/**
 * Top-level pandas-ts functions: concat, merge, cut, qcut, get_dummies, etc.
 */

import { DataFrame } from './dataframe.js';
import { Series } from './series.js';
import { IntervalClosed } from './interval.js';
import { Timedelta } from './timedelta.js';
import { Timestamp } from './timestamp.js';

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
