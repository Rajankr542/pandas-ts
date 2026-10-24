import { describe, it, expect } from 'vitest';
import { Series } from '../../src/series.js';

describe('StringAccessor (.str)', () => {
  const s = new Series(['Hello', 'World', 'foo bar']);

  it('lower()', () => {
    expect(String(s.str.lower().iloc(0))).toBe('hello');
  });
  it('upper()', () => {
    expect(String(s.str.upper().iloc(0))).toBe('HELLO');
  });
  it('title()', () => {
    expect(String(s.str.title().iloc(2))).toBe('Foo Bar');
  });
  it('capitalize()', () => {
    expect(String(s.str.capitalize().iloc(1))).toBe('World');
  });
  it('len()', () => {
    expect(Number(s.str.len().iloc(0))).toBe(5);
  });
  it('contains() literal', () => {
    const r = s.str.contains('ell', { regex: false });
    expect(Number(r.iloc(0))).toBe(1);
    expect(Number(r.iloc(1))).toBe(0);
  });
  it('contains() regex', () => {
    const r = s.str.contains('^[Hh]');
    expect(Number(r.iloc(0))).toBe(1);
  });
  it('startswith()', () => {
    expect(Number(s.str.startswith('He').iloc(0))).toBe(1);
    expect(Number(s.str.startswith('He').iloc(1))).toBe(0);
  });
  it('endswith()', () => {
    expect(Number(s.str.endswith('ld').iloc(1))).toBe(1);
  });
  it('replace()', () => {
    expect(String(s.str.replace('l', 'L', { regex: false }).iloc(0))).toContain('L');
  });
  it('strip()', () => {
    const s2 = new Series(['  hello  ', ' world ']);
    expect(String(s2.str.strip().iloc(0))).toBe('hello');
  });
  it('lstrip()', () => {
    const s2 = new Series(['  hello  ']);
    expect(String(s2.str.lstrip().iloc(0))).toBe('hello  ');
  });
  it('rstrip()', () => {
    const s2 = new Series(['  hello  ']);
    expect(String(s2.str.rstrip().iloc(0))).toBe('  hello');
  });
  it('split()', () => {
    const r = new Series(['a,b,c']).str.split(',');
    const arr = r.iloc(0) as string[];
    expect(arr).toEqual(['a', 'b', 'c']);
  });
  it('slice()', () => {
    expect(String(s.str.slice(0, 3).iloc(0))).toBe('Hel');
  });
  it('pad() left', () => {
    expect(String(new Series(['hi']).str.pad(5).iloc(0))).toBe('   hi');
  });
  it('center()', () => {
    const r = new Series(['hi']).str.center(6, '-');
    expect(String(r.iloc(0))).toBe('--hi--');
  });
  it('ljust()', () => {
    expect(String(new Series(['hi']).str.ljust(5).iloc(0))).toBe('hi   ');
  });
  it('rjust()', () => {
    expect(String(new Series(['hi']).str.rjust(5).iloc(0))).toBe('   hi');
  });
  it('zfill()', () => {
    expect(String(new Series(['42']).str.zfill(5).iloc(0))).toBe('00042');
  });
  it('isalpha()', () => {
    expect(Number(new Series(['abc']).str.isalpha().iloc(0))).toBe(1);
    expect(Number(new Series(['abc1']).str.isalpha().iloc(0))).toBe(0);
  });
  it('isdigit()', () => {
    expect(Number(new Series(['123']).str.isdigit().iloc(0))).toBe(1);
    expect(Number(new Series(['12a']).str.isdigit().iloc(0))).toBe(0);
  });
  it('isalnum()', () => {
    expect(Number(new Series(['abc123']).str.isalnum().iloc(0))).toBe(1);
  });
  it('isspace()', () => {
    expect(Number(new Series(['   ']).str.isspace().iloc(0))).toBe(1);
  });
  it('islower()', () => {
    expect(Number(new Series(['abc']).str.islower().iloc(0))).toBe(1);
    expect(Number(new Series(['Abc']).str.islower().iloc(0))).toBe(0);
  });
  it('isupper()', () => {
    expect(Number(new Series(['ABC']).str.isupper().iloc(0))).toBe(1);
  });
  it('get(i)', () => {
    expect(String(s.str.get(0).iloc(0))).toBe('H');
    expect(String(s.str.get(-1).iloc(0))).toBe('o');
  });
  it('repeat()', () => {
    expect(String(new Series(['ab']).str.repeat(3).iloc(0))).toBe('ababab');
  });
  it('removeprefix()', () => {
    expect(String(new Series(['pre_text']).str.removeprefix('pre_').iloc(0))).toBe('text');
  });
  it('removesuffix()', () => {
    expect(String(new Series(['text_suf']).str.removesuffix('_suf').iloc(0))).toBe('text');
  });
  it('find()', () => {
    expect(Number(s.str.find('l').iloc(0))).toBe(2);
  });
  it('count()', () => {
    expect(Number(new Series(['banana']).str.count('a').iloc(0))).toBe(3);
  });
  it('swapcase()', () => {
    expect(String(new Series(['Hello']).str.swapcase().iloc(0))).toBe('hELLO');
  });
  it('normalize()', () => {
    const r = new Series(['café']).str.normalize('NFC');
    expect(String(r.iloc(0))).toBe('café');
  });
  it('get_dummies()', () => {
    const r = new Series(['a|b', 'b|c']).str.get_dummies('|');
    expect(r).toHaveProperty('a');
    expect((r['a'] as number[])[0]).toBe(1);
    expect((r['c'] as number[])[0]).toBe(0);
  });
  it('handles NA values', () => {
    const s2 = new Series([null, 'hello']);
    const r = s2.str.lower();
    expect(r.size).toBe(2);
  });
  it('partition()', () => {
    const r = new Series(['hello world']).str.partition(' ');
    const parts = r.iloc(0) as string[];
    expect(parts).toEqual(['hello', ' ', 'world']);
  });
  it('extract()', () => {
    const r = new Series(['abc123']).str.extract('([0-9]+)');
    expect(String(r.iloc(0))).toBe('123');
  });
  it('wrap()', () => {
    const r = new Series(['hello world foo']).str.wrap(8);
    expect(String(r.iloc(0))).toContain('\n');
  });
});

describe('DatetimeAccessor (.dt)', () => {
  const dates = new Series([
    new Date('2024-01-15T10:30:00'),
    new Date('2024-06-30T23:59:59'),
    new Date('2024-02-29T00:00:00'), // leap year
  ]);

  it('year', () => {
    expect(Number(dates.dt.year.iloc(0))).toBe(2024);
  });
  it('month', () => {
    expect(Number(dates.dt.month.iloc(0))).toBe(1);
    expect(Number(dates.dt.month.iloc(1))).toBe(6);
  });
  it('day', () => {
    expect(Number(dates.dt.day.iloc(0))).toBe(15);
  });
  it('hour', () => {
    expect(Number(dates.dt.hour.iloc(0))).toBe(10);
  });
  it('minute', () => {
    expect(Number(dates.dt.minute.iloc(0))).toBe(30);
  });
  it('second', () => {
    expect(Number(dates.dt.second.iloc(0))).toBe(0);
  });
  it('dayofweek', () => {
    expect(Number(dates.dt.dayofweek.iloc(0))).toBeGreaterThanOrEqual(0);
    expect(Number(dates.dt.dayofweek.iloc(0))).toBeLessThanOrEqual(6);
  });
  it('quarter', () => {
    expect(Number(dates.dt.quarter.iloc(0))).toBe(1);
    expect(Number(dates.dt.quarter.iloc(1))).toBe(2);
  });
  it('is_month_start', () => {
    const s = new Series([new Date('2024-01-01'), new Date('2024-01-15')]);
    expect(Number(s.dt.is_month_start.iloc(0))).toBe(1);
    expect(Number(s.dt.is_month_start.iloc(1))).toBe(0);
  });
  it('is_month_end', () => {
    const s = new Series([new Date('2024-01-31'), new Date('2024-01-15')]);
    expect(Number(s.dt.is_month_end.iloc(0))).toBe(1);
    expect(Number(s.dt.is_month_end.iloc(1))).toBe(0);
  });
  it('is_leap_year', () => {
    expect(Number(dates.dt.is_leap_year.iloc(2))).toBe(1);
  });
  it('days_in_month', () => {
    expect(Number(dates.dt.days_in_month.iloc(0))).toBe(31);
  });
  it('day_name()', () => {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const r = dates.dt.day_name();
    expect(names).toContain(String(r.iloc(0)));
  });
  it('month_name()', () => {
    expect(String(dates.dt.month_name().iloc(0))).toBe('January');
    expect(String(dates.dt.month_name().iloc(1))).toBe('June');
  });
  it('date strips time', () => {
    const r = dates.dt.date;
    const d = r.iloc(0) as Date;
    expect(d.getHours()).toBe(0);
  });
  it('normalize() sets midnight', () => {
    const r = dates.dt.normalize();
    const d = r.iloc(0) as Date;
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
  it('floor(D) floors to day', () => {
    const r = dates.dt.floor('D');
    const d = r.iloc(0) as Date;
    expect(d.getHours()).toBe(0);
  });
  it('strftime()', () => {
    const r = dates.dt.strftime('%Y-%m-%d');
    expect(String(r.iloc(0))).toBe('2024-01-15');
  });
  it('to_period(D)', () => {
    const r = dates.dt.to_period('D');
    expect(String(r.iloc(0))).toBe('2024-01-15');
  });
  it('to_period(M)', () => {
    const r = dates.dt.to_period('M');
    expect(String(r.iloc(0))).toBe('2024-01');
  });
  it('dayofyear', () => {
    expect(Number(dates.dt.dayofyear.iloc(0))).toBeGreaterThan(0);
  });
  it('is_year_start', () => {
    const s = new Series([new Date('2024-01-01')]);
    expect(Number(s.dt.is_year_start.iloc(0))).toBe(1);
  });
  it('is_year_end', () => {
    const s = new Series([new Date('2024-12-31')]);
    expect(Number(s.dt.is_year_end.iloc(0))).toBe(1);
  });
  it('isocalendar()', () => {
    const r = dates.dt.isocalendar();
    const v = r.iloc(0) as any;
    expect(v?.year).toBe(2024);
    expect(v?.week).toBeGreaterThan(0);
  });
});

describe('CategoricalAccessor (.cat)', () => {
  const s = new Series(['a', 'b', 'a', 'c', 'b']);

  it('categories lists unique sorted values', () => {
    expect(s.cat.categories).toEqual(['a', 'b', 'c']);
  });
  it('codes maps values to indices', () => {
    const codes = s.cat.codes;
    expect(Number(codes.iloc(0))).toBe(0); // 'a' → 0
    expect(Number(codes.iloc(1))).toBe(1); // 'b' → 1
  });
  it('rename_categories()', () => {
    const r = s.cat.rename_categories(['x', 'y', 'z']);
    expect(String(r.iloc(0))).toBe('x');
  });
  it('add_categories()', () => {
    s.cat.add_categories(['d']);
    expect(s.cat.categories).toContain('d');
  });
  it('remove_categories()', () => {
    const r = s.cat.remove_categories(['c']);
    expect(r.size).toBe(5);
  });
});
