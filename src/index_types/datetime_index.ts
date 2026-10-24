import { Index } from './index.js';
import { Series } from '../series.js';

export class DatetimeIndex extends Index {
  constructor(data: (Date | string | number)[], options: { name?: string; freq?: string } = {}) {
    const dates = data.map(v => {
      if (v instanceof Date) return v;
      return new Date(v as string | number);
    });
    super(dates, options);
  }

  override get dtype(): string { return 'datetime64[ns]'; }
  override get inferred_type(): string { return 'datetime64'; }

  private _mapInt(fn: (d: Date) => number): number[] {
    return this._data.map(v => {
      const d = v as Date;
      return d instanceof Date && !isNaN(d.getTime()) ? fn(d) : NaN;
    });
  }

  get year(): number[] { return this._mapInt(d => d.getFullYear()); }
  get month(): number[] { return this._mapInt(d => d.getMonth() + 1); }
  get day(): number[] { return this._mapInt(d => d.getDate()); }
  get hour(): number[] { return this._mapInt(d => d.getHours()); }
  get minute(): number[] { return this._mapInt(d => d.getMinutes()); }
  get second(): number[] { return this._mapInt(d => d.getSeconds()); }
  get dayofweek(): number[] { return this._mapInt(d => d.getDay()); }
  get dayofyear(): number[] {
    return this._mapInt(d => {
      const start = new Date(d.getFullYear(), 0, 0);
      return Math.floor((d.getTime() - start.getTime()) / 86400000);
    });
  }
  get quarter(): number[] { return this._mapInt(d => Math.floor(d.getMonth() / 3) + 1); }
  get is_month_start(): boolean[] { return (this._data as Date[]).map(d => d.getDate() === 1); }
  get is_month_end(): boolean[] {
    return (this._data as Date[]).map(d => {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return new Date(next.getTime() - 86400000).getDate() === d.getDate();
    });
  }

  normalize(): DatetimeIndex {
    return new DatetimeIndex(
      (this._data as Date[]).map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    );
  }

  floor(freq: string): DatetimeIndex {
    const ms = this._freqToMs(freq);
    return new DatetimeIndex(
      (this._data as Date[]).map(d => {
        if (freq === 'D') return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return new Date(Math.floor(d.getTime() / ms) * ms);
      })
    );
  }

  ceil(freq: string): DatetimeIndex {
    const ms = this._freqToMs(freq);
    return new DatetimeIndex(
      (this._data as Date[]).map(d => {
        if (freq === 'D') {
          const floored = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const hasTime = d.getTime() > floored.getTime();
          return hasTime ? new Date(floored.getTime() + 86400000) : floored;
        }
        return new Date(Math.ceil(d.getTime() / ms) * ms);
      })
    );
  }

  private _freqToMs(freq: string): number {
    const map: Record<string, number> = { 'S': 1000, 'T': 60000, 'min': 60000, 'H': 3600000, 'D': 86400000 };
    return map[freq] ?? 86400000;
  }

  strftime(format: string): string[] {
    return (this._data as Date[]).map(d =>
      format
        .replace('%Y', String(d.getFullYear()))
        .replace('%m', String(d.getMonth() + 1).padStart(2, '0'))
        .replace('%d', String(d.getDate()).padStart(2, '0'))
        .replace('%H', String(d.getHours()).padStart(2, '0'))
        .replace('%M', String(d.getMinutes()).padStart(2, '0'))
        .replace('%S', String(d.getSeconds()).padStart(2, '0'))
    );
  }

  to_series(): Series {
    return new Series(this._data as Date[]);
  }

  to_pydatetime(): Date[] { return this._data as Date[]; }
  to_list(): Date[] { return this._data as Date[]; }
}
