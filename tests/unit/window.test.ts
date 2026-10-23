import { describe, it, expect } from 'vitest';
import { Series } from '../../src/series.js';
import { DataFrame } from '../../src/dataframe.js';
import type { EWMOptions } from '../../src/window/ewm.js';

describe('Rolling (Series)', () => {
  const s = new Series([1, 2, 3, 4, 5]);

  it('mean() with full window', () => {
    const r = s.rolling(3).mean() as Series;
    expect(Number(r.iloc(0))).toBeNaN();
    expect(Number(r.iloc(1))).toBeNaN();
    expect(Number(r.iloc(2))).toBe(2);
    expect(Number(r.iloc(3))).toBe(3);
    expect(Number(r.iloc(4))).toBe(4);
  });

  it('mean() with min_periods=1', () => {
    const r = s.rolling(3, { min_periods: 1 }).mean() as Series;
    expect(Number(r.iloc(0))).toBe(1);
    expect(Number(r.iloc(1))).toBe(1.5);
    expect(Number(r.iloc(2))).toBe(2);
  });

  it('sum()', () => {
    const r = s.rolling(2).sum() as Series;
    expect(Number(r.iloc(1))).toBe(3);
    expect(Number(r.iloc(4))).toBe(9);
  });

  it('min()', () => {
    const r = s.rolling(3).min() as Series;
    expect(Number(r.iloc(2))).toBe(1);
    expect(Number(r.iloc(4))).toBe(3);
  });

  it('max()', () => {
    const r = s.rolling(3).max() as Series;
    expect(Number(r.iloc(2))).toBe(3);
    expect(Number(r.iloc(4))).toBe(5);
  });

  it('std() with ddof=1', () => {
    const r = s.rolling(3).std() as Series;
    expect(Number(r.iloc(2))).toBeCloseTo(1.0, 5);
  });

  it('median()', () => {
    const r = s.rolling(3).median() as Series;
    expect(Number(r.iloc(2))).toBe(2);
    expect(Number(r.iloc(4))).toBe(4);
  });

  it('center=true shifts window', () => {
    const r = s.rolling(3, { center: true }).mean() as Series;
    expect(Number(r.iloc(1))).toBe(2);
    expect(Number(r.iloc(2))).toBe(3);
  });

  it('throws on window <= 0', () => {
    expect(() => s.rolling(0)).toThrow();
  });
});

describe('Rolling (DataFrame)', () => {
  const df = new DataFrame({ a: [1, 2, 3, 4, 5], b: [10, 20, 30, 40, 50] });

  it('mean() returns DataFrame with correct values', () => {
    const r = df.rolling(3).mean() as DataFrame;
    expect(r.columns).toEqual(['a', 'b']);
    expect(Number(r.col('a').iloc(2))).toBe(2);
    expect(Number(r.col('b').iloc(4))).toBe(40);
  });
});

describe('Expanding (Series)', () => {
  const s = new Series([1, 2, 3, 4, 5]);

  it('sum() returns cumulative sum', () => {
    const r = s.expanding().sum() as Series;
    expect(Number(r.iloc(0))).toBe(1);
    expect(Number(r.iloc(4))).toBe(15);
  });

  it('mean() returns cumulative mean', () => {
    const r = s.expanding().mean() as Series;
    expect(Number(r.iloc(0))).toBe(1);
    expect(Number(r.iloc(4))).toBe(3);
  });

  it('min()', () => {
    const r = s.expanding().min() as Series;
    expect(Number(r.iloc(4))).toBe(1);
  });

  it('max()', () => {
    const r = s.expanding().max() as Series;
    expect(Number(r.iloc(4))).toBe(5);
  });

  it('min_periods respected', () => {
    const r = s.expanding({ min_periods: 3 }).sum() as Series;
    expect(Number(r.iloc(0))).toBeNaN();
    expect(Number(r.iloc(2))).toBe(6);
  });
});

describe('EWM (Series)', () => {
  const s = new Series([1, 2, 3, 4, 5]);

  it('mean() with span=2 is non-NaN', () => {
    const r = s.ewm({ span: 2 }).mean() as Series;
    expect(Number(r.iloc(0))).toBe(1);
    expect(Number(r.iloc(4))).toBeGreaterThan(4); // approaches last value
  });

  it('mean() with alpha=1 equals the series itself', () => {
    const r = s.ewm({ alpha: 1 }).mean() as Series;
    expect(Number(r.iloc(0))).toBeCloseTo(1, 5);
    expect(Number(r.iloc(4))).toBeCloseTo(5, 5);
  });

  it('throws if no decay param given', () => {
    expect(() => (s.ewm({} as EWMOptions)).mean()).toThrow();
  });

  it('mean() with halflife', () => {
    const r = s.ewm({ halflife: 2 }).mean() as Series;
    // Just check it runs and returns a Series
    expect(r.size).toBe(5);
  });

  it('mean() with com', () => {
    const r = s.ewm({ com: 1 }).mean() as Series;
    expect(r.size).toBe(5);
  });
});
