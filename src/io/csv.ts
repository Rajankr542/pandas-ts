/**
 * CSV reader/writer for pandas-ts.
 * Pure TypeScript — no native dependencies.
 */

import { DataFrame } from '../dataframe.js';
import { float64, bool_, string_, int64, normalizeDType, DType } from '../dtype.js';
import { ParserError, ValueError } from '../errors.js';
import { isMissing, NA } from '../na.js';
import * as fs from 'node:fs';

export interface ReadCsvOptions {
  /** Column separator (default: ',') */
  sep?: string;
  /** Row to use as column names (default: 0, use null for no header) */
  header?: number | null;
  /** Columns to use as the index */
  index_col?: string | number | null;
  /** Custom column names */
  names?: string[];
  /** Number of rows to skip at the start */
  skiprows?: number;
  /** Number of rows to read */
  nrows?: number;
  /** Values to treat as NA */
  na_values?: string | string[];
  /** Whether to skip blank lines (default: true) */
  skip_blank_lines?: boolean;
  /** Comment character */
  comment?: string;
  /** Per-column dtype overrides */
  dtype?: Record<string, DType | string>;
  /** String encoding (default: 'utf-8') */
  encoding?: string;
}

export interface ToCsvOptions {
  /** Column separator (default: ',') */
  sep?: string;
  /** Include index in output (default: true) */
  index?: boolean;
  /** Columns to write (default: all) */
  columns?: string[];
  /** NA representation (default: '') */
  na_rep?: string;
  /** Float format string */
  float_format?: string;
  /** Header row (default: true) */
  header?: boolean;
}

/**
 * Parse CSV text into a DataFrame.
 */
export function parseCsv(text: string, options: ReadCsvOptions = {}): DataFrame {
  const sep = options.sep ?? ',';
  const naValues = new Set<string>(
    options.na_values
      ? Array.isArray(options.na_values) ? options.na_values : [options.na_values]
      : ['', 'NA', 'N/A', 'NaN', 'nan', 'null', 'NULL', 'None', 'none', '#N/A', '#NA']
  );
  const skipRows = options.skiprows ?? 0;
  const skip_blank_lines = options.skip_blank_lines ?? true;
  const comment = options.comment;

  // Split into lines, handle \r\n and \n
  let lines = text.split(/\r?\n/);

  // Filter blank and comment lines
  if (skip_blank_lines) {
    lines = lines.filter(l => l.trim().length > 0);
  }
  if (comment) {
    lines = lines.filter(l => !l.startsWith(comment));
  }

  // Skip rows
  lines = lines.slice(skipRows);

  if (lines.length === 0) return new DataFrame();

  // Parse header
  const headerRow: number | null = options.header === null ? null : (options.header ?? 0);
  let colNames: string[];
  let dataStartLine: number;

  if (headerRow === null) {
    // No header — generate column names
    const firstRow = parseRow(lines[0]!, sep);
    colNames = options.names ?? firstRow.map((_, i) => `${i}`);
    dataStartLine = 0;
  } else {
    const hLine = lines[headerRow]!;
    colNames = options.names ?? parseRow(hLine, sep);
    dataStartLine = headerRow + 1;
  }

  // Apply nrows limit
  const dataLines = options.nrows !== undefined
    ? lines.slice(dataStartLine, dataStartLine + options.nrows)
    : lines.slice(dataStartLine);

  // Parse rows into column arrays
  const nCols = colNames.length;
  const colData: unknown[][] = Array.from({ length: nCols }, () => []);

  for (const line of dataLines) {
    if (skip_blank_lines && line.trim().length === 0) continue;
    const row = parseRow(line, sep);
    for (let c = 0; c < nCols; c++) {
      const raw = row[c] ?? '';
      colData[c]!.push(naValues.has(raw.trim()) ? NaN : raw);
    }
  }

  // Build column dict
  const colDict: Record<string, unknown[]> = {};
  for (let c = 0; c < nCols; c++) {
    const col = colNames[c];
    if (!col) continue;
    // Try to infer numeric
    colDict[col] = inferColumn(colData[c]!, options.dtype?.[col]);
  }

  const df = new DataFrame(colDict);

  // Set index column
  if (options.index_col !== null && options.index_col !== undefined) {
    const indexCol = typeof options.index_col === 'number'
      ? colNames[options.index_col]
      : options.index_col;
    if (indexCol && df.columns.includes(indexCol)) {
      return df.set_index(indexCol);
    }
  }

  return df;
}

/**
 * Read CSV from a file path.
 */
export function read_csv(filepath: string, options: ReadCsvOptions = {}): DataFrame {
  try {
    const text = fs.readFileSync(filepath, { encoding: (options.encoding ?? 'utf-8') as BufferEncoding });
    return parseCsv(text, options);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ValueError(`File not found: ${filepath}`);
    }
    throw err;
  }
}

/**
 * Serialize a DataFrame to CSV string.
 */
export function toCsvString(df: DataFrame, options: ToCsvOptions = {}): string {
  const sep = options.sep ?? ',';
  const includeIndex = options.index ?? true;
  const includeHeader = options.header ?? true;
  const naRep = options.na_rep ?? '';
  const cols = options.columns ?? df.columns;
  const lines: string[] = [];

  if (includeHeader) {
    const headerCells = includeIndex ? ['', ...cols] : cols;
    lines.push(headerCells.map(c => quoteCsvCell(String(c), sep)).join(sep));
  }

  for (let i = 0; i < df.index.length; i++) {
    const row: string[] = [];
    if (includeIndex) row.push(quoteCsvCell(String(df.index[i]), sep));
    for (const col of cols) {
      const v = (df.col(col) as unknown as { _getAt(i: number): unknown })._getAt(i);
      row.push(isMissing(v) ? naRep : quoteCsvCell(String(v), sep));
    }
    lines.push(row.join(sep));
  }

  return lines.join('\n');
}

/**
 * Write a DataFrame to a CSV file.
 */
export function to_csv(df: DataFrame, filepath: string, options: ToCsvOptions = {}): void {
  const text = toCsvString(df, options);
  fs.writeFileSync(filepath, text, { encoding: 'utf-8' });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseRow(line: string, sep: string): string[] {
  // Handle quoted fields
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function quoteCsvCell(value: string, sep: string): string {
  if (value.includes(sep) || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function inferColumn(data: unknown[], dtypeOverride?: DType | string): unknown[] {
  if (dtypeOverride) {
    const dt = normalizeDType(dtypeOverride);
    return data.map(v => {
      if (typeof v === 'number' && isNaN(v)) return NaN;
      if (dt.kind === 'float') return parseFloat(String(v));
      if (dt.kind === 'int') return parseInt(String(v), 10);
      return v;
    });
  }

  // Try all-numeric
  const isNumeric = data.every(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string') return v.trim() === '' || !isNaN(parseFloat(v.trim()));
    return false;
  });

  if (isNumeric) {
    return data.map(v => {
      if (typeof v === 'number') return v;
      const s = String(v).trim();
      if (s === '') return NaN;
      return parseFloat(s);
    });
  }

  // Try boolean
  const isBool = data.every(v => {
    const s = String(v).trim().toLowerCase();
    return s === 'true' || s === 'false' || s === '1' || s === '0';
  });

  if (isBool) {
    return data.map(v => {
      const s = String(v).trim().toLowerCase();
      return s === 'true' || s === '1';
    });
  }

  // String
  return data.map(v => typeof v === 'number' && isNaN(v) ? NaN : String(v));
}
