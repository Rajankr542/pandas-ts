/**
 * Period — a time span with a specific frequency.
 * Mirrors pandas.Period.
 */
import { ValueError } from './errors.js';

export type PeriodFreq = 'D' | 'W' | 'M' | 'Q' | 'A' | 'Y' | 'H' | 'T' | 'S' | 'min';

export class Period {
  private _date: Date;
  readonly freq: PeriodFreq;

  constructor(value: string | Date | number, freq: PeriodFreq = 'D') {
    this.freq = freq;
    if (value instanceof Date) {
      this._date = value;
    } else if (typeof value === 'number') {
      this._date = new Date(value);
    } else {
      this._date = new Date(value);
    }
    if (isNaN(this._date.getTime())) throw new ValueError(`Cannot parse period: ${value}`);
  }

  get year(): number { return this._date.getFullYear(); }
  get month(): number { return this._date.getMonth() + 1; }
  get day(): number { return this._date.getDate(); }
  get hour(): number { return this._date.getHours(); }
  get minute(): number { return this._date.getMinutes(); }
  get second(): number { return this._date.getSeconds(); }
  get quarter(): number { return Math.floor(this._date.getMonth() / 3) + 1; }
  get dayofweek(): number { return this._date.getDay(); }
  get dayofyear(): number {
    const start = new Date(this._date.getFullYear(), 0, 0);
    return Math.floor((this._date.getTime() - start.getTime()) / 86400000);
  }

  private _freqMs(freq: PeriodFreq): number {
    const map: Record<string, number> = {
      'S': 1000, 'T': 60000, 'min': 60000, 'H': 3600000,
      'D': 86400000, 'W': 7 * 86400000,
    };
    return map[freq] ?? 86400000;
  }

  private _addFreq(n: number): Date {
    const d = new Date(this._date);
    switch (this.freq) {
      case 'D': d.setDate(d.getDate() + n); break;
      case 'W': d.setDate(d.getDate() + n * 7); break;
      case 'M': d.setMonth(d.getMonth() + n); break;
      case 'Q': d.setMonth(d.getMonth() + n * 3); break;
      case 'A': case 'Y': d.setFullYear(d.getFullYear() + n); break;
      case 'H': d.setHours(d.getHours() + n); break;
      case 'T': case 'min': d.setMinutes(d.getMinutes() + n); break;
      case 'S': d.setSeconds(d.getSeconds() + n); break;
    }
    return d;
  }

  add(n: number): Period { return new Period(this._addFreq(n), this.freq); }
  sub(n: number): Period { return new Period(this._addFreq(-n), this.freq); }

  diff(other: Period): number {
    const ms = this._date.getTime() - other._date.getTime();
    return Math.round(ms / this._freqMs(this.freq));
  }

  to_timestamp(): Date { return new Date(this._date); }

  strftime(format: string): string {
    return format
      .replace('%Y', String(this._date.getFullYear()))
      .replace('%m', String(this._date.getMonth() + 1).padStart(2, '0'))
      .replace('%d', String(this._date.getDate()).padStart(2, '0'));
  }

  toString(): string {
    if (this.freq === 'M') return `${this._date.getFullYear()}-${String(this._date.getMonth() + 1).padStart(2, '0')}`;
    if (this.freq === 'Q') return `${this._date.getFullYear()}Q${this.quarter}`;
    if (this.freq === 'A' || this.freq === 'Y') return String(this._date.getFullYear());
    return this._date.toISOString().slice(0, 10);
  }

  equals(other: Period): boolean { return this._date.getTime() === other._date.getTime() && this.freq === other.freq; }
  lt(other: Period): boolean { return this._date < other._date; }
  le(other: Period): boolean { return this._date <= other._date; }
  gt(other: Period): boolean { return this._date > other._date; }
  ge(other: Period): boolean { return this._date >= other._date; }
}
