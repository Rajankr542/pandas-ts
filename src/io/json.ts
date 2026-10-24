/**
 * JSON reader/writer for pandas-ts.
 */

import { DataFrame } from '../dataframe.js';
import { ValueError, NotImplementedError } from '../errors.js';
import { isMissing } from '../na.js';
import * as fs from 'node:fs';

export type JsonOrient = 'records' | 'split' | 'index' | 'columns' | 'values' | 'table';

export interface ReadJsonOptions {
  orient?: JsonOrient;
}

export interface ToJsonOptions {
  orient?: JsonOrient;
  /** Include index in output (default: true for most orientations) */
  index?: boolean;
  /** NA representation */
  na_rep?: unknown;
  indent?: number;
}

/**
 * Parse JSON string into a DataFrame.
 */
export function parseJson(text: string, options: ReadJsonOptions = {}): DataFrame {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ValueError('Invalid JSON');
  }

  const orient = options.orient ?? inferOrient(parsed);

  switch (orient) {
    case 'records': {
      if (!Array.isArray(parsed)) throw new ValueError('orient=records expects an array');
      return new DataFrame(parsed as Record<string, unknown>[]);
    }
    case 'columns': {
      if (typeof parsed !== 'object' || parsed === null) throw new ValueError('orient=columns expects an object');
      // columns orient: { colName: { index: value, ... }, ... }
      // Extract values in index order
      const obj = parsed as Record<string, Record<string | number, unknown>>;
      const cols = Object.keys(obj);
      if (cols.length === 0) return new DataFrame();
      const firstCol = cols[0]!;
      const indices = Object.keys(obj[firstCol]!);
      const colArr: Record<string, unknown[]> = {};
      for (const col of cols) {
        colArr[col] = indices.map(idx => obj[col]![idx]);
      }
      return new DataFrame(colArr, { index: indices.map(idx => (isNaN(Number(idx)) ? idx : Number(idx))) });
    }
    case 'split': {
      const obj = parsed as { columns: string[]; data: unknown[][]; index?: unknown[] };
      const colObj: Record<string, unknown[]> = {};
      for (let c = 0; c < obj.columns.length; c++) {
        colObj[obj.columns[c]!] = obj.data.map(row => row[c]);
      }
      const df = new DataFrame(colObj);
      return df;
    }
    case 'index': {
      // { index: { col: val, ... }, ... }
      const obj = parsed as Record<string, Record<string, unknown>>;
      const indices = Object.keys(obj);
      if (indices.length === 0) return new DataFrame();
      const cols = Object.keys(obj[indices[0]!]!);
      const colObj: Record<string, unknown[]> = {};
      for (const col of cols) colObj[col] = indices.map(idx => obj[idx]![col]);
      return new DataFrame(colObj, { index: indices });
    }
    case 'values': {
      if (!Array.isArray(parsed)) throw new ValueError('orient=values expects a 2D array');
      return new DataFrame(parsed as unknown[][]);
    }
    case 'table': {
      // pandas Table Schema: { schema: { fields, primaryKey }, data: [...] }
      const obj = parsed as { schema: { fields: Array<{ name: string; type: string }> }; data: Record<string, unknown>[] };
      const cols = obj.schema?.fields?.map(f => f.name).filter(n => n !== 'index') ?? Object.keys(obj.data?.[0] ?? {});
      const colObj: Record<string, unknown[]> = {};
      for (const col of cols) colObj[col] = obj.data.map(row => row[col]);
      const idx = obj.data.map(row => row['index'] ?? row['id']);
      const df = new DataFrame(colObj);
      if (idx.every(v => v !== undefined)) (df as any)._index = idx;
      return df;
    }
    default:
      throw new NotImplementedError(`orient='${orient}' not yet supported`);
  }
}

/**
 * Read JSON from a file path.
 */
export function read_json(filepath: string, options: ReadJsonOptions = {}): DataFrame {
  try {
    const text = fs.readFileSync(filepath, { encoding: 'utf-8' });
    return parseJson(text, options);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ValueError(`File not found: ${filepath}`);
    }
    throw err;
  }
}

/**
 * Serialize a DataFrame to JSON string.
 */
export function toJsonString(df: DataFrame, options: ToJsonOptions = {}): string {
  const orient = options.orient ?? 'columns';
  const indent = options.indent;

  function serializeVal(v: unknown): unknown {
    if (isMissing(v)) return options.na_rep ?? null;
    return v;
  }

  function getAt(col: string, i: number): unknown {
    return (df.col(col) as unknown as { _getAt(i: number): unknown })._getAt(i);
  }

  switch (orient) {
    case 'records': {
      const records = df.to_dict('records') as Record<string, unknown>[];
      return JSON.stringify(records.map(r =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, serializeVal(v)]))), null, indent);
    }
    case 'columns': {
      const obj: Record<string, Record<string | number, unknown>> = {};
      for (const col of df.columns) {
        obj[col] = {};
        for (let i = 0; i < df.index.length; i++) {
          obj[col]![df.index[i]!] = serializeVal(getAt(col, i));
        }
      }
      return JSON.stringify(obj, null, indent);
    }
    case 'split': {
      const data = Array.from({ length: df.index.length }, (_, i) =>
        df.columns.map(col => serializeVal(getAt(col, i))));
      return JSON.stringify({ columns: df.columns, index: df.index, data }, null, indent);
    }
    case 'index': {
      const obj: Record<string | number, Record<string, unknown>> = {};
      for (let i = 0; i < df.index.length; i++) {
        obj[df.index[i]!] = {};
        for (const col of df.columns) {
          obj[df.index[i]!]![col] = serializeVal(getAt(col, i));
        }
      }
      return JSON.stringify(obj, null, indent);
    }
    case 'values': {
      const data = Array.from({ length: df.index.length }, (_, i) =>
        df.columns.map(col => serializeVal(getAt(col, i))));
      return JSON.stringify(data, null, indent);
    }
    case 'table': {
      // pandas Table Schema format
      const fields = df.columns.map(col => {
        const dtype = df.col(col).dtype.name;
        const pandasType = dtype === 'float64' || dtype === 'float32' ? 'number'
          : dtype.startsWith('int') || dtype.startsWith('uint') ? 'integer'
          : dtype === 'bool' ? 'boolean'
          : dtype === 'datetime64' ? 'datetime'
          : 'string';
        return { name: col, type: pandasType };
      });
      const data = Array.from({ length: df.index.length }, (_, i) => {
        const row: Record<string, unknown> = { index: df.index[i] };
        for (const col of df.columns) row[col] = serializeVal(getAt(col, i));
        return row;
      });
      const schema = { fields: [{ name: 'index', type: 'integer' }, ...fields], primaryKey: ['index'] };
      return JSON.stringify({ schema, data }, null, indent);
    }
    default:
      throw new NotImplementedError(`orient='${orient}' not yet supported for to_json`);
  }
}

/**
 * Write a DataFrame to a JSON file.
 */
export function to_json(df: DataFrame, filepath: string, options: ToJsonOptions = {}): void {
  const text = toJsonString(df, options);
  fs.writeFileSync(filepath, text, { encoding: 'utf-8' });
}

function inferOrient(parsed: unknown): JsonOrient {
  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) return 'records';
    return 'values';
  }
  return 'columns';
}
