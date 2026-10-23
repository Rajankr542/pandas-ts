/**
 * Excel IO stubs.
 * Full implementation requires xlsx (SheetJS CE).
 */

import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export interface ReadExcelOptions {
  sheet_name?: string | number;
  header?: number | null;
  index_col?: number | null;
  nrows?: number;
}

export interface ToExcelOptions {
  sheet_name?: string;
  index?: boolean;
}

export function read_excel(_filepath: string, _options: ReadExcelOptions = {}): DataFrame {
  throw new NotImplementedError(
    'read_excel requires the xlsx package. ' +
    'Install it with: npm install xlsx'
  );
}

export function to_excel(_df: DataFrame, _filepath: string, _options: ToExcelOptions = {}): void {
  throw new NotImplementedError(
    'to_excel requires the xlsx package. ' +
    'Install it with: npm install xlsx'
  );
}
