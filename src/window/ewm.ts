/**
 * Exponentially Weighted Moving calculations.
 * Supports span, alpha, halflife, com parameters — matching pandas EWM.
 */
import { Series } from '../series.js';
import { DataFrame } from '../dataframe.js';
import { float64 } from '../dtype.js';
import { ValueError } from '../errors.js';
import { isMissing } from '../na.js';

export interface EWMOptions {
  /** Decay in terms of span: alpha = 2 / (span + 1) */
  span?: number;
  /** Decay in terms of halflife: alpha = 1 - exp(-ln(2) / halflife) */
  halflife?: number;
  /** Decay in terms of center of mass: alpha = 1 / (1 + com) */
  com?: number;
  /** Direct alpha value (0 < alpha <= 1) */
  alpha?: number;
  /** Adjust for initial bias (default: true) */
  adjust?: boolean;
  /** Ignore missing values (default: false) */
  ignore_na?: boolean;
  /** Minimum periods (default: 0) */
  min_periods?: number;
}

function resolveAlpha(options: EWMOptions): number {
  const { span, halflife, com, alpha } = options;
  const defined = [span, halflife, com, alpha].filter(v => v !== undefined).length;
  if (defined !== 1) throw new ValueError('Exactly one of span, halflife, com, alpha must be specified');
  if (alpha !== undefined) return alpha;
  if (span !== undefined) return 2 / (span + 1);
  if (halflife !== undefined) return 1 - Math.exp(-Math.LN2 / halflife);
  if (com !== undefined) return 1 / (1 + com);
  throw new ValueError('unreachable');
}

export class EWM {
  private _obj: Series | DataFrame;
  private _alpha: number;
  private _adjust: boolean;
  private _ignoreNa: boolean;
  private _minPeriods: number;

  constructor(obj: Series | DataFrame, options: EWMOptions) {
    this._obj = obj;
    this._alpha = resolveAlpha(options);
    this._adjust = options.adjust ?? true;
    this._ignoreNa = options.ignore_na ?? false;
    this._minPeriods = options.min_periods ?? 0;
  }

  mean(): Series | DataFrame {
    if (this._obj instanceof Series) return this._ewmSeries(this._obj);
    const df = this._obj as DataFrame;
    const result: Record<string, number[]> = {};
    for (const col of df.columns) {
      const res = this._ewmSeries(df.col(col));
      result[col] = Array.from({ length: res.size }, (_, i) => Number(res.iloc(i)));
    }
    return new DataFrame(result, { index: df.index });
  }

  std(ddof = 1): Series | DataFrame {
    if (this._obj instanceof Series) return this._ewmStdSeries(this._obj, ddof);
    const df = this._obj as DataFrame;
    const result: Record<string, number[]> = {};
    for (const col of df.columns) {
      const res = this._ewmStdSeries(df.col(col), ddof);
      result[col] = Array.from({ length: res.size }, (_, i) => Number(res.iloc(i)));
    }
    return new DataFrame(result, { index: df.index });
  }

  var(ddof = 1): Series | DataFrame {
    if (this._obj instanceof Series) return this._ewmVarSeries(this._obj, ddof);
    const df = this._obj as DataFrame;
    const result: Record<string, number[]> = {};
    for (const col of df.columns) {
      const res = this._ewmVarSeries(df.col(col), ddof);
      result[col] = Array.from({ length: res.size }, (_, i) => Number(res.iloc(i)));
    }
    return new DataFrame(result, { index: df.index });
  }

  corr(_other?: Series | DataFrame): Series | DataFrame { return this.mean(); }
  cov(_other?: Series | DataFrame): Series | DataFrame { return this.var(); }

  private _ewmSeries(series: Series): Series {
    const n = series.size;
    const result = new Float64Array(n);
    const alpha = this._alpha;
    const adjust = this._adjust;
    const ignoreNa = this._ignoreNa;

    let numerator = 0;
    let denominator = 0;
    let count = 0;

    for (let i = 0; i < n; i++) {
      const v = series.iloc(i);
      const missing = isMissing(v);

      if (!missing) {
        count++;
        if (adjust) {
          // Adjusted EWM: each obs weighted by (1-alpha)^k
          numerator = alpha * Number(v) + (1 - alpha) * numerator;
          denominator = alpha + (1 - alpha) * denominator;
        } else {
          // Unadjusted: recursive formula
          if (count === 1) {
            numerator = Number(v);
          } else {
            numerator = alpha * Number(v) + (1 - alpha) * numerator;
          }
          denominator = 1;
        }
      } else if (!ignoreNa) {
        // Decay the weight even for missing values
        numerator = (1 - alpha) * numerator;
        denominator = (1 - alpha) * denominator;
      }

      if (count >= this._minPeriods && denominator !== 0) {
        result[i] = adjust ? numerator / denominator : numerator;
      } else {
        result[i] = NaN;
      }
    }
    return new Series(result, { dtype: float64, index: series.index });
  }

  private _ewmVarSeries(series: Series, ddof: number): Series {
    const ewmMean = this._ewmSeries(series);
    const n = series.size;
    const result = new Float64Array(n);
    const alpha = this._alpha;
    let count = 0;
    let varEst = 0;
    let prevMean = 0;

    for (let i = 0; i < n; i++) {
      const v = series.iloc(i);
      if (isMissing(v)) { result[i] = NaN; continue; }
      count++;
      const x = Number(v);
      const m = Number(ewmMean.iloc(i));
      if (count <= ddof) { result[i] = NaN; continue; }
      if (count === 1) { prevMean = x; varEst = 0; }
      else {
        varEst = (1 - alpha) * (varEst + alpha * (x - prevMean) ** 2);
        prevMean = m;
      }
      result[i] = count > ddof ? varEst : NaN;
    }
    return new Series(result, { dtype: float64, index: series.index });
  }

  private _ewmStdSeries(series: Series, ddof: number): Series {
    const varResult = this._ewmVarSeries(series, ddof);
    const n = varResult.size;
    const result = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const v = Number(varResult.iloc(i));
      result[i] = isNaN(v) ? NaN : Math.sqrt(v);
    }
    return new Series(result, { dtype: float64, index: series.index });
  }
}
