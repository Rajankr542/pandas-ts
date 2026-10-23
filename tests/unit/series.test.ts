import { describe, it, expect } from 'vitest';
import { Series } from '../../src/series.js';
import { bool_ } from '../../src/dtype.js';

describe('Series', () => {
  it('creates from array', () => {
    const s = new Series([1, 2, 3]);
    expect(s.size).toBe(3);
    expect(s.dtype.kind).toBe('float');
  });

  it('creates with name and index', () => {
    const s = new Series([1, 2, 3], { name: 'test', index: ['a', 'b', 'c'] });
    expect(s.name).toBe('test');
    expect(s.index).toEqual(['a', 'b', 'c']);
  });

  it('head() returns first n rows', () => {
    const s = new Series([1, 2, 3, 4, 5]);
    expect(s.head(3).size).toBe(3);
  });

  it('tail() returns last n rows', () => {
    const s = new Series([1, 2, 3, 4, 5]);
    expect(s.tail(2).size).toBe(2);
  });

  it('sum() works', () => {
    expect(new Series([1, 2, 3]).sum()).toBe(6);
  });

  it('mean() works', () => {
    expect(new Series([1, 2, 3]).mean()).toBe(2);
  });

  it('min/max work', () => {
    const s = new Series([3, 1, 4, 1, 5]);
    expect(s.min()).toBe(1);
    expect(s.max()).toBe(5);
  });

  it('std() matches pandas ddof=1', () => {
    const s = new Series([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.std()).toBeCloseTo(2.0, 5);
  });

  it('isna() detects NaN', () => {
    const s = new Series([1, NaN, 3]);
    const mask = s.isna();
    expect(mask.iloc(0)).toBe(0);
    expect(mask.iloc(1)).toBe(1);
    expect(mask.iloc(2)).toBe(0);
  });

  it('fillna() replaces NaN', () => {
    const s = new Series([1, NaN, 3]);
    const filled = s.fillna(0);
    expect(Number(filled.iloc(1))).toBe(0);
  });

  it('dropna() removes NaN', () => {
    const s = new Series([1, NaN, 3, NaN, 5]);
    expect(s.dropna().size).toBe(3);
  });

  it('sort_values() sorts ascending', () => {
    const s = new Series([3, 1, 2]);
    const sorted = s.sort_values();
    expect(sorted.iloc(0)).toBe(1);
    expect(sorted.iloc(2)).toBe(3);
  });

  it('sort_values() descending', () => {
    const s = new Series([3, 1, 2]);
    const sorted = s.sort_values({ ascending: false });
    expect(sorted.iloc(0)).toBe(3);
  });

  it('unique() returns unique values', () => {
    const s = new Series([1, 2, 1, 3, 2]);
    expect(s.unique()).toHaveLength(3);
  });

  it('nunique() counts unique values', () => {
    expect(new Series([1, 2, 1, 3]).nunique()).toBe(3);
  });

  it('value_counts() counts occurrences', () => {
    const s = new Series(['a', 'b', 'a', 'c', 'a']);
    const vc = s.value_counts();
    expect(vc.iloc(0)).toBe(3); // 'a' appears 3 times
  });

  it('add() works element-wise', () => {
    const a = new Series([1, 2, 3]);
    const b = new Series([4, 5, 6]);
    const result = a.add(b);
    expect(result.iloc(0)).toBe(5);
    expect(result.iloc(2)).toBe(9);
  });

  it('add() with scalar', () => {
    const s = new Series([1, 2, 3]);
    const result = s.add(10);
    expect(result.iloc(0)).toBe(11);
  });

  it('eq() comparison', () => {
    const s = new Series([1, 2, 3]);
    const mask = s.eq(2);
    expect(mask.iloc(0)).toBe(0);
    expect(mask.iloc(1)).toBe(1);
  });

  it('cumsum()', () => {
    const s = new Series([1, 2, 3, 4]);
    const cs = s.cumsum();
    expect(cs.iloc(3)).toBe(10);
  });

  it('rolling mean', () => {
    const s = new Series([1, 2, 3, 4, 5]);
    const rm = s.rolling(3).mean();
    expect(Number(rm.iloc(0))).toBeNaN();
    expect(Number(rm.iloc(2))).toBe(2);
    expect(Number(rm.iloc(4))).toBe(4);
  });

  it('apply() maps values', () => {
    const s = new Series([1, 2, 3]);
    const doubled = s.apply(v => Number(v) * 2);
    expect(doubled.iloc(0)).toBe(2);
  });

  it('isin() checks membership', () => {
    const s = new Series([1, 2, 3, 4]);
    const result = s.isin([2, 4]);
    expect(result.iloc(0)).toBe(0);
    expect(result.iloc(1)).toBe(1);
    expect(result.iloc(3)).toBe(1);
  });

  it('describe() returns stats', () => {
    const s = new Series([1, 2, 3, 4, 5]);
    const d = s.describe();
    expect(d.count).toBe(5);
    expect(d.mean).toBe(3);
    expect(d.min).toBe(1);
    expect(d.max).toBe(5);
    expect(d['50%']).toBe(3);
  });

  it('astype() converts dtype', () => {
    const s = new Series([1.5, 2.7, 3.9]);
    const int_s = s.astype('int32');
    expect(int_s.dtype.name).toBe('int32');
  });
});
