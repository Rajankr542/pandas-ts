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
}
