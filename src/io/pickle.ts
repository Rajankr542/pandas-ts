/**
 * Pickle IO — read_pickle / to_pickle stubs.
 * Python pickle format is not supported in TypeScript.
 * Use JSON or Parquet for cross-language serialization.
 */
import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export async function read_pickle(_filePath: string): Promise<DataFrame> {
  throw new NotImplementedError(
    'read_pickle: Python pickle format is not supported in pandas-ts.\n' +
    'Use read_parquet() or read_json() for cross-language serialization.'
  );
}

export async function to_pickle(_df: DataFrame, _filePath: string): Promise<void> {
  throw new NotImplementedError(
    'to_pickle: Python pickle format is not supported in pandas-ts.\n' +
    'Use to_parquet() or to_json() for cross-language serialization.'
  );
}
