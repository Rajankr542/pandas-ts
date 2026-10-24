/**
 * Clipboard IO — read_clipboard / to_clipboard.
 * Node.js doesn't have direct clipboard access without native packages.
 */
import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export async function read_clipboard(
  _options: { sep?: string } = {}
): Promise<DataFrame> {
  throw new NotImplementedError(
    'read_clipboard: Not supported in Node.js without a native clipboard package.\n' +
    'Consider using clipboardy: npm install clipboardy'
  );
}

export async function to_clipboard(
  _df: DataFrame,
  _options: { sep?: string; index?: boolean } = {}
): Promise<void> {
  throw new NotImplementedError(
    'to_clipboard: Not supported in Node.js without a native clipboard package.\n' +
    'Consider using clipboardy: npm install clipboardy'
  );
}
