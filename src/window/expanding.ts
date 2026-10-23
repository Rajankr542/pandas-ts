/**
 * Expanding window calculations.
 */
import { Series } from '../series.js';
import { DataFrame } from '../dataframe.js';
import { float64 } from '../dtype.js';
import { isMissing } from '../na.js';

export interface ExpandingOptions {
  min_periods?: number;
}

export class Expanding {
  private _obj: Series | DataFrame;
  private _minPeriods: number;

  constructor(obj: Series | DataFrame, options: ExpandingOptions = {}) {
    this._obj = obj;
    this._minPeriods = options.min_periods ?? 1;
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

  apply(fn: (vals: number[]) => number): Series | DataFrame {
    return this._apply(fn);
  }

  private _apply(fn: (vals: number[]) => number): Series | DataFrame {
    if (this._obj instanceof Series) {
      return this._applySeries(this._obj, fn);
    }
    const df = this._obj as DataFrame;
    const result: Record<string, number[]> = {};
    for (const col of df.columns) {
      const res = this._applySeries(df.col(col), fn);
      result[col] = Array.from({ length: res.size }, (_, i) => Number(res.iloc(i)));
    }
    return new DataFrame(result, { index: df.index });
  }

  private _applySeries(series: Series, fn: (vals: number[]) => number): Series {
    const n = series.size;
    const result = new Float64Array(n);
    const acc: number[] = [];

    for (let i = 0; i < n; i++) {
      const v = series.iloc(i);
      if (!isMissing(v)) acc.push(Number(v));
      result[i] = acc.length >= this._minPeriods ? fn([...acc]) : NaN;
    }
    return new Series(result, { dtype: float64, index: series.index });
  }
}
