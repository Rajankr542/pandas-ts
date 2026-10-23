import { describe, it, expect } from 'vitest';
import { DataFrame } from '../../src/dataframe.js';
import { Series } from '../../src/series.js';

describe('DataFrame', () => {
  it('creates from column object', () => {
    const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
    expect(df.shape).toEqual([3, 2]);
    expect(df.columns).toEqual(['a', 'b']);
  });

  it('creates from records array', () => {
    const df = new DataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
    expect(df.shape).toEqual([2, 2]);
  });

  it('creates empty DataFrame', () => {
    const df = new DataFrame();
    expect(df.shape).toEqual([0, 0]);
  });

  it('col() returns Series', () => {
    const df = new DataFrame({ a: [1, 2, 3] });
    const s = df.col('a');
    expect(s).toBeInstanceOf(Series);
    expect(s.size).toBe(3);
  });

  it('col() throws on missing column', () => {
    const df = new DataFrame({ a: [1] });
    expect(() => df.col('b')).toThrow();
  });

  it('head() returns first n rows', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4, 5] });
    expect(df.head(3).shape).toEqual([3, 1]);
  });

  it('tail() returns last n rows', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4, 5] });
    expect(df.tail(2).shape).toEqual([2, 1]);
  });

  it('dtypes returns column types', () => {
    const df = new DataFrame({ a: [1.0, 2.0], b: ['x', 'y'] });
    expect(df.dtypes['a']).toBe('float64');
  });

  it('isna() produces boolean DataFrame', () => {
    const df = new DataFrame({ a: [1, NaN, 3] });
    const mask = df.isna();
    expect(mask.col('a').iloc(1)).toBe(1);
  });

  it('fillna() replaces missing values', () => {
    const df = new DataFrame({ a: [1, NaN, 3] });
    const filled = df.fillna(0);
    expect(Number(filled.col('a').iloc(1))).toBe(0);
  });

  it('dropna() removes rows with NaN', () => {
    const df = new DataFrame({ a: [1, NaN, 3], b: [4, 5, 6] });
    expect(df.dropna().shape[0]).toBe(2);
  });

  it('sum() aggregates columns', () => {
    const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
    const sums = df.sum();
    expect(sums['a']).toBe(6);
    expect(sums['b']).toBe(15);
  });

  it('sort_values() sorts by column', () => {
    const df = new DataFrame({ a: [3, 1, 2] });
    const sorted = df.sort_values('a');
    expect(sorted.col('a').iloc(0)).toBe(1);
    expect(sorted.col('a').iloc(2)).toBe(3);
  });

  it('drop() removes a column', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    const result = df.drop('a', { axis: 1 });
    expect(result.columns).toEqual(['b']);
  });

  it('rename() renames columns', () => {
    const df = new DataFrame({ a: [1, 2] });
    const renamed = df.rename({ columns: { a: 'x' } });
    expect(renamed.columns).toEqual(['x']);
  });

  it('assign() adds new column', () => {
    const df = new DataFrame({ a: [1, 2, 3] });
    const result = df.assign({ b: [4, 5, 6] });
    expect(result.columns).toContain('b');
  });

  it('merge() inner join', () => {
    const left = new DataFrame({ key: [1, 2, 3], val: [10, 20, 30] });
    const right = new DataFrame({ key: [2, 3, 4], val2: [200, 300, 400] });
    const result = left.merge(right, { on: 'key' });
    expect(result.shape[0]).toBe(2); // rows 2 and 3
    expect(result.columns).toContain('key');
    expect(result.columns).toContain('val');
  });

  it('concat() stacks rows', () => {
    const a = new DataFrame({ x: [1, 2] });
    const b = new DataFrame({ x: [3, 4] });
    const result = DataFrame.concat([a, b]);
    expect(result.shape[0]).toBe(4);
  });

  it('groupby().sum() aggregates', () => {
    const df = new DataFrame({ key: ['a', 'b', 'a'], val: [1, 2, 3] });
    const grouped = df.groupby('key').sum();
    expect(grouped.shape[0]).toBe(2);
  });

  it('to_dict(records) returns array of objects', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    const records = df.to_dict('records') as Record<string, number>[];
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({ a: 1, b: 3 });
  });

  it('copy() creates independent copy', () => {
    const df = new DataFrame({ a: [1, 2, 3] });
    const copy = df.copy();
    expect(copy.shape).toEqual(df.shape);
  });

  it('T transposes', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    const t = df.T;
    expect(t.shape).toEqual([2, 2]);
  });

  it('memory_usage() returns sizes', () => {
    const df = new DataFrame({ a: [1.0, 2.0, 3.0] });
    const mu = df.memory_usage();
    expect(mu['a']).toBeGreaterThan(0);
  });

  it('set_index() sets a column as index', () => {
    const df = new DataFrame({ id: ['x', 'y', 'z'], val: [1, 2, 3] });
    const indexed = df.set_index('id');
    expect(indexed.index).toEqual(['x', 'y', 'z']);
    expect(indexed.columns).not.toContain('id');
  });
});
