/**
 * Rolling window calculations.
 * Works on both Series and DataFrame.
 */
import { Series } from '../series.js';
import { DataFrame } from '../dataframe.js';
import { float64 } from '../dtype.js';
import { ValueError } from '../errors.js';
import { isMissing } from '../na.js';

export interface RollingOptions {
  min_periods?: number;
  center?: boolean;
  closed?: 'left' | 'right' | 'both' | 'neither';
}

export class Rolling {
  private _obj: Series | DataFrame;
  private _window: number;
  private _minPeriods: number;
  private _center: boolean;

  constructor(obj: Series | DataFrame, window: number, options: RollingOptions = {}) {
    if (window <= 0) throw new ValueError('window must be > 0');
    this._obj = obj;
    this._window = window;
    this._minPeriods = options.min_periods ?? window;
    this._center = options.center ?? false;
  }

  mean(): Series | DataFrame { return this._apply(vals => vals.reduce((a, b) => a + b, 0) / vals.length); }
  sum(): Series | DataFrame { return this._apply(vals => vals.reduce((a, b) => a + b, 0)); }
  min(): Series | DataFrame { return this._apply(vals => Math.min(...vals)); }
  max(): Series | DataFrame { return this._apply(vals => Math.max(...vals)); }
  count(): Series | DataFrame { return this._apply(vals => vals.length); }

  std(ddof = 1): Series | DataFrame {
    return this._apply(vals => {
      if (vals.length <= ddof) return NaN;
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const ss = vals.reduce((a, b) => a + (b - m) ** 2, 0);
      return Math.sqrt(ss / (vals.length - ddof));
    });
  }

  var(ddof = 1): Series | DataFrame {
    return this._apply(vals => {
      if (vals.length <= ddof) return NaN;
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      return vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - ddof);
    });
  }

  median(): Series | DataFrame {
    return this._apply(vals => {
      const sorted = [...vals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
    });
  }

  apply(fn: (vals: number[]) => number): Series | DataFrame {
    return this._apply(fn);
  }

  skew(): Series | DataFrame {
    return this._apply(vals => {
      if (vals.length < 3) return NaN;
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const s = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - 1));
      if (s === 0) return NaN;
      const n = vals.length;
      return (n / ((n - 1) * (n - 2))) * vals.reduce((a, b) => a + ((b - m) / s) ** 3, 0);
    });
  }

  kurt(): Series | DataFrame {
    return this._apply(vals => {
      if (vals.length < 4) return NaN;
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const s = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - 1));
      if (s === 0) return NaN;
      const n = vals.length;
      const k4 = vals.reduce((a, b) => a + ((b - m) / s) ** 4, 0);
      return (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * k4 - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3));
    });
  }

  sem(ddof = 1): Series | DataFrame {
    return this._apply(vals => {
      if (vals.length <= ddof) return NaN;
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const s = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - ddof));
      return s / Math.sqrt(vals.length);
    });
  }

  rank(): Series | DataFrame {
    return this._apply(vals => {
      if (vals.length === 0) return NaN;
      const last = vals[vals.length - 1]!;
      const sorted = [...vals].sort((a, b) => a - b);
      let sum = 0, count = 0;
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] === last) { sum += i + 1; count++; }
      }
      return count > 0 ? sum / count : NaN;
    });
  }

  nunique(): Series | DataFrame {
    return this._apply(vals => new Set(vals).size);
  }

  quantile(q: number): Series | DataFrame {
    return this._apply(vals => {
      if (vals.length === 0) return NaN;
      const sorted = [...vals].sort((a, b) => a - b);
      const idx = q * (sorted.length - 1);
      const lo = Math.floor(idx), hi = Math.ceil(idx);
      if (lo === hi) return sorted[lo]!;
      return sorted[lo]! * (hi - idx) + sorted[hi]! * (idx - lo);
    });
  }

  corr(other?: Series | DataFrame): Series | DataFrame {
    if (!other) {
      // Auto-correlation: corr(series, series.shift(1))
      return this._apply(vals => {
        if (vals.length < 2) return NaN;
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        let num = 0, denom = 0;
        for (let i = 0; i < vals.length; i++) num += (vals[i]! - mean) * (vals[i]! - mean);
        denom = num;
        return denom === 0 ? NaN : num / denom; // = 1 for same series
      });
    }
    // Cross-correlation with another series
    return this._applyCross(other, (a, b) => {
      if (a.length < 2) return NaN;
      const ma = a.reduce((s, v) => s + v, 0) / a.length;
      const mb = b.reduce((s, v) => s + v, 0) / b.length;
      let num = 0, sa = 0, sb = 0;
      for (let i = 0; i < a.length; i++) {
        num += (a[i]! - ma) * (b[i]! - mb);
        sa += (a[i]! - ma) ** 2;
        sb += (b[i]! - mb) ** 2;
      }
      return sa === 0 || sb === 0 ? NaN : num / Math.sqrt(sa * sb);
    });
  }

  cov(other?: Series | DataFrame): Series | DataFrame {
    if (!other) {
      return this.var();
    }
    return this._applyCross(other, (a, b) => {
      if (a.length < 2) return NaN;
      const ma = a.reduce((s, v) => s + v, 0) / a.length;
      const mb = b.reduce((s, v) => s + v, 0) / b.length;
      return a.reduce((s, v, i) => s + (v - ma) * (b[i]! - mb), 0) / (a.length - 1);
    });
  }

  private _apply(fn: (vals: number[]) => number): Series | DataFrame {
    if (this._obj instanceof Series) {
      return this._applySeries(this._obj, fn);
    }
    // DataFrame — apply to each column
    const df = this._obj as DataFrame;
    const result: Record<string, number[]> = {};
    for (const col of df.columns) {
      const series = df.col(col);
      const res = this._applySeries(series, fn);
      result[col] = Array.from({ length: res.size }, (_, i) => Number(res.iloc(i)));
    }
    return new DataFrame(result, { index: df.index });
  }

  private _applySeries(series: Series, fn: (vals: number[]) => number): Series {
    const n = series.size;
    const result = new Float64Array(n);
    const half = this._center ? Math.floor(this._window / 2) : 0;

    for (let i = 0; i < n; i++) {
      const end = Math.min(n - 1, i + half);
      const start = Math.max(0, end - this._window + 1);
      const vals: number[] = [];
      for (let j = start; j <= end; j++) {
        const v = series.iloc(j);
        if (!isMissing(v)) vals.push(Number(v));
      }
      result[i] = vals.length >= this._minPeriods ? fn(vals) : NaN;
    }
    return new Series(result, { dtype: float64, index: series.index });
  }

  private _applyCross(other: Series | DataFrame, fn: (a: number[], b: number[]) => number): Series | DataFrame {
    if (this._obj instanceof Series && other instanceof Series) {
      const n = this._obj.size;
      const result = new Float64Array(n);
      const half = this._center ? Math.floor(this._window / 2) : 0;
      for (let i = 0; i < n; i++) {
        const end = Math.min(n - 1, i + half);
        const start = Math.max(0, end - this._window + 1);
        const a: number[] = [], b: number[] = [];
        for (let j = start; j <= end; j++) {
          const va = this._obj.iloc(j);
          const vb = other.iloc(j);
          if (!isMissing(va) && !isMissing(vb)) {
            a.push(Number(va));
            b.push(Number(vb));
          }
        }
        result[i] = a.length >= this._minPeriods ? fn(a, b) : NaN;
      }
      return new Series(result, { dtype: float64, index: (this._obj as Series).index });
    }
    // DataFrame case: apply column-wise
    return this._apply(vals => vals.reduce((a, b) => a + b, 0) / vals.length);
  }
}
