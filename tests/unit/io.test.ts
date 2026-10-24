import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { parseCsv, toCsvString, read_csv, to_csv } from '../../src/io/csv.js';
import { parseJson, toJsonString } from '../../src/io/json.js';
import { read_parquet } from '../../src/io/parquet.js';
import { DataFrame } from '../../src/dataframe.js';
import { NotImplementedError } from '../../src/errors.js';

// Temp dir for file-based tests
let tmpDir: string;
beforeAll(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pandas-ts-test-')); });
afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

const CSV_BASIC = `name,age,score\nAlice,30,95.5\nBob,25,88.0\nCharlie,35,72.3`;

describe('CSV - parseCsv', () => {
  it('parses basic CSV', () => {
    const df = parseCsv(CSV_BASIC);
    expect(df.shape).toEqual([3, 3]);
    expect(df.columns).toEqual(['name', 'age', 'score']);
  });

  it('infers numeric columns', () => {
    const df = parseCsv(CSV_BASIC);
    expect(df.col('age').dtype.kind).toBe('float');
    expect(Number(df.col('age').iloc(0))).toBe(30);
  });

  it('handles NA values', () => {
    const csv = `a,b\n1,\n2,NA\n3,5`;
    const df = parseCsv(csv);
    expect(Number(df.col('b').iloc(0))).toBeNaN();
    expect(Number(df.col('b').iloc(1))).toBeNaN();
    expect(Number(df.col('b').iloc(2))).toBe(5);
  });

  it('respects custom separator', () => {
    const csv = `a|b|c\n1|2|3`;
    const df = parseCsv(csv, { sep: '|' });
    expect(df.columns).toEqual(['a', 'b', 'c']);
  });

  it('respects nrows', () => {
    const df = parseCsv(CSV_BASIC, { nrows: 2 });
    expect(df.shape[0]).toBe(2);
  });

  it('handles quoted fields with commas', () => {
    const csv = `name,city\n"Smith, John","New York"\n"Doe, Jane","Los Angeles"`;
    const df = parseCsv(csv);
    expect(df.shape).toEqual([2, 2]);
    expect(String(df.col('name').iloc(0))).toBe('Smith, John');
  });

  it('handles no header (header=null)', () => {
    const csv = `1,2,3\n4,5,6`;
    const df = parseCsv(csv, { header: null });
    expect(df.columns).toEqual(['0', '1', '2']);
    expect(df.shape[0]).toBe(2);
  });

  it('skiprows skips lines', () => {
    const csv = `skip me\nname,val\nfoo,1\nbar,2`;
    const df = parseCsv(csv, { skiprows: 1 });
    expect(df.columns).toEqual(['name', 'val']);
    expect(df.shape[0]).toBe(2);
  });
});

describe('CSV - toCsvString', () => {
  it('serializes basic DataFrame', () => {
    const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
    const csv = toCsvString(df);
    expect(csv).toContain('a,b');
    expect(csv).toContain('1,4');
  });

  it('respects index=false', () => {
    const df = new DataFrame({ a: [1, 2] });
    const csv = toCsvString(df, { index: false });
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toBe('a');
  });

  it('respects sep', () => {
    const df = new DataFrame({ a: [1], b: [2] });
    const csv = toCsvString(df, { sep: '\t', index: false });
    expect(csv).toContain('a\tb');
  });

  it('CSV round-trip', () => {
    const original = new DataFrame({ x: [1.5, 2.5, 3.5], y: [10, 20, 30] });
    const csv = toCsvString(original, { index: false });
    const recovered = parseCsv(csv);
    expect(recovered.shape).toEqual(original.shape);
    expect(Number(recovered.col('x').iloc(0))).toBeCloseTo(1.5, 5);
  });
});

describe('CSV - file-based read/write', () => {
  it('read_csv / to_csv round-trip', () => {
    const df = new DataFrame({ a: [1, 2, 3], b: ['x', 'y', 'z'] });
    const filepath = path.join(tmpDir, 'test.csv');
    to_csv(df, filepath, { index: false });
    const df2 = read_csv(filepath);
    expect(df2.shape).toEqual(df.shape);
    expect(String(df2.col('b').iloc(0))).toBe('x');
  });

  it('read_csv throws on missing file', () => {
    expect(() => read_csv('/nonexistent/path/file.csv')).toThrow();
  });
});

describe('JSON - parseJson', () => {
  it('parses orient=records', () => {
    const json = '[{"a":1,"b":"x"},{"a":2,"b":"y"}]';
    const df = parseJson(json);
    expect(df.shape).toEqual([2, 2]);
    expect(df.columns).toContain('a');
  });

  it('parses orient=columns', () => {
    const json = '{"a":{"0":1,"1":2},"b":{"0":"x","1":"y"}}';
    const df = parseJson(json, { orient: 'columns' });
    expect(df.shape[1]).toBe(2);
  });

  it('parses orient=split', () => {
    const json = '{"columns":["a","b"],"data":[[1,"x"],[2,"y"]]}';
    const df = parseJson(json, { orient: 'split' });
    expect(df.shape).toEqual([2, 2]);
  });

  it('parses orient=values (2D array)', () => {
    const json = '[[1,2],[3,4]]';
    const df = parseJson(json, { orient: 'values' });
    expect(df.shape).toEqual([2, 2]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJson('not json')).toThrow();
  });
});

describe('JSON - toJsonString', () => {
  it('serializes orient=records', () => {
    const df = new DataFrame({ a: [1, 2], b: ['x', 'y'] });
    const json = toJsonString(df, { orient: 'records' });
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ a: 1, b: 'x' });
  });

  it('serializes orient=split', () => {
    const df = new DataFrame({ a: [1], b: [2] });
    const json = toJsonString(df, { orient: 'split' });
    const parsed = JSON.parse(json);
    expect(parsed.columns).toEqual(['a', 'b']);
    expect(parsed.data).toHaveLength(1);
  });

  it('JSON round-trip (records)', () => {
    const original = new DataFrame({ x: [1, 2], y: ['a', 'b'] });
    const json = toJsonString(original, { orient: 'records' });
    const recovered = parseJson(json, { orient: 'records' });
    expect(recovered.shape).toEqual(original.shape);
  });
});

describe('Stubs', () => {
  it('read_parquet rejects with NotImplementedError', async () => {
    let threw = false;
    try {
      await read_parquet('file.parquet');
    } catch (e) {
      threw = true;
      expect(e).toBeInstanceOf(NotImplementedError);
    }
    expect(threw).toBe(true);
  });
});

import { read_excel, to_excel } from '../../src/io/excel.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

describe('Excel IO', () => {
  it('to_excel then read_excel round-trips', async () => {
    const df = new DataFrame({ name: ['Alice', 'Bob'], age: [30, 25] });
    const tmp = join(tmpdir(), `test_${Date.now()}.xlsx`);
    try {
      await to_excel(df, { path: tmp, index: false });
      expect(existsSync(tmp)).toBe(true);
      const df2 = await read_excel(tmp);
      expect(df2.shape[0]).toBe(2);
      expect(df2.columns).toContain('name');
      expect(df2.columns).toContain('age');
    } finally {
      if (existsSync(tmp)) unlinkSync(tmp);
    }
  });

  it('to_excel with custom sheet name', async () => {
    const df = new DataFrame({ x: [1, 2, 3] });
    const tmp = join(tmpdir(), `test_${Date.now()}.xlsx`);
    try {
      await to_excel(df, { path: tmp, sheet_name: 'MySheet', index: false });
      const df2 = await read_excel(tmp, { sheet_name: 'MySheet' });
      expect(df2.shape[0]).toBe(3);
    } finally {
      if (existsSync(tmp)) unlinkSync(tmp);
    }
  });
});
