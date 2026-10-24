import { Index } from './index.js';
import { ValueError } from '../errors.js';

export class RangeIndex extends Index {
  private _start: number;
  private _stop: number;
  private _step: number;

  constructor(
    startOrStop: number,
    stop?: number,
    step = 1,
    options: { name?: string } = {}
  ) {
    let start: number, actualStop: number;
    if (stop === undefined) { start = 0; actualStop = startOrStop; }
    else { start = startOrStop; actualStop = stop; }
    if (step === 0) throw new ValueError('RangeIndex: step cannot be 0');

    const data: number[] = [];
    for (let i = start; step > 0 ? i < actualStop : i > actualStop; i += step) data.push(i);
    super(data, options);

    this._start = start;
    this._stop = actualStop;
    this._step = step;
  }

  get start(): number { return this._start; }
  get stop(): number { return this._stop; }
  get step(): number { return this._step; }
  override get dtype(): string { return 'int64'; }
  override get inferred_type(): string { return 'integer'; }

  override toString(): string {
    return `RangeIndex(start=${this._start}, stop=${this._stop}, step=${this._step}${this._name ? `, name='${this._name}'` : ''})`;
  }
}
