/**
 * Resample — mirrors pandas DataFrame.resample() / Series.resample().
 * Supports time-frequency based grouping and aggregation.
 */
import { DataFrame } from '../dataframe.js';
import { Series } from '../series.js';
import { isMissing } from '../na.js';
import { ValueError } from '../errors.js';

export type ResampleFreq = 'D' | 'W' | 'M' | 'Q' | 'Y' | 'A' | 'H' | 'T' | 'min' | 'S' | '2D' | '3D' | string;

export interface ResampleOptions {
  closed?: 'left' | 'right';
  label?: 'left' | 'right';
  on?: string; // column to use as datetime (if not index)
  origin?: 'start' | 'end' | 'start_day' | 'end_day' | Date;
}

/**
 * Parse a frequency string into milliseconds.
 * Handles: 'D', 'H', 'T'/'min', 'S', 'W', 'M', 'Q', 'Y'/'A', and multipliers like '2H', '15min'.
 */
function freqToMs(freq: string): number {
  const m = freq.match(/^(\d+)?([A-Za-z]+)$/);
  if (!m) throw new ValueError(`Invalid frequency: '${freq}'`);
  const n = parseInt(m[1] ?? '1');
  const unit = m[2]!.toUpperCase();
  const msMap: Record<string, number> = {
    'S': 1000,
    'T': 60_000, 'MIN': 60_000,
    'H': 3_600_000,
    'D': 86_400_000,
    'W': 7 * 86_400_000,
    // M/Q/Y handled specially (variable-length months)
  };
  if (msMap[unit]) return n * msMap[unit]!;
  // Variable: M ≈ 30.44 days, Q ≈ 91.31 days, Y/A ≈ 365.25 days
  if (unit === 'M') return n * 30.44 * 86_400_000;
  if (unit === 'Q') return n * 91.3125 * 86_400_000;
  if (unit === 'Y' || unit === 'A') return n * 365.25 * 86_400_000;
  throw new ValueError(`Unknown frequency unit: '${unit}'`);
}

/**
 * Snap a date to the start of its frequency bucket.
 */
function snapToBucket(ts: number, freqMs: number, origin: number): number {
  return Math.floor((ts - origin) / freqMs) * freqMs + origin;
}

export class DataFrameResampler {
  private _df: DataFrame;
  private _freq: string;
  private _freqMs: number;
  private _options: ResampleOptions;
  private _groups: Map<number, number[]>; // bucket_start_ts → row indices

  constructor(df: DataFrame, freq: string, options: ResampleOptions = {}) {
    this._df = df;
    this._freq = freq;
    this._freqMs = freqToMs(freq);
    this._options = options;
    this._groups = this._buildGroups();
  }

  private _getTimestamps(): number[] {
    const dfAny = this._df as any;
    if (this._options.on) {
      // Use specified column
      const col = dfAny._columns.get(this._options.on);
      if (!col) throw new ValueError(`Column '${this._options.on}' not found`);
      return Array.from({ length: dfAny._index.length }, (_: unknown, i: number) => {
        const v = col._getAt(i);
        if (v instanceof Date) return v.getTime();
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return new Date(v).getTime();
        return NaN;
      });
    }
    // Use index
    return dfAny._index.map((v: unknown) => {
      if (v instanceof Date) return (v as Date).getTime();
      if (typeof v === 'number') return v as number;
      if (typeof v === 'string') return new Date(v as string).getTime();
      return NaN;
    });
  }

  private _buildGroups(): Map<number, number[]> {
    const timestamps = this._getTimestamps();
    const validTs = timestamps.filter((t: number) => !isNaN(t));
    if (validTs.length === 0) return new Map();

    const origin = validTs[0]!;
    const groups = new Map<number, number[]>();

    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i]!;
      if (isNaN(t)) continue;
      const bucket = snapToBucket(t, this._freqMs, origin);
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket)!.push(i);
    }

    // Sort by bucket time
    return new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
  }

  private _agg(fn: (s: Series) => unknown): DataFrame {
    const aggCols = (this._df as any)._columnOrder as string[];
    const keyVals: Date[] = [];
    const resultCols: Record<string, unknown[]> = {};
    for (const col of aggCols) resultCols[col] = [];

    for (const [bucket, positions] of this._groups) {
      keyVals.push(new Date(bucket));
      const subDf = (this._df as any)._selectRowPositions(positions) as DataFrame;
      for (const col of aggCols) {
        resultCols[col]!.push(fn(subDf.col(col)));
      }
    }

    return new DataFrame(resultCols, { index: keyVals.map(d => d.toISOString()) });
  }

  // ── Aggregations ─────────────────────────────────────────────────────────────
  sum(): DataFrame { return this._agg(s => s.sum()); }
  mean(): DataFrame { return this._agg(s => s.mean()); }
  min(): DataFrame { return this._agg(s => s.min()); }
  max(): DataFrame { return this._agg(s => s.max()); }
  count(): DataFrame { return this._agg(s => s.count()); }
  std(ddof = 1): DataFrame { return this._agg(s => s.std(ddof)); }
  var(ddof = 1): DataFrame { return this._agg(s => s.var(ddof)); }
  median(): DataFrame {
    return this._agg(s => {
      const vals = Array.from({ length: s.size }, (_: unknown, i: number) => s.iloc(i))
        .filter(v => !isMissing(v)).map(Number).sort((a, b) => a - b);
      if (vals.length === 0) return NaN;
      const mid = Math.floor(vals.length / 2);
      return vals.length % 2 === 0 ? (vals[mid - 1]! + vals[mid]!) / 2 : vals[mid]!;
    });
  }
  first(): DataFrame {
    return this._agg(s => {
      const d = s.dropna();
      return d.size > 0 ? d.iloc(0) : NaN;
    });
  }
  last(): DataFrame {
    return this._agg(s => {
      const d = s.dropna();
      return d.size > 0 ? d.iloc(d.size - 1) : NaN;
    });
  }
  prod(): DataFrame {
    return this._agg(s => {
      let p = 1;
      for (let i = 0; i < s.size; i++) {
        const v = s.iloc(i);
        if (!isMissing(v)) p *= Number(v);
      }
      return p;
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
    const keys: string[] = [], sizes: number[] = [];
    for (const [bucket, positions] of this._groups) {
      keys.push(new Date(bucket).toISOString());
      sizes.push(positions.length);
    }
    return new Series(sizes, { index: keys });
  }

  // ── OHLC ─────────────────────────────────────────────────────────────────────
  ohlc(): DataFrame {
    const aggCols = (this._df as any)._columnOrder as string[];
    const keyVals: string[] = [];
    const resultCols: Record<string, unknown[]> = {};
    for (const col of aggCols) {
      resultCols[`${col}_open`] = [];
      resultCols[`${col}_high`] = [];
      resultCols[`${col}_low`] = [];
      resultCols[`${col}_close`] = [];
    }

    for (const [bucket, positions] of this._groups) {
      keyVals.push(new Date(bucket).toISOString());
      const subDf = (this._df as any)._selectRowPositions(positions) as DataFrame;
      for (const col of aggCols) {
        const vals = Array.from({ length: positions.length }, (_: unknown, k: number) =>
          Number(subDf.col(col).iloc(k))
        ).filter(v => !isNaN(v));
        resultCols[`${col}_open`]!.push(vals[0] ?? NaN);
        resultCols[`${col}_high`]!.push(vals.length ? Math.max(...vals) : NaN);
        resultCols[`${col}_low`]!.push(vals.length ? Math.min(...vals) : NaN);
        resultCols[`${col}_close`]!.push(vals[vals.length - 1] ?? NaN);
      }
    }
    return new DataFrame(resultCols, { index: keyVals });
  }

  // ── Interpolate ───────────────────────────────────────────────────────────────
  interpolate(): DataFrame {
    return this.mean().interpolate();
  }

  // ── ffill / bfill ─────────────────────────────────────────────────────────────
  ffill(): DataFrame { return this.mean().interpolate('pad'); }
  bfill(): DataFrame { return this.mean().interpolate('backfill'); }

  // ── apply ─────────────────────────────────────────────────────────────────────
  apply(fn: (df: DataFrame) => unknown): DataFrame {
    const results: DataFrame[] = [];
    for (const [, positions] of this._groups) {
      const subDf = (this._df as any)._selectRowPositions(positions) as DataFrame;
      const r = fn(subDf);
      if (r instanceof DataFrame) results.push(r);
    }
    if (results.length === 0) return new DataFrame();
    return DataFrame.concat(results, { ignore_index: true });
  }

  // ── agg ───────────────────────────────────────────────────────────────────────
  agg(spec: string | Record<string, string | string[]>): DataFrame {
    if (typeof spec === 'string') {
      return this._agg(s => {
        switch (spec) {
          case 'sum': return s.sum();
          case 'mean': return s.mean();
          case 'min': return s.min();
          case 'max': return s.max();
          case 'count': return s.count();
          case 'std': return s.std();
          case 'var': return s.var();
          default: throw new ValueError(`Unknown aggregation: '${spec}'`);
        }
      });
    }
    // Record spec
    const aggCols = Object.keys(spec);
    const keyVals: string[] = [];
    const resultCols: Record<string, unknown[]> = {};

    for (const [bucket, positions] of this._groups) {
      keyVals.push(new Date(bucket).toISOString());
      const subDf = (this._df as any)._selectRowPositions(positions) as DataFrame;
      for (const col of aggCols) {
        const fns = Array.isArray(spec[col]) ? spec[col] as string[] : [spec[col] as string];
        for (const fn of fns) {
          const key = fns.length > 1 ? `${col}_${fn}` : col;
          if (!resultCols[key]) resultCols[key] = [];
          const s = subDf.col(col);
          switch (fn) {
            case 'sum': resultCols[key]!.push(s.sum()); break;
            case 'mean': resultCols[key]!.push(s.mean()); break;
            case 'min': resultCols[key]!.push(s.min()); break;
            case 'max': resultCols[key]!.push(s.max()); break;
            case 'count': resultCols[key]!.push(s.count()); break;
            case 'std': resultCols[key]!.push(s.std()); break;
            default: resultCols[key]!.push(NaN);
          }
        }
      }
    }
    return new DataFrame(resultCols, { index: keyVals });
  }

  // ── get_group ─────────────────────────────────────────────────────────────────
  get ngroups(): number { return this._groups.size; }
  get groups(): Map<number, number[]> { return this._groups; }
}

export class SeriesResampler {
  private _series: Series;
  private _freq: string;
  private _freqMs: number;
  private _options: ResampleOptions;
  private _groups: Map<number, number[]>;

  constructor(series: Series, freq: string, options: ResampleOptions = {}) {
    this._series = series;
    this._freq = freq;
    this._freqMs = freqToMs(freq);
    this._options = options;
    this._groups = this._buildGroups();
  }

  private _buildGroups(): Map<number, number[]> {
    const idx = this._series.index;
    const timestamps = idx.map((v: string | number) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return new Date(v).getTime();
      return NaN;
    });
    const validTs = timestamps.filter((t: number) => !isNaN(t));
    if (validTs.length === 0) return new Map();

    const origin = validTs[0]!;
    const groups = new Map<number, number[]>();
    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i]!;
      if (isNaN(t)) continue;
      const bucket = snapToBucket(t, this._freqMs, origin);
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket)!.push(i);
    }
    return new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
  }

  private _agg(fn: (s: Series) => unknown): Series {
    const keys: string[] = [], vals: unknown[] = [];
    for (const [bucket, positions] of this._groups) {
      keys.push(new Date(bucket).toISOString());
      const sub = this._selectPositions(positions);
      vals.push(fn(sub));
    }
    return new Series(vals, { index: keys, name: this._series.name ?? undefined });
  }

  private _selectPositions(positions: number[]): Series {
    const vals = positions.map(i => (this._series as any)._getAt(i));
    return new Series(vals, { name: this._series.name ?? undefined });
  }

  sum(): Series { return this._agg(s => s.sum()); }
  mean(): Series { return this._agg(s => s.mean()); }
  min(): Series { return this._agg(s => s.min()); }
  max(): Series { return this._agg(s => s.max()); }
  count(): Series { return this._agg(s => s.count()); }
  std(ddof = 1): Series { return this._agg(s => s.std(ddof)); }
  var(ddof = 1): Series { return this._agg(s => s.var(ddof)); }
  median(): Series {
    return this._agg(s => {
      const vals = Array.from({ length: s.size }, (_: unknown, i: number) => s.iloc(i))
        .filter(v => !isMissing(v)).map(Number).sort((a, b) => a - b);
      if (vals.length === 0) return NaN;
      const mid = Math.floor(vals.length / 2);
      return vals.length % 2 === 0 ? (vals[mid - 1]! + vals[mid]!) / 2 : vals[mid]!;
    });
  }
  first(): Series { return this._agg(s => { const d = s.dropna(); return d.size > 0 ? d.iloc(0) : NaN; }); }
  last(): Series { return this._agg(s => { const d = s.dropna(); return d.size > 0 ? d.iloc(d.size - 1) : NaN; }); }
  size(): Series {
    const keys: string[] = [], sizes: number[] = [];
    for (const [bucket, positions] of this._groups) {
      keys.push(new Date(bucket).toISOString());
      sizes.push(positions.length);
    }
    return new Series(sizes, { index: keys });
  }
  apply(fn: (s: Series) => unknown): Series { return this._agg(fn); }
  get ngroups(): number { return this._groups.size; }
}
