/**
 * Timedelta — represents a duration. Mirrors pandas.Timedelta.
 */
import { ValueError } from './errors.js';

export type TimedeltaUnit = 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds';

export class Timedelta {
  private _ms: number;

  constructor(value: number | string, unit: TimedeltaUnit = 'milliseconds') {
    if (typeof value === 'string') {
      this._ms = Timedelta._parseString(value);
    } else {
      this._ms = value * Timedelta._unitToMs(unit);
    }
  }

  private static _unitToMs(unit: TimedeltaUnit): number {
    const map: Record<TimedeltaUnit, number> = {
      nanoseconds: 1 / 1e6,
      microseconds: 1 / 1000,
      milliseconds: 1,
      seconds: 1000,
      minutes: 60_000,
      hours: 3_600_000,
      days: 86_400_000,
    };
    return map[unit] ?? 1;
  }

  static _parseString(s: string): number {
    const norm = s.trim().toLowerCase();
    if (norm.startsWith('p')) {
      let ms = 0;
      const m = norm.match(/p(?:(\d+)d)?(?:t(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?)?/i);
      if (m) {
        ms += (parseInt(m[1] ?? '0')) * 86_400_000;
        ms += (parseInt(m[2] ?? '0')) * 3_600_000;
        ms += (parseInt(m[3] ?? '0')) * 60_000;
        ms += (parseFloat(m[4] ?? '0')) * 1000;
      }
      return ms;
    }
    const negative = norm.startsWith('-');
    const cleaned = negative ? norm.slice(1).trim() : norm;
    let ms = 0;
    const patterns: [RegExp, number][] = [
      [/(\d+(?:\.\d+)?)\s*(?:days?|d\b)/, 86_400_000],
      [/(\d+(?:\.\d+)?)\s*(?:hours?|h\b|hrs?)/, 3_600_000],
      [/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m\b)/, 60_000],
      [/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s\b)/, 1000],
      [/(\d+(?:\.\d+)?)\s*(?:milliseconds?|ms\b)/, 1],
    ];
    for (const [re, factor] of patterns) {
      const m = cleaned.match(re);
      if (m) ms += parseFloat(m[1]!) * factor;
    }
    const timeMatch = cleaned.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (timeMatch) {
      ms += parseInt(timeMatch[1]!) * 3_600_000;
      ms += parseInt(timeMatch[2]!) * 60_000;
      ms += parseFloat(timeMatch[3]!) * 1000;
    }
    return negative ? -ms : ms;
  }

  get days(): number { return Math.trunc(this._ms / 86_400_000); }
  get seconds(): number { return Math.trunc((Math.abs(this._ms) % 86_400_000) / 1000); }
  get microseconds(): number { return Math.trunc((Math.abs(this._ms) % 1000) * 1000); }
  get milliseconds(): number { return this._ms; }
  get total_seconds(): number { return this._ms / 1000; }
  get nanoseconds(): number { return this._ms % 1000 === 0 ? 0 : (this._ms % 1) * 1_000_000; }

  add(other: Timedelta): Timedelta { return new Timedelta(this._ms + other._ms); }
  sub(other: Timedelta): Timedelta { return new Timedelta(this._ms - other._ms); }
  mul(scalar: number): Timedelta { return new Timedelta(this._ms * scalar); }
  div(scalar: number): Timedelta { return new Timedelta(this._ms / scalar); }
  neg(): Timedelta { return new Timedelta(-this._ms); }
  abs(): Timedelta { return new Timedelta(Math.abs(this._ms)); }

  eq(other: Timedelta): boolean { return this._ms === other._ms; }
  lt(other: Timedelta): boolean { return this._ms < other._ms; }
  le(other: Timedelta): boolean { return this._ms <= other._ms; }
  gt(other: Timedelta): boolean { return this._ms > other._ms; }
  ge(other: Timedelta): boolean { return this._ms >= other._ms; }

  to_pytimedelta(): number { return this._ms; }
  to_timedelta64(): bigint { return BigInt(Math.round(this._ms * 1_000_000)); }

  isoformat(): string {
    const d = Math.abs(this.days);
    const sign = this._ms < 0 ? '-' : '';
    const rem = Math.abs(this._ms) % 86_400_000;
    const h = Math.floor(rem / 3_600_000);
    const m = Math.floor((rem % 3_600_000) / 60_000);
    const sec = Math.floor((rem % 60_000) / 1000);
    const ms2 = rem % 1000;
    const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}${ms2 ? `.${String(ms2).padStart(3,'0')}` : ''}`;
    return d > 0 ? `${sign}P${d}DT${t}` : `${sign}PT${t}`;
  }

  toString(): string {
    const neg = this._ms < 0;
    const abs = Math.abs(this._ms);
    const d = Math.floor(abs / 86_400_000);
    const rem = abs % 86_400_000;
    const h = Math.floor(rem / 3_600_000);
    const m = Math.floor((rem % 3_600_000) / 60_000);
    const s = Math.floor((rem % 60_000) / 1000);
    const ms2 = rem % 1000;
    const sign = neg ? '-' : '';
    const time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const frac = ms2 > 0 ? `.${String(ms2 * 1000).padStart(6,'0')}` : '';
    return d > 0 ? `${sign}${d} day${d !== 1 ? 's' : ''} ${time}${frac}` : `${sign}${time}${frac}`;
  }

  static from_ms(ms: number): Timedelta { return new Timedelta(ms, 'milliseconds'); }

  /** Returns internal millisecond value (for interop) */
  toMs(): number { return this._ms; }
}
