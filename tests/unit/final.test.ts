import { describe, it, expect } from 'vitest';
import { DataFrame } from '../../src/dataframe.js';
import { Series } from '../../src/series.js';
import { Timedelta } from '../../src/timedelta.js';
import { Timestamp } from '../../src/timestamp.js';

describe('Series.ffill / bfill', () => {
  it('ffill fills NaN forward', () => {
    const s = new Series([1, NaN, NaN, 4]);
    const r = s.ffill();
    expect(Number(r.iloc(1))).toBe(1);
    expect(Number(r.iloc(2))).toBe(1);
    expect(Number(r.iloc(3))).toBe(4);
  });
  it('bfill fills NaN backward', () => {
    const s = new Series([NaN, NaN, 3, 4]);
    const r = s.bfill();
    expect(Number(r.iloc(0))).toBe(3);
    expect(Number(r.iloc(1))).toBe(3);
  });
  it('ffill with no NaN is a no-op', () => {
    const s = new Series([1, 2, 3]);
    expect(s.ffill().to_numpy()).toEqual([1, 2, 3]);
  });
});

describe('DataFrame.ffill / bfill', () => {
  it('ffill fills column NaNs forward', () => {
    const df = new DataFrame({ a: [1, NaN, 3], b: [NaN, 2, NaN] });
    const r = df.ffill();
    expect(Number(r.col('a').iloc(1))).toBe(1);
    expect(Number(r.col('b').iloc(2))).toBe(2);
  });
  it('bfill fills column NaNs backward', () => {
    const df = new DataFrame({ a: [NaN, NaN, 3] });
    const r = df.bfill();
    expect(Number(r.col('a').iloc(0))).toBe(3);
    expect(Number(r.col('a').iloc(1))).toBe(3);
  });
});

describe('Series.explode', () => {
  it('explodes array elements', () => {
    const s = new Series([[1, 2], [3], [4, 5]]);
    const r = s.explode();
    expect(r.size).toBe(5);
    expect(Number(r.iloc(0))).toBe(1);
    expect(Number(r.iloc(1))).toBe(2);
  });
  it('non-array elements pass through', () => {
    const s = new Series([1, [2, 3], 4]);
    const r = s.explode();
    expect(r.size).toBe(4);
  });
});

describe('DataFrame.explode', () => {
  it('explodes list column', () => {
    const df = new DataFrame({ a: [1, 2], b: [[10, 20], [30]] });
    const r = df.explode('b');
    expect(r.shape[0]).toBe(3);
    expect(Number(r.col('a').iloc(0))).toBe(1);
    expect(Number(r.col('a').iloc(1))).toBe(1);
    expect(Number(r.col('b').iloc(2))).toBe(30);
  });
});

describe('DataFrame.get_dummies', () => {
  it('one-hot encodes a column', () => {
    const df = new DataFrame({ color: ['red', 'blue', 'red'] });
    const r = df.get_dummies({ columns: ['color'] });
    expect(r.columns).toContain('color_red');
    expect(r.columns).toContain('color_blue');
    expect(Number(r.col('color_red').iloc(0))).toBe(1);
    expect(Number(r.col('color_red').iloc(1))).toBe(0);
  });
  it('drop_first removes first category', () => {
    const df = new DataFrame({ x: ['a', 'b', 'c'] });
    const r = df.get_dummies({ columns: ['x'], drop_first: true });
    expect(r.columns.length).toBe(2);
  });
  it('preserves non-dummy columns', () => {
    const df = new DataFrame({ id: [1, 2], color: ['red', 'blue'] });
    const r = df.get_dummies({ columns: ['color'] });
    expect(r.columns).toContain('id');
  });
});

describe('DataFrame.append', () => {
  it('appends another DataFrame', () => {
    const df1 = new DataFrame({ a: [1, 2] });
    const df2 = new DataFrame({ a: [3, 4] });
    const r = df1.append(df2, { ignore_index: true });
    expect(r.shape[0]).toBe(4);
  });
});

describe('Series.to_frame', () => {
  it('returns column data dict', () => {
    const s = new Series([1, 2, 3], { name: 'vals' });
    const r = s.to_frame();
    expect(r).toHaveProperty('vals');
    expect((r['vals'] as number[])[0]).toBe(1);
  });
  it('uses provided name', () => {
    const s = new Series([1, 2]);
    const r = s.to_frame('x');
    expect(r).toHaveProperty('x');
  });
});

describe('Timedelta', () => {
  it('creates from days', () => {
    const td = new Timedelta(1, 'days');
    expect(td.days).toBe(1);
    expect(td.total_seconds).toBe(86400);
  });
  it('creates from hours', () => {
    const td = new Timedelta(2, 'hours');
    expect(td.total_seconds).toBe(7200);
  });
  it('add()', () => {
    const a = new Timedelta(1, 'days');
    const b = new Timedelta(12, 'hours');
    const r = a.add(b);
    expect(r.total_seconds).toBe(86400 + 43200);
  });
  it('sub()', () => {
    const a = new Timedelta(2, 'days');
    const b = new Timedelta(1, 'days');
    expect(a.sub(b).days).toBe(1);
  });
  it('mul()', () => {
    const td = new Timedelta(1, 'hours');
    expect(td.mul(3).total_seconds).toBe(10800);
  });
  it('neg()', () => {
    expect(new Timedelta(1, 'days').neg().days).toBe(-1);
  });
  it('abs()', () => {
    expect(new Timedelta(-1, 'days').abs().days).toBe(1);
  });
  it('comparison operators', () => {
    const a = new Timedelta(1, 'days');
    const b = new Timedelta(2, 'days');
    expect(a.lt(b)).toBe(true);
    expect(b.gt(a)).toBe(true);
    expect(a.le(a)).toBe(true);
    expect(a.eq(a)).toBe(true);
  });
  it('toString() includes "day"', () => {
    expect(new Timedelta(1, 'days').toString()).toContain('day');
  });
  it('isoformat() starts with P or -P', () => {
    const iso = new Timedelta(1, 'days').isoformat();
    expect(iso).toContain('P');
  });
  it('from_ms()', () => {
    const td = Timedelta.from_ms(3_600_000);
    expect(td.total_seconds).toBe(3600);
  });
  it('to_timedelta64() returns BigInt nanoseconds', () => {
    const td = new Timedelta(1, 'milliseconds');
    expect(td.to_timedelta64()).toBe(BigInt(1_000_000));
  });
  it('parses "1 day" string', () => {
    const td = new Timedelta('1 day');
    expect(td.days).toBe(1);
  });
  it('parses "2 hours 30 minutes"', () => {
    const td = new Timedelta('2 hours 30 minutes');
    expect(td.total_seconds).toBe(9000);
  });
  it('parses HH:MM:SS', () => {
    const td = new Timedelta('01:30:00');
    expect(td.total_seconds).toBe(5400);
  });
});

describe('Timestamp', () => {
  it('creates from ISO string', () => {
    const ts = new Timestamp('2024-01-15T10:30:00');
    expect(ts.year).toBe(2024);
    expect(ts.month).toBe(1);
    expect(ts.day).toBe(15);
    expect(ts.hour).toBe(10);
    expect(ts.minute).toBe(30);
  });
  it('creates from Date', () => {
    const ts = new Timestamp(new Date('2024-06-01'));
    expect(ts.month).toBe(6);
  });
  it('quarter', () => {
    expect(new Timestamp('2024-01-01').quarter).toBe(1);
    expect(new Timestamp('2024-07-01').quarter).toBe(3);
  });
  it('is_month_start / end', () => {
    expect(new Timestamp('2024-01-01').is_month_start).toBe(true);
    expect(new Timestamp('2024-01-31').is_month_end).toBe(true);
    expect(new Timestamp('2024-01-15').is_month_start).toBe(false);
  });
  it('is_leap_year', () => {
    expect(new Timestamp('2024-01-01').is_leap_year).toBe(true);
    expect(new Timestamp('2023-01-01').is_leap_year).toBe(false);
  });
  it('floor(D) sets to midnight', () => {
    const ts = new Timestamp('2024-01-15T10:30:00');
    expect(ts.floor('D').hour).toBe(0);
  });
  it('normalize() sets to midnight', () => {
    expect(new Timestamp('2024-01-15T10:30:00').normalize().hour).toBe(0);
  });
  it('strftime()', () => {
    expect(new Timestamp('2024-03-07').strftime('%Y-%m-%d')).toBe('2024-03-07');
  });
  it('to_period(D)', () => {
    expect(new Timestamp('2024-01-15').to_period('D')).toBe('2024-01-15');
  });
  it('to_period(M)', () => {
    expect(new Timestamp('2024-01-15').to_period('M')).toBe('2024-01');
  });
  it('timestamp() returns POSIX seconds', () => {
    const ts = new Timestamp('1970-01-01T00:00:00.000Z');
    expect(ts.timestamp()).toBe(0);
  });
  it('now() returns current year', () => {
    expect(Timestamp.now().year).toBeGreaterThanOrEqual(2024);
  });
  it('fromisoformat()', () => {
    expect(Timestamp.fromisoformat('2024-01-15').year).toBe(2024);
  });
  it('fromtimestamp()', () => {
    expect(Timestamp.fromtimestamp(0).year).toBe(1970);
  });
  it('comparison operators', () => {
    const a = new Timestamp('2024-01-01');
    const b = new Timestamp('2024-06-01');
    expect(a.lt(b)).toBe(true);
    expect(b.gt(a)).toBe(true);
    expect(a.eq(a)).toBe(true);
  });
  it('days_in_month', () => {
    expect(new Timestamp('2024-02-01').days_in_month).toBe(29);
    expect(new Timestamp('2024-01-01').days_in_month).toBe(31);
  });
  it('copy via constructor', () => {
    const ts = new Timestamp('2024-01-15');
    const ts2 = new Timestamp(ts);
    expect(ts2.year).toBe(2024);
  });
});
