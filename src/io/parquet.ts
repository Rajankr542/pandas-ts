/**
 * Parquet IO — read_parquet / to_parquet.
 *
 * Uses parquet-wasm + apache-arrow when available:
 *   npm install parquet-wasm apache-arrow
 *
 * Falls back to a clear NotImplementedError when those packages are not installed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

// Dynamic import wrapper — avoids tsc errors for optional peer deps.
// The `new Function` form also lets us test in vitest without bundler interference.
/* eslint-disable @typescript-eslint/no-implied-eval */
const _dyn = new Function('pkg', 'return import(pkg)') as (pkg: string) => Promise<any>;

function isModuleNotFound(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  const code = (err as any).code as string | undefined;
  return (
    code === 'ERR_MODULE_NOT_FOUND' ||
    code === 'MODULE_NOT_FOUND' ||
    msg.includes('Cannot find module') ||
    msg.includes('Cannot find package') ||
    msg.includes('ERR_MODULE_NOT_FOUND') ||
    msg.includes('Failed to load url') ||
    msg.includes('Failed to resolve') ||
    (err instanceof TypeError && msg.includes('dynamic import callback'))
  );
}

async function optImport(pkg: string): Promise<any> {
  try {
    return await _dyn(pkg);
  } catch (err) {
    if (isModuleNotFound(err)) {
      const e = new NotImplementedError(
        `${pkg} is not installed.\nInstall with: npm install parquet-wasm apache-arrow`
      );
      throw e;
    }
    throw err;
  }
}

export interface ReadParquetOptions {
  columns?: string[];
  nrows?: number;
  engine?: string;
}

export interface ToParquetOptions {
  compression?: 'snappy' | 'gzip' | 'brotli' | 'zstd' | 'none';
  index?: boolean;
  engine?: string;
}

export async function read_parquet(
  filePath: string,
  options: ReadParquetOptions = {}
): Promise<DataFrame> {
  const parquet = await optImport('parquet-wasm');
  const arrow = await optImport('apache-arrow');
  const buf = readFileSync(filePath);
  const arrowBuf = parquet.readParquet(buf);
  const table = arrow.tableFromIPC(arrowBuf);
  const data: Record<string, unknown[]> = {};
  for (const field of table.schema.fields) {
    if (options.columns && !options.columns.includes(field.name)) continue;
    const col = table.getChild(field.name);
    if (col) {
      const vals: unknown[] = [];
      for (let i = 0; i < col.length; i++) vals.push(col.get(i));
      data[field.name] = options.nrows ? vals.slice(0, options.nrows) : vals;
    }
  }
  return new DataFrame(data);
}

export async function to_parquet(
  df: DataFrame,
  filePath: string,
  options: ToParquetOptions = {}
): Promise<void> {
  const parquet = await optImport('parquet-wasm');
  const arrow = await optImport('apache-arrow');
  const dfAny = df as any;
  const cols = df.columns;
  const arrowData: Record<string, unknown[]> = {};
  for (const col of cols) {
    arrowData[col] = Array.from({ length: dfAny._index.length }, (_: unknown, i: number) =>
      dfAny._columns.get(col)._getAt(i));
  }
  const table = arrow.tableFrom(arrowData);
  const ipc = arrow.tableToIPC(table);
  const compression = (options.compression ?? 'snappy') as string;
  const parquetBuf = parquet.writeParquet(ipc, { compression });
  writeFileSync(filePath, parquetBuf);
}
