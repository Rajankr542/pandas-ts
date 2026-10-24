/**
 * Interval and IntervalIndex — mirrors pandas Interval.
 */
import { Series } from './series.js';
import { ValueError } from './errors.js';

export type IntervalClosed = 'left' | 'right' | 'both' | 'neither';

export class Interval {
  readonly left: number;
  readonly right: number;
  readonly closed: IntervalClosed;

  constructor(left: number, right: number, closed: IntervalClosed = 'right') {
    if (left > right) throw new ValueError('left must be <= right');
    this.left = left;
    this.right = right;
    this.closed = closed;
  }

  get length(): number { return this.right - this.left; }
  get mid(): number { return (this.left + this.right) / 2; }
  get is_empty(): boolean { return this.length === 0 && this.closed !== 'both'; }

  contains(value: number): boolean {
    const leftOk = this.closed === 'left' || this.closed === 'both' ? value >= this.left : value > this.left;
    const rightOk = this.closed === 'right' || this.closed === 'both' ? value <= this.right : value < this.right;
    return leftOk && rightOk;
  }

  overlaps(other: Interval): boolean {
    return this.left < other.right && other.left < this.right;
  }

  toString(): string {
    const l = this.closed === 'left' || this.closed === 'both' ? '[' : '(';
    const r = this.closed === 'right' || this.closed === 'both' ? ']' : ')';
    return `${l}${this.left}, ${this.right}${r}`;
  }

  equals(other: Interval): boolean {
    return this.left === other.left && this.right === other.right && this.closed === other.closed;
  }
}

export class IntervalIndex {
  private _intervals: Interval[];

  constructor(intervals: Interval[]) {
    this._intervals = intervals;
  }

  get left(): Series {
    return new Series(this._intervals.map(i => i.left));
  }

  get right(): Series {
    return new Series(this._intervals.map(i => i.right));
  }

  get mid(): Series {
    return new Series(this._intervals.map(i => i.mid));
  }

  get length(): number { return this._intervals.length; }

  contains(value: number): Series {
    return new Series(this._intervals.map(i => i.contains(value) ? 1 : 0));
  }

  get(i: number): Interval { return this._intervals[i]!; }

  static from_breaks(breaks: number[], closed: IntervalClosed = 'right'): IntervalIndex {
    const intervals: Interval[] = [];
    for (let i = 0; i < breaks.length - 1; i++) {
      intervals.push(new Interval(breaks[i]!, breaks[i + 1]!, closed));
    }
    return new IntervalIndex(intervals);
  }

  static from_arrays(left: number[], right: number[], closed: IntervalClosed = 'right'): IntervalIndex {
    return new IntervalIndex(left.map((l, i) => new Interval(l, right[i]!, closed)));
  }
}
