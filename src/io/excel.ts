/**
 * Excel IO — read_excel / to_excel using SheetJS (xlsx).
 * Supports: .xlsx, .xls, .xlsb, .ods, .csv
 */
import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

// Lazy import xlsx to avoid bundling cost when not used
let XLSX: typeof import('xlsx') | null = null;
async function getXLSX(): Promise<typeof import('xlsx')> {
  if (!XLSX) {
    try {
      XLSX = await import('xlsx');
    } catch {
      throw new NotImplementedError(
        'Excel IO requires the xlsx package. Install with: npm install xlsx'
      );
    }
  }
  return XLSX;
}

export interface ReadExcelOptions {
  /** Sheet name or index. Default: 0 */
  sheet_name?: string | number;
  /** Row number(s) to use as column labels. Default: 0 */
  header?: number;
  /** Number of rows to skip at the top (after header). Default: 0 */
  skiprows?: number;
  /** Number of rows to read. Default: all */
  nrows?: number;
  /** Use first column as index */
  index_col?: number;
  /** Columns to parse as dates */
  parse_dates?: boolean | string[];
}

export interface ToExcelOptions {
  /** File path to write */
  path?: string;
  /** Sheet name. Default: 'Sheet1' */
  sheet_name?: string;
  /** Whether to write index. Default: true */
  index?: boolean;
  /** Start row (0-indexed). Default: 0 */
  startrow?: number;
  /** Start column (0-indexed). Default: 0 */
  startcol?: number;
}

/**
 * Read an Excel file into a DataFrame.
 * @param filePath Path to the Excel file
 * @param options Read options
 */
export async function read_excel(
  filePath: string,
  options: ReadExcelOptions = {}
): Promise<DataFrame> {
  const xlsx = await getXLSX();
  const { readFile, utils } = xlsx;

  const workbook = readFile(filePath);
  const sheetName = typeof options.sheet_name === 'string'
    ? options.sheet_name
    : workbook.SheetNames[options.sheet_name ?? 0]!;

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found in workbook`);
  }

  // Convert to array of arrays
  const raw: unknown[][] = utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];

  if (raw.length === 0) return new DataFrame();

  const headerRow = options.header ?? 0;
  const headers = (raw[headerRow] as unknown[]).map(h => h === null ? '' : String(h));

  const skipRows = options.skiprows ?? 0;
  const dataStart = headerRow + 1 + skipRows;
  const nRows = options.nrows !== undefined
    ? Math.min(options.nrows, raw.length - dataStart)
    : raw.length - dataStart;

  const data: Record<string, unknown[]> = {};
  for (const h of headers) data[h] = [];

  for (let i = dataStart; i < dataStart + nRows && i < raw.length; i++) {
    const row = raw[i] as unknown[];
    headers.forEach((h, j) => {
      data[h]!.push(row[j] ?? null);
    });
  }

  // Handle index_col
  if (options.index_col !== undefined) {
    const indexColName = headers[options.index_col];
    if (indexColName) {
      const indexData = data[indexColName]!;
      delete data[indexColName];
      return new DataFrame(data, { index: indexData as (string | number)[] });
    }
  }

  return new DataFrame(data);
}

/**
 * Write a DataFrame to an Excel file.
 * @param df DataFrame to write
 * @param options Write options
 */
export async function to_excel(
  df: DataFrame,
  options: ToExcelOptions = {}
): Promise<void> {
  const xlsx = await getXLSX();
  const { utils, writeFile } = xlsx;

  const sheetName = options.sheet_name ?? 'Sheet1';
  const includeIndex = options.index ?? true;
  const startRow = options.startrow ?? 0;
  const startCol = options.startcol ?? 0;

  const dfAny = df as any;
  const rows: unknown[][] = [];

  // Header row
  const headers: unknown[] = [];
  if (includeIndex) headers.push('');
  headers.push(...df.columns);
  rows.push(headers);

  // Data rows
  for (let i = 0; i < dfAny._index.length; i++) {
    const row: unknown[] = [];
    if (includeIndex) row.push(dfAny._index[i]);
    for (const col of df.columns) {
      row.push(dfAny._columns.get(col)._getAt(i));
    }
    rows.push(row);
  }

  // origin is a valid runtime option; cast to any to bypass strict type check
  const ws = utils.aoa_to_sheet(rows, { origin: { r: startRow, c: startCol } } as any);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName);

  const filePath = options.path ?? 'output.xlsx';
  writeFile(wb, filePath);
}

/**
 * Read multiple sheets from an Excel workbook.
 * Returns a Map of sheet name → DataFrame.
 */
export async function read_excel_all_sheets(
  filePath: string,
  options: ReadExcelOptions = {}
): Promise<Map<string, DataFrame>> {
  const xlsx = await getXLSX();
  const { readFile } = xlsx;

  const workbook = readFile(filePath);
  const result = new Map<string, DataFrame>();

  for (const sheetName of workbook.SheetNames) {
    const df = await read_excel(filePath, { ...options, sheet_name: sheetName });
    result.set(sheetName, df);
  }

  return result;
}
