/**
 * DatetimeAccessor — mirrors pandas Series.dt accessor.
 * Handles datetime64[ns] series (stored as millisecond timestamps or as Date objects).
 */
import { Series } from '../series.js';
import { float64, bool_ } from '../dtype.js';
import { isMissing, NA } from '../na.js';

export class DatetimeAccessor {
  private _series: Series;

  constructor(series: Series) {
    this._series = series;
  }

  private _getDate(i: number): Date | null {
    const v = (this._series as any)._getAt(i);
    if (isMissing(v)) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') return new Date(v);
    return null;
  }

  private _mapInt(fn: (d: Date) => number): Series {
    const result = new Float64Array(this._series.size);
    for (let i = 0; i < this._series.size; i++) {
      const d = this._getDate(i);
      result[i] = d ? fn(d) : NaN;
    }
    return new Series(result, { dtype: float64, index: this._series.index });
  }

  private _mapBool(fn: (d: Date) => boolean): Series {
    const result = new Uint8Array(this._series.size);
    for (let i = 0; i < this._series.size; i++) {
      const d = this._getDate(i);
      result[i] = d ? (fn(d) ? 1 : 0) : 0;
    }
    return new Series(result, { dtype: bool_, index: this._series.index });
  }

  private _mapStr(fn: (d: Date) => string): Series {
    const vals: string[] = [];
    for (let i = 0; i < this._series.size; i++) {
      const d = this._getDate(i);
      vals.push(d ? fn(d) : '');
    }
    return new Series(vals, { index: this._series.index });
  }

  // ── Date components ───────────────────────────────────────────────────────────
  get year(): Series { return this._mapInt(d => d.getFullYear()); }
  get month(): Series { return this._mapInt(d => d.getMonth() + 1); }
  get day(): Series { return this._mapInt(d => d.getDate()); }
  get hour(): Series { return this._mapInt(d => d.getHours()); }
  get minute(): Series { return this._mapInt(d => d.getMinutes()); }
  get second(): Series { return this._mapInt(d => d.getSeconds()); }
  get microsecond(): Series { return this._mapInt(d => d.getMilliseconds() * 1000); }
  get millisecond(): Series { return this._mapInt(d => d.getMilliseconds()); }
  get nanosecond(): Series { return this._mapInt(_ => 0); }

  // ── Day of week/year ──────────────────────────────────────────────────────────
  get dayofweek(): Series { return this._mapInt(d => d.getDay()); }
  get day_of_week(): Series { return this.dayofweek; }
  get weekday(): Series { return this.dayofweek; }
  get dayofyear(): Series {
    return this._mapInt(d => {
      const start = new Date(d.getFullYear(), 0, 0);
      return Math.floor((d.getTime() - start.getTime()) / 86400000);
    });
  }
  get day_of_year(): Series { return this.dayofyear; }

  // ── Week ──────────────────────────────────────────────────────────────────────
  get week(): Series {
    return new Series(
      Array.from({ length: this._series.size }, (_, i) => {
        const d = this._getDate(i);
        if (!d) return NaN;
        const tmp = new Date(d);
        tmp.setHours(0, 0, 0, 0);
        tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
        const yearStart = new Date(tmp.getFullYear(), 0, 1);
        return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      }),
      { dtype: float64, index: this._series.index }
    );
  }
  get weekofyear(): Series { return this.week; }

  isocalendar(): Series {
    return new Series(
      Array.from({ length: this._series.size }, (_, i) => {
        const d = this._getDate(i);
        if (!d) return NA;
        const tmp = new Date(d);
        tmp.setHours(0, 0, 0, 0);
        tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
        const yearStart = new Date(tmp.getFullYear(), 0, 1);
        const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return { year: tmp.getFullYear(), week, day: d.getDay() || 7 };
      }),
      { index: this._series.index }
    );
  }

  // ── Quarter ───────────────────────────────────────────────────────────────────
  get quarter(): Series { return this._mapInt(d => Math.floor(d.getMonth() / 3) + 1); }

  // ── Month/day names ───────────────────────────────────────────────────────────
  day_name(_locale?: string): Series {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return this._mapStr(d => names[d.getDay()] ?? '');
  }
  month_name(_locale?: string): Series {
    const names = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return this._mapStr(d => names[d.getMonth()] ?? '');
  }

  // ── Boolean properties ────────────────────────────────────────────────────────
  get is_month_start(): Series { return this._mapBool(d => d.getDate() === 1); }
  get is_month_end(): Series {
    return this._mapBool(d => {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return new Date(next.getTime() - 86400000).getDate() === d.getDate();
    });
  }
  get is_quarter_start(): Series { return this._mapBool(d => d.getDate() === 1 && d.getMonth() % 3 === 0); }
  get is_quarter_end(): Series {
    return this._mapBool(d => {
      const m = d.getMonth();
      if (m % 3 !== 2) return false;
      const next = new Date(d.getFullYear(), m + 1, 1);
      return new Date(next.getTime() - 86400000).getDate() === d.getDate();
    });
  }
  get is_year_start(): Series { return this._mapBool(d => d.getDate() === 1 && d.getMonth() === 0); }
  get is_year_end(): Series { return this._mapBool(d => d.getDate() === 31 && d.getMonth() === 11); }
  get is_leap_year(): Series {
    return this._mapBool(d => {
      const y = d.getFullYear();
      return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    });
  }
  get days_in_month(): Series {
    return this._mapInt(d => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
  }
  get daysinmonth(): Series { return this.days_in_month; }

  // ── Floor / ceil / round ──────────────────────────────────────────────────────
  floor(freq: string): Series { return this._snapFreq(freq, 'floor'); }
  ceil(freq: string): Series { return this._snapFreq(freq, 'ceil'); }
  round(freq: string): Series { return this._snapFreq(freq, 'round'); }

  private _snapFreq(freq: string, method: 'floor' | 'ceil' | 'round'): Series {
    const freqKey = freq.replace(/^\d+/, '');
    // For day-level frequencies, snap using local calendar components to avoid TZ offset issues
    if (freqKey === 'D' || freqKey === 'W') {
      const result: (Date | null)[] = [];
      for (let i = 0; i < this._series.size; i++) {
        const d = this._getDate(i);
        if (!d) { result.push(null); continue; }
        const floored = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (method === 'floor') {
          result.push(floored);
        } else if (method === 'ceil') {
          const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0 || d.getMilliseconds() !== 0;
          result.push(hasTime ? new Date(floored.getTime() + 86400000) : floored);
        } else {
          const ms2 = d.getTime() - floored.getTime();
          result.push(ms2 >= 43200000 ? new Date(floored.getTime() + 86400000) : floored);
        }
      }
      return new Series(result, { index: this._series.index });
    }
    const ms = this._freqToMs(freq);
    const result: (Date | null)[] = [];
    for (let i = 0; i < this._series.size; i++) {
      const d = this._getDate(i);
      if (!d) { result.push(null); continue; }
      const t = d.getTime();
      const snapped = method === 'floor' ? Math.floor(t / ms) * ms
        : method === 'ceil' ? Math.ceil(t / ms) * ms
        : Math.round(t / ms) * ms;
      result.push(new Date(snapped));
    }
    return new Series(result, { index: this._series.index });
  }

  private _freqToMs(freq: string): number {
    const map: Record<string, number> = {
      'S': 1000, 'T': 60000, 'min': 60000, 'H': 3600000,
      'D': 86400000, 'W': 604800000,
    };
    const m = freq.match(/^(\d+)?([A-Za-z]+)$/);
    if (!m) return 1000;
    const multiplier = parseInt(m[1] ?? '1');
    const unit = m[2] ?? 'S';
    return multiplier * (map[unit] ?? 1000);
  }

  // ── Normalize (set time to midnight) ─────────────────────────────────────────
  normalize(): Series {
    const result: (Date | null)[] = [];
    for (let i = 0; i < this._series.size; i++) {
      const d = this._getDate(i);
      if (!d) { result.push(null); continue; }
      result.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return new Series(result, { index: this._series.index });
  }

  // ── Date / time components ────────────────────────────────────────────────────
  get date(): Series {
    const result: (Date | null)[] = [];
    for (let i = 0; i < this._series.size; i++) {
      const d = this._getDate(i);
      result.push(d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null);
    }
    return new Series(result, { index: this._series.index });
  }

  get time(): Series {
    return this._mapStr(d =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
    );
  }

  // ── Timezone ──────────────────────────────────────────────────────────────────
  get tz(): Series { return new Series(new Array(this._series.size).fill(null), { index: this._series.index }); }
  tz_localize(_tz: string): Series { return this._series; }
  tz_convert(_tz: string): Series { return this._series; }

  // ── to_period ─────────────────────────────────────────────────────────────────
  to_period(freq = 'D'): Series {
    return this._mapStr(d => {
      if (freq === 'D') return d.toISOString().slice(0, 10);
      if (freq === 'M') return d.toISOString().slice(0, 7);
      if (freq === 'Y' || freq === 'A') return String(d.getFullYear());
      return d.toISOString().slice(0, 10);
    });
  }

  // ── total_seconds (for timedelta-like) ───────────────────────────────────────
  total_seconds(): Series {
    return this._mapInt(d => d.getTime() / 1000);
  }

  // ── strftime ──────────────────────────────────────────────────────────────────
  strftime(format: string): Series {
    return this._mapStr(d => {
      const dayOfYear = (): string => {
        const start = new Date(d.getFullYear(), 0, 0);
        return String(Math.floor((d.getTime() - start.getTime()) / 86400000)).padStart(3, '0');
      };
      return format
        .replace('%Y', String(d.getFullYear()))
        .replace('%m', String(d.getMonth() + 1).padStart(2, '0'))
        .replace('%d', String(d.getDate()).padStart(2, '0'))
        .replace('%H', String(d.getHours()).padStart(2, '0'))
        .replace('%M', String(d.getMinutes()).padStart(2, '0'))
        .replace('%S', String(d.getSeconds()).padStart(2, '0'))
        .replace('%j', dayOfYear());
    });
  }

  // ── days (timedelta accessor) ─────────────────────────────────────────────────
  get days(): Series { return this._mapInt(d => Math.floor(d.getTime() / 86400000)); }
  get seconds(): Series { return this._mapInt(d => Math.floor((d.getTime() % 86400000) / 1000)); }
  get microseconds(): Series { return this._mapInt(d => (d.getTime() % 1000) * 1000); }
}
