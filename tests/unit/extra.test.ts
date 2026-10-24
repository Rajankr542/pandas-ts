import { describe, it, expect } from 'vitest';
import { DataFrame } from '../../src/dataframe.js';
import { Series } from '../../src/series.js';
import { Categorical } from '../../src/categorical.js';
import { Period } from '../../src/period.js';
import { Interval, IntervalIndex } from '../../src/interval.js';
import { cut, qcut, date_range, to_datetime, isna } from '../../src/functions.js';

describe('Categorical', () => {
  it('creates with inferred categories', () => {
    const c = new Categorical(['a', 'b', 'a', 'c']);
    expect(c.categories).toEqual(['a', 'b', 'c']);
  });
  it('codes maps correctly', () => {
    const c = new Categorical(['a', 'b', 'a']);
    expect(c.codes[0]).toBe(0);
    expect(c.codes[1]).toBe(1);
  });
  it('from_codes round-trips', () => {
    const c = Categorical.from_codes([0, 1, 0], ['x', 'y']);
    expect(c.categories).toEqual(['x', 'y']);
  });
  it('value_counts()', () => {
    const c = new Categorical(['a', 'b', 'a']);
    const vc = c.value_counts();
    expect(Number(vc.iloc(0))).toBe(2);
  });
  it('rename_categories()', () => {
    const c = new Categorical(['a', 'b']);
    const r = c.rename_categories(['x', 'y']);
    expect(r.categories).toEqual(['x', 'y']);
  });
});

describe('Period', () => {
  it('creates daily period', () => {
    const p = new Period('2024-01-15', 'D');
    expect(p.year).toBe(2024);
    expect(p.month).toBe(1);
    expect(p.day).toBe(15);
  });
  it('add() shifts period', () => {
    const p = new Period('2024-01-15', 'D');
    const p2 = p.add(5);
    expect(p2.day).toBe(20);
  });
  it('monthly period', () => {
    const p = new Period('2024-01', 'M');
    expect(p.toString()).toBe('2024-01');
    const p2 = p.add(3);
    expect(p2.month).toBe(4);
  });
  it('diff()', () => {
    const p1 = new Period('2024-01-10', 'D');
    const p2 = new Period('2024-01-15', 'D');
    expect(p2.diff(p1)).toBe(5);
  });
  it('strftime()', () => {
    const p = new Period('2024-03-07', 'D');
    expect(p.strftime('%Y-%m-%d')).toBe('2024-03-07');
  });
  it('comparison operators', () => {
    const p1 = new Period('2024-01-01', 'D');
    const p2 = new Period('2024-01-02', 'D');
    expect(p1.lt(p2)).toBe(true);
    expect(p2.gt(p1)).toBe(true);
  });
});

describe('Interval', () => {
  it('creates interval', () => {
    const i = new Interval(0, 1);
    expect(i.left).toBe(0);
    expect(i.right).toBe(1);
    expect(i.length).toBe(1);
  });
  it('contains()', () => {
    const i = new Interval(0, 1, 'right');
    expect(i.contains(0.5)).toBe(true);
    expect(i.contains(0)).toBe(false); // open on left
    expect(i.contains(1)).toBe(true);
  });
  it('contains() with both', () => {
    const i = new Interval(0, 1, 'both');
    expect(i.contains(0)).toBe(true);
    expect(i.contains(1)).toBe(true);
  });
  it('overlaps()', () => {
    const a = new Interval(0, 2);
    const b = new Interval(1, 3);
    expect(a.overlaps(b)).toBe(true);
  });
  it('toString()', () => {
    expect(new Interval(0, 1).toString()).toBe('(0, 1]');
    expect(new Interval(0, 1, 'both').toString()).toBe('[0, 1]');
  });
});

describe('IntervalIndex', () => {
  it('from_breaks()', () => {
    const idx = IntervalIndex.from_breaks([0, 1, 2, 3]);
    expect(idx.length).toBe(3);
    expect(idx.get(0).left).toBe(0);
    expect(idx.get(2).right).toBe(3);
  });
});

describe('cut()', () => {
  it('bins a Series into equal-width bins', () => {
    const s = new Series([1, 2, 3, 4, 5]);
    const r = cut(s, 2);
    expect(r.size).toBe(5);
  });
  it('uses custom bin edges', () => {
    const s = new Series([1, 3, 5, 7]);
    const r = cut(s, [0, 4, 8]);
    expect(r.size).toBe(4);
  });
  it('uses custom labels', () => {
    const s = new Series([1, 5, 9]);
    const r = cut(s, [0, 4, 8, 12], { labels: ['low', 'med', 'high'] });
    expect(String(r.iloc(0))).toBe('low');
    expect(String(r.iloc(1))).toBe('med');
    expect(String(r.iloc(2))).toBe('high');
  });
});

describe('qcut()', () => {
  it('bins into quantile-based intervals', () => {
    const s = new Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const r = qcut(s, 4);
    expect(r.size).toBe(10);
  });
});

describe('date_range()', () => {
  it('generates daily range by periods', () => {
    const r = date_range('2024-01-01', { periods: 5, freq: 'D' });
    expect(r.size).toBe(5);
    const first = r.iloc(0) as Date;
    expect(first.getFullYear()).toBe(2024);
  });
  it('generates range by end date', () => {
    const r = date_range('2024-01-01', { end: '2024-01-05', freq: 'D' });
    expect(r.size).toBe(5);
  });
});

describe('to_datetime()', () => {
  it('converts string array', () => {
    const r = to_datetime(['2024-01-01', '2024-06-15']);
    expect(r.size).toBe(2);
    expect((r.iloc(0) as Date).getFullYear()).toBe(2024);
  });
});

describe('DataFrame extras', () => {
  const df = new DataFrame({ a: [1, 2, 3, 4, 5], b: [5, 4, 3, 2, 1] });

  it('diff()', () => {
    const r = df.diff();
    expect(Number(r.col('a').iloc(0))).toBeNaN();
    expect(Number(r.col('a').iloc(1))).toBe(1);
  });

  it('pct_change()', () => {
    const r = df.pct_change();
    expect(r.shape[0]).toBe(5);
  });

  it('shift()', () => {
    const r = df.shift(1);
    expect(Number(r.col('a').iloc(0))).toBeNaN();
    expect(Number(r.col('a').iloc(1))).toBe(1);
  });

  it('cumsum()', () => {
    const r = df.cumsum();
    expect(Number(r.col('a').iloc(4))).toBe(15);
  });

  it('abs()', () => {
    const d = new DataFrame({ a: [-1, -2, 3] });
    const r = d.abs();
    expect(Number(r.col('a').iloc(0))).toBe(1);
  });

  it('round()', () => {
    const d = new DataFrame({ a: [1.456, 2.789] });
    const r = d.round(2);
    expect(Number(r.col('a').iloc(0))).toBeCloseTo(1.46, 2);
  });

  it('clip()', () => {
    const r = df.clip(2, 4);
    expect(Number(r.col('a').iloc(0))).toBe(2);
    expect(Number(r.col('a').iloc(4))).toBe(4);
  });

  it('corr()', () => {
    const r = df.corr();
    expect(Number(r.col('a').iloc(0))).toBeCloseTo(1.0, 5);
    expect(Number(r.col('b').iloc(0))).toBeCloseTo(-1.0, 5);
  });

  it('cov()', () => {
    const r = df.cov();
    expect(r.shape).toEqual([2, 2]);
  });

  it('quantile()', () => {
    const r = df.quantile(0.5);
    expect(r['a']).toBe(3);
  });

  it('nunique()', () => {
    const r = df.nunique();
    expect(r['a']).toBe(5);
  });

  it('idxmin()', () => {
    const r = df.idxmin();
    expect(r['a']).toBe(0);
  });

  it('idxmax()', () => {
    const r = df.idxmax();
    expect(r['a']).toBe(4);
  });

  it('value_counts()', () => {
    const d = new DataFrame({ a: [1, 1, 2, 3] });
    const r = d.value_counts(['a']);
    expect(Number(r.iloc(0))).toBe(2);
  });

  it('pivot()', () => {
    const d = new DataFrame({ row: ['r1', 'r1', 'r2'], col: ['c1', 'c2', 'c1'], val: [1, 2, 3] });
    const r = d.pivot({ index: 'row', columns: 'col', values: 'val' });
    expect(r.columns).toContain('c1');
  });

  it('melt()', () => {
    const d = new DataFrame({ id: [1, 2], a: [10, 20], b: [30, 40] });
    const r = d.melt({ id_vars: 'id', value_vars: ['a', 'b'] });
    expect(r.shape[0]).toBe(4);
    expect(r.columns).toContain('variable');
    expect(r.columns).toContain('value');
  });

  it('duplicated()', () => {
    const d = new DataFrame({ a: [1, 2, 1, 3] });
    const r = d.duplicated(['a']);
    expect(Number(r.iloc(2))).toBe(1);
    expect(Number(r.iloc(0))).toBe(0);
  });

  it('drop_duplicates()', () => {
    const d = new DataFrame({ a: [1, 2, 1, 3] });
    const r = d.drop_duplicates(['a']);
    expect(r.shape[0]).toBe(3);
  });

  it('nlargest()', () => {
    const r = df.nlargest(2, 'a');
    expect(Number(r.col('a').iloc(0))).toBe(5);
  });

  it('nsmallest()', () => {
    const r = df.nsmallest(2, 'a');
    expect(Number(r.col('a').iloc(0))).toBe(1);
  });

  it('sample() returns correct n', () => {
    const r = df.sample(3);
    expect(r.shape[0]).toBe(3);
  });

  it('interpolate() fills NaN linearly', () => {
    const d = new DataFrame({ a: [1, NaN, 3] });
    const r = d.interpolate();
    expect(Number(r.col('a').iloc(1))).toBe(2);
  });

  it('pipe()', () => {
    const r = df.pipe(d => d.head(2));
    expect(r.shape[0]).toBe(2);
  });
});

describe('Series extras', () => {
  const s = new Series([3, 1, 4, 1, 5]);

  it('rank()', () => {
    const r = s.rank();
    expect(r.size).toBe(5);
  });

  it('diff()', () => {
    const r = s.diff();
    expect(Number(r.iloc(0))).toBeNaN();
    expect(Number(r.iloc(1))).toBe(-2);
  });

  it('pct_change()', () => {
    const r = new Series([100, 110, 99]).pct_change();
    expect(Number(r.iloc(0))).toBeNaN();
    expect(Number(r.iloc(1))).toBeCloseTo(0.1, 5);
  });

  it('shift()', () => {
    const r = s.shift(1);
    expect(Number(r.iloc(0))).toBeNaN();
    expect(Number(r.iloc(1))).toBe(3);
  });

  it('quantile()', () => {
    expect(new Series([1,2,3,4,5]).quantile(0.5)).toBe(3);
  });

  it('nlargest()', () => {
    expect(Number(s.nlargest(1).iloc(0))).toBe(5);
  });

  it('nsmallest()', () => {
    expect(Number(s.nsmallest(1).iloc(0))).toBe(1);
  });

  it('duplicated()', () => {
    const r = s.duplicated();
    expect(Number(r.iloc(0))).toBe(0);
    expect(Number(r.iloc(3))).toBe(1); // second '1'
  });

  it('drop_duplicates()', () => {
    expect(s.drop_duplicates().size).toBe(4);
  });

  it('sample()', () => {
    expect(s.sample(2).size).toBe(2);
  });

  it('interpolate()', () => {
    const r = new Series([1, NaN, 3]).interpolate();
    expect(Number(r.iloc(1))).toBe(2);
  });

  it('where()', () => {
    const cond = s.gt(2);
    const r = s.where(cond, 0);
    expect(Number(r.iloc(1))).toBe(0); // 1 < 2
    expect(Number(r.iloc(0))).toBe(3); // 3 > 2
  });

  it('searchsorted()', () => {
    const sorted = new Series([1, 3, 5, 7]);
    expect(sorted.searchsorted(4)).toBe(2);
  });

  it('pipe()', () => {
    const r = s.pipe(x => x.head(2));
    expect(r.size).toBe(2);
  });
});

describe('isna()', () => {
  it('detects null', () => { expect(isna(null)).toBe(true); });
  it('detects NaN', () => { expect(isna(NaN)).toBe(true); });
  it('non-missing value', () => { expect(isna(1)).toBe(false); });
  it('Series input returns Series', () => {
    const r = isna(new Series([1, NaN, null]));
    expect(r).toBeInstanceOf(Series);
  });
});
