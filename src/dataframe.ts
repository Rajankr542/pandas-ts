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

  ffill(): DataFrame { return this._applyToAll(s => s.ffill()); }
  bfill(): DataFrame { return this._applyToAll(s => s.bfill()); }

  explode(column: string): DataFrame {
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < this._index.length; i++) {
      const v = (this._columns.get(column) as any)._getAt(i);
      const items = Array.isArray(v) ? v : [v];
      for (const item of items) {
        const row: Record<string, unknown> = {};
        for (const col of this._columnOrder) {
          row[col] = col === column ? item : (this._columns.get(col) as any)._getAt(i);
        }
        rows.push(row);
      }
    }
    return new DataFrame(rows);
  }

  get_dummies(options: { columns?: string[]; prefix?: string; drop_first?: boolean } = {}): DataFrame {
    const cols = options.columns ?? this._columnOrder;
    const prefix = options.prefix ?? '';
    const dropFirst = options.drop_first ?? false;
    const data: Record<string, unknown[]> = {};
    for (const col of this._columnOrder) {
      if (!cols.includes(col)) {
        data[col] = Array.from({ length: this._index.length }, (_, i) =>
          (this._columns.get(col) as any)._getAt(i));
      }
    }
    for (const col of cols) {
      const s = this._columns.get(col)!;
      const cats = s.unique().filter(v => v !== null && v !== undefined).map(String).sort();
      const start = dropFirst ? 1 : 0;
      for (let k = start; k < cats.length; k++) {
        const cat = cats[k]!;
        const colName = prefix ? `${prefix}_${cat}` : `${col}_${cat}`;
        data[colName] = Array.from({ length: this._index.length }, (_, i) =>
          String((this._columns.get(col) as any)._getAt(i)) === cat ? 1 : 0);
      }
    }
    return new DataFrame(data, { index: this._index });
  }

  append(other: DataFrame | Record<string, unknown>, options: { ignore_index?: boolean } = {}): DataFrame {
    const otherDf = other instanceof DataFrame ? other : new DataFrame([other]);
    return DataFrame.concat([this, otherDf], options);
  }

  dropna(options: { axis?: 0 | 1; how?: 'any' | 'all'; thresh?: number } = {}): DataFrame {
    const axis = options.axis ?? 0;
    const how = options.how ?? 'any';

    if (axis === 1) {
      // Drop columns that have any/all NA values
      const keepCols: string[] = [];
      for (const col of this._columnOrder) {
        const s = this._columns.get(col)!;
        let naCount = 0;
        for (let i = 0; i < this._index.length; i++) {
          if (isMissing(s._getAt(i))) naCount++;
        }
        const thresh = options.thresh;
        if (thresh !== undefined) {
          if (this._index.length - naCount >= thresh) keepCols.push(col);
        } else if (how === 'any' && naCount === 0) {
          keepCols.push(col);
        } else if (how === 'all' && naCount < this._index.length) {
          keepCols.push(col);
        }
      }
      const df = new DataFrame();
      df._index = [...this._index];
      for (const col of keepCols) {
        df._columns.set(col, this._columns.get(col)!);
        df._columnOrder.push(col);
      }
      return df;
    }

    const keepPositions: number[] = [];
    const nCols = this._columnOrder.length;

    for (let i = 0; i < this._index.length; i++) {
      let naCount = 0;
      for (const col of this._columnOrder) {
        const v = this._columns.get(col)!._getAt(i);
        if (isMissing(v)) naCount++;
      }
      if (options.thresh !== undefined) {
        if (nCols - naCount >= options.thresh) keepPositions.push(i);
      } else if (how === 'any' && naCount === 0) keepPositions.push(i);
      else if (how === 'all' && naCount < nCols) keepPositions.push(i);
    }
    return this._selectRowPositions(keepPositions);
  }

  // ── Reductions ────────────────────────────────────────────────────────────────

  sum(axis = 0): any {
    if (axis === 1) {
      // Row-wise sum
      const vals = this._index.map((_, i) => {
        let s = 0;
        for (const col of this._columnOrder) s += Number(this._columns.get(col)!._getAt(i) ?? 0);
        return s;
      });
      return new Series(vals, { index: this._index });
    }
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = Number(this._columns.get(col)!.sum());
    }
    return result;
  }

  mean(axis = 0): any {
    if (axis === 1) {
      const vals = this._index.map((_, i) => {
        const nums = this._columnOrder.map(col => Number(this._columns.get(col)!._getAt(i))).filter(v => !isNaN(v));
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
      });
      return new Series(vals, { index: this._index });
    }
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.mean();
    }
    return result;
  }

  min(axis = 0): any {
    if (axis === 1) {
      const vals = this._index.map((_, i) => {
        const nums = this._columnOrder.map(col => Number(this._columns.get(col)!._getAt(i))).filter(v => !isNaN(v));
        return nums.length ? Math.min(...nums) : NaN;
      });
      return new Series(vals, { index: this._index });
    }
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      result[col] = this._columns.get(col)!.min();
    }
    return result;
  }

  max(axis = 0): any {
    if (axis === 1) {
      const vals = this._index.map((_, i) => {
        const nums = this._columnOrder.map(col => Number(this._columns.get(col)!._getAt(i))).filter(v => !isNaN(v));
        return nums.length ? Math.max(...nums) : NaN;
      });
      return new Series(vals, { index: this._index });
    }
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

    // axis=1: concatenate side-by-side (column-wise)
    {
      // Use the index of the first df as the reference; align others to it
      const baseIdx = dfs[0]!._index;
      const resultDf = new DataFrame();
      resultDf._index = ignore_index ? Array.from({ length: baseIdx.length }, (_, i) => i) : [...baseIdx];

      const usedCols = new Set<string>();
      for (const df of dfs) {
        for (const col of df._columnOrder) {
          let colName = col;
          let suffix = 0;
          while (usedCols.has(colName)) colName = `${col}_${++suffix}`;
          usedCols.add(colName);

          // Align rows: if df has the same index, use positions; otherwise align by label
          const vals = resultDf._index.map(idxVal => {
            const pos = df._index.indexOf(idxVal);
            return pos === -1 ? NA : df._columns.get(col)!._getAt(pos);
          });
          resultDf._columns.set(colName, new Series(vals, { name: colName, index: resultDf._index }));
          resultDf._columnOrder.push(colName);
        }
      }
      return resultDf;
    }
  }

  // ── Apply / map ───────────────────────────────────────────────────────────────

  apply(fn: (series: Series) => unknown, axis = 0): Record<string, unknown> | Series {
    if (axis === 1) {
      // Apply row-wise: fn receives a Series of one row
      const vals = this._index.map((_, i) => {
        const rowData: Record<string, unknown> = {};
        for (const col of this._columnOrder) rowData[col] = this._columns.get(col)!._getAt(i);
        return fn(new Series(Object.values(rowData), { index: this._columnOrder }));
      });
      return new Series(vals, { index: this._index });
    }
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
    if (orient === 'dict') {
      // { col: { idx: val, ... }, ... }  — mirrors pandas default
      const result: Record<string, Record<string | number, unknown>> = {};
      for (const col of this._columnOrder) {
        result[col] = {};
        for (let i = 0; i < this._index.length; i++) {
          result[col]![this._index[i] as string | number] = this._columns.get(col)!._getAt(i);
        }
      }
      return result;
    }
    if (orient === 'series') {
      const result: Record<string, Series> = {};
      for (const col of this._columnOrder) {
        result[col] = this._columns.get(col)!;
      }
      return result;
    }
    if (orient === 'split') {
      return {
        index: [...this._index],
        columns: [...this._columnOrder],
        data: Array.from({ length: this._index.length }, (_, i) =>
          this._columnOrder.map(col => this._columns.get(col)!._getAt(i))),
      };
    }
    if (orient === 'index') {
      const result: Record<string | number, Record<string, unknown>> = {};
      for (let i = 0; i < this._index.length; i++) {
        const row: Record<string, unknown> = {};
        for (const col of this._columnOrder) row[col] = this._columns.get(col)!._getAt(i);
        result[this._index[i] as string | number] = row;
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
    if (axis === 1) {
      // Column-wise diff: each column minus the column `periods` to the left
      const df = new DataFrame();
      df._index = [...this._index];
      for (let c = 0; c < this._columnOrder.length; c++) {
        const col = this._columnOrder[c]!;
        if (c < periods) {
          df._columns.set(col, new Series(Array(this._index.length).fill(NaN), { name: col, index: df._index }));
        } else {
          const prevCol = this._columnOrder[c - periods]!;
          const vals = Array.from({ length: this._index.length }, (_, i) =>
            Number(this._columns.get(col)!._getAt(i)) - Number(this._columns.get(prevCol)!._getAt(i)));
          df._columns.set(col, new Series(vals, { name: col, index: df._index }));
        }
        df._columnOrder.push(col);
      }
      return df;
    }
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

  // ── ffill / bfill (added via existing _applyToAll) ───────────────────────────

  // ── Aggregation ─────────────────────────────────────────────────────────────

  agg(func: string | string[] | Record<string, string | string[]> | ((df: DataFrame) => unknown)): unknown {
    if (typeof func === 'function') return func(this);
    if (typeof func === 'string') {
      const fns: Record<string, () => unknown> = {
        sum: () => this.sum(), mean: () => this.mean(), min: () => this.min(),
        max: () => this.max(), std: () => this.std(), var: () => this.var(),
        count: () => this.count(), median: () => this.median(),
        first: () => { const r: Record<string,unknown>={};for(const c of this._columnOrder)r[c]=(this._columns.get(c) as any)._getAt(0);return r; },
        last: () => { const n=this._index.length-1;const r: Record<string,unknown>={};for(const c of this._columnOrder)r[c]=(this._columns.get(c) as any)._getAt(n);return r; },
        nunique: () => this.nunique(), skew: () => this.skew(), kurt: () => this.kurtosis(),
        sem: () => this.sem(), prod: () => this.product(),
      };
      const fn = fns[func];
      if (!fn) throw new ValueError(func);
      return fn();
    }
    if (Array.isArray(func)) {
      const result: Record<string, unknown> = {};
      for (const f of func) result[f] = this.agg(f);
      return result;
    }
    // dict: {col: func | func[]}
    const result: Record<string, unknown> = {};
    for (const [col, f] of Object.entries(func as Record<string, string | string[]>)) {
      const s = this._columns.get(col);
      if (!s) continue;
      result[col] = (s as any).agg(f);
    }
    return result;
  }

  aggregate = this.agg.bind(this);

  transform(func: string | ((s: Series) => Series)): DataFrame {
    return this._applyToAll(s => typeof func === 'string' ? (s as any).transform(func) : func(s));
  }

  // ── Query / Eval ─────────────────────────────────────────────────────────────

  query(expr: string): DataFrame {
    const rows: number[] = [];
    for (let i = 0; i < this._index.length; i++) {
      try {
        const ctx: Record<string, unknown> = {};
        for (const col of this._columnOrder) ctx[col] = (this._columns.get(col) as any)._getAt(i);
        let evalExpr = expr;
        for (const col of this._columnOrder.slice().sort((a,b)=>b.length-a.length)) {
          const val = ctx[col];
          evalExpr = evalExpr.replace(new RegExp(`\\b${col}\\b`, 'g'),
            typeof val === 'string' ? `"${val}"` : String(val));
        }
        // eslint-disable-next-line no-new-func
        const result = new Function(`return (${evalExpr})`)();
        if (result) rows.push(i);
      } catch { /* skip */ }
    }
    return this._selectRowPositions(rows);
  }

  evalExpr(expr: string): Series {
    const data: unknown[] = [];
    for (let i = 0; i < this._index.length; i++) {
      const ctx: Record<string, unknown> = {};
      for (const col of this._columnOrder) ctx[col] = (this._columns.get(col) as any)._getAt(i);
      let evalExpr = expr;
      for (const col of this._columnOrder.slice().sort((a,b)=>b.length-a.length)) {
        const val = ctx[col];
        evalExpr = evalExpr.replace(new RegExp(`\\b${col}\\b`, 'g'),
          typeof val === 'string' ? `"${val}"` : String(val));
      }
      try {
        // eslint-disable-next-line no-new-func
        data.push(new Function(`return (${evalExpr})`)());
      } catch { data.push(NaN); }
    }
    return new Series(data, { index: this._index });
  }

  // ── Join ─────────────────────────────────────────────────────────────────────

  join(other: DataFrame, options: { on?: string; how?: 'left'|'right'|'inner'|'outer'; lsuffix?: string; rsuffix?: string } = {}): DataFrame {
    const how = options.how ?? 'left';
    const lsuffix = options.lsuffix ?? '';
    const rsuffix = options.rsuffix ?? '_right';
    const lIdx = this._index;
    const rIdx = (other as any)._index as (string | number)[];

    const rows: Array<{ li: number; ri: number | null }> = [];
    if (how === 'left' || how === 'outer') {
      for (let i = 0; i < lIdx.length; i++) {
        const ri = rIdx.indexOf(lIdx[i]!);
        rows.push({ li: i, ri: ri === -1 ? null : ri });
      }
    }
    if (how === 'right' || how === 'outer') {
      for (let i = 0; i < rIdx.length; i++) {
        if (!lIdx.includes(rIdx[i]!)) rows.push({ li: -1, ri: i });
      }
    }
    if (how === 'inner') {
      for (let i = 0; i < lIdx.length; i++) {
        const ri = rIdx.indexOf(lIdx[i]!);
        if (ri !== -1) rows.push({ li: i, ri });
      }
    }

    const result: Record<string, unknown[]> = {};
    for (const col of this._columnOrder) {
      const cname = (other as any)._columnOrder.includes(col) ? col + lsuffix : col;
      result[cname] = rows.map(({ li }) => li >= 0 ? (this._columns.get(col) as any)._getAt(li) : NaN);
    }
    for (const col of (other as any)._columnOrder as string[]) {
      const cname = this._columnOrder.includes(col) ? col + rsuffix : col;
      result[cname] = rows.map(({ ri }) => ri !== null ? (other as any)._columns.get(col)._getAt(ri) : NaN);
    }
    const newIndex = rows.map(({ li, ri }) => li >= 0 ? lIdx[li]! : rIdx[ri!]!);
    return new DataFrame(result, { index: newIndex });
  }

  // ── corrwith ─────────────────────────────────────────────────────────────────

  corrwith(other: DataFrame | Series, options: { axis?: 0 | 1 } = {}): Series {
    if (other instanceof Series) {
      const result: Record<string, number> = {};
      for (const col of this._columnOrder) {
        result[col] = (this._columns.get(col) as any).corr(other);
      }
      return new Series(Object.values(result), { index: Object.keys(result) });
    }
    const result: Record<string, number> = {};
    for (const col of this._columnOrder) {
      const otherCol = (other as any)._columns.get(col);
      result[col] = otherCol ? (this._columns.get(col) as any).corr(otherCol) : NaN;
    }
    return new Series(Object.values(result), { index: Object.keys(result) });
  }

  // ── from_dict / from_records ─────────────────────────────────────────────────

  static from_dict(data: Record<string, unknown[]>, options: { orient?: 'columns' | 'index' } = {}): DataFrame {
    if (options.orient === 'index') {
      const rows = Object.entries(data).map(([idx, vals]) => {
        const row: Record<string, unknown> = {};
        if (Array.isArray(vals)) vals.forEach((v, i) => row[String(i)] = v);
        else Object.assign(row, vals);
        return row;
      });
      return new DataFrame(rows, { index: Object.keys(data) });
    }
    return new DataFrame(data);
  }

  static from_records(records: Record<string, unknown>[], options: { index?: string; columns?: string[] } = {}): DataFrame {
    const df = new DataFrame(records);
    if (options.index && df._columns.has(options.index)) {
      const idxVals = Array.from({ length: df._index.length }, (_, i) => (df._columns.get(options.index!) as any)._getAt(i) as string | number);
      const subCols = df._columnOrder.filter(c => c !== options.index);
      const data: Record<string, unknown[]> = {};
      for (const c of subCols) data[c] = Array.from({ length: df._index.length }, (_, i) => (df._columns.get(c) as any)._getAt(i));
      return new DataFrame(data, { index: idxVals });
    }
    if (options.columns) {
      const data: Record<string, unknown[]> = {};
      for (const c of options.columns) {
        data[c] = Array.from({ length: df._index.length }, (_, i) => (df._columns.get(c) as any)?._getAt(i) ?? NaN);
      }
      return new DataFrame(data, { index: df._index });
    }
    return df;
  }

  // ── Indexing helpers ─────────────────────────────────────────────────────────

  at(row: string | number, col: string): unknown {
    const ri = this._index.indexOf(row);
    if (ri === -1) throw new Error(`Key error: ${row}`);
    return (this._columns.get(col) as any)?._getAt(ri);
  }

  iat(row: number, col: number): unknown {
    const colName = this._columnOrder[col];
    if (!colName) throw new Error(`Column index ${col} out of bounds`);
    return (this._columns.get(colName) as any)._getAt(row);
  }

  loc(rows: string | number | (string | number)[] | null, cols?: string | string[]): unknown {
    let rowPositions: number[];
    if (rows === null || rows === undefined) {
      rowPositions = Array.from({ length: this._index.length }, (_, i) => i);
    } else if (Array.isArray(rows)) {
      rowPositions = rows.map(r => this._index.indexOf(r)).filter(p => p !== -1);
    } else {
      const p = this._index.indexOf(rows);
      rowPositions = p === -1 ? [] : [p];
    }
    let colNames: string[];
    if (!cols) colNames = [...this._columnOrder];
    else if (Array.isArray(cols)) colNames = cols;
    else colNames = [cols];

    if (colNames.length === 1 && rowPositions.length === 1 && !Array.isArray(rows) && !Array.isArray(cols)) {
      return (this._columns.get(colNames[0]!) as any)._getAt(rowPositions[0]!);
    }
    const data: Record<string, unknown[]> = {};
    for (const c of colNames) {
      data[c] = rowPositions.map(i => (this._columns.get(c) as any)?._getAt(i) ?? NaN);
    }
    return new DataFrame(data, { index: rowPositions.map(i => this._index[i]!) });
  }

  items(): [string, Series][] {
    return this._columnOrder.map(col => [col, this._columns.get(col)!] as [string, Series]);
  }

  iteritems = this.items.bind(this);

  iterrows(): [string | number, Record<string, unknown>][] {
    return this._index.map((idx, i) => {
      const row: Record<string, unknown> = {};
      for (const col of this._columnOrder) row[col] = (this._columns.get(col) as any)._getAt(i);
      return [idx, row] as [string | number, Record<string, unknown>];
    });
  }

  itertuples(options: { index?: boolean; name?: string } = {}): unknown[][] {
    const includeIndex = options.index !== false;
    return this._index.map((idx, i) => {
      const row = this._columnOrder.map(col => (this._columns.get(col) as any)._getAt(i));
      return includeIndex ? [idx, ...row] : row;
    });
  }

  keys(): string[] { return [...this._columnOrder]; }

  filter(options: { items?: string[]; like?: string; regex?: string; axis?: 0 | 1 } = {}): DataFrame {
    const axis = options.axis ?? 1;
    if (axis === 1) {
      let cols: string[];
      if (options.items) cols = options.items.filter(c => this._columnOrder.includes(c));
      else if (options.like) cols = this._columnOrder.filter(c => c.includes(options.like!));
      else if (options.regex) { const re = new RegExp(options.regex); cols = this._columnOrder.filter(c => re.test(c)); }
      else cols = [...this._columnOrder];
      const data: Record<string, unknown[]> = {};
      for (const c of cols) data[c] = Array.from({ length: this._index.length }, (_, i) => (this._columns.get(c) as any)._getAt(i));
      return new DataFrame(data, { index: this._index });
    }
    let rows: (string | number)[];
    if (options.items) rows = options.items.filter(r => this._index.includes(r as any));
    else if (options.like) rows = this._index.filter(r => String(r).includes(options.like!));
    else if (options.regex) { const re = new RegExp(options.regex); rows = this._index.filter(r => re.test(String(r))); }
    else rows = [...this._index];
    const positions = rows.map(r => this._index.indexOf(r));
    return this._selectRowPositions(positions);
  }

  pop(col: string): Series {
    const s = this._columns.get(col);
    if (!s) throw new Error(`Column ${col} not found`);
    this._columns.delete(col);
    this._columnOrder.splice(this._columnOrder.indexOf(col), 1);
    return s;
  }

  insert(loc: number, column: string, value: Series | unknown[]): void {
    let s: Series;
    if (value instanceof Series) s = value;
    else s = new Series(value as unknown[], { index: this._index });
    this._columns.set(column, s);
    this._columnOrder.splice(loc, 0, column);
  }

  // ── Properties ───────────────────────────────────────────────────────────────

  get empty(): boolean { return this._index.length === 0 || this._columnOrder.length === 0; }

  transpose(): DataFrame {
    const data: Record<string, unknown[]> = {};
    for (let i = 0; i < this._index.length; i++) {
      const rowKey = String(this._index[i]);
      data[rowKey] = this._columnOrder.map(col => (this._columns.get(col) as any)._getAt(i));
    }
    return new DataFrame(data, { index: this._columnOrder.map(String) });
  }

  get attrs(): Record<string, unknown> { return {}; }
  get flags(): Record<string, unknown> { return { allows_duplicate_labels: true }; }

  // ── add_prefix / add_suffix ──────────────────────────────────────────────────

  add_prefix(prefix: string): DataFrame {
    const data: Record<string, unknown[]> = {};
    for (const col of this._columnOrder) {
      data[prefix + col] = Array.from({ length: this._index.length }, (_, i) => (this._columns.get(col) as any)._getAt(i));
    }
    return new DataFrame(data, { index: this._index });
  }

  add_suffix(suffix: string): DataFrame {
    const data: Record<string, unknown[]> = {};
    for (const col of this._columnOrder) {
      data[col + suffix] = Array.from({ length: this._index.length }, (_, i) => (this._columns.get(col) as any)._getAt(i));
    }
    return new DataFrame(data, { index: this._index });
  }

  // ── select_dtypes ────────────────────────────────────────────────────────────

  select_dtypes(options: { include?: string | string[]; exclude?: string | string[] } = {}): DataFrame {
    const include = options.include ? (Array.isArray(options.include) ? options.include : [options.include]) : null;
    const exclude = options.exclude ? (Array.isArray(options.exclude) ? options.exclude : [options.exclude]) : null;
    const cols = this._columnOrder.filter(col => {
      const kind = (this._columns.get(col) as any)._dtype.kind;
      const name = (this._columns.get(col) as any)._dtype.name;
      if (exclude && (exclude.includes(kind) || exclude.includes(name) || (exclude.includes('number') && (kind === 'float' || kind === 'int')))) return false;
      if (include) return include.includes(kind) || include.includes(name) || (include.includes('number') && (kind === 'float' || kind === 'int'));
      return true;
    });
    const data: Record<string, unknown[]> = {};
    for (const c of cols) data[c] = Array.from({ length: this._index.length }, (_, i) => (this._columns.get(c) as any)._getAt(i));
    return new DataFrame(data, { index: this._index });
  }

  // ── convert_dtypes / infer_objects ───────────────────────────────────────────

  infer_objects(): DataFrame {
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of this._columnOrder) {
      const s = this._columns.get(col)!;
      df._columns.set(col, s);
      df._columnOrder.push(col);
    }
    return df;
  }

  convert_dtypes(): DataFrame {
    // Convert to best possible dtypes (numeric strings → numbers, etc.)
    const df = new DataFrame();
    df._index = [...this._index];
    for (const col of this._columnOrder) {
      const s = this._columns.get(col)!;
      // Try to convert string/object series containing numeric strings
      if (s.dtype.name === 'object' || s.dtype.name === 'string') {
        const vals = Array.from({ length: s.size }, (_, i) => s._getAt(i));
        const allNumeric = vals.every(v => v === null || v === undefined || v !== v ||
          (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))));
        if (allNumeric) {
          const nums = vals.map(v => (v === null || v === undefined || (typeof v !== 'string')) ? NaN : Number(v));
          df._columns.set(col, new Series(nums, { name: col, index: df._index }));
          df._columnOrder.push(col);
          continue;
        }
      }
      df._columns.set(col, s);
      df._columnOrder.push(col);
    }
    return df;
  }

  // ── mode ─────────────────────────────────────────────────────────────────────

  mode(options: { axis?: 0 | 1; numeric_only?: boolean } = {}): DataFrame {
    const data: Record<string, unknown[]> = {};
    for (const col of this._columnOrder) {
      const s = this._columns.get(col)!;
      const modes = (s as any).mode();
      data[col] = Array.from({ length: (modes as any).size }, (_: unknown, i: number) => (modes as any)._getAt(i));
    }
    const maxLen = Math.max(...Object.values(data).map(a => a.length));
    for (const col of this._columnOrder) {
      while (data[col]!.length < maxLen) data[col]!.push(NaN);
    }
    return new DataFrame(data);
  }

  // ── replace ──────────────────────────────────────────────────────────────────

  replace(to_replace: unknown | unknown[] | Record<string, unknown>, value?: unknown): DataFrame {
    return this._applyToAll(s => (s as any).replace(to_replace, value));
  }

  // ── align ────────────────────────────────────────────────────────────────────

  align(other: DataFrame, options: { join?: 'inner' | 'outer' | 'left' | 'right' } = {}): [DataFrame, DataFrame] {
    const join = options.join ?? 'outer';
    const thisIdx = this._index;
    const otherIdx = (other as any)._index as (string | number)[];
    let idx: (string | number)[];
    if (join === 'inner') idx = thisIdx.filter(i => otherIdx.includes(i));
    else if (join === 'left') idx = [...thisIdx];
    else if (join === 'right') idx = [...otherIdx];
    else { const s = new Set([...thisIdx, ...otherIdx]); idx = [...s]; }
    const reindex = (df: DataFrame, newIdx: (string | number)[]) => {
      const data: Record<string, unknown[]> = {};
      for (const col of (df as any)._columnOrder as string[]) {
        data[col] = newIdx.map(i => {
          const p = (df as any)._index.indexOf(i);
          return p === -1 ? NaN : (df as any)._columns.get(col)._getAt(p);
        });
      }
      return new DataFrame(data, { index: newIdx });
    };
    return [reindex(this, idx), reindex(other, idx)];
  }

  // ── droplevel / reorder_levels ───────────────────────────────────────────────

  droplevel(_level: number | string, _axis: 0 | 1 = 0): DataFrame { return this.copy(); }
  reorder_levels(_order: (number | string)[], _axis: 0 | 1 = 0): DataFrame { return this.copy(); }

  // ── to_markdown / to_latex / to_string ───────────────────────────────────────

  to_string(options: { index?: boolean; max_rows?: number; max_cols?: number } = {}): string {
    const includeIndex = options.index !== false;
    const maxRows = options.max_rows ?? 60;
    const maxCols = options.max_cols ?? 20;
    const nRows = this._index.length;
    const cols = this._columnOrder.slice(0, maxCols);
    const truncRows = nRows > maxRows;
    const truncCols = this._columnOrder.length > maxCols;

    const rowsToShow = truncRows
      ? [...Array.from({ length: Math.ceil(maxRows / 2) }, (_, i) => i),
         ...Array.from({ length: Math.floor(maxRows / 2) }, (_, i) => nRows - Math.floor(maxRows / 2) + i)]
      : Array.from({ length: nRows }, (_, i) => i);

    const header = includeIndex
      ? ['', ...cols, ...(truncCols ? ['...'] : [])].join('\t')
      : [...cols, ...(truncCols ? ['...'] : [])].join('\t');

    const lines: string[] = [header];
    let prevI = -1;
    for (const i of rowsToShow) {
      if (truncRows && prevI !== -1 && i !== prevI + 1) lines.push('...');
      const vals = cols.map(col => {
        const v = this._columns.get(col)!._getAt(i);
        return v === null || v === undefined ? 'NaN' : String(v);
      });
      const row = includeIndex
        ? [String(this._index[i]), ...vals, ...(truncCols ? ['...'] : [])].join('\t')
        : [...vals, ...(truncCols ? ['...'] : [])].join('\t');
      lines.push(row);
      prevI = i;
    }
    return lines.join('\n');
  }

  to_markdown(options: { index?: boolean } = {}): string {
    const includeIndex = options.index !== false;
    const cols = includeIndex ? ['index', ...this._columnOrder] : this._columnOrder;
    const header = '| ' + cols.join(' | ') + ' |';
    const sep = '| ' + cols.map(() => '---').join(' | ') + ' |';
    const rows = this._index.map((idx, i) => {
      const vals = this._columnOrder.map(col => String((this._columns.get(col) as any)._getAt(i)));
      const rowVals = includeIndex ? [String(idx), ...vals] : vals;
      return '| ' + rowVals.join(' | ') + ' |';
    });
    return [header, sep, ...rows].join('\n');
  }

  to_latex(options: { index?: boolean; caption?: string } = {}): string {
    const includeIndex = options.index !== false;
    const cols = includeIndex ? ['index', ...this._columnOrder] : this._columnOrder;
    const header = cols.join(' & ') + ' \\\\';
    const rows = this._index.map((idx, i) => {
      const vals = this._columnOrder.map(col => String((this._columns.get(col) as any)._getAt(i)));
      return (includeIndex ? [String(idx), ...vals] : vals).join(' & ') + ' \\\\';
    });
    const cap = options.caption ? `\\caption{${options.caption}}\n` : '';
    return `\\begin{table}\n${cap}\\begin{tabular}{${'l'.repeat(cols.length)}}\n\\hline\n${header}\n\\hline\n${rows.join('\n')}\n\\hline\n\\end{tabular}\n\\end{table}`;
  }

  // ── bool ─────────────────────────────────────────────────────────────────────

  bool(): boolean {
    if (this._index.length !== 1 || this._columnOrder.length !== 1) throw new Error('DataFrame truth value is ambiguous');
    return Boolean((this._columns.get(this._columnOrder[0]!) as any)._getAt(0));
  }

  // ── numera-powered operations ────────────────────────────────────────────────

  /** Compute DataFrame covariance matrix using numera */
  cov_matrix(min_periods = 1, ddof = 1): DataFrame {
    const cols = this._columnOrder;
    const n = this._index.length;
    const data: Record<string, unknown[]> = {};
    for (const c1 of cols) {
      data[c1] = [];
      for (const c2 of cols) {
        const a1 = Array.from({ length: n }, (_, i) => Number((this._columns.get(c1) as any)._getAt(i))).filter(v => !isNaN(v));
        const a2 = Array.from({ length: n }, (_, i) => Number((this._columns.get(c2) as any)._getAt(i))).filter(v => !isNaN(v));
        const len = Math.min(a1.length, a2.length);
        if (len < min_periods) { (data[c1] as unknown[]).push(NaN); continue; }
        const m1 = a1.reduce((s, v) => s + v, 0) / len;
        const m2 = a2.reduce((s, v) => s + v, 0) / len;
        const cv = a1.slice(0, len).reduce((s, v, i) => s + (v - m1) * (a2[i]! - m2), 0) / (len - ddof);
        (data[c1] as unknown[]).push(cv);
      }
    }
    return new DataFrame(data, { index: cols });
  }

  /** Compute correlation matrix */
  corr_matrix(method: 'pearson' | 'spearman' = 'pearson', min_periods = 1): DataFrame {
    const cols = this._columnOrder;

    if (method === 'spearman') {
      // Rank each column then compute Pearson on ranks
      const ranked = new DataFrame();
      ranked._index = [...this._index];
      for (const col of cols) {
        ranked._columns.set(col, this._columns.get(col)!.rank('average'));
        ranked._columnOrder.push(col);
      }
      return ranked.corr_matrix('pearson', min_periods);
    }
    const cov = this.cov_matrix(min_periods, 1);
    const data: Record<string, unknown[]> = {};
    for (const c1 of cols) {
      data[c1] = cols.map(c2 => {
        const cv12 = Number((cov as any)._columns.get(c1)?._getAt(cols.indexOf(c2)));
        const cv11 = Number((cov as any)._columns.get(c1)?._getAt(cols.indexOf(c1)));
        const cv22 = Number((cov as any)._columns.get(c2)?._getAt(cols.indexOf(c2)));
        if (isNaN(cv12) || cv11 <= 0 || cv22 <= 0) return NaN;
        return cv12 / Math.sqrt(cv11 * cv22);
      });
    }
    return new DataFrame(data, { index: cols });
  }

}

function _arrEqual(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

