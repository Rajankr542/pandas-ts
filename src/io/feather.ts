/**
 * Feather IO — read_feather / to_feather.
 * Feather V2 is a subset of Arrow IPC.
 * Real implementation requires: npm install apache-arrow
 */
import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

// Helper to dynamically import optional modules without TS module resolution errors
async function optionalImport(pkg: string): Promise<any> {
  return new Function('pkg', 'return import(pkg)')(pkg);
}

export async function read_feather(
  filePath: string,
  options: { columns?: string[]; use_threads?: boolean } = {}
): Promise<DataFrame> {
  try {
    const { RecordBatchFileReader } = await optionalImport('apache-arrow');
    const fs = await import('fs');
    const buffer = fs.readFileSync(filePath);
    const reader = RecordBatchFileReader.from(buffer);
    const table = await reader.readAll();

    const data: Record<string, unknown[]> = {};
    for (const field of table.schema.fields) {
      if (options.columns && !options.columns.includes(field.name)) continue;
      const col = table.getChild(field.name);
      if (col) {
        const vals: unknown[] = [];
        for (let i = 0; i < col.length; i++) vals.push(col.get(i));
        data[field.name] = vals;
      }
    }
    return new DataFrame(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Cannot find module') || msg.includes('Failed to resolve')) {
      throw new NotImplementedError(
        'read_feather requires apache-arrow. Install with: npm install apache-arrow'
      );
    }
    throw err;
  }
}

export async function to_feather(
  df: DataFrame,
  filePath: string
): Promise<void> {
  try {
    const { tableFrom, RecordBatchFileWriter } = await optionalImport('apache-arrow');
    const fs = await import('fs');

    const dfAny = df as any;
    const arrowData: Record<string, unknown[]> = {};
    for (const col of df.columns) {
      arrowData[col] = Array.from({ length: dfAny._index.length }, (_: unknown, i: number) =>
        dfAny._columns.get(col)._getAt(i)
      );
    }
    const table = tableFrom(arrowData);
    const writer = RecordBatchFileWriter.throughNode();
    fs.createWriteStream(filePath).pipe(writer as any);
    writer.write(table);
    writer.finish();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Cannot find module') || msg.includes('Failed to resolve')) {
      throw new NotImplementedError(
        'to_feather requires apache-arrow. Install with: npm install apache-arrow'
      );
    }
    throw err;
  }
}
