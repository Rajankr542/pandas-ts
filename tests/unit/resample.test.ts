import { describe, it, expect } from 'vitest';
import { DataFrame } from '../../src/dataframe.js';
import { Series } from '../../src/series.js';

// Create a daily time-series DataFrame
const makeDailyDf = () => {
  const dates = Array.from({ length: 10 }, (_, i) => new Date(2024, 0, i + 1));
  const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return new DataFrame({ val: vals }, { index: dates.map(d => d.toISOString()) });
};

const makeDailySeries = () => {
  const dates = Array.from({ length: 10 }, (_, i) => new Date(2024, 0, i + 1).toISOString());
  return new Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { index: dates });
};

describe('DataFrameResampler', () => {
  it('sum() aggregates by week', () => {
    const df = makeDailyDf();
    const r = df.resample('W').sum();
    expect(r.shape[0]).toBeGreaterThan(0);
    expect(r.shape[0]).toBeLessThan(11);
  });

  it('mean() returns one row per bucket', () => {
    const df = makeDailyDf();
    const r = df.resample('W').mean();
    expect(r.shape[0]).toBeGreaterThan(0);
  });

  it('count() counts per bucket', () => {
    const df = makeDailyDf();
    const r = df.resample('W').count();
    let total = 0;
    for (let i = 0; i < r.shape[0]; i++) total += Number(r.col('val').iloc(i));
    expect(total).toBe(10);
  });

  it('min() and max()', () => {
    const df = makeDailyDf();
    const rmin = df.resample('W').min();
    const rmax = df.resample('W').max();
    expect(rmin.shape[0]).toBe(rmax.shape[0]);
    expect(Number(rmin.col('val').iloc(0))).toBeLessThan(Number(rmax.col('val').iloc(0)));
  });

  it('std()', () => {
    const df = makeDailyDf();
    const r = df.resample('W').std();
    expect(r.shape[0]).toBeGreaterThan(0);
  });

  it('ohlc() creates open/high/low/close columns', () => {
    const df = makeDailyDf();
    const r = df.resample('W').ohlc();
    expect(r.columns).toContain('val_open');
    expect(r.columns).toContain('val_high');
    expect(r.columns).toContain('val_low');
    expect(r.columns).toContain('val_close');
  });

  it('size() returns group sizes', () => {
    const df = makeDailyDf();
    const r = df.resample('W').size();
    let total = 0;
    for (let i = 0; i < r.size; i++) total += Number(r.iloc(i));
    expect(total).toBe(10);
  });

  it('ngroups', () => {
    const df = makeDailyDf();
    expect(df.resample('W').ngroups).toBeGreaterThan(0);
  });

  it('agg() with string', () => {
    const df = makeDailyDf();
    const r = df.resample('W').agg('sum');
    expect(r.shape[0]).toBeGreaterThan(0);
  });

  it('first() and last()', () => {
    const df = makeDailyDf();
    const rf = df.resample('W').first();
    const rl = df.resample('W').last();
    expect(rf.shape[0]).toBe(rl.shape[0]);
  });

  it('median()', () => {
    const df = makeDailyDf();
    const r = df.resample('W').median();
    expect(r.shape[0]).toBeGreaterThan(0);
  });
});

describe('SeriesResampler', () => {
  it('sum() aggregates by week', () => {
    const s = makeDailySeries();
    const r = s.resample('W').sum();
    let total = 0;
    for (let i = 0; i < r.size; i++) total += Number(r.iloc(i));
    expect(total).toBe(55); // 1+2+...+10
  });

  it('mean()', () => {
    const s = makeDailySeries();
    const r = s.resample('W').mean();
    expect(r.size).toBeGreaterThan(0);
  });

  it('count() sums to total rows', () => {
    const s = makeDailySeries();
    const r = s.resample('W').count();
    let total = 0;
    for (let i = 0; i < r.size; i++) total += Number(r.iloc(i));
    expect(total).toBe(10);
  });

  it('ngroups', () => {
    const s = makeDailySeries();
    expect(s.resample('W').ngroups).toBeGreaterThan(0);
  });

  it('min() / max()', () => {
    const s = makeDailySeries();
    const rmin = s.resample('W').min();
    const rmax = s.resample('W').max();
    expect(Number(rmin.iloc(0))).toBeLessThan(Number(rmax.iloc(0)));
  });
});

describe('DataFrame extra methods', () => {
  const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });

  it('to_records()', () => {
    const r = df.to_records({ index: false });
    expect(r.length).toBe(3);
    expect(r[0]).toHaveProperty('a');
  });

  it('to_numpy()', () => {
    const r = df.to_numpy();
    expect(r.length).toBe(3);
    expect(r[0]!.length).toBe(2);
  });

  it('equals()', () => {
    const df2 = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
    expect(df.equals(df2)).toBe(true);
    const df3 = new DataFrame({ a: [1, 2, 9], b: [4, 5, 6] });
    expect(df.equals(df3)).toBe(false);
  });

  it('reindex() pads missing with NaN', () => {
    const r = df.reindex([0, 1, 2, 3]);
    expect(r.shape[0]).toBe(4);
    expect(Number(r.col('a').iloc(3))).toBeNaN();
  });

  it('sem()', () => {
    expect(typeof df.sem()['a']).toBe('number');
  });

  it('var()', () => {
    expect(typeof df.var()['a']).toBe('number');
  });

  it('median()', () => {
    expect(df.median()['a']).toBe(2);
  });

  it('mad()', () => {
    expect(typeof df.mad()['a']).toBe('number');
  });

  it('skew()', () => {
    expect(typeof df.skew()['a']).toBe('number');
  });

  it('kurtosis()', () => {
    expect(typeof df.kurtosis()['a']).toBe('number');
  });

  it('dot() DataFrame @ Series', () => {
    const s = new Series([1, 1]);
    const r = df.dot(s);
    expect(r instanceof Series).toBe(true);
  });

  it('xs() gets row as Series', () => {
    const r = df.xs(0);
    expect(r instanceof Series).toBe(true);
  });

  it('product()', () => {
    expect(df.product()['a']).toBe(6); // 1*2*3
  });

  it('combine_first() fills missing', () => {
    const df1 = new DataFrame({ a: [1, null, 3] });
    const df2 = new DataFrame({ a: [10, 20, 30] });
    const r = df1.combine_first(df2);
    expect(r.shape[0]).toBe(3);
  });
});

describe('Series extra methods', () => {
  const s = new Series([1, 2, 3, 4, 5]);

  it('kurtosis()', () => {
    expect(typeof s.kurtosis()).toBe('number');
  });

  it('skew()', () => {
    expect(typeof s.skew()).toBe('number');
  });

  it('sem()', () => {
    expect(typeof s.sem()).toBe('number');
  });

  it('mad()', () => {
    expect(typeof s.mad()).toBe('number');
  });

  it('product()', () => {
    expect(s.product()).toBe(120); // 1*2*3*4*5
  });

  it('to_numpy()', () => {
    expect(s.to_numpy()).toEqual([1, 2, 3, 4, 5]);
  });

  it('equals()', () => {
    expect(s.equals(new Series([1, 2, 3, 4, 5]))).toBe(true);
    expect(s.equals(new Series([1, 2, 3]))).toBe(false);
  });

  it('between()', () => {
    const r = s.between(2, 4);
    expect(Number(r.iloc(0))).toBe(0); // 1 not in [2,4]
    expect(Number(r.iloc(1))).toBe(1); // 2 in [2,4]
    expect(Number(r.iloc(4))).toBe(0); // 5 not in [2,4]
  });

  it('between() exclusive', () => {
    const r = s.between(2, 4, 'neither');
    expect(Number(r.iloc(1))).toBe(0); // 2 not in (2,4)
    expect(Number(r.iloc(2))).toBe(1); // 3 in (2,4)
  });

  it('dot()', () => {
    const s2 = new Series([1, 1, 1, 1, 1]);
    expect(s.dot(s2)).toBe(15); // 1+2+3+4+5
  });

  it('reindex()', () => {
    const s2 = new Series([10, 20, 30], { index: ['a', 'b', 'c'] });
    const r = s2.reindex(['a', 'b', 'c', 'd']);
    expect(r.size).toBe(4);
    expect(Number(r.iloc(3))).toBeNaN();
  });

  it('combine_first()', () => {
    const a = new Series([1, null, 3]);
    const b = new Series([10, 20, 30]);
    const r = a.combine_first(b);
    expect(Number(r.iloc(1))).toBe(20);
  });

  it('combine()', () => {
    const a = new Series([1, 2, 3]);
    const b = new Series([4, 5, 6]);
    const r = a.combine(b, (x, y) => Number(x) + Number(y));
    expect(Number(r.iloc(0))).toBe(5);
  });
});
