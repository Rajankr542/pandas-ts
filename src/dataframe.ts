/**
 * pandas-ts DataFrame — a two-dimensional labeled data structure.
 *
 * Mirrors the pandas.DataFrame API.
 */

import { Series } from './series.js';
import { DType, normalizeDType } from './dtype.js';
import { KeyError, ValueError, NotImplementedError } from './errors.js';
import { isMissing, NA } from './na.js';
import { Rolling, RollingOptions } from './window/rolling.js';
import { Expanding, ExpandingOptions } from './window/expanding.js';
import { EWM, EWMOptions } from './window/ewm.js';
import { DataFrameResampler, ResampleOptions } from './resample/resample.js';
import { DataFrameGroupBy } from './groupby/dataframe_groupby.js';

export type DataInput =
  | Record<string, unknown[] | Float64Array | Int32Array | Uint8Array | BigInt64Array>
  | unknown[][]
  | Array<Record<string, unknown>>;

export interface DataFrameOptions {
  index?: (string | number)[];
  columns?: string[];
  dtype?: DType | string;
}

export class DataFrame {
  private _columns: Map<string, Series>;
  private _columnOrder: string[];
  private _index: (string | number)[];

  constructor(data?: DataInput | null, options: DataFrameOptions = {}) {
    this._columns = new Map();
    this._columnOrder = [];
    this._index = [];

    if (!data) {
      this._index = options.index ?? [];
      if (options.columns) this._columnOrder = options.columns;
      return;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        this._index = options.index ?? [];
        if (options.columns) this._columnOrder = options.columns;
        return;
      }
      if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
        this._fromRecords(data as Record<string, unknown>[], options);
      } else {
        this._from2DArray(data as unknown[][], options);
      }
    } else if (typeof data === 'object') {
      this._fromColumnDict(data as Record<string, unknown[]>, options);
    }
  }

  private _fromColumnDict(data: Record<string, unknown[]>, options: DataFrameOptions) {
    const colNames = options.columns ?? Object.keys(data);
    const firstCol = colNames[0];
    const nRows = firstCol !== undefined && data[firstCol] !== undefined
      ? (data[firstCol] as unknown[]).length
      : 0;
    this._index = options.index ?? Array.from({ length: nRows }, (_, i) => i);

    for (const col of colNames) {
      const vals = (data[col] ?? []) as unknown[];
      const series = new Series(vals, { name: col, index: this._index });
      this._columns.set(col, series);
      this._columnOrder.push(col);
    }
  }

  private _fromRecords(records: Record<string, unknown>[], options: DataFrameOptions) {
    const colNames = options.columns ?? (records.length > 0 ? Object.keys(records[0]!) : []);
    this._index = options.index ?? Array.from({ length: records.length }, (_, i) => i);

    for (const col of colNames) {
      const vals = records.map(r => r[col] ?? null);
      const series = new Series(vals, { name: col, index: this._index });
      this._columns.set(col, series);
      this._columnOrder.push(col);
    }
  }

  private _from2DArray(data: unknown[][], options: DataFrameOptions) {
    const nRows = data.length;
    const nCols = data.length > 0 ? (data[0] as unknown[]).length : 0;
    this._index = options.index ?? Array.from({ length: nRows }, (_, i) => i);
    const colNames = options.columns ?? Array.from({ length: nCols }, (_, i) => String(i));

    for (let c = 0; c < nCols; c++) {
      const col = colNames[c] as string;
      const vals = data.map(row => (row as unknown[])[c]);
      const series = new Series(vals, { name: col, index: this._index });
      this._columns.set(col, series);
      this._columnOrder.push(col);
    }
  }

  // ── Properties ──────────────────────────────────────────────────────────────

  get shape(): [number, number] {
    return [this._index.length, this._columnOrder.length];
  }

  get columns(): string[] { return [...this._columnOrder]; }
  get index(): (string | number)[] { return [...this._index]; }
  get ndim(): number { return 2; }
  get size(): number { return this._index.length * this._columnOrder.length; }

  get dtypes(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.dtype.name;
    }
    return result;
  }

  // ── Column access ─────────────────────────────────────────────────────────────

  /** Get a column as a Series */
  col(name: string): Series {
    const s = this._columns.get(name);
    if (!s) throw new KeyError(`'${name}'`);
    return s;
  }

  get(name: string): Series;
  get(names: string[]): DataFrame;
  get(name: string | string[]): Series | DataFrame {
    if (Array.isArray(name)) {
      return this._selectColumns(name);
    }
    return this.col(name);
  }

  private _selectColumns(names: string[]): DataFrame {
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of names) {
      if (!this._columns.has(col)) throw new KeyError(`'${col}'`);
      df._columns.set(col, this._columns.get(col)!);
      df._columnOrder.push(col);
    }
    return df;
  }

  // ── Display ───────────────────────────────────────────────────────────────────

  head(n = 5): DataFrame {
    return this._sliceRows(0, Math.min(n, this._index.length));
  }

  tail(n = 5): DataFrame {
    const start = Math.max(0, this._index.length - n);
    return this._sliceRows(start, this._index.length);
  }

  private _sliceRows(start: number, end: number): DataFrame {
    const df = new DataFrame();
    df._index = this._index.slice(start, end);
    df._columnOrder = [...this._columnOrder];
    for (const col of this._columnOrder) {
      df._columns.set(col, this._columns.get(col)!.iloc_slice(start, end));
    }
    return df;
  }

  toString(): string {
    const maxRows = 60;
    const rows = Math.min(this._index.length, maxRows);
    const lines: string[] = [];
    lines.push(this._columnOrder.join('\t'));
    for (let i = 0; i < rows; i++) {
      const row = this._columnOrder.map(col => {
        const v = this._columns.get(col)!._getAt(i);
        return String(v ?? 'NaN');
      });
      lines.push(`${this._index[i]}\t${row.join('\t')}`);
    }
    if (this._index.length > maxRows) lines.push(`... ${this._index.length - maxRows} more rows`);
    return lines.join('\n');
  }

  info(): string {
    const lines = [
      `<class 'pandas_ts.DataFrame'>`,
      `RangeIndex: ${this._index.length} entries`,
      `Data columns (total ${this._columnOrder.length} columns):`,
    ];
    for (const col of this._columnOrder) {
      lines.push(` ${col}: ${this._columns.get(col)!.count()} non-null ${this._columns.get(col)!.dtype.name}`);
    }
    return lines.join('\n');
  }

  // ── Row/column selection ──────────────────────────────────────────────────────

  ilocRows(start: number, end: number): DataFrame {
    return this._sliceRows(start, end);
  }

  drop(labels: string | string[], options: { axis?: 0 | 1 } = {}): DataFrame {
    const axis = options.axis ?? 0;
    const labelArr = Array.isArray(labels) ? labels : [labels];

    if (axis === 1) {
      const df = new DataFrame();
      df._index = [...this._index];
      for (const col of this._columnOrder) {
        if (!labelArr.includes(col)) {
          df._columns.set(col, this._columns.get(col)!);
          df._columnOrder.push(col);
        }
      }
      return df;
    } else {
      const keepPositions: number[] = [];
      for (let i = 0; i < this._index.length; i++) {
        if (!labelArr.includes(String(this._index[i]))) keepPositions.push(i);
      }
      return this._selectRowPositions(keepPositions);
    }
  }

  _selectRowPositions(positions: number[]): DataFrame {
    const df = new DataFrame();
    df._index = positions.map(i => this._index[i] as string | number);
    for (const col of this._columnOrder) {
      const series = this._columns.get(col)!;
      const vals: unknown[] = positions.map(i => series._getAt(i));
      df._columns.set(col, new Series(vals, { name: col, index: df._index }));
      df._columnOrder.push(col);
    }
    return df;
  }

  // ── Missing data ──────────────────────────────────────────────────────────────

  isna(): DataFrame {
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of this._columnOrder) {
      df._columns.set(col, this._columns.get(col)!.isna());
      df._columnOrder.push(col);
    }
    return df;
  }

  notna(): DataFrame { return this._applyToAll(s => s.notna()); }
  isnull = this.isna.bind(this);
  notnull = this.notna.bind(this);

  fillna(value: unknown): DataFrame {
    return this._applyToAll(s => s.fillna(value));
  }

  dropna(options: { axis?: 0 | 1; how?: 'any' | 'all'; thresh?: number } = {}): DataFrame {
    const axis = options.axis ?? 0;
    const how = options.how ?? 'any';

    if (axis === 1) {
      throw new NotImplementedError('dropna(axis=1) not yet implemented');
    }

    const keepPositions: number[] = [];
    const nCols = this._columnOrder.length;

    for (let i = 0; i < this._index.length; i++) {
      let naCount = 0;
      for (const col of this._columnOrder) {
        const v = this._columns.get(col)!._getAt(i);
        if (isMissing(v)) naCount++;
      }
      if (how === 'any' && naCount === 0) keepPositions.push(i);
      else if (how === 'all' && naCount < nCols) keepPositions.push(i);
    }
    return this._selectRowPositions(keepPositions);
  }

  // ── Reductions ────────────────────────────────────────────────────────────────

  sum(axis = 0): Record<string, number> {
    if (axis !== 0) throw new NotImplementedError('sum(axis=1) not yet implemented');
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = Number(this._columns.get(col)!.sum());
    }
    return result;
  }

  mean(axis = 0): Record<string, number> {
    if (axis !== 0) throw new NotImplementedError('mean(axis=1) not yet implemented');
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.mean();
    }
    return result;
  }

  min(axis = 0): Record<string, number> {
    if (axis !== 0) throw new NotImplementedError('min(axis=1) not yet implemented');
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.min();
    }
    return result;
  }

  max(axis = 0): Record<string, number> {
    if (axis !== 0) throw new NotImplementedError('max(axis=1) not yet implemented');
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.max();
    }
    return result;
  }

  std(ddof = 1): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.std(ddof);
    }
    return result;
  }

  count(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.count();
    }
    return result;
  }

  describe(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const col of this._columnOrder) {
      const s = this._columns.get(col)!;
      if (s.dtype.kind === 'float' || s.dtype.kind === 'int') {
        result[col] = s.describe();
      }
    }
    return result;
  }

  // ── Sorting ───────────────────────────────────────────────────────────────────

  sort_values(by: string | string[], options: { ascending?: boolean | boolean[]; na_position?: 'first' | 'last' } = {}): DataFrame {
    const cols = Array.isArray(by) ? by : [by];
    const ascending = Array.isArray(options.ascending)
      ? options.ascending
      : new Array(cols.length).fill(options.ascending ?? true) as boolean[];
    const na_position = options.na_position ?? 'last';

    const positions = Array.from({ length: this._index.length }, (_, i) => i);
    positions.sort((a, b) => {
      for (let k = 0; k < cols.length; k++) {
        const s = this._columns.get(cols[k]!)!;
        const va = s._getAt(a);
        const vb = s._getAt(b);
        const aMiss = isMissing(va), bMiss = isMissing(vb);
        if (aMiss && bMiss) continue;
        if (aMiss) return na_position === 'last' ? 1 : -1;
        if (bMiss) return na_position === 'last' ? -1 : 1;
        if ((va as number) < (vb as number)) return ascending[k] ? -1 : 1;
        if ((va as number) > (vb as number)) return ascending[k] ? 1 : -1;
      }
      return 0;
    });
    return this._selectRowPositions(positions);
  }

  sort_index(ascending = true): DataFrame {
    const positions = Array.from({ length: this._index.length }, (_, i) => i);
    positions.sort((a, b) => {
      const ia = this._index[a] as string | number;
      const ib = this._index[b] as string | number;
      if (ia < ib) return ascending ? -1 : 1;
      if (ia > ib) return ascending ? 1 : -1;
      return 0;
    });
    return this._selectRowPositions(positions);
  }

  // ── Merge / Join ──────────────────────────────────────────────────────────────

  merge(
    right: DataFrame,
    options: {
      how?: 'inner' | 'left' | 'right' | 'outer';
      on?: string | string[];
      left_on?: string | string[];
      right_on?: string | string[];
    } = {}
  ): DataFrame {
    const how = options.how ?? 'inner';
    const on = options.on;
    const leftOn = on
      ? (Array.isArray(on) ? on : [on])
      : (options.left_on ? (Array.isArray(options.left_on) ? options.left_on : [options.left_on]) : []);
    const rightOn = on
      ? (Array.isArray(on) ? on : [on])
      : (options.right_on ? (Array.isArray(options.right_on) ? options.right_on : [options.right_on]) : []);

    if (leftOn.length === 0) throw new ValueError('merge requires "on", "left_on+right_on"');

    const rightMap = new Map<string, number[]>();
    for (let i = 0; i < right._index.length; i++) {
      const key = rightOn.map(col => String(right._columns.get(col)!._getAt(i))).join('|');
      if (!rightMap.has(key)) rightMap.set(key, []);
      rightMap.get(key)!.push(i);
    }

    const leftPositions: number[] = [];
    const rightPositions: (number | null)[] = [];

    for (let i = 0; i < this._index.length; i++) {
      const key = leftOn.map(col => String(this._columns.get(col)!._getAt(i))).join('|');
      const matches = rightMap.get(key);
      if (matches && matches.length > 0) {
        for (const j of matches) {
          leftPositions.push(i);
          rightPositions.push(j);
        }
      } else if (how === 'left' || how === 'outer') {
        leftPositions.push(i);
        rightPositions.push(null);
      }
    }

    if (how === 'right' || how === 'outer') {
      const matchedRight = new Set(rightPositions.filter((j): j is number => j !== null));
      for (let j = 0; j < right._index.length; j++) {
        if (!matchedRight.has(j)) {
          leftPositions.push(-1);
          rightPositions.push(j);
        }
      }
    }

    const resultDf = new DataFrame();
    resultDf._index = Array.from({ length: leftPositions.length }, (_, i) => i);

    for (const col of this._columnOrder) {
      const vals = leftPositions.map(i => i === -1 ? NA : this._columns.get(col)!._getAt(i));
      resultDf._columns.set(col, new Series(vals, { name: col, index: resultDf._index }));
      if (!resultDf._columnOrder.includes(col)) resultDf._columnOrder.push(col);
    }

    for (const col of right._columnOrder) {
      const colName = this._columns.has(col) && !leftOn.includes(col) ? `${col}_y` : col;
      const vals = rightPositions.map(j => j === null ? NA : right._columns.get(col)!._getAt(j));
      resultDf._columns.set(colName, new Series(vals, { name: colName, index: resultDf._index }));
      if (!resultDf._columnOrder.includes(colName)) resultDf._columnOrder.push(colName);
    }

    return resultDf;
  }

  // ── Concat (static) ───────────────────────────────────────────────────────────

  static concat(dfs: DataFrame[], options: { axis?: 0 | 1; ignore_index?: boolean } = {}): DataFrame {
    const axis = options.axis ?? 0;
    const ignore_index = options.ignore_index ?? false;

    if (dfs.length === 0) return new DataFrame();

    if (axis === 0) {
      const allCols = [...new Set(dfs.flatMap(df => df._columnOrder))];
      const allRows: Record<string, unknown>[] = [];
      const idx: (string | number)[] = [];

      for (const df of dfs) {
        for (let i = 0; i < df._index.length; i++) {
          const row: Record<string, unknown> = {};
          for (const col of allCols) {
            row[col] = df._columns.has(col) ? df._columns.get(col)!._getAt(i) : NA;
          }
          allRows.push(row);
          idx.push(df._index[i] as string | number);
        }
      }

      const result = new DataFrame(allRows, { columns: allCols });
      if (!ignore_index) result._index = idx;
      return result;
    }

    throw new NotImplementedError('concat(axis=1) not yet implemented');
  }

  // ── Apply / map ───────────────────────────────────────────────────────────────

  apply(fn: (series: Series) => unknown, axis = 0): Record<string, unknown> {
    if (axis !== 0) throw new NotImplementedError('apply(axis=1) not yet implemented');
    const result: Record<string, unknown> = {};
    for (const col of this._columnOrder) {
      result[col] = fn(this._columns.get(col)!);
    }
    return result;
  }

  applymap(fn: (v: unknown) => unknown): DataFrame {
    return this._applyToAll(s => s.apply(fn));
  }

  private _applyToAll(fn: (s: Series) => Series): DataFrame {
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of this._columnOrder) {
      df._columns.set(col, fn(this._columns.get(col)!));
      df._columnOrder.push(col);
    }
    return df;
  }

  // ── Rename ────────────────────────────────────────────────────────────────────

  rename(options: { columns?: Record<string, string>; index?: Record<string | number, string | number> }): DataFrame {
    const df = new DataFrame();
    df._index = options.index
      ? this._index.map(idx => (options.index![idx as string] ?? idx) as string | number)
      : [...this._index];

    for (const col of this._columnOrder) {
      const newCol = options.columns?.[col] ?? col;
      df._columns.set(newCol, this._columns.get(col)!.rename(newCol));
      df._columnOrder.push(newCol);
    }
    return df;
  }

  // ── Add column ────────────────────────────────────────────────────────────────

  assign(columns: Record<string, unknown[] | Series>): DataFrame {
    const df = this.copy();
    for (const [col, vals] of Object.entries(columns)) {
      const series = vals instanceof Series ? vals : new Series(vals as unknown[], { name: col, index: df._index });
      df._columns.set(col, series);
      if (!df._columnOrder.includes(col)) df._columnOrder.push(col);
    }
    return df;
  }

  // ── Reset / set index ──────────────────────────────────────────────────────────

  reset_index(_drop = false): DataFrame {
    const df = this.copy();
    df._index = Array.from({ length: this._index.length }, (_, i) => i);
    for (const series of df._columns.values()) {
      series._setIndex(df._index);
    }
    return df;
  }

  set_index(col: string): DataFrame {
    if (!this._columns.has(col)) throw new KeyError(`'${col}'`);
    const newIndex: (string | number)[] = [];
    const s = this._columns.get(col)!;
    for (let i = 0; i < s.size; i++) {
      newIndex.push(s._getAt(i) as string | number);
    }
    const df = this.copy();
    df._index = newIndex;
    df._columns.delete(col);
    df._columnOrder = df._columnOrder.filter(c => c !== col);
    return df;
  }

  // ── GroupBy ───────────────────────────────────────────────────────────────────

  groupby(by: string | string[], options: { dropna?: boolean; sort?: boolean } = {}): DataFrameGroupBy {
    return new DataFrameGroupBy(this, Array.isArray(by) ? by : [by], options);
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

  resample(freq: string, options: ResampleOptions = {}): DataFrameResampler {
    return new DataFrameResampler(this, freq, options);
  }

  // ── Type conversion ───────────────────────────────────────────────────────────

  astype(dtypes: Record<string, DType | string>): DataFrame {
    const df = this.copy();
    for (const [col, dtype] of Object.entries(dtypes)) {
      if (df._columns.has(col)) {
        df._columns.set(col, df._columns.get(col)!.astype(normalizeDType(dtype)));
      }
    }
    return df;
  }

  // ── Copy ──────────────────────────────────────────────────────────────────────

  copy(): DataFrame {
    const df = new DataFrame();
    df._index = [...this._index];
    df._columnOrder = [...this._columnOrder];
    for (const [col, series] of this._columns) {
      df._columns.set(col, series.copy());
    }
    return df;
  }

  // ── Transpose ────────────────────────────────────────────────────────────────

  get T(): DataFrame {
    const result = new DataFrame();
    result._columnOrder = this._index.map(String);
    result._index = this._columnOrder.map(String);

    const nRows = this._index.length;
    const nCols = this._columnOrder.length;
    for (let c = 0; c < nCols; c++) {
      const colName = String(this._columnOrder[c]);
      const vals: unknown[] = [];
      for (let r = 0; r < nRows; r++) {
        vals.push(this._columns.get(this._columnOrder[r]!)!._getAt(c));
      }
      result._columns.set(colName, new Series(vals, { name: colName, index: result._index }));
    }
    return result;
  }

  // ── Isin ──────────────────────────────────────────────────────────────────────

  isin(values: unknown[] | Record<string, unknown[]>): DataFrame {
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of this._columnOrder) {
      const colVals = Array.isArray(values) ? values : ((values as Record<string, unknown[]>)[col] ?? []);
      df._columns.set(col, this._columns.get(col)!.isin(colVals));
      df._columnOrder.push(col);
    }
    return df;
  }

  // ── to_dict ──────────────────────────────────────────────────────────────────

  to_dict(orient: 'records' | 'list' | 'dict' | 'series' | 'split' | 'index' = 'dict'): unknown {
    if (orient === 'records') {
      return Array.from({ length: this._index.length }, (_, i) => {
        const row: Record<string, unknown> = {};
        for (const col of this._columnOrder) {
          row[col] = this._columns.get(col)!._getAt(i);
        }
        return row;
      });
    }
    if (orient === 'list') {
      const result: Record<string, unknown[]> = {};
      for (const col of this._columnOrder) {
        result[col] = Array.from({ length: this._index.length }, (_, i) =>
          this._columns.get(col)!._getAt(i));
      }
      return result;
    }
    throw new NotImplementedError(`to_dict(orient='${orient}') not yet implemented`);
  }

  // ── Memory usage ──────────────────────────────────────────────────────────────

  memory_usage(): Record<string, number> {
    const result: Record<string, number> = { Index: this._index.length * 8 };
    for (const col of this._columnOrder) {
      const s = this._columns.get(col)!;
      result[col] = s.size * s.dtype.itemsize;
    }
    return result;
  }

  // ── pipe ──────────────────────────────────────────────────────────────────────
  pipe(fn: (df: DataFrame, ...args: unknown[]) => DataFrame, ...args: unknown[]): DataFrame {
    return fn(this, ...args);
  }

  // ── where / mask ──────────────────────────────────────────────────────────────
  where(cond: DataFrame, other: unknown = NaN): DataFrame {
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of this._columnOrder) {
      const vals = Array.from({ length: this._index.length }, (_, i) => {
        const condVal = cond.columns.includes(col) ? (cond._columns.get(col) as Series)._getAt(i) : 1;
        return condVal ? (this._columns.get(col) as Series)._getAt(i) : other;
      });
      df._columns.set(col, new Series(vals, { name: col, index: df._index }));
      df._columnOrder.push(col);
    }
    return df;
  }

  mask(cond: DataFrame, other: unknown = NaN): DataFrame {
    const invertedCond = cond.applymap(v => v ? 0 : 1) as DataFrame;
    return this.where(invertedCond, other);
  }

  // ── diff ─────────────────────────────────────────────────────────────────────
  diff(periods = 1, axis = 0): DataFrame {
    if (axis !== 0) throw new NotImplementedError('diff(axis=1) not implemented');
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of this._columnOrder) {
      const vals = Array.from({ length: this._index.length }, (_, i) => {
        if (i < periods) return NaN;
        const curr = Number((this._columns.get(col) as Series)._getAt(i));
        const prev = Number((this._columns.get(col) as Series)._getAt(i - periods));
        return curr - prev;
      });
      df._columns.set(col, new Series(vals, { name: col, index: df._index }));
      df._columnOrder.push(col);
    }
    return df;
  }

  // ── pct_change ───────────────────────────────────────────────────────────────
  pct_change(periods = 1): DataFrame {
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of this._columnOrder) {
      const vals = Array.from({ length: this._index.length }, (_, i) => {
        if (i < periods) return NaN;
        const curr = Number((this._columns.get(col) as Series)._getAt(i));
        const prev = Number((this._columns.get(col) as Series)._getAt(i - periods));
        return prev !== 0 ? (curr - prev) / Math.abs(prev) : NaN;
      });
      df._columns.set(col, new Series(vals, { name: col, index: df._index }));
      df._columnOrder.push(col);
    }
    return df;
  }

  // ── shift ─────────────────────────────────────────────────────────────────────
  shift(periods = 1): DataFrame {
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of this._columnOrder) {
      const vals = Array.from({ length: this._index.length }, (_, i) => {
        const srcI = i - periods;
        if (srcI < 0 || srcI >= this._index.length) return NaN;
        return (this._columns.get(col) as Series)._getAt(srcI);
      });
      df._columns.set(col, new Series(vals, { name: col, index: df._index }));
      df._columnOrder.push(col);
    }
    return df;
  }

  // ── cumsum / cumprod / cummax / cummin ───────────────────────────────────────
  cumsum(): DataFrame { return this._applyToAll(s => s.cumsum()); }
  cumprod(): DataFrame { return this._applyToAll(s => s.cumprod()); }
  cummax(): DataFrame { return this._applyToAll(s => s.cummax()); }
  cummin(): DataFrame { return this._applyToAll(s => s.cummin()); }

  // ── abs ───────────────────────────────────────────────────────────────────────
  abs(): DataFrame { return this._applyToAll(s => s.abs()); }

  // ── round ─────────────────────────────────────────────────────────────────────
  round(decimals = 0): DataFrame {
    return this._applyToAll(s => s.apply(v => typeof v === 'number' ? Math.round(v * 10**decimals) / 10**decimals : v));
  }

  // ── clip ─────────────────────────────────────────────────────────────────────
  clip(lower?: number, upper?: number): DataFrame {
    return this._applyToAll(s => s.clip(lower, upper));
  }

  // ── rank ─────────────────────────────────────────────────────────────────────
  rank(method: 'average' | 'min' | 'max' | 'first' | 'dense' = 'average'): DataFrame {
    return this._applyToAll(s => s.rank(method));
  }

  // ── nunique ───────────────────────────────────────────────────────────────────
  nunique(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) result[col] = this._columns.get(col)!.nunique();
    return result;
  }

  // ── value_counts ──────────────────────────────────────────────────────────────
  value_counts(subset?: string[]): Series {
    const cols = subset ?? this._columnOrder;
    const counts = new Map<string, number>();
    for (let i = 0; i < this._index.length; i++) {
      const key = cols.map(c => String((this._columns.get(c) as Series)._getAt(i))).join('|');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return new Series(sorted.map(([, v]) => v), { index: sorted.map(([k]) => k) });
  }

  // ── pivot ─────────────────────────────────────────────────────────────────────
  pivot(options: { index: string; columns: string; values: string }): DataFrame {
    const { index, columns, values } = options;
    const rowKeys = [...new Set(Array.from({ length: this._index.length }, (_, i) =>
      String((this._columns.get(index) as Series)._getAt(i))))];
    const colKeys = [...new Set(Array.from({ length: this._index.length }, (_, i) =>
      String((this._columns.get(columns) as Series)._getAt(i))))];

    const data: Record<string, unknown[]> = {};
    for (const ck of colKeys) data[ck] = new Array(rowKeys.length).fill(NaN);

    for (let i = 0; i < this._index.length; i++) {
      const rowKey = String((this._columns.get(index) as Series)._getAt(i));
      const colKey = String((this._columns.get(columns) as Series)._getAt(i));
      const val = (this._columns.get(values) as Series)._getAt(i);
      const rowIdx = rowKeys.indexOf(rowKey);
      data[colKey]![rowIdx] = val;
    }

    return new DataFrame(data, { index: rowKeys });
  }

  // ── pivot_table ───────────────────────────────────────────────────────────────
  pivot_table(options: {
    values?: string | string[];
    index: string | string[];
    columns?: string;
    aggfunc?: string;
    fill_value?: unknown;
  }): DataFrame {
    const indexCols = Array.isArray(options.index) ? options.index : [options.index];
    const aggfunc = options.aggfunc ?? 'mean';
    const valueCols = Array.isArray(options.values)
      ? options.values
      : options.values
        ? [options.values]
        : this._columnOrder.filter(c => !indexCols.includes(c));
    return this.groupby(indexCols).agg(
      Object.fromEntries(valueCols.map(col => [col, aggfunc]))
    );
  }

  // ── melt ─────────────────────────────────────────────────────────────────────
  melt(options: {
    id_vars?: string | string[];
    value_vars?: string | string[];
    var_name?: string;
    value_name?: string;
  } = {}): DataFrame {
    const idVars = options.id_vars ? (Array.isArray(options.id_vars) ? options.id_vars : [options.id_vars]) : [];
    const valueVars = options.value_vars
      ? (Array.isArray(options.value_vars) ? options.value_vars : [options.value_vars])
      : this._columnOrder.filter(c => !idVars.includes(c));
    const varName = options.var_name ?? 'variable';
    const valueName = options.value_name ?? 'value';

    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < this._index.length; i++) {
      for (const valCol of valueVars) {
        const row: Record<string, unknown> = {};
        for (const idCol of idVars) row[idCol] = (this._columns.get(idCol) as Series)._getAt(i);
        row[varName] = valCol;
        row[valueName] = (this._columns.get(valCol) as Series)._getAt(i);
        rows.push(row);
      }
    }
    return new DataFrame(rows);
  }

  // ── stack / unstack ───────────────────────────────────────────────────────────
  stack(): Series {
    const vals: unknown[] = [];
    const idx: string[] = [];
    for (let i = 0; i < this._index.length; i++) {
      for (const col of this._columnOrder) {
        vals.push((this._columns.get(col) as Series)._getAt(i));
        idx.push(`${this._index[i]}-${col}`);
      }
    }
    return new Series(vals, { index: idx });
  }

  // ── corr / cov ────────────────────────────────────────────────────────────────
  corr(): DataFrame {
    const numCols = this._columnOrder.filter(c => {
      const kind = this._columns.get(c)!.dtype.kind;
      return kind === 'float' || kind === 'int';
    });
    const data: Record<string, unknown[]> = {};
    for (const c1 of numCols) {
      data[c1] = [];
      for (const c2 of numCols) {
        (data[c1] as unknown[]).push(this._pearsonCorr(this._columns.get(c1)!, this._columns.get(c2)!));
      }
    }
    return new DataFrame(data, { index: numCols });
  }

  cov(): DataFrame {
    const numCols = this._columnOrder.filter(c => {
      const kind = this._columns.get(c)!.dtype.kind;
      return kind === 'float' || kind === 'int';
    });
    const data: Record<string, unknown[]> = {};
    for (const c1 of numCols) {
      data[c1] = [];
      for (const c2 of numCols) {
        (data[c1] as unknown[]).push(this._cov(this._columns.get(c1)!, this._columns.get(c2)!));
      }
    }
    return new DataFrame(data, { index: numCols });
  }

  private _pearsonCorr(a: Series, b: Series): number {
    const meanA = a.mean(), meanB = b.mean();
    let num = 0, denomA = 0, denomB = 0;
    for (let i = 0; i < a.size; i++) {
      const da = Number(a.iloc(i)) - meanA;
      const db = Number(b.iloc(i)) - meanB;
      num += da * db; denomA += da * da; denomB += db * db;
    }
    return num / Math.sqrt(denomA * denomB);
  }

  private _cov(a: Series, b: Series): number {
    const meanA = a.mean(), meanB = b.mean();
    let sum = 0, n = 0;
    for (let i = 0; i < a.size; i++) {
      sum += (Number(a.iloc(i)) - meanA) * (Number(b.iloc(i)) - meanB);
      n++;
    }
    return n > 1 ? sum / (n - 1) : NaN;
  }

  // ── quantile ─────────────────────────────────────────────────────────────────
  quantile(q = 0.5): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      const s = this._columns.get(col)!;
      const d = s.describe();
      if (q === 0.25) result[col] = d['25%']!;
      else if (q === 0.5) result[col] = d['50%']!;
      else if (q === 0.75) result[col] = d['75%']!;
      else {
        const sorted = s.dropna().sort_values();
        const idx = q * (sorted.size - 1);
        const lo = Math.floor(idx), hi = Math.ceil(idx);
        result[col] = lo === hi ? Number(sorted.iloc(lo))
          : Number(sorted.iloc(lo)) * (hi - idx) + Number(sorted.iloc(hi)) * (idx - lo);
      }
    }
    return result;
  }

  // ── idxmin / idxmax ──────────────────────────────────────────────────────────
  idxmin(): Record<string, string | number> {
    const result: Record<string, string | number> = {};
    for (const col of this._columnOrder) {
      let minVal = Infinity, minIdx: string | number = this._index[0]!;
      for (let i = 0; i < this._index.length; i++) {
        const v = Number((this._columns.get(col) as Series)._getAt(i));
        if (v < minVal) { minVal = v; minIdx = this._index[i]!; }
      }
      result[col] = minIdx;
    }
    return result;
  }

  idxmax(): Record<string, string | number> {
    const result: Record<string, string | number> = {};
    for (const col of this._columnOrder) {
      let maxVal = -Infinity, maxIdx: string | number = this._index[0]!;
      for (let i = 0; i < this._index.length; i++) {
        const v = Number((this._columns.get(col) as Series)._getAt(i));
        if (v > maxVal) { maxVal = v; maxIdx = this._index[i]!; }
      }
      result[col] = maxIdx;
    }
    return result;
  }

  // ── any / all ─────────────────────────────────────────────────────────────────
  any(_axis = 0): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const col of this._columnOrder) {
      let found = false;
      for (let i = 0; i < this._index.length; i++) {
        if ((this._columns.get(col) as Series)._getAt(i)) { found = true; break; }
      }
      result[col] = found;
    }
    return result;
  }

  all(_axis = 0): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const col of this._columnOrder) {
      let allTrue = true;
      for (let i = 0; i < this._index.length; i++) {
        if (!(this._columns.get(col) as Series)._getAt(i)) { allTrue = false; break; }
      }
      result[col] = allTrue;
    }
    return result;
  }

  // ── first_valid_index ─────────────────────────────────────────────────────────
  first_valid_index(): string | number | null {
    for (let i = 0; i < this._index.length; i++) {
      for (const col of this._columnOrder) {
        if (!isMissing((this._columns.get(col) as Series)._getAt(i))) return this._index[i]!;
      }
    }
    return null;
  }

  // ── sample ───────────────────────────────────────────────────────────────────
  sample(n?: number, frac?: number, replace = false): DataFrame {
    const nRows = this._index.length;
    let count = n ?? (frac !== undefined ? Math.floor(frac * nRows) : 1);
    count = Math.min(count, replace ? count : nRows);
    const positions: number[] = [];
    const available = Array.from({ length: nRows }, (_, i) => i);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * available.length);
      positions.push(available[idx]!);
      if (!replace) available.splice(idx, 1);
    }
    return this._selectRowPositions(positions.sort((a, b) => a - b));
  }

  // ── nlargest / nsmallest ──────────────────────────────────────────────────────
  nlargest(n: number, columns: string | string[]): DataFrame {
    const cols = Array.isArray(columns) ? columns : [columns];
    return this.sort_values(cols, { ascending: false }).head(n);
  }

  nsmallest(n: number, columns: string | string[]): DataFrame {
    const cols = Array.isArray(columns) ? columns : [columns];
    return this.sort_values(cols, { ascending: true }).head(n);
  }

  // ── duplicated / drop_duplicates ──────────────────────────────────────────────
  duplicated(subset?: string[], keep: 'first' | 'last' | false = 'first'): Series {
    const cols = subset ?? this._columnOrder;
    const seen = new Map<string, number>();
    const result = new Uint8Array(this._index.length);
    for (let i = 0; i < this._index.length; i++) {
      const key = cols.map(c => String((this._columns.get(c) as Series)._getAt(i))).join('|');
      if (seen.has(key)) {
        if (keep === 'first') result[i] = 1;
        else if (keep === 'last') result[seen.get(key)!] = 1;
        else { result[i] = 1; result[seen.get(key)!] = 1; }
      } else {
        seen.set(key, i);
      }
    }
    return new Series(result, { index: this._index });
  }

  drop_duplicates(subset?: string[], keep: 'first' | 'last' | false = 'first'): DataFrame {
    const dupes = this.duplicated(subset, keep);
    const keepPos: number[] = [];
    for (let i = 0; i < dupes.size; i++) {
      if (!dupes.iloc(i)) keepPos.push(i);
    }
    return this._selectRowPositions(keepPos);
  }

  // ── interpolate ───────────────────────────────────────────────────────────────
  interpolate(method: 'linear' | 'pad' | 'backfill' = 'linear'): DataFrame {
    return this._applyToAll(s => {
      if (method === 'pad' || method === 'backfill') return s.fillna(NaN) as Series;
      const vals: number[] = Array.from({ length: s.size }, (_, i) => Number(s.iloc(i)));
      for (let i = 1; i < vals.length - 1; i++) {
        if (isNaN(vals[i]!)) {
          let lo = i - 1, hi = i + 1;
          while (hi < vals.length && isNaN(vals[hi]!)) hi++;
          if (!isNaN(vals[lo]!) && hi < vals.length && !isNaN(vals[hi]!)) {
            vals[i] = vals[lo]! + (vals[hi]! - vals[lo]!) * (i - lo) / (hi - lo);
          }
        }
      }
      return new Series(new Float64Array(vals), { index: s.index });
    });
  }

  // ── to_records ───────────────────────────────────────────────────────────────
  to_records(options: { index?: boolean } = {}): Record<string, unknown>[] {
    const includeIndex = options.index ?? true;
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < this._index.length; i++) {
      const row: Record<string, unknown> = {};
      if (includeIndex) row['index'] = this._index[i];
      for (const col of this._columnOrder) {
        row[col] = (this._columns.get(col) as any)._getAt(i);
      }
      rows.push(row);
    }
    return rows;
  }

  // ── to_numpy ─────────────────────────────────────────────────────────────────
  to_numpy(): unknown[][] {
    const result: unknown[][] = [];
    for (let i = 0; i < this._index.length; i++) {
      const row: unknown[] = this._columnOrder.map(col =>
        (this._columns.get(col) as any)._getAt(i)
      );
      result.push(row);
    }
    return result;
  }

  // ── equals ───────────────────────────────────────────────────────────────────
  equals(other: DataFrame): boolean {
    if (!_arrEqual(this._index, other._index)) return false;
    if (!_arrEqual(this._columnOrder, other.columns)) return false;
    for (const col of this._columnOrder) {
      const a = this._columns.get(col)!;
      const b = (other as any)._columns.get(col)!;
      if (a.size !== b.size) return false;
      for (let i = 0; i < a.size; i++) {
        const av = a.iloc(i), bv = b.iloc(i);
        if (av !== bv && !(typeof av === 'number' && typeof bv === 'number' && isNaN(av) && isNaN(bv))) return false;
      }
    }
    return true;
  }

  // ── combine_first ────────────────────────────────────────────────────────────
  combine_first(other: DataFrame): DataFrame {
    const allCols = [...new Set([...this._columnOrder, ...other.columns])];
    const allIdx = [...new Set([...this._index, ...other.index])];
    const data: Record<string, unknown[]> = {};

    for (const col of allCols) {
      data[col] = allIdx.map(idx => {
        const selfPos = this._index.indexOf(idx);
        if (selfPos !== -1) {
          const v = (this._columns.get(col) as any)?._getAt(selfPos);
          if (v !== null && v !== undefined && !(typeof v === 'number' && isNaN(v))) return v;
        }
        const otherPos = other.index.indexOf(idx);
        if (otherPos !== -1) {
          return (other as any)._columns.get(col)?._getAt(otherPos) ?? null;
        }
        return null;
      });
    }
    return new DataFrame(data, { index: allIdx });
  }

  // ── compare ──────────────────────────────────────────────────────────────────
  compare(other: DataFrame, options: { result_names?: [string, string] } = {}): DataFrame {
    const [selfName, otherName] = options.result_names ?? ['self', 'other'];
    const diffCols: Record<string, unknown[]> = {};
    for (const col of this._columnOrder) {
      if (!other.columns.includes(col)) continue;
      const selfVals: unknown[] = [], otherVals: unknown[] = [];
      for (let i = 0; i < this._index.length; i++) {
        const sv = (this._columns.get(col) as any)._getAt(i);
        const ov = (other as any)._columns.get(col)?._getAt(i);
        if (sv !== ov) { selfVals.push(sv); otherVals.push(ov); }
        else { selfVals.push(null); otherVals.push(null); }
      }
      diffCols[`${col}_${selfName}`] = selfVals;
      diffCols[`${col}_${otherName}`] = otherVals;
    }
    return new DataFrame(diffCols, { index: this._index });
  }

  // ── update ────────────────────────────────────────────────────────────────────
  update(other: DataFrame, options: { overwrite?: boolean } = {}): void {
    const overwrite = options.overwrite ?? true;
    for (const col of other.columns) {
      if (!this._columnOrder.includes(col)) continue;
      for (let i = 0; i < this._index.length; i++) {
        const idx = this._index[i];
        const otherPos = other.index.indexOf(idx!);
        if (otherPos === -1) continue;
        const v = (other as any)._columns.get(col)._getAt(otherPos);
        const current = (this._columns.get(col) as any)._getAt(i);
        if (overwrite || current === null || current === undefined || (typeof current === 'number' && isNaN(current))) {
          const series = this._columns.get(col)!;
          const vals = Array.from({ length: series.size }, (_, k) =>
            k === i ? v : (series as any)._getAt(k)
          );
          this._columns.set(col, new Series(vals, { name: col, index: this._index }));
        }
      }
    }
  }

  // ── reindex ───────────────────────────────────────────────────────────────────
  reindex(
    index?: (string | number)[],
    options: { fill_value?: unknown; method?: 'ffill' | 'bfill' } = {}
  ): DataFrame {
    const newIndex = index ?? this._index;
    const fill = options.fill_value ?? NaN;
    const data: Record<string, unknown[]> = {};

    for (const col of this._columnOrder) {
      data[col] = newIndex.map(idx => {
        const pos = this._index.indexOf(idx);
        if (pos !== -1) return (this._columns.get(col) as any)._getAt(pos);
        return fill;
      });
    }
    return new DataFrame(data, { index: newIndex });
  }

  // ── swaplevel (for MultiIndex) ────────────────────────────────────────────────
  swaplevel(_i = 0, _j = 1): DataFrame {
    return this.copy();
  }

  // ── xs (cross-section) ────────────────────────────────────────────────────────
  xs(key: string | number, axis = 0): Series | DataFrame {
    if (axis === 0) {
      const pos = this._index.indexOf(key);
      if (pos === -1) throw new Error(`Key '${key}' not found`);
      const data: Record<string, unknown> = {};
      for (const col of this._columnOrder) {
        data[col] = (this._columns.get(col) as any)._getAt(pos);
      }
      return new Series(Object.values(data), { index: Object.keys(data) });
    }
    return this.col(String(key));
  }

  // ── product ───────────────────────────────────────────────────────────────────
  product(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      let p = 1;
      const s = this._columns.get(col)!;
      for (let i = 0; i < s.size; i++) {
        const v = s.iloc(i);
        if (!isMissing(v)) p *= Number(v);
      }
      result[col] = p;
    }
    return result;
  }

  // ── sem ───────────────────────────────────────────────────────────────────────
  sem(ddof = 1): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      const s = this._columns.get(col)!;
      const n = s.count();
      result[col] = n > ddof ? s.std(ddof) / Math.sqrt(n) : NaN;
    }
    return result;
  }

  // ── var ───────────────────────────────────────────────────────────────────────
  var(ddof = 1): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.var(ddof);
    }
    return result;
  }

  // ── median ────────────────────────────────────────────────────────────────────
  median(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      const s = this._columns.get(col)!;
      const sorted = s.dropna().sort_values();
      const n = sorted.size;
      if (n === 0) { result[col] = NaN; continue; }
      const mid = Math.floor(n / 2);
      result[col] = n % 2 === 0
        ? (Number(sorted.iloc(mid - 1)) + Number(sorted.iloc(mid))) / 2
        : Number(sorted.iloc(mid));
    }
    return result;
  }

  // ── mad ───────────────────────────────────────────────────────────────────────
  mad(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      const s = this._columns.get(col)!;
      const mean = s.mean();
      let sum = 0; let n = 0;
      for (let i = 0; i < s.size; i++) {
        const v = s.iloc(i);
        if (!isMissing(v)) { sum += Math.abs(Number(v) - mean); n++; }
      }
      result[col] = n > 0 ? sum / n : NaN;
    }
    return result;
  }

  // ── kurtosis ──────────────────────────────────────────────────────────────────
  kurtosis(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.kurtosis();
    }
    return result;
  }

  // ── skew ──────────────────────────────────────────────────────────────────────
  skew(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.skew();
    }
    return result;
  }

  // ── dot ───────────────────────────────────────────────────────────────────────
  dot(other: DataFrame | Series): DataFrame | Series {
    if (other instanceof Series) {
      const result: unknown[] = [];
      for (let i = 0; i < this._index.length; i++) {
        let sum = 0;
        for (let j = 0; j < this._columnOrder.length; j++) {
          const col = this._columnOrder[j]!;
          sum += Number((this._columns.get(col) as any)._getAt(i)) * Number((other as any)._getAt(j));
        }
        result.push(sum);
      }
      return new Series(result, { index: this._index });
    }
    // DataFrame @ DataFrame
    const data: Record<string, unknown[]> = {};
    for (const col2 of other.columns) {
      data[col2] = this._index.map((_, i) => {
        let sum = 0;
        for (let j = 0; j < this._columnOrder.length; j++) {
          const col1 = this._columnOrder[j]!;
          sum += Number((this._columns.get(col1) as any)._getAt(i)) *
                 Number((other as any)._columns.get(col2)._getAt(j));
        }
        return sum;
      });
    }
    return new DataFrame(data, { index: this._index });
  }
}

function _arrEqual(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

