import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export function read_xml(
  xml: string,
  options: { xpath?: string; names?: string[]; dtype?: Record<string, string> } = {}
): DataFrame {
  try {
    const rows: Record<string, unknown>[] = [];
    const rootMatch = xml.match(/<(\w+)[^>]*>([\s\S]*)<\/\1>/);
    if (!rootMatch) return new DataFrame([]);
    const inner = rootMatch[2]!;
    const rowRegex = /<(\w+)[^>]*>([\s\S]*?)<\/\1>/g;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRegex.exec(inner)) !== null) {
      const row: Record<string, unknown> = {};
      const fieldRegex = /<(\w+)[^>]*>([\s\S]*?)<\/\1>/g;
      let fieldMatch: RegExpExecArray | null;
      while ((fieldMatch = fieldRegex.exec(rowMatch[2]!)) !== null) {
        const key = fieldMatch[1]!;
        const val = fieldMatch[2]!.trim();
        const num = Number(val);
        row[key] = isNaN(num) || val === '' ? val : num;
      }
      // Also check attributes
      const attrRegex = /(\w+)="([^"]*)"/g;
      const tagHtml = rowMatch[0]!;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(tagHtml)) !== null) {
        row[`@${attrMatch[1]}`] = attrMatch[2];
      }
      if (Object.keys(row).length > 0) rows.push(row);
    }
    return new DataFrame(rows);
  } catch (e) {
    throw new NotImplementedError('read_xml failed to parse XML');
  }
}

export function to_xml(
  df: DataFrame,
  options: {
    root_name?: string;
    row_name?: string;
    index?: boolean;
    attr_cols?: string[];
    elem_cols?: string[];
  } = {}
): string {
  const rootName = options.root_name ?? 'data';
  const rowName = options.row_name ?? 'row';
  const includeIndex = options.index !== false;
  const lines: string[] = [`<?xml version='1.0' encoding='utf-8'?>`, `<${rootName}>`];
  for (let i = 0; i < (df as any)._index.length; i++) {
    let rowStr = `  <${rowName}`;
    if (includeIndex) rowStr += ` index="${(df as any)._index[i]}"`;
    rowStr += '>';
    for (const col of (df as any)._columnOrder as string[]) {
      rowStr += `<${col}>${(df as any)._columns.get(col)._getAt(i)}</${col}>`;
    }
    rowStr += `</${rowName}>`;
    lines.push(rowStr);
  }
  lines.push(`</${rootName}>`);
  return lines.join('\n');
}
