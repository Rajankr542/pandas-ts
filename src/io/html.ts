import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export function read_html(
  url_or_html: string,
  options: {
    match?: string;
    header?: number;
    index_col?: number;
    attrs?: Record<string, string>;
    flavor?: string;
  } = {}
): DataFrame[] {
  const tables: DataFrame[] = [];
  try {
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;
    while ((tableMatch = tableRegex.exec(url_or_html)) !== null) {
      const tableHtml = tableMatch[1]!;
      const rows: string[][] = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch: RegExpExecArray | null;
      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        const cells: string[] = [];
        let cellMatch: RegExpExecArray | null;
        while ((cellMatch = cellRegex.exec(rowMatch[1]!)) !== null) {
          cells.push(cellMatch[1]!.replace(/<[^>]+>/g, '').trim());
        }
        if (cells.length > 0) rows.push(cells);
      }
      if (rows.length < 2) continue;
      const headerRow = options.header !== undefined ? rows[options.header]! : rows[0]!;
      const dataRows = rows.slice(options.header !== undefined ? options.header + 1 : 1);
      const data: Record<string, unknown[]> = {};
      for (let ci = 0; ci < headerRow.length; ci++) {
        const colName = headerRow[ci] ?? `col_${ci}`;
        data[colName] = dataRows.map(row => {
          const val = row[ci] ?? '';
          const num = Number(val);
          return isNaN(num) || val === '' ? val : num;
        });
      }
      tables.push(new DataFrame(data));
    }
  } catch (e) {
    throw new NotImplementedError('read_html failed to parse HTML');
  }
  return tables;
}

export function to_html(
  df: DataFrame,
  options: { index?: boolean; border?: number; classes?: string; header?: boolean } = {}
): string {
  const includeIndex = options.index !== false;
  const includeHeader = options.header !== false;
  const border = options.border !== undefined ? ` border="${options.border}"` : '';
  const cls = options.classes ? ` class="${options.classes}"` : '';
  let html = `<table${border}${cls}>\n`;
  if (includeHeader) {
    html += '  <thead>\n    <tr>\n';
    if (includeIndex) html += '      <th></th>\n';
    for (const col of (df as any)._columnOrder as string[]) html += `      <th>${col}</th>\n`;
    html += '    </tr>\n  </thead>\n';
  }
  html += '  <tbody>\n';
  const idx = (df as any)._index as (string | number)[];
  for (let i = 0; i < idx.length; i++) {
    html += '    <tr>\n';
    if (includeIndex) html += `      <th>${idx[i]}</th>\n`;
    for (const col of (df as any)._columnOrder as string[]) {
      html += `      <td>${(df as any)._columns.get(col)._getAt(i)}</td>\n`;
    }
    html += '    </tr>\n';
  }
  html += '  </tbody>\n</table>';
  return html;
}
