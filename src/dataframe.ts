/**
 * pandas-ts DataFrame — a two-dimensional labeled data structure.
 *
 * Mirrors the pandas.DataFrame API.
 */

import { Series } from './series.js';
import { DType, normalizeDType } from './dtype.js';
import { KeyError, ValueError, NotImplementedError } from './errors.js';
import { isMissing, NA } from './na.js';

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

  groupby(by: string | string[]): _DataFrameGroupBy {
    return new _DataFrameGroupBy(this, Array.isArray(by) ? by : [by]);
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
}

// ── GroupBy helper ────────────────────────────────────────────────────────────

class _DataFrameGroupBy {
  private _df: DataFrame;
  private _by: string[];
  private _groups: Map<string, number[]>;

  constructor(df: DataFrame, by: string[]) {
    this._df = df;
    this._by = by;
    this._groups = this._buildGroups();
  }

  private _buildGroups(): Map<string, number[]> {
    const groups = new Map<string, number[]>();
    for (let i = 0; i < this._df.index.length; i++) {
      const key = this._by.map(col => String(this._df.col(col)._getAt(i))).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(i);
    }
    return groups;
  }

  sum(): DataFrame { return this._agg(s => s.sum()); }
  mean(): DataFrame { return this._agg(s => s.mean()); }
  min(): DataFrame { return this._agg(s => s.min()); }
  max(): DataFrame { return this._agg(s => s.max()); }
  count(): DataFrame { return this._agg(s => s.count()); }
  std(): DataFrame { return this._agg(s => s.std()); }

  private _agg(fn: (s: Series) => unknown): DataFrame {
    const keyVals: Record<string, unknown[]> = {};
    for (const col of this._by) keyVals[col] = [];
    const aggCols = this._df.columns.filter(c => !this._by.includes(c));
    const aggVals: Record<string, unknown[]> = {};
    for (const col of aggCols) aggVals[col] = [];

    for (const [key, positions] of this._groups) {
      const keyParts = key.split('|');
      for (let k = 0; k < this._by.length; k++) {
        keyVals[this._by[k]!]!.push(keyParts[k]);
      }
      const subDf = this._df._selectRowPositions(positions);
      for (const col of aggCols) {
        aggVals[col]!.push(fn(subDf.col(col)));
      }
    }

    const allCols = { ...keyVals, ...aggVals };
    return new DataFrame(allCols);
  }

  get groups(): Map<string, number[]> { return this._groups; }
  get ngroups(): number { return this._groups.size; }

  size(): Series {
    const keys: string[] = [];
    const sizes: number[] = [];
    for (const [key, positions] of this._groups) {
      keys.push(key);
      sizes.push(positions.length);
    }
    return new Series(sizes, { index: keys });
  }
}
