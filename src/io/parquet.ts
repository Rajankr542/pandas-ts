/**
 * Parquet IO stubs.
 * Full implementation requires parquet-wasm + apache-arrow (planned for a later phase).
 */

import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export interface ReadParquetOptions {
  columns?: string[];
}

export interface ToParquetOptions {
  compression?: 'snappy' | 'gzip' | 'brotli' | 'zstd' | 'none';
}

export function read_parquet(_filepath: string, _options: ReadParquetOptions = {}): DataFrame {
  throw new NotImplementedError(
    'read_parquet requires the parquet-wasm package. ' +
    'Install it with: npm install parquet-wasm apache-arrow'
  );
}

export function to_parquet(_df: DataFrame, _filepath: string, _options: ToParquetOptions = {}): void {
  throw new NotImplementedError(
    'to_parquet requires the parquet-wasm package. ' +
    'Install it with: npm install parquet-wasm apache-arrow'
  );
}
