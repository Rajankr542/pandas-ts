/**
 * SQL IO — read_sql, read_sql_query, read_sql_table, to_sql.
 * Supports: better-sqlite3 (sync), pg (async), mysql2 (async).
 * Lazy imports — install only what you need.
 */
import { DataFrame } from '../dataframe.js';
import { NotImplementedError } from '../errors.js';

export interface ReadSqlOptions {
  /** SQL query or table name */
  sql?: string;
  /** Database connection object (better-sqlite3 Database, pg Client, mysql2 Connection) */
  con: unknown;
  /** Index column name(s) */
  index_col?: string | string[];
  /** Columns to parse as dates */
  parse_dates?: string[];
  /** Column selection */
  columns?: string[];
  /** Max rows to return */
  chunksize?: number;
}

function rowsToDataFrame(
  rows: Record<string, unknown>[],
  options: Partial<ReadSqlOptions> = {}
): DataFrame {
  if (rows.length === 0) return new DataFrame();
  const cols = Object.keys(rows[0]!);
  const data: Record<string, unknown[]> = {};
  for (const col of cols) {
    if (options.columns && !options.columns.includes(col)) continue;
    data[col] = rows.map(r => r[col] ?? null);
  }
  return new DataFrame(data);
}

/**
 * Read SQL query or table into a DataFrame.
 * Supports better-sqlite3 (sync), pg Client, or mysql2 Connection.
 */
export async function read_sql(
  sqlOrTable: string,
  con: unknown,
  options: Omit<ReadSqlOptions, 'sql' | 'con'> = {}
): Promise<DataFrame> {
  if (!con) throw new NotImplementedError('read_sql requires a database connection object');

  const connAny = con as any;

  // better-sqlite3 (synchronous)
  if (typeof connAny.prepare === 'function') {
    const stmt = connAny.prepare(sqlOrTable);
    const rows = stmt.all() as Record<string, unknown>[];
    return rowsToDataFrame(rows, options);
  }

  // pg (async)
  if (typeof connAny.query === 'function' && typeof connAny.connect !== 'undefined') {
    const result = await connAny.query(sqlOrTable);
    const rows = result.rows as Record<string, unknown>[];
    return rowsToDataFrame(rows, options);
  }

  // mysql2 (async)
  if (typeof connAny.execute === 'function') {
    const [rows] = await connAny.execute(sqlOrTable);
    return rowsToDataFrame(rows as Record<string, unknown>[], options);
  }

  throw new NotImplementedError(
    'Unsupported database connection. Supported: better-sqlite3 Database, pg Client, mysql2 Connection'
  );
}

/**
 * Write a DataFrame to a SQL table.
 */
export async function to_sql(
  df: DataFrame,
  name: string,
  con: unknown,
  options: {
    if_exists?: 'fail' | 'replace' | 'append';
    index?: boolean;
    dtype?: Record<string, string>;
  } = {}
): Promise<void> {
  if (!con) throw new NotImplementedError('to_sql requires a database connection object');

  const connAny = con as any;
  const ifExists = options.if_exists ?? 'fail';
  const includeIndex = options.index ?? true;
  const dfAny = df as any;

  const cols = [...(includeIndex ? ['index'] : []), ...df.columns];
  const colDefs = cols.map(c => `"${c}" TEXT`).join(', ');

  // better-sqlite3 (sync)
  if (typeof connAny.prepare === 'function') {
    if (ifExists === 'replace') {
      connAny.exec(`DROP TABLE IF EXISTS "${name}"`);
    }
    try {
      connAny.exec(`CREATE TABLE IF NOT EXISTS "${name}" (${colDefs})`);
    } catch {
      if (ifExists === 'fail') throw new Error(`Table '${name}' already exists`);
    }

    const placeholders = cols.map(() => '?').join(', ');
    const stmt = connAny.prepare(`INSERT INTO "${name}" VALUES (${placeholders})`);
    const insertMany = connAny.transaction((rows: unknown[][]) => {
      for (const row of rows) stmt.run(...row);
    });

    const rows: unknown[][] = [];
    for (let i = 0; i < dfAny._index.length; i++) {
      const row: unknown[] = [];
      if (includeIndex) row.push(dfAny._index[i]);
      for (const col of df.columns) row.push(dfAny._columns.get(col)._getAt(i));
      rows.push(row);
    }
    insertMany(rows);
    return;
  }

  // pg / mysql2 (async) — basic implementation
  const createSql = ifExists === 'replace'
    ? `DROP TABLE IF EXISTS "${name}"; CREATE TABLE "${name}" (${colDefs})`
    : `CREATE TABLE IF NOT EXISTS "${name}" (${colDefs})`;

  if (typeof connAny.query === 'function') {
    await connAny.query(createSql);
    for (let i = 0; i < dfAny._index.length; i++) {
      const vals: unknown[] = [];
      if (includeIndex) vals.push(dfAny._index[i]);
      for (const col of df.columns) vals.push(dfAny._columns.get(col)._getAt(i));
      const placeholders = vals.map((_: unknown, k: number) => `$${k + 1}`).join(', ');
      await connAny.query(`INSERT INTO "${name}" VALUES (${placeholders})`, vals);
    }
  }
}

/** Alias: read_sql_query */
export const read_sql_query = read_sql;
/** Alias: read_sql_table */
export const read_sql_table = read_sql;
