import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export function read_hdf(path_or_buf: string, key?: string, options: Record<string, unknown> = {}): DataFrame {
  throw new NotImplementedError('read_hdf is not supported in pandas-ts (requires HDF5 native library)');
}

export function to_hdf(df: DataFrame, path_or_buf: string, key: string, options: Record<string, unknown> = {}): void {
  throw new NotImplementedError('to_hdf is not supported in pandas-ts (requires HDF5 native library)');
}
