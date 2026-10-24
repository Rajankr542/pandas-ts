/**
 * Top-level pandas-ts functions: concat, merge, cut, qcut, get_dummies, etc.
 */

import { DataFrame } from './dataframe.js';
import { Series } from './series.js';
import { Interval, IntervalClosed } from './interval.js';
import { Timedelta } from './timedelta.js';
import { Timestamp } from './timestamp.js';
import { Period } from './period.js';

export { Timedelta, Timestamp };

export function concat(dfs: DataFrame[], options: { axis?: 0 | 1; ignore_index?: boolean } = {}): DataFrame {
  return DataFrame.concat(dfs, options);
}

export function merge(
  left: DataFrame,
  right: DataFrame,
  options: {
    how?: 'inner' | 'left' | 'right' | 'outer';
    on?: string | string[];
    left_on?: string | string[];
    right_on?: string | string[];
  } = {}
): DataFrame {
  return left.merge(right, options);
}

/** pd.cut — bin values into discrete intervals */
export function cut(
  x: Series | number[],
  bins: number | number[],
  options: { labels?: string[]; right?: boolean; include_lowest?: boolean } = {}
): Series {
  const values = x instanceof Series ? Array.from({ length: x.size }, (_, i) => Number(x.iloc(i))) : x;
  const right = options.right ?? true;

  let edges: number[];
  if (typeof bins === 'number') {
    const filtered = values.filter(v => !isNaN(v));
    const mn = Math.min(...filtered);
    const mx = Math.max(...filtered);
    const step = (mx - mn) / bins;
    edges = Array.from({ length: bins + 1 }, (_, i) => mn + i * step);
  } else {
    edges = [...bins].sort((a, b) => a - b);
  }

  const result: string[] = values.map((v, _i) => {
    if (isNaN(v)) return 'NaN';
    for (let k = 0; k < edges.length - 1; k++) {
      const lo = edges[k]!;
      const hi = edges[k + 1]!;
      const inBin = right
        ? (v > lo || (k === 0 && options.include_lowest !== false && v === lo)) && v <= hi
        : v >= lo && (v < hi || k === edges.length - 2);
      if (inBin) return options.labels ? (options.labels[k] ?? `bin_${k}`) : `(${lo}, ${hi}]`;
    }
    return 'NaN';
  });

  const idx = x instanceof Series ? x.index : Array.from({ length: values.length }, (_, i) => i);
  return new Series(result, { index: idx });
}

/** pd.qcut — bin values into quantile-based intervals */
export function qcut(x: Series | number[], q: number | number[], options: { labels?: string[] } = {}): Series {
  const values = x instanceof Series ? Array.from({ length: x.size }, (_, i) => Number(x.iloc(i))) : x;
  const sorted = [...values].filter(v => !isNaN(v)).sort((a, b) => a - b);
  const n = sorted.length;

  const quantiles: number[] = typeof q === 'number'
    ? Array.from({ length: q + 1 }, (_, i) => i / q)
    : q;

  const edges = quantiles.map(p => {
    const idx = p * (n - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? sorted[lo]! : sorted[lo]! * (hi - idx) + sorted[hi]! * (idx - lo);
  });

  return cut(x, edges, { labels: options.labels, right: true, include_lowest: true });
}

/** pd.get_dummies — one-hot encode a Series */
export function get_dummies(s: Series, options: { prefix?: string; drop_first?: boolean } = {}): DataFrame {
  const prefix = options.prefix ? `${options.prefix}_` : '';
  const cats = s.unique()
    .filter(v => v !== null && v !== undefined && !(typeof v === 'number' && isNaN(v as number)))
    .map(String);
  const cols: string[] = options.drop_first ? cats.slice(1) : cats;
  const data: Record<string, number[]> = {};
  for (const cat of cols) {
    data[`${prefix}${cat}`] = Array.from({ length: s.size }, (_, i) => String(s.iloc(i)) === cat ? 1 : 0);
  }
  return new DataFrame(data, { index: s.index });
}

/** pd.date_range — generate a range of dates */
export function date_range(
  start: string | Date,
  options: { periods?: number; end?: string | Date; freq?: string }
): Series {
  const startDate = start instanceof Date ? start : new Date(start);
  const freq = options.freq ?? 'D';
  const freqMs: Record<string, number> = {
    'D': 86400000, 'H': 3600000, 'T': 60000, 'min': 60000, 'S': 1000, 'W': 604800000,
  };
  const stepMs = freqMs[freq] ?? 86400000;

  const dates: Date[] = [];
  if (options.periods) {
    for (let i = 0; i < options.periods; i++) {
      dates.push(new Date(startDate.getTime() + i * stepMs));
    }
  } else if (options.end) {
    const endDate = options.end instanceof Date ? options.end : new Date(options.end);
    let t = startDate.getTime();
    while (t <= endDate.getTime()) {
      dates.push(new Date(t));
      t += stepMs;
    }
  }

  return new Series(dates);
}

/** pd.to_datetime — convert to datetime Series */
export function to_datetime(values: (string | number | Date)[] | Series): Series {
  const arr = values instanceof Series
    ? Array.from({ length: values.size }, (_, i) => values.iloc(i))
    : values;
  return new Series(arr.map(v => {
    if (v instanceof Date) return v;
    if (typeof v === 'string' || typeof v === 'number') return new Date(v as string | number);
    return null;
  }), { index: values instanceof Series ? values.index : undefined });
}

/** pd.isna / pd.isnull */
export function isna(value: unknown): boolean | Series {
  if (value instanceof Series) return value.isna();
  return value === null || value === undefined || (typeof value === 'number' && isNaN(value));
}

/** pd.notna / pd.notnull */
export function notna(value: unknown): boolean | Series {
  if (value instanceof Series) return value.notna();
  const r = isna(value);
  if (typeof r === 'boolean') return !r;
  return r;
}

/** pd.timedelta_range — generate a range of Timedeltas */
export function timedelta_range(
  start: string | number,
  options: { periods?: number; end?: string | number; freq?: string } = {}
): Series {
  const freqMap: Record<string, number> = { 'D': 86_400_000, 'H': 3_600_000, 'T': 60_000, 'min': 60_000, 'S': 1000 };
  const stepMs = freqMap[options.freq ?? 'D'] ?? 86_400_000;
  const startMs = typeof start === 'number' ? start : new Timedelta(start as string).milliseconds;

  const tds: Timedelta[] = [];
  if (options.periods) {
    for (let i = 0; i < options.periods; i++) {
      tds.push(Timedelta.from_ms(startMs + i * stepMs));
    }
  }
  return new Series(tds);
}

// ── pd.to_numeric ────────────────────────────────────────────────────────────
export function to_numeric(values: unknown[] | Series, options: { errors?: 'raise' | 'coerce' | 'ignore' } = {}): Series {
  const arr = values instanceof Series
    ? Array.from({ length: (values as any).size }, (_, i) => (values as any).iloc(i))
    : (values as unknown[]);
  const result = arr.map(v => {
    if (v === null || v === undefined) return NaN;
    const n = Number(v);
    if (isNaN(n)) {
      if (options.errors === 'raise') throw new Error(`Unable to parse string "${v}"`);
      if (options.errors === 'coerce') return NaN;
      return v;
    }
    return n;
  });
  return new Series(result);
}

// ── pd.to_timedelta ──────────────────────────────────────────────────────────
export function to_timedelta(values: unknown[] | Series, unit: string = 'ns'): Series {
  const arr = values instanceof Series
    ? Array.from({ length: (values as any).size }, (_, i) => (values as any).iloc(i))
    : (values as unknown[]);
  const result = arr.map(v => {
    if (typeof v === 'string') return new Timedelta(v);
    if (typeof v === 'number') return new Timedelta(v, unit as any);
    return v;
  });
  return new Series(result);
}

// ── pd.unique ────────────────────────────────────────────────────────────────
export function unique(values: unknown[] | Series): unknown[] {
  const arr = values instanceof Series
    ? Array.from({ length: (values as any).size }, (_, i) => (values as any).iloc(i))
    : (values as unknown[]);
  return [...new Set(arr)];
}

// ── pd.value_counts ──────────────────────────────────────────────────────────
export function value_counts(
  values: unknown[] | Series,
  options: { normalize?: boolean; sort?: boolean; ascending?: boolean } = {}
): Series {
  const arr = values instanceof Series
    ? Array.from({ length: (values as any).size }, (_, i) => (values as any).iloc(i))
    : (values as unknown[]);
  const counts = new Map<unknown, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let entries = [...counts.entries()];
  const sort = options.sort !== false;
  if (sort) entries.sort(([, a], [, b]) => options.ascending ? a - b : b - a);
  const n = arr.length;
  const vals = entries.map(([, c]) => options.normalize ? c / n : c);
  const idx = entries.map(([k]) => k as string | number);
  return new Series(vals, { index: idx });
}

// ── pd.crosstab ──────────────────────────────────────────────────────────────
export function crosstab(
  index: Series | unknown[],
  columns: Series | unknown[],
  options: {
    values?: Series;
    aggfunc?: string;
    normalize?: boolean | 'index' | 'columns' | 'all';
    margins?: boolean;
    margins_name?: string;
  } = {}
): DataFrame {
  const rowArr = index instanceof Series
    ? Array.from({ length: (index as any).size }, (_, i) => (index as any).iloc(i))
    : (index as unknown[]);
  const colArr = columns instanceof Series
    ? Array.from({ length: (columns as any).size }, (_, i) => (columns as any).iloc(i))
    : (columns as unknown[]);
  const rowCats = [...new Set(rowArr)].map(String).sort();
  const colCats = [...new Set(colArr)].map(String).sort();
  const counts: Record<string, Record<string, number>> = {};
  for (const r of rowCats) { counts[r] = {}; for (const c of colCats) counts[r]![c] = 0; }
  for (let i = 0; i < rowArr.length; i++) {
    const r = String(rowArr[i]), c = String(colArr[i]);
    if (counts[r] && counts[r]![c] !== undefined) counts[r]![c]!++;
  }
  const data: Record<string, unknown[]> = {};
  for (const c of colCats) data[c] = rowCats.map(r => counts[r]![c] ?? 0);
  if (options.margins) {
    const marginName = options.margins_name ?? 'All';
    for (const c of colCats) data[c]!.push(data[c]!.reduce((s: number, v) => s + Number(v), 0));
    data[marginName] = rowCats.map(r => colCats.reduce((s: number, c) => s + Number(counts[r]![c] ?? 0), 0));
    data[marginName]!.push(rowArr.length);
    return new DataFrame(data, { index: [...rowCats, marginName] });
  }
  return new DataFrame(data, { index: rowCats });
}

// ── pd.factorize ─────────────────────────────────────────────────────────────
export function factorize(
  values: unknown[] | Series,
  options: { sort?: boolean; na_sentinel?: number } = {}
): [number[], unknown[]] {
  const arr = values instanceof Series
    ? Array.from({ length: (values as any).size }, (_, i) => (values as any).iloc(i))
    : (values as unknown[]);
  const uniques: unknown[] = [];
  const codes: number[] = [];
  const naS = options.na_sentinel ?? -1;
  for (const v of arr) {
    if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) {
      codes.push(naS);
      continue;
    }
    let idx = uniques.indexOf(v);
    if (idx === -1) { idx = uniques.length; uniques.push(v); }
    codes.push(idx);
  }
  if (options.sort) {
    const sorted = [...uniques].sort((a, b) => String(a) < String(b) ? -1 : 1);
    const remap = new Map(sorted.map((v, i) => [uniques.indexOf(v), i]));
    return [codes.map(c => c === naS ? naS : remap.get(c)!), sorted];
  }
  return [codes, uniques];
}

// ── pd.wide_to_long ──────────────────────────────────────────────────────────
export function wide_to_long(df: DataFrame, stubnames: string[], i: string | string[], j: string): DataFrame {
  const idCols = Array.isArray(i) ? i : [i];
  const rows: Record<string, unknown>[] = [];
  const suffixSet = new Set<string>();
  for (const stub of stubnames) {
    for (const col of (df as any)._columnOrder as string[]) {
      if (col.startsWith(stub) && col !== stub) suffixSet.add(col.slice(stub.length));
    }
  }
  const suffixes = [...suffixSet].sort();
  for (let ri = 0; ri < (df as any)._index.length; ri++) {
    for (const suffix of suffixes) {
      const row: Record<string, unknown> = {};
      for (const id of idCols) row[id] = (df as any)._columns.get(id)?._getAt(ri);
      row[j] = isNaN(Number(suffix)) ? suffix : Number(suffix);
      for (const stub of stubnames) {
        const colName = stub + suffix;
        row[stub] = (df as any)._columns.get(colName)?._getAt(ri) ?? NaN;
      }
      rows.push(row);
    }
  }
  return new DataFrame(rows);
}

// ── pd.lreshape ──────────────────────────────────────────────────────────────
export function lreshape(
  df: DataFrame,
  groups: Record<string, string[]>,
  options: { dropna?: boolean } = {}
): DataFrame {
  const groupKeys = Object.keys(groups);
  const maxLen = Math.max(...Object.values(groups).map(a => a.length));
  const idCols = ((df as any)._columnOrder as string[]).filter(
    (c: string) => !Object.values(groups).flat().includes(c)
  );
  const rows: Record<string, unknown>[] = [];
  for (let ri = 0; ri < (df as any)._index.length; ri++) {
    for (let k = 0; k < maxLen; k++) {
      const row: Record<string, unknown> = {};
      for (const id of idCols) row[id] = (df as any)._columns.get(id)?._getAt(ri);
      let hasNull = false;
      for (const gk of groupKeys) {
        const colName = groups[gk]![k];
        const val = colName ? ((df as any)._columns.get(colName)?._getAt(ri) ?? NaN) : NaN;
        if (
          (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) &&
          options.dropna !== false
        ) hasNull = true;
        row[gk] = val;
      }
      if (!hasNull) rows.push(row);
    }
  }
  return new DataFrame(rows);
}

// ── pd.json_normalize ────────────────────────────────────────────────────────
export function json_normalize(
  data: Record<string, unknown> | Record<string, unknown>[],
  options: { record_path?: string | string[]; meta?: string[]; sep?: string } = {}
): DataFrame {
  const sep = options.sep ?? '.';
  const arr = Array.isArray(data) ? data : [data];
  const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? prefix + sep + k : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(result, flatten(v as Record<string, unknown>, key));
      } else {
        result[key] = v;
      }
    }
    return result;
  };
  const flattened = arr.map(r => flatten(r));
  return new DataFrame(flattened);
}

// ── pd.interval_range ────────────────────────────────────────────────────────
export function interval_range(options: {
  start?: number;
  end?: number;
  periods?: number;
  freq?: number;
  closed?: IntervalClosed;
} = {}): Series {
  const closed = options.closed ?? 'right';
  const intervals: unknown[] = [];
  if (options.start !== undefined && options.end !== undefined) {
    const freq = options.freq ?? 1;
    for (let v = options.start; v < options.end; v += freq) {
      intervals.push(new Interval(v, v + freq, closed));
    }
  } else if (options.start !== undefined && options.periods !== undefined) {
    const freq = options.freq ?? 1;
    for (let k = 0; k < options.periods; k++) {
      intervals.push(new Interval(options.start + k * freq, options.start + (k + 1) * freq, closed));
    }
  }
  return new Series(intervals);
}

// ── pd.period_range ──────────────────────────────────────────────────────────
export function period_range(
  start: string,
  options: { periods?: number; end?: string; freq?: string } = {}
): Series {
  const freq = (options.freq ?? 'D') as any;
  const periods: unknown[] = [];
  let current = new Period(start, freq);
  const n = options.periods ?? 10;
  for (let i = 0; i < n; i++) {
    periods.push(current);
    current = current.add(1);
  }
  return new Series(periods);
}

// ── pd.bdate_range ───────────────────────────────────────────────────────────
export function bdate_range(
  start: string,
  options: { periods?: number; end?: string; freq?: string } = {}
): Series {
  const result: Date[] = [];
  const current = new Date(start);
  const target = options.periods ?? 5;
  while (result.length < target) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) result.push(new Date(current));
    current.setDate(current.getDate() + 1);
    if (options.end && current > new Date(options.end)) break;
  }
  return new Series(result);
}

// ── pd.from_dummies ──────────────────────────────────────────────────────────
export function from_dummies(
  df: DataFrame,
  options: { sep?: string; default_category?: Record<string, string> } = {}
): DataFrame {
  const sep = options.sep ?? '_';
  const groups: Record<string, string[]> = {};
  for (const col of (df as any)._columnOrder as string[]) {
    const idx = col.indexOf(sep);
    if (idx === -1) continue;
    const prefix = col.slice(0, idx);
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix]!.push(col);
  }
  const data: Record<string, unknown[]> = {};
  for (const [prefix, cols] of Object.entries(groups)) {
    data[prefix] = Array.from({ length: (df as any)._index.length }, (_, ri) => {
      for (const col of cols) {
        if (Number((df as any)._columns.get(col)?._getAt(ri)) === 1) {
          return col.slice(prefix.length + sep.length);
        }
      }
      return options.default_category?.[prefix] ?? NaN;
    });
  }
  return new DataFrame(data, { index: (df as any)._index });
}

// ── pd.merge_ordered ─────────────────────────────────────────────────────────
export function merge_ordered(
  left: DataFrame,
  right: DataFrame,
  options: {
    on?: string | string[];
    how?: 'left' | 'right' | 'inner' | 'outer';
    fill_method?: 'ffill' | null;
  } = {}
): DataFrame {
  const merged = merge(left, right, { on: options.on, how: options.how ?? 'outer' });
  if (options.fill_method === 'ffill') return (merged as any).ffill();
  return merged;
}

// ── pd.merge_asof ─────────────────────────────────────────────────────────────
export function merge_asof(
  left: DataFrame,
  right: DataFrame,
  options: {
    on?: string;
    left_on?: string;
    right_on?: string;
    by?: string | string[];
    direction?: 'backward' | 'forward' | 'nearest';
  } = {}
): DataFrame {
  const lKey = options.on ?? options.left_on ?? '';
  const rKey = options.on ?? options.right_on ?? lKey;
  const direction = options.direction ?? 'backward';
  const result: Record<string, unknown[]> = {};
  for (const col of (left as any)._columnOrder as string[]) result[col] = [];
  for (const col of (right as any)._columnOrder as string[]) {
    if (!(left as any)._columnOrder.includes(col)) result[col] = [];
  }
  for (let li = 0; li < (left as any)._index.length; li++) {
    const lval = Number((left as any)._columns.get(lKey)?._getAt(li));
    let best: number | null = null;
    let bestDiff = Infinity;
    for (let ri = 0; ri < (right as any)._index.length; ri++) {
      const rval = Number((right as any)._columns.get(rKey)?._getAt(ri));
      const diff = direction === 'backward'
        ? lval - rval
        : direction === 'forward'
        ? rval - lval
        : Math.abs(lval - rval);
      if (diff >= 0 && diff < bestDiff) { bestDiff = diff; best = ri; }
    }
    for (const col of (left as any)._columnOrder as string[]) {
      (result[col] as unknown[]).push((left as any)._columns.get(col)._getAt(li));
    }
    for (const col of (right as any)._columnOrder as string[]) {
      if (!(left as any)._columnOrder.includes(col)) {
        (result[col] as unknown[]).push(best !== null ? (right as any)._columns.get(col)._getAt(best) : NaN);
      }
    }
  }
  return new DataFrame(result);
}
