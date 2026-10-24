/**
 * DataFrameGroupBy — mirrors pandas DataFrameGroupBy API.
 */
import { DataFrame } from '../dataframe.js';
import { Series } from '../series.js';
import { isMissing, NA } from '../na.js';
import { ValueError, KeyError } from '../errors.js';

export class DataFrameGroupBy {
  private _df: DataFrame;
  private _by: string[];
  private _groups: Map<string, number[]>;
  private _dropna: boolean;
  private _sort: boolean;

  constructor(df: DataFrame, by: string[], options: { dropna?: boolean; sort?: boolean } = {}) {
    this._df = df;
    this._by = by;
    this._dropna = options.dropna ?? true;
    this._sort = options.sort ?? true;
    this._groups = this._buildGroups();
  }

  private _buildGroups(): Map<string, number[]> {
    const groups = new Map<string, number[]>();
    const dfAny = this._df as any;
    for (let i = 0; i < dfAny._index.length; i++) {
      let hasNA = false;
      const keyParts: string[] = [];
      for (const col of this._by) {
        const v = (dfAny._columns.get(col) as any)._getAt(i);
        if (isMissing(v)) { hasNA = true; break; }
        keyParts.push(String(v));
      }
      if (hasNA && this._dropna) continue;
      const key = keyParts.join('\x00');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(i);
    }
    if (this._sort) {
      return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    }
    return groups;
  }

  get groups(): Map<string, number[]> { return this._groups; }
  get ngroups(): number { return this._groups.size; }
  get indices(): Map<string, number[]> { return this._groups; }

  // ── Core aggregations ────────────────────────────────────────────────────────

  sum(): DataFrame { return this._agg(s => s.sum()); }
  mean(): DataFrame { return this._agg(s => s.mean()); }
  min(): DataFrame { return this._agg(s => s.min()); }
  max(): DataFrame { return this._agg(s => s.max()); }
  count(): DataFrame { return this._agg(s => s.count()); }
  std(ddof = 1): DataFrame { return this._agg(s => s.std(ddof)); }
  var(ddof = 1): DataFrame { return this._agg(s => s.var(ddof)); }
  first(): DataFrame { return this._agg(s => s.dropna().size > 0 ? s.dropna().iloc(0) : NA); }
  last(): DataFrame { return this._agg(s => { const d = s.dropna(); return d.size > 0 ? d.iloc(d.size - 1) : NA; }); }
  prod(): DataFrame { return this._agg(s => { let p = 1; for (let i = 0; i < s.size; i++) { const v = s.iloc(i); if (!isMissing(v)) p *= Number(v); } return p; }); }

  median(): DataFrame {
    return this._agg(s => {
      const vals = Array.from({ length: s.size }, (_, i) => s.iloc(i)).filter(v => !isMissing(v)).map(Number).sort((a, b) => a - b);
      if (vals.length === 0) return NaN;
      const mid = Math.floor(vals.length / 2);
      return vals.length % 2 === 0 ? ((vals[mid - 1] ?? 0) + (vals[mid] ?? 0)) / 2 : (vals[mid] ?? NaN);
    });
  }

  sem(ddof = 1): DataFrame {
    return this._agg(s => {
      const n = s.count();
      return n > ddof ? s.std(ddof) / Math.sqrt(n) : NaN;
    });
  }

  nunique(): DataFrame { return this._agg(s => s.nunique()); }

  size(): Series {
    const keys: string[] = [];
    const sizes: number[] = [];
    for (const [key, positions] of this._groups) {
      keys.push(key.replace('\x00', ','));
      sizes.push(positions.length);
    }
    return new Series(sizes, { index: keys });
  }

  // ── Multi-aggregation ────────────────────────────────────────────────────────

  agg(spec: Record<string, string | string[]>): DataFrame {
    const aggCols = Object.keys(spec);
    const keyVals: Record<string, unknown[]> = {};
    for (const col of this._by) keyVals[col] = [];
    const resultCols: Record<string, unknown[]> = {};

    for (const [key, positions] of this._groups) {
      const keyParts = key.split('\x00');
      for (let k = 0; k < this._by.length; k++) {
        keyVals[this._by[k]!]!.push(keyParts[k]);
      }
      const subDf = (this._df as any)._selectRowPositions(positions) as DataFrame;
      for (const col of aggCols) {
        const fns = Array.isArray(spec[col]) ? spec[col] as string[] : [spec[col] as string];
        for (const fn of fns) {
          const colKey = fns.length > 1 ? `${col}_${fn}` : col;
          if (!resultCols[colKey]) resultCols[colKey] = [];
          resultCols[colKey]!.push(this._applyAggFn(subDf.col(col), fn));
        }
      }
    }
    return new DataFrame({ ...keyVals, ...resultCols });
  }

  private _applyAggFn(s: Series, fn: string): unknown {
    switch (fn) {
      case 'sum': return s.sum();
      case 'mean': return s.mean();
      case 'min': return s.min();
      case 'max': return s.max();
      case 'count': return s.count();
      case 'std': return s.std();
      case 'var': return s.var();
      case 'first': return s.dropna().size > 0 ? s.dropna().iloc(0) : NA;
      case 'last': { const d = s.dropna(); return d.size > 0 ? d.iloc(d.size - 1) : NA; }
      case 'nunique': return s.nunique();
      case 'median': return this._median(s);
      case 'prod': { let p = 1; for (let i = 0; i < s.size; i++) { const v = s.iloc(i); if (!isMissing(v)) p *= Number(v); } return p; }
      default: throw new ValueError(`Unknown aggregation function: '${fn}'`);
    }
  }

  private _median(s: Series): number {
    const vals = Array.from({ length: s.size }, (_, i) => s.iloc(i)).filter(v => !isMissing(v)).map(Number).sort((a, b) => a - b);
    if (vals.length === 0) return NaN;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? ((vals[mid - 1] ?? 0) + (vals[mid] ?? 0)) / 2 : (vals[mid] ?? NaN);
  }

  // ── Transform ────────────────────────────────────────────────────────────────

  transform(fn: string | ((s: Series) => Series)): DataFrame {
    const nRows = (this._df as any)._index.length;
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const resultData: Record<string, unknown[]> = {};
    for (const col of aggCols) resultData[col] = new Array(nRows).fill(NaN);

    for (const [, positions] of this._groups) {
      const subDf = (this._df as any)._selectRowPositions(positions) as DataFrame;
      for (const col of aggCols) {
        const s = subDf.col(col);
        let aggVal: unknown;
        if (typeof fn === 'string') {
          aggVal = this._applyAggFn(s, fn);
        } else {
          const res = fn(s);
          for (let k = 0; k < positions.length; k++) {
            resultData[col]![positions[k]!] = res.size > k ? res.iloc(k) : NaN;
          }
          continue;
        }
        for (const pos of positions) resultData[col]![pos] = aggVal;
      }
    }
    return new DataFrame(resultData, { index: (this._df as any)._index });
  }

  // ── Apply ────────────────────────────────────────────────────────────────────

  apply(fn: (df: DataFrame) => DataFrame | unknown): DataFrame {
    const results: DataFrame[] = [];
    for (const [, positions] of this._groups) {
      const subDf = (this._df as any)._selectRowPositions(positions) as DataFrame;
      const res = fn(subDf);
      if (res instanceof DataFrame) results.push(res);
    }
    if (results.length === 0) return new DataFrame();
    return DataFrame.concat(results, { ignore_index: true });
  }

  // ── Filter ───────────────────────────────────────────────────────────────────

  filter(fn: (df: DataFrame) => boolean): DataFrame {
    const keepPositions: number[] = [];
    for (const [, positions] of this._groups) {
      const subDf = (this._df as any)._selectRowPositions(positions) as DataFrame;
      if (fn(subDf)) keepPositions.push(...positions);
    }
    return (this._df as any)._selectRowPositions(keepPositions.sort((a, b) => a - b)) as DataFrame;
  }

  // ── Cumulative ops ───────────────────────────────────────────────────────────

  cumsum(): DataFrame { return this._cumOp((acc, v) => acc + v, 0); }
  cumprod(): DataFrame { return this._cumOp((acc, v) => acc * v, 1); }
  cummax(): DataFrame { return this._cumOp((acc, v) => Math.max(acc, v), -Infinity); }
  cummin(): DataFrame { return this._cumOp((acc, v) => Math.min(acc, v), Infinity); }

  private _cumOp(fn: (acc: number, v: number) => number, init: number): DataFrame {
    const nRows = (this._df as any)._index.length;
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const resultData: Record<string, unknown[]> = {};
    for (const col of aggCols) resultData[col] = new Array(nRows).fill(NaN);

    for (const [, positions] of this._groups) {
      for (const col of aggCols) {
        let acc = init;
        for (const pos of positions) {
          const v = ((this._df as any)._columns.get(col) as any)._getAt(pos);
          if (!isMissing(v)) { acc = fn(acc, Number(v)); resultData[col]![pos] = acc; }
          else resultData[col]![pos] = NaN;
        }
      }
    }
    return new DataFrame(resultData, { index: (this._df as any)._index });
  }

  // ── cumcount ─────────────────────────────────────────────────────────────────

  cumcount(ascending = true): Series {
    const nRows = (this._df as any)._index.length;
    const result = new Array<number>(nRows).fill(0);
    for (const [, positions] of this._groups) {
      const ordered = ascending ? [...positions] : [...positions].reverse();
      ordered.forEach((pos, k) => { result[pos] = k; });
    }
    return new Series(result, { index: (this._df as any)._index });
  }

  // ── ngroup ───────────────────────────────────────────────────────────────────

  ngroup(ascending = true): Series {
    const nRows = (this._df as any)._index.length;
    const result = new Array<number>(nRows).fill(0);
    const keys = [...this._groups.keys()];
    if (!ascending) keys.reverse();
    keys.forEach((key, groupIdx) => {
      for (const pos of this._groups.get(key)!) result[pos] = groupIdx;
    });
    return new Series(result, { index: (this._df as any)._index });
  }

  // ── nth ──────────────────────────────────────────────────────────────────────

  nth(n: number): DataFrame {
    const positions: number[] = [];
    for (const [, pos] of this._groups) {
      const idx = n < 0 ? pos.length + n : n;
      if (idx >= 0 && idx < pos.length) positions.push(pos[idx]!);
    }
    return (this._df as any)._selectRowPositions(positions.sort((a, b) => a - b)) as DataFrame;
  }

  // ── shift ────────────────────────────────────────────────────────────────────

  shift(periods = 1): DataFrame {
    const nRows = (this._df as any)._index.length;
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const resultData: Record<string, unknown[]> = {};
    for (const col of aggCols) resultData[col] = new Array(nRows).fill(NaN);

    for (const [, positions] of this._groups) {
      for (const col of aggCols) {
        for (let k = 0; k < positions.length; k++) {
          const srcK = k - periods;
          resultData[col]![positions[k]!] = srcK >= 0 && srcK < positions.length
            ? (this._df as any)._columns.get(col)._getAt(positions[srcK])
            : NaN;
        }
      }
    }
    return new DataFrame(resultData, { index: (this._df as any)._index });
  }

  // ── diff ─────────────────────────────────────────────────────────────────────

  diff(periods = 1): DataFrame {
    const nRows = (this._df as any)._index.length;
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const resultData: Record<string, unknown[]> = {};
    for (const col of aggCols) resultData[col] = new Array(nRows).fill(NaN);

    for (const [, positions] of this._groups) {
      for (const col of aggCols) {
        for (let k = 0; k < positions.length; k++) {
          const srcK = k - periods;
          if (srcK >= 0) {
            const curr = Number((this._df as any)._columns.get(col)._getAt(positions[k]));
            const prev = Number((this._df as any)._columns.get(col)._getAt(positions[srcK]));
            resultData[col]![positions[k]!] = curr - prev;
          }
        }
      }
    }
    return new DataFrame(resultData, { index: (this._df as any)._index });
  }

  // ── rank ─────────────────────────────────────────────────────────────────────

  rank(method: 'average' | 'min' | 'max' | 'first' | 'dense' = 'average'): DataFrame {
    const nRows = (this._df as any)._index.length;
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const resultData: Record<string, unknown[]> = {};
    for (const col of aggCols) resultData[col] = new Array(nRows).fill(NaN);

    for (const [, positions] of this._groups) {
      for (const col of aggCols) {
        const vals = positions.map(pos => ({ pos, val: Number((this._df as any)._columns.get(col)._getAt(pos)) }));
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
        for (const { pos, val } of vals) resultData[col]![pos] = ranks.get(val)!;
      }
    }
    return new DataFrame(resultData, { index: (this._df as any)._index });
  }

  // ── pct_change ───────────────────────────────────────────────────────────────

  pct_change(periods = 1): DataFrame {
    const nRows = (this._df as any)._index.length;
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const resultData: Record<string, unknown[]> = {};
    for (const col of aggCols) resultData[col] = new Array(nRows).fill(NaN);

    for (const [, positions] of this._groups) {
      for (const col of aggCols) {
        for (let k = periods; k < positions.length; k++) {
          const curr = Number((this._df as any)._columns.get(col)._getAt(positions[k]));
          const prev = Number((this._df as any)._columns.get(col)._getAt(positions[k - periods]));
          resultData[col]![positions[k]!] = prev !== 0 ? (curr - prev) / Math.abs(prev) : NaN;
        }
      }
    }
    return new DataFrame(resultData, { index: (this._df as any)._index });
  }

  // ── ffill / bfill ─────────────────────────────────────────────────────────────

  ffill(): DataFrame { return this._fill('forward'); }
  bfill(): DataFrame { return this._fill('backward'); }

  private _fill(direction: 'forward' | 'backward'): DataFrame {
    const nRows = (this._df as any)._index.length;
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const resultData: Record<string, unknown[]> = {};
    for (const col of aggCols) resultData[col] = new Array(nRows);

    for (const [, positions] of this._groups) {
      const ordered = direction === 'forward' ? positions : [...positions].reverse();
      for (const col of aggCols) {
        let lastValid: unknown = NaN;
        for (const pos of ordered) {
          const v = (this._df as any)._columns.get(col)._getAt(pos);
          if (!isMissing(v)) lastValid = v;
          resultData[col]![pos] = lastValid;
        }
      }
    }
    return new DataFrame(resultData, { index: (this._df as any)._index });
  }

  // ── idxmin / idxmax ──────────────────────────────────────────────────────────

  idxmin(): DataFrame { return this._idxOp('min'); }
  idxmax(): DataFrame { return this._idxOp('max'); }

  private _idxOp(op: 'min' | 'max'): DataFrame {
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const keyVals: Record<string, unknown[]> = {};
    for (const col of this._by) keyVals[col] = [];
    const resultCols: Record<string, unknown[]> = {};
    for (const col of aggCols) resultCols[col] = [];

    for (const [key, positions] of this._groups) {
      const keyParts = key.split('\x00');
      for (let k = 0; k < this._by.length; k++) keyVals[this._by[k]!]!.push(keyParts[k]);
      for (const col of aggCols) {
        let bestPos = positions[0]!;
        let bestVal = Number((this._df as any)._columns.get(col)._getAt(positions[0]));
        for (const pos of positions) {
          const v = Number((this._df as any)._columns.get(col)._getAt(pos));
          if (op === 'min' ? v < bestVal : v > bestVal) { bestVal = v; bestPos = pos; }
        }
        resultCols[col]!.push((this._df as any)._index[bestPos]);
      }
    }
    return new DataFrame({ ...keyVals, ...resultCols });
  }

  // ── value_counts ─────────────────────────────────────────────────────────────

  value_counts(): DataFrame {
    const keyVals: Record<string, unknown[]> = {};
    for (const col of this._by) keyVals[col] = [];
    const countArr: number[] = [];

    for (const [key, positions] of this._groups) {
      const keyParts = key.split('\x00');
      for (let k = 0; k < this._by.length; k++) keyVals[this._by[k]!]!.push(keyParts[k]);
      countArr.push(positions.length);
    }
    return new DataFrame({ ...keyVals, count: countArr });
  }

  // ── sample ───────────────────────────────────────────────────────────────────

  sample(n = 1): DataFrame {
    const positions: number[] = [];
    for (const [, pos] of this._groups) {
      const shuffled = [...pos].sort(() => Math.random() - 0.5);
      positions.push(...shuffled.slice(0, Math.min(n, shuffled.length)));
    }
    return (this._df as any)._selectRowPositions(positions.sort((a, b) => a - b)) as DataFrame;
  }

  // ── head / tail ───────────────────────────────────────────────────────────────

  head(n = 5): DataFrame {
    const positions: number[] = [];
    for (const [, pos] of this._groups) positions.push(...pos.slice(0, n));
    return (this._df as any)._selectRowPositions(positions.sort((a, b) => a - b)) as DataFrame;
  }

  tail(n = 5): DataFrame {
    const positions: number[] = [];
    for (const [, pos] of this._groups) positions.push(...pos.slice(-n));
    return (this._df as any)._selectRowPositions(positions.sort((a, b) => a - b)) as DataFrame;
  }

  // ── ohlc ─────────────────────────────────────────────────────────────────────

  ohlc(): DataFrame {
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const keyVals: Record<string, unknown[]> = {};
    for (const col of this._by) keyVals[col] = [];
    const resultCols: Record<string, unknown[]> = {};
    for (const col of aggCols) {
      resultCols[`${col}_open`] = [];
      resultCols[`${col}_high`] = [];
      resultCols[`${col}_low`] = [];
      resultCols[`${col}_close`] = [];
    }

    for (const [key, positions] of this._groups) {
      const keyParts = key.split('\x00');
      for (let k = 0; k < this._by.length; k++) keyVals[this._by[k]!]!.push(keyParts[k]);
      for (const col of aggCols) {
        const vals = positions.map(p => Number((this._df as any)._columns.get(col)._getAt(p))).filter(v => !isNaN(v));
        resultCols[`${col}_open`]!.push(vals[0] ?? NaN);
        resultCols[`${col}_high`]!.push(vals.length ? Math.max(...vals) : NaN);
        resultCols[`${col}_low`]!.push(vals.length ? Math.min(...vals) : NaN);
        resultCols[`${col}_close`]!.push(vals[vals.length - 1] ?? NaN);
      }
    }
    return new DataFrame({ ...keyVals, ...resultCols });
  }

  // ── describe ─────────────────────────────────────────────────────────────────

  describe(): DataFrame {
    const stats = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'];
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const rows: Record<string, unknown>[] = [];
    for (const stat of stats) {
      const row: Record<string, unknown> = { stat };
      for (const col of aggCols) {
        const vals: number[] = [];
        for (const [, positions] of this._groups) {
          const subSeries = ((this._df as any)._selectRowPositions(positions) as DataFrame).col(col);
          switch (stat) {
            case 'count': vals.push(subSeries.count()); break;
            case 'mean': vals.push(subSeries.mean()); break;
            case 'std': vals.push(subSeries.std()); break;
            case 'min': vals.push(subSeries.min()); break;
            case 'max': vals.push(subSeries.max()); break;
            default: {
              const d = subSeries.describe();
              vals.push((d[stat] as number) ?? NaN);
            }
          }
        }
        row[col] = vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      rows.push(row);
    }
    return new DataFrame(rows);
  }

  // ── get_group ─────────────────────────────────────────────────────────────────

  get_group(key: unknown | unknown[]): DataFrame {
    const keyStr = Array.isArray(key) ? (key as unknown[]).map(String).join('\x00') : String(key);
    const positions = this._groups.get(keyStr);
    if (!positions) throw new KeyError(`group '${keyStr}' not found`);
    return (this._df as any)._selectRowPositions(positions) as DataFrame;
  }

  // ── pipe ─────────────────────────────────────────────────────────────────────

  pipe(fn: (g: DataFrameGroupBy) => unknown): unknown {
    return fn(this);
  }

  // ── quantile ─────────────────────────────────────────────────────────────────

  quantile(q = 0.5): DataFrame {
    return this._agg(s => {
      const sorted = s.dropna().sort_values();
      if (sorted.size === 0) return NaN;
      const idx = q * (sorted.size - 1);
      const lo = Math.floor(idx), hi = Math.ceil(idx);
      if (lo === hi) return Number(sorted.iloc(lo));
      return Number(sorted.iloc(lo)) * (hi - idx) + Number(sorted.iloc(hi)) * (idx - lo);
    });
  }

  // ── all / any ─────────────────────────────────────────────────────────────────

  all(): DataFrame {
    return this._agg(s => {
      for (let i = 0; i < s.size; i++) { if (!s.iloc(i)) return false; }
      return true;
    });
  }

  any(): DataFrame {
    return this._agg(s => {
      for (let i = 0; i < s.size; i++) { if (s.iloc(i)) return true; }
      return false;
    });
  }

  // ── Private helper ────────────────────────────────────────────────────────────

  private _agg(fn: (s: Series) => unknown): DataFrame {
    const keyVals: Record<string, unknown[]> = {};
    for (const col of this._by) keyVals[col] = [];
    const aggCols = (this._df as any)._columnOrder.filter((c: string) => !this._by.includes(c)) as string[];
    const aggVals: Record<string, unknown[]> = {};
    for (const col of aggCols) aggVals[col] = [];

    for (const [key, positions] of this._groups) {
      const keyParts = key.split('\x00');
      for (let k = 0; k < this._by.length; k++) keyVals[this._by[k]!]!.push(keyParts[k]);
      const subDf = (this._df as any)._selectRowPositions(positions) as DataFrame;
      for (const col of aggCols) aggVals[col]!.push(fn(subDf.col(col)));
    }
    return new DataFrame({ ...keyVals, ...aggVals });
  }
}
