/**
 * Parquet IO — read_parquet / to_parquet.
 *
 * Real implementation requires: npm install parquet-wasm apache-arrow
 * This file throws NotImplementedError until those packages are installed.
 */
import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export interface ReadParquetOptions {
  /** Columns to read. Default: all */
  columns?: string[];
  /** Number of rows. Default: all */
  nrows?: number;
  /** Engine: 'auto' | 'pyarrow' | 'fastparquet'. Default: 'auto' */
  engine?: string;
}

export interface ToParquetOptions {
  /** Compression codec. Default: 'snappy' */
  compression?: 'snappy' | 'gzip' | 'brotli' | 'zstd' | 'none';
  /** Whether to include index. Default: true */
  index?: boolean;
  /** Engine: 'auto' | 'pyarrow' | 'fastparquet'. Default: 'auto' */
  engine?: string;
}

/**
 * Read a Parquet file into a DataFrame.
 * Requires: npm install parquet-wasm apache-arrow
 */
export function read_parquet(
  _filePath: string,
  _options: ReadParquetOptions = {}
): Promise<DataFrame> {
  throw new NotImplementedError(
    'read_parquet requires parquet-wasm and apache-arrow.\n' +
    'Install with: npm install parquet-wasm apache-arrow'
  );
}

/**
 * Write a DataFrame to a Parquet file.
 * Requires: npm install parquet-wasm apache-arrow
 */
export function to_parquet(
  _df: DataFrame,
  _filePath: string,
  _options: ToParquetOptions = {}
): Promise<void> {
  throw new NotImplementedError(
    'to_parquet requires parquet-wasm and apache-arrow.\n' +
    'Install with: npm install parquet-wasm apache-arrow'
  );
}
