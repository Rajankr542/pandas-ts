/**
 * Timestamp — a moment in time. Mirrors pandas.Timestamp.
 */
import { ValueError } from './errors.js';

export class Timestamp {
  private _date: Date;

  constructor(
    value: string | number | Date | Timestamp,
    options: { unit?: 'ns' | 'us' | 'ms' | 's' | 'D' } = {}
  ) {
    if (value instanceof Timestamp) {
      this._date = new Date((value as Timestamp)._date);
    } else if (value instanceof Date) {
      this._date = new Date(value);
    } else if (typeof value === 'number') {
      const unit = options.unit ?? 'ms';
      const ms = unit === 'ns' ? value / 1e6
        : unit === 'us' ? value / 1000
        : unit === 'ms' ? value
        : unit === 's' ? value * 1000
        : value * 86_400_000;
      this._date = new Date(ms);
    } else {
      this._date = new Date(value as string);
      if (isNaN(this._date.getTime())) throw new ValueError(`Cannot parse timestamp: ${value}`);
    }
  }

  get year(): number { return this._date.getFullYear(); }
  get month(): number { return this._date.getMonth() + 1; }
  get day(): number { return this._date.getDate(); }
  get hour(): number { return this._date.getHours(); }
  get minute(): number { return this._date.getMinutes(); }
  get second(): number { return this._date.getSeconds(); }
  get microsecond(): number { return this._date.getMilliseconds() * 1000; }
  get millisecond(): number { return this._date.getMilliseconds(); }
  get nanosecond(): number { return 0; }
  get dayofweek(): number { return this._date.getDay(); }
  get dayofyear(): number {
    const start = new Date(this._date.getFullYear(), 0, 0);
    return Math.floor((this._date.getTime() - start.getTime()) / 86_400_000);
  }
  get quarter(): number { return Math.floor(this._date.getMonth() / 3) + 1; }
  get is_month_start(): boolean { return this._date.getDate() === 1; }
  get is_month_end(): boolean {
    const next = new Date(this._date.getFullYear(), this._date.getMonth() + 1, 1);
    return new Date(next.getTime() - 86_400_000).getDate() === this._date.getDate();
  }
  get is_year_start(): boolean { return this._date.getDate() === 1 && this._date.getMonth() === 0; }
  get is_year_end(): boolean { return this._date.getDate() === 31 && this._date.getMonth() === 11; }
  get is_leap_year(): boolean {
    const y = this._date.getFullYear();
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }
  get days_in_month(): number {
    return new Date(this._date.getFullYear(), this._date.getMonth() + 1, 0).getDate();
  }
  get tz(): string | null { return null; }
  get value(): number { return this._date.getTime() * 1_000_000; }

  floor(freq: string): Timestamp {
    const d = this._date;
    if (freq === 'D') return new Timestamp(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    if (freq === 'H') return new Timestamp(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()));
    if (freq === 'T' || freq === 'min') return new Timestamp(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()));
    return new Timestamp(new Date(this._date));
  }

  ceil(freq: string): Timestamp {
    const floored = this.floor(freq);
    const ms: Record<string, number> = { 'D': 86_400_000, 'H': 3_600_000, 'T': 60_000, 'min': 60_000 };
    const step = ms[freq] ?? 1000;
    if (this._date.getTime() === floored._date.getTime()) return floored;
    return new Timestamp(new Date(floored._date.getTime() + step));
  }

  round(freq: string): Timestamp {
    const floored = this.floor(freq);
    const ms: Record<string, number> = { 'D': 86_400_000, 'H': 3_600_000, 'T': 60_000, 'min': 60_000 };
    const step = ms[freq] ?? 1000;
    const diff = this._date.getTime() - floored._date.getTime();
    return diff >= step / 2 ? new Timestamp(new Date(floored._date.getTime() + step)) : floored;
  }

  normalize(): Timestamp {
    const d = this._date;
    return new Timestamp(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  eq(other: Timestamp): boolean { return this._date.getTime() === other._date.getTime(); }
  lt(other: Timestamp): boolean { return this._date < other._date; }
  le(other: Timestamp): boolean { return this._date <= other._date; }
  gt(other: Timestamp): boolean { return this._date > other._date; }
  ge(other: Timestamp): boolean { return this._date >= other._date; }

  to_datetime64(): Date { return new Date(this._date); }
  to_pydatetime(): Date { return new Date(this._date); }
  to_period(freq = 'D'): string {
    if (freq === 'D') return this._date.toISOString().slice(0, 10);
    if (freq === 'M') return this._date.toISOString().slice(0, 7);
    if (freq === 'Y' || freq === 'A') return String(this._date.getFullYear());
    return this._date.toISOString().slice(0, 10);
  }
  timestamp(): number { return this._date.getTime() / 1000; }
  date(): Date { return new Date(this._date.getFullYear(), this._date.getMonth(), this._date.getDate()); }
  time(): string {
    const d = this._date;
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }

  strftime(format: string): string {
    const d = this._date;
    return format
      .replace('%Y', String(d.getFullYear()))
      .replace('%m', String(d.getMonth() + 1).padStart(2, '0'))
      .replace('%d', String(d.getDate()).padStart(2, '0'))
      .replace('%H', String(d.getHours()).padStart(2, '0'))
      .replace('%M', String(d.getMinutes()).padStart(2, '0'))
      .replace('%S', String(d.getSeconds()).padStart(2, '0'));
  }

  isoformat(sep = 'T'): string {
    return this._date.toISOString().replace('T', sep);
  }

  toString(): string { return this._date.toISOString(); }

  static now(): Timestamp { return new Timestamp(new Date()); }
  static today(): Timestamp { return Timestamp.now(); }
  static utcnow(): Timestamp { return new Timestamp(new Date()); }
  static fromisoformat(s: string): Timestamp { return new Timestamp(new Date(s)); }
  static fromtimestamp(ts: number): Timestamp { return new Timestamp(new Date(ts * 1000)); }
  static fromordinal(ordinal: number): Timestamp {
    return new Timestamp(new Date((ordinal - 719163) * 86_400_000));
  }
}
