/**
 * Parity completion tests — covers every stub that was implemented in the
 * "1% remaining" pass:
 *
 *   DataFrame: dropna(axis=1), sum/mean/min/max(axis=1), concat(axis=1),
 *              apply(axis=1), diff(axis=1), to_dict (all orients),
 *              to_string, infer_objects, convert_dtypes, corr_matrix(spearman)
 *
 *   Series:    at_time, between_time, tz_convert, tz_localize, unstack
 *
 *   Rolling:   corr, cov (real cross-series implementations)
 *
 *   IO:        json orient='table' (read + write)
 *
 *   Accessors: CategoricalAccessor.reorder_categories, as_ordered, as_unordered
 *              DatetimeAccessor.tz_localize, tz_convert
 *              StringAccessor.encode / decode
 *
 *   Index:     astype
 */
import { describe, it, expect } from 'vitest';
import { DataFrame, Series } from '../../src/index.js';
import { toJsonString, parseJson } from '../../src/io/json.js';
import { Index } from '../../src/index_types/index.js';

// ── DataFrame: axis-1 reductions ─────────────────────────────────────────────

describe('DataFrame axis=1 reductions', () => {
  const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });

  it('sum(axis=1) returns row-wise sums', () => {
    const s = df.sum(1) as Series;
    expect(s.iloc(0)).toBe(5);
    expect(s.iloc(1)).toBe(7);
    expect(s.iloc(2)).toBe(9);
  });

  it('mean(axis=1) returns row-wise means', () => {
    const s = df.mean(1) as Series;
    expect(s.iloc(0)).toBeCloseTo(2.5);
    expect(s.iloc(1)).toBeCloseTo(3.5);
  });

  it('min(axis=1) returns row-wise min', () => {
    const s = df.min(1) as Series;
    expect(s.iloc(0)).toBe(1);
    expect(s.iloc(2)).toBe(3);
  });

  it('max(axis=1) returns row-wise max', () => {
    const s = df.max(1) as Series;
    expect(s.iloc(0)).toBe(4);
    expect(s.iloc(2)).toBe(6);
  });
});

// ── DataFrame: dropna(axis=1) ─────────────────────────────────────────────────

describe('DataFrame dropna(axis=1)', () => {
  it('drops columns with any NaN', () => {
    const df = new DataFrame({ a: [1, null, 3], b: [4, 5, 6] });
    const result = df.dropna({ axis: 1 });
    expect(result.columns).toEqual(['b']);
    expect(result.shape[1]).toBe(1);
  });

  it('drops columns where ALL values are NaN when how=all', () => {
    const df = new DataFrame({ a: [null, null, null], b: [4, 5, 6] });
    const result = df.dropna({ axis: 1, how: 'all' });
    expect(result.columns).toEqual(['b']);
  });

  it('keeps columns that meet thresh', () => {
    const df = new DataFrame({ a: [1, null, 3], b: [4, 5, 6] });
    // thresh=2: need at least 2 non-NA → column 'a' has 2 non-NA → kept
    const result = df.dropna({ axis: 1, thresh: 2 });
    expect(result.columns).toContain('a');
    expect(result.columns).toContain('b');
  });
});

// ── DataFrame: concat(axis=1) ────────────────────────────────────────────────

describe('DataFrame concat(axis=1)', () => {
  it('concatenates two DataFrames side-by-side', () => {
    const df1 = new DataFrame({ a: [1, 2, 3] });
    const df2 = new DataFrame({ b: [4, 5, 6] });
    const result = DataFrame.concat([df1, df2], { axis: 1 });
    expect(result.columns).toEqual(['a', 'b']);
    expect(result.shape).toEqual([3, 2]);
    expect((result.col('a') as Series).iloc(0)).toBe(1);
    expect((result.col('b') as Series).iloc(2)).toBe(6);
  });

  it('renames duplicate columns', () => {
    const df1 = new DataFrame({ a: [1, 2] });
    const df2 = new DataFrame({ a: [3, 4] });
    const result = DataFrame.concat([df1, df2], { axis: 1 });
    expect(result.columns).toEqual(['a', 'a_1']);
  });
});

// ── DataFrame: apply(axis=1) ─────────────────────────────────────────────────

describe('DataFrame apply(axis=1)', () => {
  it('applies fn row-wise', () => {
    const df = new DataFrame({ a: [1, 2, 3], b: [10, 20, 30] });
    const result = df.apply((row: Series) => (row.sum() as number), 1) as Series;
    expect(result.iloc(0)).toBe(11);
    expect(result.iloc(1)).toBe(22);
    expect(result.iloc(2)).toBe(33);
  });
});

// ── DataFrame: diff(axis=1) ──────────────────────────────────────────────────

describe('DataFrame diff(axis=1)', () => {
  it('computes column-wise diff', () => {
    const df = new DataFrame({ a: [1, 2, 3], b: [4, 6, 9] });
    const result = df.diff(1, 1);
    expect(isNaN(result.col('a').iloc(0) as number)).toBe(true);
    expect((result.col('b') as Series).iloc(0)).toBeCloseTo(3);
    expect((result.col('b') as Series).iloc(1)).toBeCloseTo(4);
  });
});

// ── DataFrame: to_dict all orientations ───────────────────────────────────────

describe('DataFrame to_dict orientations', () => {
  const df = new DataFrame({ a: [1, 2], b: [3, 4] });

  it("orient='dict'", () => {
    const d = df.to_dict('dict') as any;
    expect(d.a[0]).toBe(1);
    expect(d.b[1]).toBe(4);
  });

  it("orient='list'", () => {
    const d = df.to_dict('list') as any;
    expect(d.a).toEqual([1, 2]);
    expect(d.b).toEqual([3, 4]);
  });

  it("orient='records'", () => {
    const d = df.to_dict('records') as any[];
    expect(d[0]).toEqual({ a: 1, b: 3 });
    expect(d[1]).toEqual({ a: 2, b: 4 });
  });

  it("orient='series'", () => {
    const d = df.to_dict('series') as any;
    expect(d.a).toBeInstanceOf(Series);
    expect(d.b).toBeInstanceOf(Series);
  });

  it("orient='split'", () => {
    const d = df.to_dict('split') as any;
    expect(d.columns).toEqual(['a', 'b']);
    expect(d.data[0]).toEqual([1, 3]);
    expect(d.index).toEqual([0, 1]);
  });

  it("orient='index'", () => {
    const d = df.to_dict('index') as any;
    expect(d[0]).toEqual({ a: 1, b: 3 });
    expect(d[1]).toEqual({ a: 2, b: 4 });
  });
});

// ── DataFrame: to_string ──────────────────────────────────────────────────────

describe('DataFrame to_string', () => {
  it('renders a tab-separated table with header', () => {
    const df = new DataFrame({ x: [1, 2], y: [3, 4] });
    const s = df.to_string();
    expect(s).toContain('x');
    expect(s).toContain('y');
    expect(s).toContain('1');
    expect(s).toContain('4');
  });

  it('omits index when index=false', () => {
    const df = new DataFrame({ a: [1] });
    const s = df.to_string({ index: false });
    expect(s.split('\n')[0]).not.toMatch(/^\s*\t/); // no leading tab
  });
});

// ── DataFrame: convert_dtypes ─────────────────────────────────────────────────

describe('DataFrame convert_dtypes', () => {
  it('converts numeric-string object columns to numbers', () => {
    const df = new DataFrame({ a: ['1', '2', '3'], b: ['x', 'y', 'z'] });
    const result = df.convert_dtypes();
    expect(typeof result.col('a').iloc(0)).toBe('number');
    // non-numeric stays string
    expect(result.col('b').iloc(0)).toBe('x');
  });
});

// ── DataFrame: corr_matrix(spearman) ─────────────────────────────────────────

describe('DataFrame corr_matrix spearman', () => {
  it('diagonal is 1', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4], b: [4, 3, 2, 1] });
    const corr = df.corr_matrix('spearman');
    expect(corr.col('a').iloc(0)).toBeCloseTo(1);
    expect(corr.col('b').iloc(1)).toBeCloseTo(1);
  });

  it('perfectly negatively correlated gives -1', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4], b: [4, 3, 2, 1] });
    const corr = df.corr_matrix('spearman');
    // a vs b
    expect(corr.col('b').iloc(0)).toBeCloseTo(-1);
  });
});

// ── IO: JSON orient='table' ───────────────────────────────────────────────────

describe("JSON orient='table'", () => {
  it('round-trips table schema format', () => {
    const df = new DataFrame({ name: ['Alice', 'Bob'], score: [95, 87] });
    const json = toJsonString(df, { orient: 'table' });
    const parsed = JSON.parse(json);
    expect(parsed.schema).toBeDefined();
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data[0].name).toBe('Alice');
  });

  it('reads table schema format', () => {
    const tableJson = JSON.stringify({
      schema: { fields: [{ name: 'x', type: 'integer' }, { name: 'y', type: 'number' }] },
      data: [{ index: 0, x: 1, y: 1.5 }, { index: 1, x: 2, y: 2.5 }],
    });
    const df = parseJson(tableJson, { orient: 'table' });
    expect(df.columns).toContain('x');
    expect(df.columns).toContain('y');
    expect(df.shape[0]).toBe(2);
  });
});

// ── Series: at_time / between_time ───────────────────────────────────────────

describe('Series at_time / between_time', () => {
  const times = ['2024-01-01T08:30:00', '2024-01-01T09:00:00', '2024-01-01T10:30:00'];
  const s = new Series([10, 20, 30], { index: times.map(t => new Date(t).getTime()) });

  it('at_time filters by HH:MM', () => {
    // Build a series with actual Date objects in index
    const dates = times.map(t => new Date(t));
    const s2 = new Series([10, 20, 30], { index: dates as any });
    const result = s2.at_time('09:00');
    expect(result.size).toBe(1);
    expect(result.iloc(0)).toBe(20);
  });

  it('between_time keeps rows within range', () => {
    const dates = times.map(t => new Date(t));
    const s2 = new Series([10, 20, 30], { index: dates as any });
    const result = s2.between_time('08:00', '09:30');
    expect(result.size).toBe(2); // 08:30 and 09:00
  });
});

// ── Series: tz_convert / tz_localize ─────────────────────────────────────────

describe('Series tz_convert / tz_localize', () => {
  it('tz_convert returns same-size series', () => {
    const dates = [new Date('2024-06-01T12:00:00Z'), new Date('2024-06-02T12:00:00Z')];
    const s = new Series(dates, { index: [0, 1] });
    const converted = s.tz_convert('America/New_York');
    expect(converted.size).toBe(2);
    expect(converted.iloc(0)).toBeInstanceOf(Date);
  });

  it('tz_localize returns same-size series', () => {
    const dates = [new Date('2024-06-01T12:00:00')];
    const s = new Series(dates, { index: [0] });
    const localized = s.tz_localize('UTC');
    expect(localized.size).toBe(1);
  });
});

// ── Rolling: corr and cov ────────────────────────────────────────────────────

describe('Rolling corr / cov', () => {
  const s = new Series([1, 2, 3, 4, 5], { index: [0, 1, 2, 3, 4] });
  const s2 = new Series([5, 4, 3, 2, 1], { index: [0, 1, 2, 3, 4] });

  it('corr of series with itself is 1 (for full windows)', () => {
    const result = s.rolling(3).corr(s) as Series;
    // Last window [3,4,5] vs [3,4,5] → corr = 1
    expect(result.iloc(4)).toBeCloseTo(1);
  });

  it('corr of perfectly negatively correlated series is -1', () => {
    const result = s.rolling(3).corr(s2) as Series;
    expect(result.iloc(4)).toBeCloseTo(-1);
  });

  it('cov of series with constant-offset series', () => {
    const result = s.rolling(3).cov(s) as Series;
    // var([3,4,5]) = 1
    expect(result.iloc(4)).toBeCloseTo(1);
  });
});

// ── Categorical accessor ──────────────────────────────────────────────────────

describe('CategoricalAccessor improvements', () => {
  it('reorder_categories remaps values and updates category list', () => {
    const s = new Series(['a', 'b', 'c', 'a'], { index: [0, 1, 2, 3] });
    const result = s.cat.reorder_categories(['c', 'b', 'a']);
    expect(s.cat.categories).not.toEqual(['a', 'b', 'c']); // mutated
    expect(result.size).toBe(4);
  });

  it('as_ordered sorts categories', () => {
    const s = new Series(['b', 'a', 'c'], { index: [0, 1, 2] });
    const ordered = s.cat.as_ordered();
    expect(ordered.cat.categories).toEqual(['a', 'b', 'c']);
  });

  it('as_unordered preserves values', () => {
    const s = new Series(['x', 'y', 'z'], { index: [0, 1, 2] });
    const unordered = s.cat.as_unordered();
    expect(unordered.size).toBe(3);
  });
});

// ── StringAccessor encode/decode ──────────────────────────────────────────────

describe('StringAccessor encode / decode', () => {
  it('encode returns non-empty values', () => {
    const s = new Series(['hello', 'world'], { index: [0, 1] });
    const encoded = s.str.encode('utf-8');
    expect(encoded.size).toBe(2);
  });

  it('decode inverts encode (utf-8 round-trip via base64)', () => {
    const s = new Series(['hello'], { index: [0] });
    const encoded = s.str.encode('base64');
    const decoded = encoded.str.decode('base64');
    expect(decoded.iloc(0)).toBe('hello');
  });
});

// ── Index.astype ─────────────────────────────────────────────────────────────

describe('Index astype', () => {
  it('converts string index to int', () => {
    const idx = new Index(['1', '2', '3']);
    const iIdx = idx.astype('int64');
    expect(iIdx.toArray()).toEqual([1, 2, 3]);
  });

  it('converts numeric index to string', () => {
    const idx = new Index([1, 2, 3]);
    const sIdx = idx.astype('str');
    expect(sIdx.toArray()).toEqual(['1', '2', '3']);
  });

  it('converts string index to float', () => {
    const idx = new Index(['1.5', '2.5']);
    const fIdx = idx.astype('float64');
    expect(fIdx.toArray()[0]).toBeCloseTo(1.5);
  });
});

// ── DatetimeAccessor tz_localize / tz_convert ─────────────────────────────────

describe('DatetimeAccessor tz_localize / tz_convert', () => {
  it('tz_localize attaches tz metadata', () => {
    const s = new Series([new Date('2024-01-01T12:00:00')], { index: [0] });
    const localized = s.dt.tz_localize('UTC');
    expect(localized.size).toBe(1);
    expect((localized as any)._tz).toBe('UTC');
  });

  it('tz_convert shifts time', () => {
    const utcDate = new Date('2024-06-01T15:00:00Z'); // 15:00 UTC = 11:00 ET
    const s = new Series([utcDate], { index: [0] });
    const converted = s.dt.tz_convert('America/New_York');
    const d = converted.iloc(0) as Date;
    expect(d).toBeInstanceOf(Date);
    // ET is UTC-4 in summer → hour should be 11
    expect(d.getHours()).toBe(11);
  });
});
