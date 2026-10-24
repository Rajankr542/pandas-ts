/**
 * Clipboard IO — read_clipboard / to_clipboard.
 *
 * Uses clipboardy when available (npm install clipboardy).
 * Falls back to a clear error on platforms without clipboard access.
 */
import { DataFrame } from '../dataframe.js';
import { parseCsv } from './csv.js';
import { toCsvString } from './csv.js';
import { NotImplementedError } from '../errors.js';

async function optionalImport(pkg: string): Promise<any> {
  return new Function('pkg', 'return import(pkg)')(pkg);
}

export async function read_clipboard(
  options: { sep?: string } = {}
): Promise<DataFrame> {
  try {
    const { default: clipboard } = await optionalImport('clipboardy');
    const text: string = await clipboard.read();
    return parseCsv(text, { sep: options.sep ?? '\t' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Cannot find module') || msg.includes('ERR_MODULE_NOT_FOUND')) {
      throw new NotImplementedError(
        'read_clipboard requires clipboardy.\n' +
        'Install with: npm install clipboardy'
      );
    }
    throw err;
  }
}

export async function to_clipboard(
  df: DataFrame,
  options: { sep?: string; index?: boolean } = {}
): Promise<void> {
  try {
    const { default: clipboard } = await optionalImport('clipboardy');
    const text = toCsvString(df, { sep: options.sep ?? '\t', index: options.index });
    await clipboard.write(text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Cannot find module') || msg.includes('ERR_MODULE_NOT_FOUND')) {
      throw new NotImplementedError(
        'to_clipboard requires clipboardy.\n' +
        'Install with: npm install clipboardy'
      );
    }
    throw err;
  }
}
