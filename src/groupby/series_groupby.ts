/**
 * SeriesGroupBy — mirrors pandas SeriesGroupBy API.
 */
import { Series } from '../series.js';
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
      default: throw new ValueError(`Unknown aggregation: '${fn}'`);
    }
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
}
