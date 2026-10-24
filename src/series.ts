/**
 * pandas-ts Series — a one-dimensional labeled array.
 *
 * Mirrors the pandas.Series API.
 */

import { DType, float64, int64, bool_, string_, object_, normalizeDType } from './dtype.js';
import { IndexError, KeyError, ValueError } from './errors.js';
import { isMissing, NA } from './na.js';
import { Rolling, RollingOptions } from './window/rolling.js';
import { Expanding, ExpandingOptions } from './window/expanding.js';
import { EWM, EWMOptions } from './window/ewm.js';
import { SeriesResampler, ResampleOptions } from './resample/resample.js';
import { StringAccessor } from './accessors/string_accessor.js';
import { DatetimeAccessor } from './accessors/datetime_accessor.js';
import { CategoricalAccessor } from './accessors/categorical_accessor.js';
import { SeriesGroupBy } from './groupby/series_groupby.js';

// Internal column data storage
type ColumnData = Float64Array | Float32Array | Int32Array | Int16Array | Int8Array |
  Uint32Array | Uint16Array | Uint8Array | BigInt64Array | BigUint64Array | string[] | unknown[];

export interface SeriesOptions {
  name?: string;
  index?: (string | number)[];
  dtype?: DType | string;
}

export class Series {
  private _data: ColumnData;
  private _index: (string | number)[];
  private _dtype: DType;
  private _name: string | null;
  private _naMask: Uint8Array | null; // 1 = NA, 0 = valid

  constructor(data: ColumnData | unknown[] | Record<string, unknown> | number | null, options: SeriesOptions = {}) {
    let rawData: unknown[];
    let index: (string | number)[] | null = null;

    if (data === null || data === undefined) {
      rawData = [];
    } else if (data instanceof Float64Array || data instanceof Float32Array ||
               data instanceof Int32Array || data instanceof Int16Array ||
               data instanceof Int8Array || data instanceof Uint32Array ||
               data instanceof Uint16Array || data instanceof Uint8Array ||
               data instanceof BigInt64Array || data instanceof BigUint64Array) {
      this._data = data;
      this._dtype = options.dtype ? normalizeDType(options.dtype) : inferDTypeFromTypedArray(data);
      this._index = options.index ?? Array.from({ length: data.length }, (_, i) => i);
      this._name = options.name ?? null;
      this._naMask = null;
      return;
    } else if (Array.isArray(data)) {
      rawData = data;
    } else if (typeof data === 'object') {
      // dict-like: { key: value }
      const entries = Object.entries(data as Record<string, unknown>);
      index = entries.map(([k]) => k);
      rawData = entries.map(([, v]) => v);
    } else {
      rawData = [data];
    }

    if (options.index) {
      index = options.index;
    }

    const dtype = options.dtype ? normalizeDType(options.dtype) : inferDTypeFromArray(rawData);
    const { typedData, naMask } = coerceToTypedArray(rawData, dtype);

    this._data = typedData;
    this._dtype = dtype;
    this._index = index ?? Array.from({ length: rawData.length }, (_, i) => i);
    this._name = options.name ?? null;
    this._naMask = naMask;
  }

  // ── Properties ──────────────────────────────────────────────────────────────

  get name(): string | null { return this._name; }

  /** String accessor (.str) */
  get str(): StringAccessor { return new StringAccessor(this); }

  /** Datetime accessor (.dt) */
  get dt(): DatetimeAccessor { return new DatetimeAccessor(this); }

  /** Categorical accessor (.cat) */
  get cat(): CategoricalAccessor { return new CategoricalAccessor(this); }

  get dtype(): DType { return this._dtype; }
  get shape(): [number] { return [this._data.length]; }
  get size(): number { return this._data.length; }
  get ndim(): number { return 1; }
  get index(): (string | number)[] { return this._index; }
  get values(): ColumnData { return this._data; }

  // ── Display ─────────────────────────────────────────────────────────────────

  toString(): string {
    const lines: string[] = [];
    const n = this.size;
    for (let i = 0; i < Math.min(n, 60); i++) {
      const label = this._index[i];
      const val = this._getAt(i);
      lines.push(`${label}    ${val}`);
    }
    if (n > 60) lines.push(`... ${n - 60} more items`);
    if (this._name !== null) lines.push(`Name: ${this._name}, dtype: ${this._dtype.name}`);
    else lines.push(`dtype: ${this._dtype.name}`);
    return lines.join('\n');
  }

  // ── Indexing ─────────────────────────────────────────────────────────────────

  _getAt(pos: number): unknown {
    if (this._naMask && this._naMask[pos] === 1) return NA;
    const v = (this._data as unknown[])[pos];
    return v;
  }

  /** Get a value by label (like df.loc) */
  get(label: string | number): unknown {
    const pos = this._index.indexOf(label);
    if (pos === -1) throw new KeyError(`${String(label)}`);
    return this._getAt(pos);
  }

  /** Get a value by integer position (like df.iloc) */
  iloc(pos: number): unknown {
    if (pos < 0) pos = this.size + pos;
    if (pos < 0 || pos >= this.size) throw new IndexError(`index ${pos} is out of bounds`);
    return this._getAt(pos);
  }

  /** Slice by position range [start, end) — internal helper */
  iloc_slice(start: number, end: number): Series {
    return this._slice(start, end);
  }

  /** Return first n rows */
  head(n = 5): Series {
    return this._slice(0, Math.min(n, this.size));
  }

  /** Return last n rows */
  tail(n = 5): Series {
    const start = Math.max(0, this.size - n);
    return this._slice(start, this.size);
  }

  private _slice(start: number, end: number): Series {
    const newData = (this._data as { slice(s: number, e: number): ColumnData }).slice(start, end);
    const newIndex = this._index.slice(start, end);
    const newMask = this._naMask ? this._naMask.slice(start, end) : null;
    const s = new Series(newData, { name: this._name ?? undefined, dtype: this._dtype });
    s._index = newIndex;
    s._naMask = newMask;
    return s;
  }

  // ── Missing data ─────────────────────────────────────────────────────────────

  /** Boolean Series: true where value is NA/NaN */
  isna(): Series {
    const result = new Uint8Array(this.size);
    for (let i = 0; i < this.size; i++) {
      result[i] = isMissing(this._getAt(i)) ? 1 : 0;
    }
    return new Series(result, { name: this._name ?? undefined, dtype: bool_, index: this._index });
  }

  /** Boolean Series: true where value is NOT NA/NaN */
  notna(): Series {
    const result = new Uint8Array(this.size);
    for (let i = 0; i < this.size; i++) {
      result[i] = isMissing(this._getAt(i)) ? 0 : 1;
    }
    return new Series(result, { name: this._name ?? undefined, dtype: bool_, index: this._index });
  }

  /** isnull is an alias for isna */
  isnull = this.isna.bind(this);
  /** notnull is an alias for notna */
  notnull = this.notna.bind(this);

  /** Fill NA values */
  fillna(value: unknown): Series {
    const result: unknown[] = [];
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      result.push(isMissing(v) ? value : v);
    }
    return new Series(result, { name: this._name ?? undefined, index: this._index });
  }

  ffill(): Series {
    const result: unknown[] = new Array(this.size);
    let last: unknown = null;
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (!isMissing(v)) last = v;
      result[i] = last;
    }
    return new Series(result, { name: this._name ?? undefined, index: this._index });
  }

  bfill(): Series {
    const result: unknown[] = new Array(this.size);
    let last: unknown = null;
    for (let i = this.size - 1; i >= 0; i--) {
      const v = this._getAt(i);
      if (!isMissing(v)) last = v;
      result[i] = last;
    }
    return new Series(result, { name: this._name ?? undefined, index: this._index });
  }

  explode(): Series {
    const vals: unknown[] = [];
    const idx: (string | number)[] = [];
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      const origIdx = this._index[i] as string | number;
      if (Array.isArray(v)) {
        for (const item of v) { vals.push(item); idx.push(origIdx); }
      } else { vals.push(v); idx.push(origIdx); }
    }
    return new Series(vals, { index: idx, name: this._name ?? undefined });
  }

  to_frame(name?: string): Record<string, unknown[]> {
    const colName = String(name ?? this._name ?? '0');
    return { [colName]: Array.from({ length: this.size }, (_, i) => this._getAt(i)) };
  }

  /** Drop NA values */
  dropna(): Series {
    const keepIdx: number[] = [];
    for (let i = 0; i < this.size; i++) {
      if (!isMissing(this._getAt(i))) keepIdx.push(i);
    }
    return this._selectPositions(keepIdx);
  }

  private _selectPositions(positions: number[]): Series {
    const result: unknown[] = positions.map(i => this._getAt(i));
    const newIndex = positions.map(i => this._index[i] as string | number);
    return new Series(result, { name: this._name ?? undefined, index: newIndex });
  }

  // ── Reductions ───────────────────────────────────────────────────────────────

  sum(): number | bigint {
    if (this._dtype.kind === 'int' && this._data instanceof BigInt64Array) {
      let s = 0n;
      for (let i = 0; i < this.size; i++) {
        if (!this._naMask || this._naMask[i] === 0) s += (this._data as BigInt64Array)[i] ?? 0n;
      }
      return s;
    }
    let s = 0;
    for (let i = 0; i < this.size; i++) {
      if (!this._naMask || this._naMask[i] === 0) {
        const v = (this._data as unknown[])[i];
        if (typeof v === 'number' && !isNaN(v)) s += v;
      }
    }
    return s;
  }

  mean(): number {
    let s = 0, count = 0;
    for (let i = 0; i < this.size; i++) {
      const v = (this._data as unknown[])[i];
      const missing = this._naMask ? this._naMask[i] === 1 : (typeof v === 'number' && isNaN(v));
      if (!missing) {
        s += Number(v);
        count++;
      }
    }
    return count === 0 ? NaN : s / count;
  }

  min(): number {
    let m = Infinity;
    for (let i = 0; i < this.size; i++) {
      const v = (this._data as unknown[])[i];
      const missing = this._naMask ? this._naMask[i] === 1 : (typeof v === 'number' && isNaN(v));
      if (!missing) {
        const n = Number(v);
        if (n < m) m = n;
      }
    }
    return m;
  }

  max(): number {
    let m = -Infinity;
    for (let i = 0; i < this.size; i++) {
      const v = (this._data as unknown[])[i];
      const missing = this._naMask ? this._naMask[i] === 1 : (typeof v === 'number' && isNaN(v));
      if (!missing) {
        const n = Number(v);
        if (n > m) m = n;
      }
    }
    return m;
  }

  std(ddof = 1): number {
    const m = this.mean();
    let ss = 0, count = 0;
    for (let i = 0; i < this.size; i++) {
      const v = (this._data as unknown[])[i];
      const missing = this._naMask ? this._naMask[i] === 1 : (typeof v === 'number' && isNaN(v));
      if (!missing) {
        const d = Number(v) - m;
        ss += d * d;
        count++;
      }
    }
    if (count <= ddof) return NaN;
    return Math.sqrt(ss / (count - ddof));
  }

  var(ddof = 1): number {
    return this.std(ddof) ** 2;
  }

  count(): number {
    let c = 0;
    for (let i = 0; i < this.size; i++) {
      const v = (this._data as unknown[])[i];
      const missing = this._naMask ? this._naMask[i] === 1 : (typeof v === 'number' && isNaN(v));
      if (!missing) c++;
    }
    return c;
  }

  // ── Sorting ───────────────────────────────────────────────────────────────────

  sort_values(options: { ascending?: boolean; na_position?: 'first' | 'last' } = {}): Series {
    const ascending = options.ascending ?? true;
    const na_position = options.na_position ?? 'last';

    const indices = Array.from({ length: this.size }, (_, i) => i);
    indices.sort((a, b) => {
      const va = this._getAt(a);
      const vb = this._getAt(b);
      const aMiss = isMissing(va);
      const bMiss = isMissing(vb);
      if (aMiss && bMiss) return 0;
      if (aMiss) return na_position === 'last' ? 1 : -1;
      if (bMiss) return na_position === 'last' ? -1 : 1;
      if ((va as number) < (vb as number)) return ascending ? -1 : 1;
      if ((va as number) > (vb as number)) return ascending ? 1 : -1;
      return 0;
    });

    return this._selectPositions(indices);
  }

  sort_index(ascending = true): Series {
    const indices = Array.from({ length: this.size }, (_, i) => i);
    indices.sort((a, b) => {
      const ia = this._index[a] as string | number;
      const ib = this._index[b] as string | number;
      if (ia < ib) return ascending ? -1 : 1;
      if (ia > ib) return ascending ? 1 : -1;
      return 0;
    });
    return this._selectPositions(indices);
  }

  // ── Unique / value counts ─────────────────────────────────────────────────────

  unique(): unknown[] {
    const seen = new Set<unknown>();
    const result: unknown[] = [];
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      const key = isMissing(v) ? '__MISSING__' : v;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(v);
      }
    }
    return result;
  }

  nunique(): number {
    const seen = new Set<unknown>();
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (!isMissing(v)) seen.add(v);
    }
    return seen.size;
  }

  value_counts(): Series {
    const counts = new Map<unknown, number>();
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (!isMissing(v)) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([k]) => String(k));
    const values = sorted.map(([, v]) => v);
    return new Series(values, { name: this._name ?? undefined, index: labels });
  }

  // ── Arithmetic ───────────────────────────────────────────────────────────────

  add(other: Series | number): Series {
    return this._elementWise(other, (a, b) => a + b);
  }

  sub(other: Series | number): Series {
    return this._elementWise(other, (a, b) => a - b);
  }

  mul(other: Series | number): Series {
    return this._elementWise(other, (a, b) => a * b);
  }

  div(other: Series | number): Series {
    return this._elementWise(other, (a, b) => a / b);
  }

  mod(other: Series | number): Series {
    return this._elementWise(other, (a, b) => a % b);
  }

  pow(other: Series | number): Series {
    return this._elementWise(other, (a, b) => Math.pow(a, b));
  }

  abs(): Series {
    return this._map(v => typeof v === 'number' ? Math.abs(v) : v);
  }

  private _elementWise(other: Series | number, fn: (a: number, b: number) => number): Series {
    const result: number[] = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const a = this._getAt(i);
      const b = other instanceof Series ? other._getAt(i) : other;
      if (isMissing(a) || isMissing(b)) {
        result[i] = NaN;
      } else {
        result[i] = fn(Number(a), Number(b));
      }
    }
    return new Series(new Float64Array(result), { name: this._name ?? undefined, dtype: float64, index: this._index });
  }

  private _map(fn: (v: unknown) => unknown): Series {
    const result: unknown[] = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      result[i] = isMissing(v) ? v : fn(v);
    }
    return new Series(result, { name: this._name ?? undefined, index: this._index });
  }

  // ── Comparison ───────────────────────────────────────────────────────────────

  eq(other: Series | unknown): Series {
    return this._compare(other, (a, b) => a === b);
  }

  ne(other: Series | unknown): Series {
    return this._compare(other, (a, b) => a !== b);
  }

  lt(other: Series | number): Series {
    return this._compare(other, (a, b) => (a as number) < (b as number));
  }

  le(other: Series | number): Series {
    return this._compare(other, (a, b) => (a as number) <= (b as number));
  }

  gt(other: Series | number): Series {
    return this._compare(other, (a, b) => (a as number) > (b as number));
  }

  ge(other: Series | number): Series {
    return this._compare(other, (a, b) => (a as number) >= (b as number));
  }

  private _compare(other: Series | unknown, fn: (a: unknown, b: unknown) => boolean): Series {
    const result = new Uint8Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const a = this._getAt(i);
      const b = other instanceof Series ? other._getAt(i) : other;
      if (isMissing(a) || isMissing(b)) {
        result[i] = 0;
      } else {
        result[i] = fn(a, b) ? 1 : 0;
      }
    }
    return new Series(result, { name: this._name ?? undefined, dtype: bool_, index: this._index });
  }

  // ── Apply / map ───────────────────────────────────────────────────────────────

  apply(fn: (value: unknown) => unknown): Series {
    const result: unknown[] = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      result[i] = fn(this._getAt(i));
    }
    return new Series(result, { name: this._name ?? undefined, index: this._index });
  }

  map(fn: (value: unknown) => unknown): Series {
    return this.apply(fn);
  }

  // ── Cumulative ───────────────────────────────────────────────────────────────

  cumsum(): Series {
    const result = new Float64Array(this.size);
    let running = 0;
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (isMissing(v)) {
        result[i] = NaN;
      } else {
        running += Number(v);
        result[i] = running;
      }
    }
    return new Series(result, { name: this._name ?? undefined, dtype: float64, index: this._index });
  }

  cumprod(): Series {
    const result = new Float64Array(this.size);
    let running = 1;
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (isMissing(v)) {
        result[i] = NaN;
      } else {
        running *= Number(v);
        result[i] = running;
      }
    }
    return new Series(result, { name: this._name ?? undefined, dtype: float64, index: this._index });
  }

  cummax(): Series {
    const result = new Float64Array(this.size);
    let running = -Infinity;
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (isMissing(v)) {
        result[i] = NaN;
      } else {
        running = Math.max(running, Number(v));
        result[i] = running;
      }
    }
    return new Series(result, { name: this._name ?? undefined, dtype: float64, index: this._index });
  }

  cummin(): Series {
    const result = new Float64Array(this.size);
    let running = Infinity;
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (isMissing(v)) {
        result[i] = NaN;
      } else {
        running = Math.min(running, Number(v));
        result[i] = running;
      }
    }
    return new Series(result, { name: this._name ?? undefined, dtype: float64, index: this._index });
  }

  // ── Describe ─────────────────────────────────────────────────────────────────

  describe(): Record<string, number> {
    const n = this.count();
    const m = this.mean();
    const s = this.std();
    const mn = this.min();
    const mx = this.max();
    const sorted = this.dropna().sort_values();
    const q = (p: number): number => {
      if (sorted.size === 0) return NaN;
      const idx = p * (sorted.size - 1);
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      if (lo === hi) return Number(sorted.iloc(lo));
      return Number(sorted.iloc(lo)) * (hi - idx) + Number(sorted.iloc(hi)) * (idx - lo);
    };

    return {
      count: n,
      mean: m,
      std: s,
      min: mn,
      '25%': q(0.25),
      '50%': q(0.5),
      '75%': q(0.75),
      max: mx,
    };
  }

  // ── Rename / reset_index ──────────────────────────────────────────────────────

  rename(name: string): Series {
    const s = this._copy();
    s._name = name;
    return s;
  }

  reset_index(_drop = false): Series {
    const s = this._copy();
    s._index = Array.from({ length: this.size }, (_, i) => i);
    return s;
  }

  private _copy(): Series {
    const s = new Series(this._data, { name: this._name ?? undefined, dtype: this._dtype });
    s._index = [...this._index];
    s._naMask = this._naMask ? new Uint8Array(this._naMask) : null;
    return s;
  }

  copy(): Series {
    return this._copy();
  }

  // ── Type conversion ───────────────────────────────────────────────────────────

  astype(dtype: DType | string): Series {
    const dt = normalizeDType(dtype);
    const result: unknown[] = [];
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (isMissing(v)) { result.push(NA); continue; }
      if (dt.kind === 'float') result.push(Number(v));
      else if (dt.kind === 'int') result.push(Math.trunc(Number(v)));
      else if (dt.kind === 'bool') result.push(Boolean(v));
      else if (dt.kind === 'string') result.push(String(v));
      else result.push(v);
    }
    return new Series(result, { name: this._name ?? undefined, dtype: dt, index: this._index });
  }

  // ── Isin ─────────────────────────────────────────────────────────────────────

  isin(values: unknown[]): Series {
    const set = new Set(values);
    const result = new Uint8Array(this.size);
    for (let i = 0; i < this.size; i++) {
      result[i] = set.has(this._getAt(i)) ? 1 : 0;
    }
    return new Series(result, { name: this._name ?? undefined, dtype: bool_, index: this._index });
  }

  // ── Clip ─────────────────────────────────────────────────────────────────────

  clip(lower?: number, upper?: number): Series {
    return this._map(v => {
      let n = Number(v);
      if (lower !== undefined && n < lower) n = lower;
      if (upper !== undefined && n > upper) n = upper;
      return n;
    });
  }

  // ── Rolling / Expanding / EWM ────────────────────────────────────────────────

  rolling(window: number, options: RollingOptions = {}): Rolling {
    return new Rolling(this, window, options);
  }

  expanding(options: ExpandingOptions = {}): Expanding {
    return new Expanding(this, options);
  }

  ewm(options: EWMOptions): EWM {
    return new EWM(this, options);
  }

  resample(freq: string, options: ResampleOptions = {}): SeriesResampler {
    return new SeriesResampler(this, freq, options);
  }

  // ── Between ──────────────────────────────────────────────────────────────────

  between(left: number, right: number, inclusive: 'both' | 'left' | 'right' | 'neither' = 'both'): Series {
    return this._compare_range(left, right, inclusive);
  }

  private _compare_range(left: number, right: number, inclusive: string): Series {
    const result = new Uint8Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const v = Number(this._getAt(i));
      const leftOk = inclusive === 'both' || inclusive === 'left' ? v >= left : v > left;
      const rightOk = inclusive === 'both' || inclusive === 'right' ? v <= right : v < right;
      result[i] = leftOk && rightOk ? 1 : 0;
    }
    return new Series(result, { dtype: bool_, index: this._index });
  }

  // ── GroupBy ──────────────────────────────────────────────────────────────────

  groupby(by: unknown[] | Series, options: { dropna?: boolean } = {}): SeriesGroupBy {
    return new SeriesGroupBy(this, by, options);
  }

  // ── rank ─────────────────────────────────────────────────────────────────────
  rank(method: 'average' | 'min' | 'max' | 'first' | 'dense' = 'average'): Series {
    const vals = Array.from({ length: this.size }, (_, i) => ({ i, v: this._getAt(i) }));
    const nonMissing = vals.filter(x => !isMissing(x.v)).map(x => ({ ...x, v: Number(x.v) }));
    const sorted = [...nonMissing].sort((a, b) => (a.v as number) - (b.v as number));
    const ranks = new Map<number, number>();
    const result = new Float64Array(this.size).fill(NaN);

    for (let i = 0; i < sorted.length; ) {
      const val = sorted[i]!.v as number;
      let j = i;
      while (j < sorted.length && (sorted[j]!.v as number) === val) j++;
      for (let k = i; k < j; k++) {
        let rank: number;
        if (method === 'min') rank = i + 1;
        else if (method === 'max') rank = j;
        else if (method === 'first') rank = k + 1;
        else if (method === 'dense') rank = ranks.size + 1;
        else rank = (i + j + 1) / 2;
        result[sorted[k]!.i] = rank;
      }
      if (!ranks.has(i)) ranks.set(i, ranks.size);
      i = j;
    }
    return new Series(result, { dtype: float64, name: this._name ?? undefined, index: this._index });
  }

  // ── diff ─────────────────────────────────────────────────────────────────────
  diff(periods = 1): Series {
    const result = new Float64Array(this.size);
    for (let i = 0; i < this.size; i++) {
      if (i < periods) { result[i] = NaN; continue; }
      const curr = Number(this._getAt(i));
      const prev = Number(this._getAt(i - periods));
      result[i] = curr - prev;
    }
    return new Series(result, { dtype: float64, name: this._name ?? undefined, index: this._index });
  }

  // ── pct_change ───────────────────────────────────────────────────────────────
  pct_change(periods = 1): Series {
    const result = new Float64Array(this.size);
    for (let i = 0; i < this.size; i++) {
      if (i < periods) { result[i] = NaN; continue; }
      const curr = Number(this._getAt(i));
      const prev = Number(this._getAt(i - periods));
      result[i] = prev !== 0 ? (curr - prev) / Math.abs(prev) : NaN;
    }
    return new Series(result, { dtype: float64, name: this._name ?? undefined, index: this._index });
  }

  // ── shift ─────────────────────────────────────────────────────────────────────
  shift(periods = 1): Series {
    const result: unknown[] = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const srcI = i - periods;
      result[i] = srcI >= 0 && srcI < this.size ? this._getAt(srcI) : NaN;
    }
    return new Series(result, { name: this._name ?? undefined, index: this._index });
  }

  // ── quantile ─────────────────────────────────────────────────────────────────
  quantile(q = 0.5): number {
    const sorted = this.dropna().sort_values();
    if (sorted.size === 0) return NaN;
    const idx = q * (sorted.size - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return Number(sorted.iloc(lo));
    return Number(sorted.iloc(lo)) * (hi - idx) + Number(sorted.iloc(hi)) * (idx - lo);
  }

  // ── nlargest / nsmallest ─────────────────────────────────────────────────────
  nlargest(n: number): Series { return this.sort_values({ ascending: false }).head(n); }
  nsmallest(n: number): Series { return this.sort_values({ ascending: true }).head(n); }

  // ── duplicated / drop_duplicates ──────────────────────────────────────────────
  duplicated(keep: 'first' | 'last' | false = 'first'): Series {
    const seen = new Map<unknown, number>();
    const result = new Uint8Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (seen.has(v)) {
        if (keep === 'first') result[i] = 1;
        else if (keep === 'last') result[seen.get(v)!] = 1;
        else { result[i] = 1; result[seen.get(v)!] = 1; }
      } else { seen.set(v, i); }
    }
    return new Series(result, { dtype: bool_, name: this._name ?? undefined, index: this._index });
  }

  drop_duplicates(keep: 'first' | 'last' | false = 'first'): Series {
    const dupes = this.duplicated(keep);
    const positions: number[] = [];
    for (let i = 0; i < dupes.size; i++) {
      if (!dupes.iloc(i)) positions.push(i);
    }
    return this._selectPositions(positions);
  }

  // ── sample ───────────────────────────────────────────────────────────────────
  sample(n = 1, replace = false): Series {
    const available = Array.from({ length: this.size }, (_, i) => i);
    const positions: number[] = [];
    const count = Math.min(n, replace ? n : this.size);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * available.length);
      positions.push(available[idx]!);
      if (!replace) available.splice(idx, 1);
    }
    return this._selectPositions(positions.sort((a, b) => a - b));
  }

  // ── interpolate ───────────────────────────────────────────────────────────────
  interpolate(method: 'linear' | 'pad' | 'backfill' = 'linear'): Series {
    const vals: number[] = Array.from({ length: this.size }, (_, i) => Number(this._getAt(i)));
    if (method === 'linear') {
      for (let i = 1; i < vals.length - 1; i++) {
        if (isNaN(vals[i]!)) {
          let lo = i - 1, hi = i + 1;
          while (hi < vals.length && isNaN(vals[hi]!)) hi++;
          if (!isNaN(vals[lo]!) && hi < vals.length && !isNaN(vals[hi]!)) {
            vals[i] = vals[lo]! + (vals[hi]! - vals[lo]!) * (i - lo) / (hi - lo);
          }
        }
      }
    }
    return new Series(new Float64Array(vals), { dtype: float64, name: this._name ?? undefined, index: this._index });
  }

  // ── pipe ─────────────────────────────────────────────────────────────────────
  pipe(fn: (s: Series) => Series): Series { return fn(this); }

  // ── where ────────────────────────────────────────────────────────────────────
  where(cond: Series, other: unknown = NaN): Series {
    const result: unknown[] = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const c = cond.iloc(i);
      result[i] = c ? this._getAt(i) : other;
    }
    return new Series(result, { name: this._name ?? undefined, index: this._index });
  }

  // ── searchsorted ─────────────────────────────────────────────────────────────
  searchsorted(value: number, side: 'left' | 'right' = 'left'): number {
    let lo = 0, hi = this.size;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const v = Number(this._getAt(mid));
      if (side === 'left' ? v < value : v <= value) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  // ── Internal access (for DataFrame) ──────────────────────────────────────────

  _getDataArray(): ColumnData { return this._data; }
  _getNaMask(): Uint8Array | null { return this._naMask; }
  _getDType(): DType { return this._dtype; }
  _getIndex(): (string | number)[] { return this._index; }
  _setIndex(idx: (string | number)[]): void { this._index = idx; }

  // ── kurtosis ─────────────────────────────────────────────────────────────────
  kurtosis(): number {
    const vals: number[] = [];
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (!isMissing(v)) vals.push(Number(v));
    }
    const n = vals.length;
    if (n < 4) return NaN;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    if (std === 0) return NaN;
    const kurt = vals.reduce((a, b) => a + ((b - mean) / std) ** 4, 0);
    return (kurt * n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  }

  // ── skew ─────────────────────────────────────────────────────────────────────
  skew(): number {
    const vals: number[] = [];
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (!isMissing(v)) vals.push(Number(v));
    }
    const n = vals.length;
    if (n < 3) return NaN;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    if (std === 0) return NaN;
    const s = vals.reduce((a, b) => a + ((b - mean) / std) ** 3, 0);
    return (n * s) / ((n - 1) * (n - 2));
  }

  // ── sem ──────────────────────────────────────────────────────────────────────
  sem(ddof = 1): number {
    const n = this.count();
    return n > ddof ? this.std(ddof) / Math.sqrt(n) : NaN;
  }

  // ── mad ──────────────────────────────────────────────────────────────────────
  mad(): number {
    const mean = this.mean();
    let sum = 0; let n = 0;
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (!isMissing(v)) { sum += Math.abs(Number(v) - mean); n++; }
    }
    return n > 0 ? sum / n : NaN;
  }

  // ── product ──────────────────────────────────────────────────────────────────
  product(): number {
    let p = 1;
    for (let i = 0; i < this.size; i++) {
      const v = this._getAt(i);
      if (!isMissing(v)) p *= Number(v);
    }
    return p;
  }

  // ── to_numpy ─────────────────────────────────────────────────────────────────
  to_numpy(): unknown[] {
    return Array.from({ length: this.size }, (_, i) => this._getAt(i));
  }

  // ── equals ───────────────────────────────────────────────────────────────────
  equals(other: Series): boolean {
    if (this.size !== other.size) return false;
    for (let i = 0; i < this.size; i++) {
      const a = this._getAt(i), b = (other as any)._getAt(i);
      if (a !== b && !(typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b))) return false;
    }
    return true;
  }

  // ── combine ──────────────────────────────────────────────────────────────────
  combine(other: Series, fn: (a: unknown, b: unknown) => unknown): Series {
    const result: unknown[] = [];
    for (let i = 0; i < Math.max(this.size, other.size); i++) {
      const a = i < this.size ? this._getAt(i) : null;
      const b = i < other.size ? (other as any)._getAt(i) : null;
      result.push(fn(a, b));
    }
    return new Series(result, { name: this._name ?? undefined });
  }

  // ── combine_first ─────────────────────────────────────────────────────────────
  combine_first(other: Series): Series {
    const result: unknown[] = [];
    for (let i = 0; i < Math.max(this.size, other.size); i++) {
      const a = i < this.size ? this._getAt(i) : null;
      const b = i < other.size ? (other as any)._getAt(i) : null;
      result.push(!isMissing(a) ? a : b);
    }
    return new Series(result, { name: this._name ?? undefined });
  }

  // ── reindex ──────────────────────────────────────────────────────────────────
  reindex(index: (string | number)[], options: { fill_value?: unknown } = {}): Series {
    const fill = options.fill_value ?? NaN;
    const result = index.map(idx => {
      const pos = this._index.indexOf(idx);
      return pos !== -1 ? this._getAt(pos) : fill;
    });
    return new Series(result, { index, name: this._name ?? undefined });
  }

  // ── dot ───────────────────────────────────────────────────────────────────────
  dot(other: Series): number {
    let sum = 0;
    for (let i = 0; i < this.size; i++) {
      sum += Number(this._getAt(i)) * Number((other as any)._getAt(i));
    }
    return sum;
  }

}

// ── Dtype inference helpers ───────────────────────────────────────────────────

function inferDTypeFromArray(data: unknown[]): DType {
  if (data.length === 0) return object_;
  // Scan all values: if any non-missing value is an array, use object
  for (const v of data) {
    if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) continue;
    if (Array.isArray(v)) return object_;
  }
  for (const v of data) {
    if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) continue;
    if (typeof v === 'bigint') return int64;
    if (typeof v === 'number') return float64;
    if (typeof v === 'boolean') return bool_;
    if (typeof v === 'string') return string_;
    return object_;
  }
  return float64; // all missing → float64 (pandas default)
}

function inferDTypeFromTypedArray(arr: ArrayBufferView): DType {
  if (arr instanceof Float64Array) return float64;
  if (arr instanceof Float32Array) return { name: 'float32', itemsize: 4, kind: 'float' };
  if (arr instanceof Int32Array) return { name: 'int32', itemsize: 4, kind: 'int' };
  if (arr instanceof Int16Array) return { name: 'int16', itemsize: 2, kind: 'int' };
  if (arr instanceof Int8Array) return { name: 'int8', itemsize: 1, kind: 'int' };
  if (arr instanceof Uint32Array) return { name: 'uint32', itemsize: 4, kind: 'uint' };
  if (arr instanceof Uint16Array) return { name: 'uint16', itemsize: 2, kind: 'uint' };
  if (arr instanceof Uint8Array) return bool_;
  if (arr instanceof BigInt64Array) return int64;
  if (arr instanceof BigUint64Array) return { name: 'uint64', itemsize: 8, kind: 'uint' };
  return object_;
}

function coerceToTypedArray(data: unknown[], dtype: DType): { typedData: ColumnData; naMask: Uint8Array | null } {
  const n = data.length;
  let hasMissing = false;

  for (const v of data) {
    if (isMissing(v)) { hasMissing = true; break; }
  }

  const mask = hasMissing ? new Uint8Array(n) : null;

  if (dtype.kind === 'string' || dtype.kind === 'object') {
    // Check if any value is a non-string, non-primitive object — preserve as-is
    const hasComplexObjects = data.some(v => !isMissing(v) && typeof v === 'object' && typeof v !== 'string');
    if (hasComplexObjects) {
      const arr: unknown[] = new Array(n);
      for (let i = 0; i < n; i++) {
        const v = data[i];
        if (isMissing(v)) {
          arr[i] = null;
          if (mask) mask[i] = 1;
        } else {
          arr[i] = v;
        }
      }
      return { typedData: arr, naMask: mask };
    }
    const arr: string[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const v = data[i];
      if (isMissing(v)) {
        arr[i] = '';
        if (mask) mask[i] = 1;
      } else {
        arr[i] = String(v);
      }
    }
    return { typedData: arr, naMask: mask };
  }

  if (dtype.name === 'int64' || (dtype.kind === 'int' && dtype.itemsize === 8)) {
    const arr = new BigInt64Array(n);
    for (let i = 0; i < n; i++) {
      const v = data[i];
      if (isMissing(v)) {
        if (mask) mask[i] = 1;
      } else {
        arr[i] = BigInt(Math.trunc(Number(v)));
      }
    }
    return { typedData: arr, naMask: mask };
  }

  if (dtype.kind === 'bool') {
    const arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const v = data[i];
      if (isMissing(v)) {
        if (mask) mask[i] = 1;
      } else {
        arr[i] = v ? 1 : 0;
      }
    }
    return { typedData: arr, naMask: mask };
  }

  // Float or int (non-bigint): use Float64Array with NaN as missing marker
  const arr = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = data[i];
    if (isMissing(v)) {
      arr[i] = NaN;
    } else {
      arr[i] = Number(v);
    }
  }
  return { typedData: arr, naMask: null }; // NaN in float64 IS the NA marker
}
