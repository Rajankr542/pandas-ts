/**
 * SeriesGroupBy — mirrors pandas SeriesGroupBy API.
 */
import { Series } from '../series.js';
import { DataFrame } from '../dataframe.js';
import { isMissing, NA } from '../na.js';
import { ValueError, KeyError } from '../errors.js';

export class SeriesGroupBy {
  private _series: Series;
  private _groups: Map<string, number[]>;
  private _dropna: boolean;

  constructor(series: Series, by: unknown[] | Series, options: { dropna?: boolean } = {}) {
    this._series = series;
    this._dropna = options.dropna ?? true;
    this._groups = this._buildGroups(by);
  }

  private _buildGroups(by: unknown[] | Series): Map<string, number[]> {
    const groups = new Map<string, number[]>();
    const keys = by instanceof Series
      ? Array.from({ length: by.size }, (_, i) => by.iloc(i))
      : by;
    for (let i = 0; i < this._series.size; i++) {
      const k = keys[i];
      if (isMissing(k) && this._dropna) continue;
      const key = String(k);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(i);
    }
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }

  get groups(): Map<string, number[]> { return this._groups; }
  get ngroups(): number { return this._groups.size; }

  sum(): Series { return this._agg(s => s.sum()); }
  mean(): Series { return this._agg(s => s.mean()); }
  min(): Series { return this._agg(s => s.min()); }
  max(): Series { return this._agg(s => s.max()); }
  count(): Series { return this._agg(s => s.count()); }
  std(ddof = 1): Series { return this._agg(s => s.std(ddof)); }
  var(ddof = 1): Series { return this._agg(s => s.var(ddof)); }
  nunique(): Series { return this._agg(s => s.nunique()); }
  first(): Series { return this._agg(s => { const d = s.dropna(); return d.size > 0 ? d.iloc(0) : NA; }); }
  last(): Series { return this._agg(s => { const d = s.dropna(); return d.size > 0 ? d.iloc(d.size - 1) : NA; }); }

  size(): Series {
    const keys: string[] = [], sizes: number[] = [];
    for (const [k, p] of this._groups) { keys.push(k); sizes.push(p.length); }
    return new Series(sizes, { index: keys });
  }

  apply(fn: (s: Series) => unknown): Series {
    const keys: string[] = [], vals: unknown[] = [];
    for (const [key, positions] of this._groups) {
      const subSeries = this._selectPositions(positions);
      keys.push(key);
      vals.push(fn(subSeries));
    }
    return new Series(vals, { index: keys });
  }

  transform(fn: string | ((s: Series) => Series)): Series {
    const result: unknown[] = new Array(this._series.size).fill(NaN);
    for (const [, positions] of this._groups) {
      const sub = this._selectPositions(positions);
      if (typeof fn === 'string') {
        const agg = this._applyFn(sub, fn);
        for (const pos of positions) result[pos] = agg;
      } else {
        const res = fn(sub);
        for (let k = 0; k < positions.length; k++) result[positions[k]!] = res.size > k ? res.iloc(k) : NaN;
      }
    }
    return new Series(result, { index: this._series.index });
  }

  get_group(key: unknown): Series {
    const k = String(key);
    const positions = this._groups.get(k);
    if (!positions) throw new KeyError(`group '${k}' not found`);
    return this._selectPositions(positions);
  }

  value_counts(): Series {
    const keys: string[] = [], vals: number[] = [];
    for (const [k, p] of this._groups) { keys.push(k); vals.push(p.length); }
    return new Series(vals, { index: keys });
  }

  private _applyFn(s: Series, fn: string): unknown {
    switch (fn) {
      case 'sum': return s.sum();
      case 'mean': return s.mean();
      case 'min': return s.min();
      case 'max': return s.max();
      case 'count': return s.count();
      case 'std': return s.std();
      case 'var': return s.var();
      case 'nunique': return s.nunique();
      case 'first': { const d = s.dropna(); return d.size > 0 ? d.iloc(0) : NA; }
      case 'last': { const d = s.dropna(); return d.size > 0 ? d.iloc(d.size - 1) : NA; }
      case 'median': return this._median(s);
      case 'prod': { let p = 1; for (let i = 0; i < s.size; i++) { const v = s.iloc(i); if (!isMissing(v)) p *= Number(v); } return p; }
      default: throw new ValueError(`Unknown aggregation: '${fn}'`);
    }
  }

  private _median(s: Series): number {
    const vals = Array.from({ length: s.size }, (_, i) => s.iloc(i)).filter(v => !isMissing(v)).map(Number).sort((a, b) => a - b);
    if (vals.length === 0) return NaN;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? ((vals[mid - 1] ?? 0) + (vals[mid] ?? 0)) / 2 : (vals[mid] ?? NaN);
  }

  private _agg(fn: (s: Series) => unknown): Series {
    const keys: string[] = [], vals: unknown[] = [];
    for (const [key, positions] of this._groups) {
      keys.push(key);
      vals.push(fn(this._selectPositions(positions)));
    }
    return new Series(vals, { index: keys, name: this._series.name ?? undefined });
  }

  private _selectPositions(positions: number[]): Series {
    const vals = positions.map(i => (this._series as any)._getAt(i));
    return new Series(vals, { name: this._series.name ?? undefined });
  }

  // ── agg / aggregate ───────────────────────────────────────────────────────────

  agg(spec: string | string[] | Record<string, string>): Series | DataFrame {
    if (typeof spec === 'string') {
      return this._agg(s => this._applyFn(s, spec));
    }
    if (Array.isArray(spec)) {
      const keys: string[] = [];
      const resultCols: Record<string, unknown[]> = {};
      for (const fn of spec) resultCols[fn] = [];
      for (const [key, positions] of this._groups) {
        keys.push(key);
        const sub = this._selectPositions(positions);
        for (const fn of spec) resultCols[fn]!.push(this._applyFn(sub, fn));
      }
      
      return new DataFrame(resultCols, { index: keys });
    }
    // Record<string, string>
    const keys: string[] = [];
    const resultCols: Record<string, unknown[]> = {};
    for (const fn of Object.values(spec as Record<string, string>)) {
      if (!resultCols[fn]) resultCols[fn] = [];
    }
    for (const [key, positions] of this._groups) {
      keys.push(key);
      const sub = this._selectPositions(positions);
      for (const fn of Object.values(spec as Record<string, string>)) {
        resultCols[fn]!.push(this._applyFn(sub, fn));
      }
    }
    
    return new DataFrame(resultCols, { index: keys });
  }

  aggregate(spec: string | string[] | Record<string, string>): Series | DataFrame {
    return this.agg(spec);
  }

  // ── median / prod / sem ───────────────────────────────────────────────────────

  median(): Series { return this._agg(s => this._median(s)); }
  prod(): Series { return this._agg(s => { let p = 1; for (let i = 0; i < s.size; i++) { const v = s.iloc(i); if (!isMissing(v)) p *= Number(v); } return p; }); }
  sem(ddof = 1): Series { return this._agg(s => { const n = s.count(); return n > ddof ? s.std(ddof) / Math.sqrt(n) : NaN; }); }

  // ── quantile ─────────────────────────────────────────────────────────────────

  quantile(q = 0.5): Series {
    return this._agg(s => {
      const sorted = s.dropna().sort_values();
      if (sorted.size === 0) return NaN;
      const idx = q * (sorted.size - 1);
      const lo = Math.floor(idx), hi = Math.ceil(idx);
      if (lo === hi) return Number(sorted.iloc(lo));
      return Number(sorted.iloc(lo)) * (hi - idx) + Number(sorted.iloc(hi)) * (idx - lo);
    });
  }

  // ── filter ────────────────────────────────────────────────────────────────────

  filter(fn: (s: Series) => boolean): Series {
    const keepPositions: number[] = [];
    for (const [, positions] of this._groups) {
      const sub = this._selectPositions(positions);
      if (fn(sub)) keepPositions.push(...positions);
    }
    return this._selectPositions(keepPositions.sort((a, b) => a - b));
  }

  // ── ngroup ───────────────────────────────────────────────────────────────────

  ngroup(ascending = true): Series {
    const result = new Array<number>(this._series.size).fill(0);
    const keys = [...this._groups.keys()];
    if (!ascending) keys.reverse();
    keys.forEach((key, groupIdx) => {
      for (const pos of this._groups.get(key)!) result[pos] = groupIdx;
    });
    return new Series(result, { index: this._series.index });
  }

  // ── cumcount ─────────────────────────────────────────────────────────────────

  cumcount(ascending = true): Series {
    const result = new Array<number>(this._series.size).fill(0);
    for (const [, positions] of this._groups) {
      const ordered = ascending ? [...positions] : [...positions].reverse();
      ordered.forEach((pos, k) => { result[pos] = k; });
    }
    return new Series(result, { index: this._series.index });
  }

  // ── nth ──────────────────────────────────────────────────────────────────────

  nth(n: number): Series {
    const positions: number[] = [];
    for (const [, pos] of this._groups) {
      const idx = n < 0 ? pos.length + n : n;
      if (idx >= 0 && idx < pos.length) positions.push(pos[idx]!);
    }
    return this._selectPositions(positions.sort((a, b) => a - b));
  }

  // ── head / tail ───────────────────────────────────────────────────────────────

  head(n = 5): Series {
    const positions: number[] = [];
    for (const [, pos] of this._groups) positions.push(...pos.slice(0, n));
    return this._selectPositions(positions.sort((a, b) => a - b));
  }

  tail(n = 5): Series {
    const positions: number[] = [];
    for (const [, pos] of this._groups) positions.push(...pos.slice(-n));
    return this._selectPositions(positions.sort((a, b) => a - b));
  }

  // ── rank ─────────────────────────────────────────────────────────────────────

  rank(method: 'average' | 'min' | 'max' | 'first' | 'dense' = 'average'): Series {
    const result = new Array<number>(this._series.size).fill(NaN);
    for (const [, positions] of this._groups) {
      const vals = positions.map(pos => ({ pos, val: Number((this._series as any)._getAt(pos)) }));
      const sorted = [...vals].sort((a, b) => a.val - b.val);
      const ranks = new Map<number, number>();
      for (let i = 0; i < sorted.length; i++) {
        const val = sorted[i]!.val;
        if (!ranks.has(val)) {
          if (method === 'min') ranks.set(val, i + 1);
          else if (method === 'max') {
            let j = i;
            while (j < sorted.length && sorted[j]!.val === val) j++;
            ranks.set(val, j);
          } else if (method === 'dense') ranks.set(val, ranks.size + 1);
          else if (method === 'first') ranks.set(val, i + 1);
          else {
            let j = i, sum = 0, count = 0;
            while (j < sorted.length && sorted[j]!.val === val) { sum += j + 1; count++; j++; }
            ranks.set(val, sum / count);
          }
        }
      }
      for (const { pos, val } of vals) result[pos] = ranks.get(val)!;
    }
    return new Series(result, { index: this._series.index });
  }

  // ── ohlc ─────────────────────────────────────────────────────────────────────

  ohlc(): DataFrame {
    const keys: string[] = [];
    const open: number[] = [], high: number[] = [], low: number[] = [], close: number[] = [];
    for (const [key, positions] of this._groups) {
      const vals = positions.map(p => Number((this._series as any)._getAt(p))).filter(v => !isNaN(v));
      keys.push(key);
      open.push(vals[0] ?? NaN);
      high.push(vals.length ? Math.max(...vals) : NaN);
      low.push(vals.length ? Math.min(...vals) : NaN);
      close.push(vals[vals.length - 1] ?? NaN);
    }
    
    return new DataFrame({ open, high, low, close }, { index: keys });
  }

  // ── pipe ─────────────────────────────────────────────────────────────────────

  pipe(fn: (g: SeriesGroupBy) => unknown): unknown {
    return fn(this);
  }

  // ── describe ─────────────────────────────────────────────────────────────────

  describe(): DataFrame {
    const stats = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'];
    const keys: string[] = [];
    const resultCols: Record<string, unknown[]> = {};
    for (const stat of stats) resultCols[stat] = [];

    for (const [key, positions] of this._groups) {
      keys.push(key);
      const sub = this._selectPositions(positions);
      const desc = sub.describe() as unknown as Record<string, number>;
      for (const stat of stats) {
        switch (stat) {
          case 'count': resultCols[stat]!.push(sub.count()); break;
          case 'mean': resultCols[stat]!.push(sub.mean()); break;
          case 'std': resultCols[stat]!.push(sub.std()); break;
          case 'min': resultCols[stat]!.push(sub.min()); break;
          case 'max': resultCols[stat]!.push(sub.max()); break;
          default: resultCols[stat]!.push(desc[stat] ?? NaN);
        }
      }
    }
    
    return new DataFrame({ group: keys, ...resultCols });
  }

  // ── cumulative ops ────────────────────────────────────────────────────────────

  cumsum(): Series { return this._cumOp((acc, v) => acc + v, 0); }
  cumprod(): Series { return this._cumOp((acc, v) => acc * v, 1); }
  cummax(): Series { return this._cumOp((acc, v) => Math.max(acc, v), -Infinity); }
  cummin(): Series { return this._cumOp((acc, v) => Math.min(acc, v), Infinity); }

  private _cumOp(fn: (acc: number, v: number) => number, init: number): Series {
    const result = new Array<unknown>(this._series.size).fill(NaN);
    for (const [, positions] of this._groups) {
      let acc = init;
      for (const pos of positions) {
        const v = (this._series as any)._getAt(pos);
        if (!isMissing(v)) { acc = fn(acc, Number(v)); result[pos] = acc; }
        else result[pos] = NaN;
      }
    }
    return new Series(result, { index: this._series.index });
  }

  // ── shift / diff / pct_change ─────────────────────────────────────────────────

  shift(periods = 1): Series {
    const result = new Array<unknown>(this._series.size).fill(NaN);
    for (const [, positions] of this._groups) {
      for (let k = 0; k < positions.length; k++) {
        const srcK = k - periods;
        result[positions[k]!] = srcK >= 0 && srcK < positions.length
          ? (this._series as any)._getAt(positions[srcK])
          : NaN;
      }
    }
    return new Series(result, { index: this._series.index });
  }

  diff(periods = 1): Series {
    const result = new Array<unknown>(this._series.size).fill(NaN);
    for (const [, positions] of this._groups) {
      for (let k = periods; k < positions.length; k++) {
        const curr = Number((this._series as any)._getAt(positions[k]));
        const prev = Number((this._series as any)._getAt(positions[k - periods]));
        result[positions[k]!] = curr - prev;
      }
    }
    return new Series(result, { index: this._series.index });
  }

  pct_change(periods = 1): Series {
    const result = new Array<unknown>(this._series.size).fill(NaN);
    for (const [, positions] of this._groups) {
      for (let k = periods; k < positions.length; k++) {
        const curr = Number((this._series as any)._getAt(positions[k]));
        const prev = Number((this._series as any)._getAt(positions[k - periods]));
        result[positions[k]!] = prev !== 0 ? (curr - prev) / Math.abs(prev) : NaN;
      }
    }
    return new Series(result, { index: this._series.index });
  }

  // ── ffill / bfill ─────────────────────────────────────────────────────────────

  ffill(): Series { return this._fill('forward'); }
  bfill(): Series { return this._fill('backward'); }

  private _fill(direction: 'forward' | 'backward'): Series {
    const result = new Array<unknown>(this._series.size);
    for (const [, positions] of this._groups) {
      const ordered = direction === 'forward' ? positions : [...positions].reverse();
      let lastValid: unknown = NaN;
      for (const pos of ordered) {
        const v = (this._series as any)._getAt(pos);
        if (!isMissing(v)) lastValid = v;
        result[pos] = lastValid;
      }
    }
    return new Series(result, { index: this._series.index });
  }

  // ── idxmin / idxmax ──────────────────────────────────────────────────────────

  idxmin(): Series {
    const keys: string[] = [], vals: unknown[] = [];
    for (const [key, positions] of this._groups) {
      keys.push(key);
      let bestPos = positions[0]!;
      let bestVal = Number((this._series as any)._getAt(positions[0]));
      for (const pos of positions) {
        const v = Number((this._series as any)._getAt(pos));
        if (v < bestVal) { bestVal = v; bestPos = pos; }
      }
      vals.push((this._series as any)._index ? (this._series as any)._index[bestPos] : bestPos);
    }
    return new Series(vals, { index: keys });
  }

  idxmax(): Series {
    const keys: string[] = [], vals: unknown[] = [];
    for (const [key, positions] of this._groups) {
      keys.push(key);
      let bestPos = positions[0]!;
      let bestVal = Number((this._series as any)._getAt(positions[0]));
      for (const pos of positions) {
        const v = Number((this._series as any)._getAt(pos));
        if (v > bestVal) { bestVal = v; bestPos = pos; }
      }
      vals.push((this._series as any)._index ? (this._series as any)._index[bestPos] : bestPos);
    }
    return new Series(vals, { index: keys });
  }

  // ── sample ───────────────────────────────────────────────────────────────────

  sample(n = 1): Series {
    const positions: number[] = [];
    for (const [, pos] of this._groups) {
      const shuffled = [...pos].sort(() => Math.random() - 0.5);
      positions.push(...shuffled.slice(0, Math.min(n, shuffled.length)));
    }
    return this._selectPositions(positions.sort((a, b) => a - b));
  }

  // ── all / any ─────────────────────────────────────────────────────────────────

  all(): Series {
    return this._agg(s => {
      for (let i = 0; i < s.size; i++) { if (!s.iloc(i)) return false; }
      return true;
    });
  }

  any(): Series {
    return this._agg(s => {
      for (let i = 0; i < s.size; i++) { if (s.iloc(i)) return true; }
      return false;
    });
  }

  // ── get_group ─────────────────────────────────────────────────────────────────
}
