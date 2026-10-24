import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export function read_stata(path_or_buf: string, options: Record<string, unknown> = {}): DataFrame {
  throw new NotImplementedError('read_stata is not supported in pandas-ts');
}

export function to_stata(df: DataFrame, path_or_buf: string, options: Record<string, unknown> = {}): void {
  throw new NotImplementedError('to_stata is not supported in pandas-ts');
}
