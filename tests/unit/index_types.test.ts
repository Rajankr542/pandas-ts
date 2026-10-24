import { describe, it, expect } from 'vitest';
import { Index, RangeIndex, Int64Index, MultiIndex, DatetimeIndex, Float64Index, StringIndex } from '../../src/index.js';

describe('Index', () => {
  const idx = new Index([1, 2, 3, 4, 5]);

  it('length', () => expect(idx.length).toBe(5));
  it('get()', () => expect(idx.get(0)).toBe(1));
  it('get(-1)', () => expect(idx.get(-1)).toBe(5));
  it('get_loc()', () => expect(idx.get_loc(3)).toBe(2));
  it('contains()', () => {
    expect(idx.contains(3)).toBe(true);
    expect(idx.contains(99)).toBe(false);
  });
  it('union()', () => {
    const other = new Index([4, 5, 6]);
    expect(idx.union(other).length).toBe(6);
  });
  it('intersection()', () => {
    const other = new Index([3, 4, 5, 6]);
    expect(idx.intersection(other).length).toBe(3);
  });
  it('difference()', () => {
    const other = new Index([4, 5]);
    expect(idx.difference(other).length).toBe(3);
  });
  it('sort_values() ascending', () => {
    const i2 = new Index([3, 1, 2]);
    const s = i2.sort_values();
    expect(s.get(0)).toBe(1);
  });
  it('sort_values() descending', () => {
    const i2 = new Index([3, 1, 2]);
    const s = i2.sort_values(false);
    expect(s.get(0)).toBe(3);
  });
  it('unique()', () => {
    const i2 = new Index([1, 2, 2, 3]);
    expect(i2.unique().length).toBe(3);
  });
  it('is_unique', () => {
    expect(idx.is_unique).toBe(true);
    expect(new Index([1, 1]).is_unique).toBe(false);
  });
  it('is_monotonic_increasing', () => {
    expect(idx.is_monotonic_increasing).toBe(true);
    expect(new Index([3, 1, 2]).is_monotonic_increasing).toBe(false);
  });
  it('isin()', () => {
    const result = idx.isin([2, 4]);
    expect(result[1]).toBe(true);
    expect(result[0]).toBe(false);
  });
  it('drop()', () => {
    expect(idx.drop([2, 3]).length).toBe(3);
  });
  it('append()', () => {
    expect(idx.append(new Index([6])).length).toBe(6);
  });
  it('insert()', () => {
    expect(idx.insert(2, 99).get(2)).toBe(99);
  });
  it('delete()', () => {
    expect(idx.delete(0).get(0)).toBe(2);
  });
  it('min() / max()', () => {
    expect(idx.min()).toBe(1);
    expect(idx.max()).toBe(5);
  });
  it('equals()', () => {
    expect(idx.equals(new Index([1, 2, 3, 4, 5]))).toBe(true);
    expect(idx.equals(new Index([1, 2, 3]))).toBe(false);
  });
  it('duplicated()', () => {
    const i2 = new Index([1, 2, 1]);
    const d = i2.duplicated();
    expect(d[0]).toBe(false);
    expect(d[2]).toBe(true);
  });
  it('value_counts()', () => {
    const i2 = new Index([1, 2, 1]);
    const vc = i2.value_counts();
    expect(vc.get(1)).toBe(2);
  });
  it('toArray()', () => {
    expect(idx.toArray()).toEqual([1, 2, 3, 4, 5]);
  });
  it('iterable', () => {
    const vals: unknown[] = [];
    for (const v of idx) vals.push(v);
    expect(vals).toEqual([1, 2, 3, 4, 5]);
  });
  it('get_indexer()', () => {
    const result = idx.get_indexer([3, 5, 99]);
    expect(result[0]).toBe(2);
    expect(result[2]).toBe(-1);
  });
  it('slice()', () => {
    expect(idx.slice(1, 3).length).toBe(2);
  });
  it('map()', () => {
    const r = idx.map(v => (v as number) * 2);
    expect(r.get(0)).toBe(2);
  });
  it('symmetric_difference()', () => {
    const a = new Index([1, 2, 3]);
    const b = new Index([2, 3, 4]);
    expect(a.symmetric_difference(b).length).toBe(2);
  });
});

describe('RangeIndex', () => {
  it('start/stop creates range', () => {
    const r = new RangeIndex(0, 5);
    expect(r.length).toBe(5);
    expect(r.get(0)).toBe(0);
    expect(r.get(4)).toBe(4);
  });
  it('stop only creates 0..n range', () => {
    const r = new RangeIndex(3);
    expect(r.length).toBe(3);
    expect(r.get(0)).toBe(0);
  });
  it('with step', () => {
    const r = new RangeIndex(0, 10, 2);
    expect(r.length).toBe(5);
    expect(r.get(2)).toBe(4);
  });
  it('start/stop/step props', () => {
    const r = new RangeIndex(1, 7, 2);
    expect(r.start).toBe(1);
    expect(r.stop).toBe(7);
    expect(r.step).toBe(2);
  });
  it('dtype is int64', () => {
    expect(new RangeIndex(5).dtype).toBe('int64');
  });
  it('toString()', () => {
    expect(new RangeIndex(0, 5).toString()).toContain('RangeIndex');
  });
});

describe('Int64Index', () => {
  it('holds integer values', () => {
    const idx = new Int64Index([10, 20, 30]);
    expect(idx.dtype).toBe('int64');
    expect(idx.get(1)).toBe(20);
  });
});

describe('Float64Index', () => {
  it('holds float values', () => {
    const idx = new Float64Index([1.1, 2.2]);
    expect(idx.dtype).toBe('float64');
  });
});

describe('StringIndex', () => {
  it('holds string values', () => {
    const idx = new StringIndex(['a', 'b', 'c']);
    expect(idx.dtype).toBe('object');
    expect(idx.get(0)).toBe('a');
  });
});

describe('DatetimeIndex', () => {
  const dti = new DatetimeIndex(['2024-01-01', '2024-06-15', '2024-12-31']);

  it('length', () => expect(dti.length).toBe(3));
  it('dtype', () => expect(dti.dtype).toBe('datetime64[ns]'));
  it('year', () => expect(dti.year[0]).toBe(2024));
  it('month', () => {
    expect(dti.month[0]).toBe(1);
    expect(dti.month[1]).toBe(6);
  });
  it('day', () => expect(dti.day[0]).toBe(1));
  it('quarter', () => {
    expect(dti.quarter[0]).toBe(1);
    expect(dti.quarter[1]).toBe(2);
  });
  it('dayofweek', () => {
    expect(dti.dayofweek[0]).toBeGreaterThanOrEqual(0);
    expect(dti.dayofweek[0]).toBeLessThanOrEqual(6);
  });
  it('normalize() strips time', () => {
    const dti2 = new DatetimeIndex(['2024-01-15T10:30:00']);
    const norm = dti2.normalize();
    expect((norm.get(0) as Date).getHours()).toBe(0);
  });
  it('strftime()', () => {
    expect(dti.strftime('%Y-%m-%d')[0]).toBe('2024-01-01');
  });
  it('is_month_start', () => {
    expect(dti.is_month_start[0]).toBe(true);
    expect(dti.is_month_start[1]).toBe(false);
  });
  it('is_month_end', () => {
    expect(dti.is_month_end[2]).toBe(true);
    expect(dti.is_month_end[0]).toBe(false);
  });
  it('to_series()', () => {
    const s = dti.to_series();
    expect(s.size).toBe(3);
  });
  it('floor(D)', () => {
    const dti2 = new DatetimeIndex(['2024-01-15T10:30:00']);
    const floored = dti2.floor('D');
    expect((floored.get(0) as Date).getHours()).toBe(0);
  });
  it('union()', () => {
    const other = new DatetimeIndex(['2024-06-15', '2025-01-01']);
    const result = dti.union(other);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});

describe('MultiIndex', () => {
  it('from_tuples()', () => {
    const mi = MultiIndex.from_tuples([['a', 1], ['a', 2], ['b', 1]], { names: ['letter', 'number'] });
    expect(mi.length).toBe(3);
    expect(mi.nlevels).toBe(2);
    expect(mi.names).toEqual(['letter', 'number']);
  });
  it('get_level_values(0)', () => {
    const mi = MultiIndex.from_tuples([['a', 1], ['b', 2]]);
    const lv = mi.get_level_values(0);
    expect(lv.get(0)).toBe('a');
    expect(lv.get(1)).toBe('b');
  });
  it('get_level_values by name', () => {
    const mi = MultiIndex.from_tuples([['a', 1], ['b', 2]], { names: ['x', 'y'] });
    const lv = mi.get_level_values('x');
    expect(lv.get(0)).toBe('a');
  });
  it('from_arrays()', () => {
    const mi = MultiIndex.from_arrays([['a', 'a', 'b'], [1, 2, 1]]);
    expect(mi.length).toBe(3);
  });
  it('from_product()', () => {
    const mi = MultiIndex.from_product([['a', 'b'], [1, 2]]);
    expect(mi.length).toBe(4);
  });
  it('droplevel()', () => {
    const mi = MultiIndex.from_tuples([['a', 1], ['b', 2]]);
    const dropped = mi.droplevel(0);
    expect(dropped.get(0)).toBe(1);
  });
  it('set_names()', () => {
    const mi = MultiIndex.from_tuples([['a', 1]]);
    const renamed = mi.set_names(['x', 'y']);
    expect(renamed.names).toEqual(['x', 'y']);
  });
  it('levels', () => {
    const mi = MultiIndex.from_tuples([['a', 1], ['b', 2]]);
    expect(mi.levels.length).toBe(2);
  });
  it('toString()', () => {
    const mi = MultiIndex.from_tuples([['a', 1]]);
    expect(mi.toString()).toContain('MultiIndex');
  });
});
