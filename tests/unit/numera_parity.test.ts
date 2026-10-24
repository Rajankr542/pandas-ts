/**
 * Tests for numera integration, tseries.offsets, pd.testing, pd.eval, pd.infer_freq
 */
import { describe, it, expect } from 'vitest';
import { Series } from '../../src/series.js';
import { DataFrame } from '../../src/dataframe.js';
import {
  BusinessDay, MonthEnd, MonthBegin, YearEnd, YearBegin,
  QuarterEnd, Week, Hour, Minute, Second, Day, Milli, offsets,
} from '../../src/offsets.js';
import {
  assert_series_equal, assert_frame_equal, assert_index_equal, AssertionError,
} from '../../src/testing.js';
import { pdEval, evalDataFrame } from '../../src/eval.js';
import { infer_freq } from '../../src/infer_freq.js';

// ── tseries.offsets ───────────────────────────────────────────────────────────

describe('tseries.offsets', () => {
  it('BusinessDay advances by 1 business day (Friday → Monday)', () => {
    const bd = new BusinessDay(1);
    const friday = new Date('2024-01-05'); // Friday
    expect(bd.apply(friday).getDay()).toBe(1); // Monday
  });

  it('BusinessDay advances Thursday → Friday', () => {
    const bd = new BusinessDay(1);
    expect(bd.apply(new Date('2024-01-04')).getDay()).toBe(5);
  });

  it('BusinessDay rollforward skips Saturday → Monday', () => {
    const bd = new BusinessDay();
    expect(bd.rollforward(new Date('2024-01-06')).getDay()).toBe(1);
  });

  it('BusinessDay rollback skips Sunday → Friday', () => {
    const bd = new BusinessDay();
    expect(bd.rollback(new Date('2024-01-07')).getDay()).toBe(5);
  });

  it('BusinessDay(5) advances 5 business days', () => {
    const bd = new BusinessDay(5);
    const monday = new Date('2024-01-01');
    expect(bd.apply(monday).getDay()).toBe(1); // next Monday
  });

  it('MonthEnd advances to end of month', () => {
    const me = new MonthEnd(1);
    const r = me.apply(new Date('2024-01-15'));
    expect(r.getMonth()).toBe(0);
    expect(r.getDate()).toBe(31);
  });

  it('MonthEnd on leap year Feb = 29', () => {
    const me = new MonthEnd(1);
    const r = me.apply(new Date('2024-01-31'));
    expect(r.getDate()).toBe(29); // Feb 2024 (leap)
  });

  it('MonthBegin advances to first of next month', () => {
    const mb = new MonthBegin(1);
    const r = mb.apply(new Date('2024-01-15'));
    expect(r.getDate()).toBe(1);
    expect(r.getMonth()).toBe(1);
  });

  it('YearEnd advances to Dec 31', () => {
    const ye = new YearEnd(1);
    const r = ye.apply(new Date('2024-06-15'));
    expect(r.getMonth()).toBe(11);
    expect(r.getDate()).toBe(31);
  });

  it('YearBegin advances to Jan 1 of next year', () => {
    const yb = new YearBegin(1);
    const r = yb.apply(new Date('2024-06-15'));
    expect(r.getFullYear()).toBe(2025);
    expect(r.getMonth()).toBe(0);
    expect(r.getDate()).toBe(1);
  });

  it('QuarterEnd advances to next quarter end', () => {
    const qe = new QuarterEnd(1);
    const r = qe.apply(new Date('2024-01-15'));
    expect(r.getMonth()).toBe(2);  // March
    expect(r.getDate()).toBe(31);
  });

  it('Week advances by 7 days', () => {
    const w = new Week(1);
    expect(w.apply(new Date('2024-01-01')).getDate()).toBe(8);
  });

  it('Hour adds hours', () => {
    const h = new Hour(3);
    expect(h.apply(new Date('2024-01-01T10:00:00')).getHours()).toBe(13);
  });

  it('Minute adds minutes', () => {
    const m = new Minute(30);
    expect(m.apply(new Date('2024-01-01T10:00:00')).getMinutes()).toBe(30);
  });

  it('Second adds seconds', () => {
    const s = new Second(45);
    expect(s.apply(new Date('2024-01-01T10:00:00')).getSeconds()).toBe(45);
  });

  it('Day advances by n days', () => {
    expect(new Day(5).apply(new Date('2024-01-01')).getDate()).toBe(6);
  });

  it('Milli adds milliseconds', () => {
    expect(new Milli(500).apply(new Date('2024-01-01T00:00:00.000')).getMilliseconds()).toBe(500);
  });

  it('offsets map contains all offset classes', () => {
    expect(offsets.BusinessDay).toBeDefined();
    expect(offsets.MonthEnd).toBeDefined();
    expect(offsets.Week).toBeDefined();
    expect(offsets.Hour).toBeDefined();
    expect(offsets.YearEnd).toBeDefined();
  });

  it('toString is descriptive', () => {
    expect(new BusinessDay(2).toString()).toContain('BusinessDay');
    expect(new MonthEnd(1).toString()).toContain('MonthEnd');
  });
});

// ── pd.testing ────────────────────────────────────────────────────────────────

describe('pd.testing', () => {
  it('assert_series_equal passes for equal series', () => {
    expect(() => assert_series_equal(new Series([1, 2, 3]), new Series([1, 2, 3]))).not.toThrow();
  });

  it('assert_series_equal fails for different values', () => {
    expect(() => assert_series_equal(new Series([1, 2, 3]), new Series([1, 2, 4]))).toThrow(AssertionError);
  });

  it('assert_series_equal passes close floats within rtol', () => {
    expect(() => assert_series_equal(
      new Series([1.0, 2.0]),
      new Series([1.0 + 1e-7, 2.0]),
    )).not.toThrow();
  });

  it('assert_series_equal check_exact rejects close values', () => {
    expect(() => assert_series_equal(
      new Series([1.0]),
      new Series([1.0 + 1e-7]),
      { check_exact: true },
    )).toThrow(AssertionError);
  });

  it('assert_series_equal fails for length mismatch', () => {
    expect(() => assert_series_equal(new Series([1, 2]), new Series([1, 2, 3]))).toThrow(AssertionError);
  });

  it('assert_series_equal treats NaN == NaN as equal', () => {
    expect(() => assert_series_equal(new Series([1, NaN, 3]), new Series([1, NaN, 3]))).not.toThrow();
  });

  it('assert_series_equal fails on NaN vs number', () => {
    expect(() => assert_series_equal(new Series([NaN]), new Series([1]))).toThrow(AssertionError);
  });

  it('assert_frame_equal passes for equal frames', () => {
    const a = new DataFrame({ x: [1, 2], y: [3, 4] });
    const b = new DataFrame({ x: [1, 2], y: [3, 4] });
    expect(() => assert_frame_equal(a, b)).not.toThrow();
  });

  it('assert_frame_equal fails for different values', () => {
    expect(() => assert_frame_equal(
      new DataFrame({ x: [1, 2] }),
      new DataFrame({ x: [1, 9] }),
    )).toThrow(AssertionError);
  });

  it('assert_frame_equal fails for shape mismatch', () => {
    expect(() => assert_frame_equal(
      new DataFrame({ x: [1, 2] }),
      new DataFrame({ x: [1, 2, 3] }),
    )).toThrow(AssertionError);
  });

  it('assert_index_equal passes for equal indices', () => {
    expect(() => assert_index_equal(['a', 'b', 'c'], ['a', 'b', 'c'])).not.toThrow();
  });

  it('assert_index_equal fails for mismatch', () => {
    expect(() => assert_index_equal(['a', 'b'], ['a', 'c'])).toThrow(AssertionError);
  });

  it('assert_index_equal fails for length mismatch', () => {
    expect(() => assert_index_equal(['a'], ['a', 'b'])).toThrow(AssertionError);
  });
});

// ── pd.eval ───────────────────────────────────────────────────────────────────

describe('pd.eval / evalDataFrame', () => {
  it('evaluates addition expression', () => {
    const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
    const r = evalDataFrame(df, 'a + b');
    expect(Number(r.iloc(0))).toBe(5);
    expect(Number(r.iloc(1))).toBe(7);
    expect(Number(r.iloc(2))).toBe(9);
  });

  it('evaluates multiplication', () => {
    const df = new DataFrame({ x: [2, 3], y: [4, 5] });
    const r = evalDataFrame(df, 'x * y');
    expect(Number(r.iloc(0))).toBe(8);
    expect(Number(r.iloc(1))).toBe(15);
  });

  it('evaluates comparison (returns booleans)', () => {
    const df = new DataFrame({ a: [1, 2, 3] });
    const r = evalDataFrame(df, 'a > 1');
    expect(Boolean(r.iloc(0))).toBe(false);
    expect(Boolean(r.iloc(1))).toBe(true);
    expect(Boolean(r.iloc(2))).toBe(true);
  });

  it('evaluates subtraction', () => {
    const df = new DataFrame({ a: [10, 20], b: [3, 4] });
    const r = evalDataFrame(df, 'a - b');
    expect(Number(r.iloc(0))).toBe(7);
    expect(Number(r.iloc(1))).toBe(16);
  });

  it('pdEval with no df evaluates scalar math', () => {
    expect(pdEval('2 + 3')).toBe(5);
    expect(pdEval('10 / 2')).toBe(5);
    expect(pdEval('2 ** 3')).toBe(8);
  });

  it('pdEval with df returns Series', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    const r = pdEval('a + b', df) as Series;
    expect(Number(r.iloc(0))).toBe(4);
    expect(Number(r.iloc(1))).toBe(6);
  });
});

// ── pd.infer_freq ─────────────────────────────────────────────────────────────

describe('pd.infer_freq', () => {
  it('detects daily frequency', () => {
    expect(infer_freq(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'])).toBe('D');
  });

  it('detects hourly frequency', () => {
    const base = new Date('2024-01-01T00:00:00');
    const dates = [0, 1, 2, 3].map(h => new Date(base.getTime() + h * 3_600_000));
    expect(infer_freq(dates)).toBe('H');
  });

  it('detects minute frequency', () => {
    const base = new Date('2024-01-01T00:00:00');
    const dates = [0, 1, 2, 3].map(m => new Date(base.getTime() + m * 60_000));
    expect(infer_freq(dates)).toBe('T');
  });

  it('detects weekly frequency', () => {
    const base = new Date('2024-01-01');
    const dates = [0, 1, 2, 3].map(w => new Date(base.getTime() + w * 7 * 86_400_000));
    expect(infer_freq(dates)).toBe('W');
  });

  it('detects month-start frequency', () => {
    expect(infer_freq(['2024-01-01', '2024-02-01', '2024-03-01'])).toBe('MS');
  });

  it('returns null for irregular dates', () => {
    expect(infer_freq(['2024-01-01', '2024-01-03', '2024-01-07'])).toBeNull();
  });

  it('returns null for single date', () => {
    expect(infer_freq(['2024-01-01'])).toBeNull();
  });
});

// ── numera-powered Series methods ─────────────────────────────────────────────

describe('Series numera methods', () => {
  it('norm() L2 — 3-4-5 triangle', () => {
    expect(new Series([3, 4]).norm()).toBeCloseTo(5, 4);
  });

  it('average() without weights equals mean', () => {
    expect(new Series([1, 2, 3, 4]).average()).toBeCloseTo(2.5, 5);
  });

  it('average() with weights', () => {
    const r = new Series([1, 2, 3]).average([0, 0, 1]);
    expect(r).toBeCloseTo(3, 5);
  });

  it('gradient() returns numerical gradient', () => {
    const r = new Series([1, 2, 3, 4, 5]).gradient();
    expect(r.size).toBe(5);
    expect(Number(r.iloc(2))).toBeCloseTo(1.0, 4);
  });

  it('hist() returns correct bin count', () => {
    const { hist, edges } = new Series([1, 2, 2, 3, 3, 3, 4]).hist(4);
    expect(hist.length).toBe(4);
    expect(edges.length).toBe(5);
    expect(hist.reduce((a, b) => a + b, 0)).toBe(7);
  });

  it('percentile() 50th = median', () => {
    expect(new Series([1, 2, 3, 4, 5]).percentile(50)).toBeCloseTo(3, 1);
  });

  it('percentile() 0th = min, 100th = max', () => {
    const s = new Series([1, 2, 3, 4, 5]);
    expect(s.percentile(0)).toBeCloseTo(1, 1);
    expect(s.percentile(100)).toBeCloseTo(5, 1);
  });

  it('interp() interpolates correctly', () => {
    const r = new Series([0, 0.5, 1, 1.5, 2]).interp([0, 1, 2], [0, 10, 20]);
    expect(Number(r.iloc(0))).toBeCloseTo(0, 4);
    expect(Number(r.iloc(1))).toBeCloseTo(5, 4);
    expect(Number(r.iloc(2))).toBeCloseTo(10, 4);
    expect(Number(r.iloc(4))).toBeCloseTo(20, 4);
  });

  it('corrWithNumera() perfect positive = 1', () => {
    const a = new Series([1, 2, 3, 4, 5]);
    const b = new Series([2, 4, 6, 8, 10]);
    expect(a.corrWithNumera(b)).toBeCloseTo(1.0, 4);
  });

  it('corrWithNumera() perfect negative = -1', () => {
    const a = new Series([1, 2, 3, 4, 5]);
    const b = new Series([5, 4, 3, 2, 1]);
    expect(a.corrWithNumera(b)).toBeCloseTo(-1.0, 4);
  });

  it('ndiff() same size as input with leading NaN', () => {
    const r = new Series([1, 3, 6, 10]).ndiff(1);
    expect(r.size).toBe(4);
    expect(Number(r.iloc(1))).toBeCloseTo(2, 4);
    expect(Number(r.iloc(2))).toBeCloseTo(3, 4);
  });

  it('convolve() with [1,1,1] is sliding sum', () => {
    const r = new Series([1, 2, 3]).convolve([1, 1, 1], 'full');
    expect(r.size).toBe(5); // full mode: n+m-1
  });

  it('cumsumNumera() correct', () => {
    const r = new Series([1, 2, 3, 4]).cumsumNumera();
    expect(Number(r.iloc(3))).toBeCloseTo(10, 4);
  });

  it('cumprodNumera() correct', () => {
    const r = new Series([1, 2, 3, 4]).cumprodNumera();
    expect(Number(r.iloc(3))).toBeCloseTo(24, 4);
  });
});

// ── DataFrame numera integration ──────────────────────────────────────────────

describe('DataFrame numera integration', () => {
  it('cov_matrix() has correct shape', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4], b: [4, 3, 2, 1] });
    const r = df.cov_matrix();
    expect(r.shape).toEqual([2, 2]);
  });

  it('cov_matrix() diagonal is variance', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4, 5] });
    const r = df.cov_matrix();
    // Var of [1,2,3,4,5] with ddof=1 = 2.5
    expect(Number(r.col('a').iloc(0))).toBeCloseTo(2.5, 4);
  });

  it('cov_matrix() off-diagonal a-b is negative for inverse series', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4], b: [4, 3, 2, 1] });
    const r = df.cov_matrix();
    expect(Number(r.col('b').iloc(0))).toBeLessThan(0);
  });

  it('corr_matrix() diagonal = 1', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4], b: [1, 2, 3, 4] });
    const r = df.corr_matrix();
    expect(Number(r.col('a').iloc(0))).toBeCloseTo(1.0, 4);
    expect(Number(r.col('b').iloc(1))).toBeCloseTo(1.0, 4);
  });

  it('corr_matrix() perfectly correlated columns = 1', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4], b: [2, 4, 6, 8] });
    const r = df.corr_matrix();
    expect(Number(r.col('b').iloc(0))).toBeCloseTo(1.0, 4);
  });

  it('corr_matrix() inversely correlated = -1', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4], b: [4, 3, 2, 1] });
    const r = df.corr_matrix();
    expect(Number(r.col('b').iloc(0))).toBeCloseTo(-1.0, 4);
  });
});
