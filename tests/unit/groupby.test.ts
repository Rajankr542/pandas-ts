import { describe, it, expect } from 'vitest';
import { DataFrame } from '../../src/dataframe.js';
import { Series } from '../../src/series.js';

const df = () => new DataFrame({
  key: ['a', 'b', 'a', 'b', 'a'],
  val: [1, 2, 3, 4, 5],
  val2: [10, 20, 30, 40, 50],
});

describe('DataFrameGroupBy', () => {
  it('sum()', () => {
    const r = df().groupby('key').sum();
    expect(r.shape[0]).toBe(2);
    const aRow = r.col('val').iloc(0);
    expect(Number(aRow)).toBe(9); // 1+3+5
  });

  it('mean()', () => {
    const r = df().groupby('key').mean();
    expect(Number(r.col('val').iloc(0))).toBe(3); // (1+3+5)/3
  });

  it('count()', () => {
    const r = df().groupby('key').count();
    expect(Number(r.col('val').iloc(0))).toBe(3);
  });

  it('min() and max()', () => {
    const r = df().groupby('key').min();
    expect(Number(r.col('val').iloc(0))).toBe(1);
    const r2 = df().groupby('key').max();
    expect(Number(r2.col('val').iloc(0))).toBe(5);
  });

  it('std()', () => {
    const r = df().groupby('key').std();
    expect(Number(r.col('val').iloc(0))).toBeGreaterThan(0);
  });

  it('agg() with single fn', () => {
    const r = df().groupby('key').agg({ val: 'sum' });
    expect(Number(r.col('val').iloc(0))).toBe(9);
  });

  it('agg() with multiple fns', () => {
    const r = df().groupby('key').agg({ val: ['sum', 'mean'] });
    expect(r.columns).toContain('val_sum');
    expect(r.columns).toContain('val_mean');
  });

  it('transform() broadcasts mean', () => {
    const r = df().groupby('key').transform('mean');
    expect(r.shape[0]).toBe(5);
    expect(Number(r.col('val').iloc(0))).toBe(3);
    expect(Number(r.col('val').iloc(2))).toBe(3);
  });

  it('filter() keeps groups satisfying predicate', () => {
    const r = df().groupby('key').filter(sub => sub.col('val').sum() as number > 5);
    expect(r.shape[0]).toBeGreaterThan(0);
  });

  it('cumsum()', () => {
    const r = df().groupby('key').cumsum();
    expect(Number(r.col('val').iloc(0))).toBe(1);
    expect(Number(r.col('val').iloc(2))).toBe(4); // 1+3
  });

  it('cumcount()', () => {
    const r = df().groupby('key').cumcount();
    expect(Number(r.iloc(0))).toBe(0);
    expect(Number(r.iloc(2))).toBe(1);
  });

  it('ngroup()', () => {
    const r = df().groupby('key').ngroup();
    expect(r.size).toBe(5);
  });

  it('nth(0) returns first row of each group', () => {
    const r = df().groupby('key').nth(0);
    expect(r.shape[0]).toBe(2);
  });

  it('nth(-1) returns last row of each group', () => {
    const r = df().groupby('key').nth(-1);
    expect(r.shape[0]).toBe(2);
  });

  it('shift()', () => {
    const r = df().groupby('key').shift(1);
    expect(Number(r.col('val').iloc(0))).toBeNaN();
    expect(Number(r.col('val').iloc(2))).toBe(1);
  });

  it('diff()', () => {
    const r = df().groupby('key').diff();
    expect(Number(r.col('val').iloc(0))).toBeNaN();
    expect(Number(r.col('val').iloc(2))).toBe(2);
  });

  it('rank()', () => {
    const r = df().groupby('key').rank();
    expect(r.shape[0]).toBe(5);
  });

  it('pct_change()', () => {
    const r = df().groupby('key').pct_change();
    expect(r.shape[0]).toBe(5);
    expect(Number(r.col('val').iloc(0))).toBeNaN();
  });

  it('ffill()', () => {
    const d = new DataFrame({ key: ['a', 'a', 'a'], val: [1, NaN, 3] });
    const r = d.groupby('key').ffill();
    expect(Number(r.col('val').iloc(1))).toBe(1);
  });

  it('ohlc()', () => {
    const r = df().groupby('key').ohlc();
    expect(r.columns).toContain('val_open');
    expect(r.columns).toContain('val_close');
  });

  it('get_group()', () => {
    const r = df().groupby('key').get_group('a');
    expect(r.shape[0]).toBe(3);
  });

  it('size()', () => {
    const r = df().groupby('key').size();
    expect(r.size).toBe(2);
  });

  it('head(n)', () => {
    const r = df().groupby('key').head(1);
    expect(r.shape[0]).toBe(2);
  });

  it('apply()', () => {
    const r = df().groupby('key').apply(sub => sub.sort_values('val'));
    expect(r.shape[0]).toBe(5);
  });

  it('ngroups', () => {
    expect(df().groupby('key').ngroups).toBe(2);
  });

  it('quantile()', () => {
    const r = df().groupby('key').quantile(0.5);
    expect(r.shape[0]).toBe(2);
  });

  it('nunique()', () => {
    const r = df().groupby('key').nunique();
    expect(Number(r.col('val').iloc(0))).toBe(3);
  });

  it('median()', () => {
    const r = df().groupby('key').median();
    expect(Number(r.col('val').iloc(0))).toBe(3);
  });
});

describe('SeriesGroupBy', () => {
  const s = new Series([1, 2, 3, 4, 5], { name: 'val' });
  const keys = ['a', 'b', 'a', 'b', 'a'];

  it('sum()', () => {
    const r = s.groupby(keys).sum();
    expect(Number(r.get('a'))).toBe(9);
  });

  it('mean()', () => {
    const r = s.groupby(keys).mean();
    expect(Number(r.get('a'))).toBe(3);
  });

  it('count()', () => {
    const r = s.groupby(keys).count();
    expect(Number(r.get('a'))).toBe(3);
  });

  it('size()', () => {
    const r = s.groupby(keys).size();
    expect(r.size).toBe(2);
  });

  it('apply()', () => {
    const r = s.groupby(keys).apply(sub => sub.sum());
    expect(r.size).toBe(2);
  });
});
