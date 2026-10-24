import { DataFrame } from '../dataframe.js';

export interface ReadFwfOptions {
  colspecs?: Array<[number, number]> | 'infer';
  widths?: number[];
  names?: string[];
  header?: number | null;
  skiprows?: number;
  skipfooter?: number;
  nrows?: number;
  na_values?: string[];
  dtype?: Record<string, string>;
}

export function read_fwf(content: string, options: ReadFwfOptions = {}): DataFrame {
  const lines = content.split('\n').filter(l => l.length > 0);
  const skip = options.skiprows ?? 0;
  const skipFooter = options.skipfooter ?? 0;
  const workLines = lines.slice(skip, skipFooter > 0 ? -skipFooter : undefined);
  if (workLines.length === 0) return new DataFrame([]);
  const naValues = new Set(options.na_values ?? ['', 'NA', 'NaN', 'null', 'None', 'N/A']);

  let colspecs: Array<[number, number]>;
  if (options.widths) {
    let pos = 0;
    colspecs = options.widths.map(w => { const s = pos; pos += w; return [s, pos] as [number, number]; });
  } else if (Array.isArray(options.colspecs)) {
    colspecs = options.colspecs;
  } else {
    const sample = workLines[0]!;
    const spans: Array<[number, number]> = [];
    let inWord = false, start = 0;
    for (let i = 0; i <= sample.length; i++) {
      const c = sample[i] ?? ' ';
      if (!inWord && c !== ' ') { inWord = true; start = i; }
      else if (inWord && c === ' ') { spans.push([start, i]); inWord = false; }
    }
    colspecs = spans.length > 0 ? spans : [[0, sample.length]];
  }

  let headerRow: string[] | null = null;
  let dataLines = workLines;
  if (options.header !== null && options.header !== undefined) {
    headerRow = colspecs.map(([s, e]) => workLines[options.header as number]!.slice(s, e).trim());
    dataLines = workLines.slice((options.header as number) + 1);
  } else if (options.header === undefined) {
    headerRow = colspecs.map(([s, e]) => workLines[0]!.slice(s, e).trim());
    dataLines = workLines.slice(1);
  }
  const names = options.names ?? headerRow ?? colspecs.map((_, i) => String(i));
  if (options.nrows !== undefined) dataLines = dataLines.slice(0, options.nrows);

  const data: Record<string, unknown[]> = {};
  for (const n of names) data[n] = [];
  for (const line of dataLines) {
    for (let ci = 0; ci < colspecs.length; ci++) {
      const [s, e] = colspecs[ci]!;
      const raw = line.slice(s, e).trim();
      const colName = names[ci] ?? String(ci);
      const val = naValues.has(raw) ? NaN : (isNaN(Number(raw)) || raw === '' ? raw : Number(raw));
      if (data[colName]) data[colName]!.push(val);
    }
  }
  return new DataFrame(data);
}
