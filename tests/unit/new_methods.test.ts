/**
 * Tests for all methods added in the pandas parity pass.
 */
import { describe, it, expect } from 'vitest';
import { Series } from '../../src/series.js';
import { DataFrame } from '../../src/dataframe.js';
import {
  to_numeric, unique, value_counts, crosstab, factorize,
  wide_to_long, json_normalize, bdate_range,
  merge_ordered, merge_asof, from_dummies,
  interval_range, period_range,
} from '../../src/functions.js';
import { read_html, to_html } from '../../src/io/html.js';
import { read_xml, to_xml } from '../../src/io/xml.js';
import { read_fwf } from '../../src/io/fwf.js';
import { read_hdf } from '../../src/io/hdf.js';
import { read_stata } from '../../src/io/stata.js';
import { NotImplementedError } from '../../src/errors.js';

// ── Series: aggregation ──────────────────────────────────────────────────────

describe('Series.agg', () => {
  it('string func', () => {
    const s = new Series([1, 2, 3, 4]);
    expect(s.agg('sum')).toBe(10);
    expect(s.agg('mean')).toBe(2.5);
    expect(s.agg('min')).toBe(1);
    expect(s.agg('max')).toBe(4);
    expect(s.agg('count')).toBe(4);
  });
  it('array of funcs returns object', () => {
    const s = new Series([1, 2, 3]);
    const r = s.agg(['sum', 'mean']) as Record<string, unknown>;
    expect(r['sum']).toBe(6);
    expect(r['mean']).toBe(2);
  });
  it('function callback', () => {
    const s = new Series([1, 2, 3]);
    expect(s.agg(s2 => s2.agg('sum'))).toBe(6);
  });
});

describe('Series.transform', () => {
  it('cumsum transform', () => {
    const s = new Series([1, 2, 3]);
    const r = s.transform('cumsum') as Series;
    expect(Number(r.iloc(2))).toBe(6);
  });
  it('function transform', () => {
    const s = new Series([1, 2, 3]);
    const r = s.transform((v: unknown) => Number(v) * 2);
    expect(Number(r.iloc(1))).toBe(4);
  });
});

// ── Series: properties ───────────────────────────────────────────────────────

describe('Series properties', () => {
  it('is_unique true', () => expect(new Series([1, 2, 3]).is_unique).toBe(true));
  it('is_unique false', () => expect(new Series([1, 1, 2]).is_unique).toBe(false));
  it('is_monotonic_increasing', () => {
    expect(new Series([1, 2, 3]).is_monotonic_increasing).toBe(true);
    expect(new Series([1, 3, 2]).is_monotonic_increasing).toBe(false);
  });
  it('is_monotonic_decreasing', () => {
    expect(new Series([3, 2, 1]).is_monotonic_decreasing).toBe(true);
    expect(new Series([1, 2, 3]).is_monotonic_decreasing).toBe(false);
  });
  it('hasnans', () => {
    expect(new Series([1, NaN, 3]).hasnans).toBe(true);
    expect(new Series([1, 2, 3]).hasnans).toBe(false);
  });
  it('nbytes', () => expect(new Series([1, 2, 3]).nbytes).toBeGreaterThan(0));
  it('empty', () => {
    expect(new Series([]).empty).toBe(true);
    expect(new Series([1]).empty).toBe(false);
  });
  it('memory_usage', () => expect(new Series([1, 2, 3]).memory_usage()).toBeGreaterThan(0));
});

// ── Series: indexing ─────────────────────────────────────────────────────────

describe('Series.at / iat', () => {
  it('at by label', () => {
    const s = new Series([10, 20], { index: ['a', 'b'] });
    expect(s.at('a')).toBe(10);
  });
  it('iat by position', () => {
    const s = new Series([10, 20, 30]);
    expect(s.iat(2)).toBe(30);
  });
});

describe('Series.loc', () => {
  it('scalar label', () => {
    const s = new Series([10, 20], { index: ['a', 'b'] });
    expect(s.loc('b')).toBe(20);
  });
  it('array of labels returns Series', () => {
    const s = new Series([1, 2, 3], { index: ['a', 'b', 'c'] });
    const r = s.loc(['a', 'c']) as Series;
    expect(r.size).toBe(2);
  });
});

describe('Series.items / keys', () => {
  it('items returns label-value pairs', () => {
    const s = new Series([10, 20], { index: ['x', 'y'] });
    const pairs = s.items();
    expect(pairs[0]).toEqual(['x', 10]);
    expect(pairs[1]).toEqual(['y', 20]);
  });
  it('keys returns index', () => {
    const s = new Series([1, 2], { index: ['a', 'b'] });
    expect(s.keys()).toEqual(['a', 'b']);
  });
});

describe('Series.pop / item / to_list', () => {
  it('pop returns value at label', () => {
    const s = new Series([1, 2, 3], { index: ['a', 'b', 'c'] });
    expect(s.pop('b')).toBe(2);
  });
  it('item() on size-1 series', () => {
    expect(new Series([42]).item()).toBe(42);
  });
  it('to_list', () => {
    expect(new Series([1, 2, 3]).to_list()).toEqual([1, 2, 3]);
  });
});

// ── Series: missing data ─────────────────────────────────────────────────────

describe('Series.replace', () => {
  it('replaces scalar', () => {
    const s = new Series([1, 2, 3, 2]);
    const r = s.replace(2, 99);
    expect(Number(r.iloc(1))).toBe(99);
    expect(Number(r.iloc(3))).toBe(99);
    expect(Number(r.iloc(0))).toBe(1);
  });
  it('replaces with dict', () => {
    const s = new Series(['a', 'b', 'c']);
    const r = s.replace({ a: 'x', c: 'z' });
    expect(r.iloc(0)).toBe('x');
    expect(r.iloc(2)).toBe('z');
    expect(r.iloc(1)).toBe('b');
  });
  it('replaces with arrays', () => {
    const s = new Series([1, 2, 3]);
    const r = s.replace([1, 3], [10, 30]);
    expect(Number(r.iloc(0))).toBe(10);
    expect(Number(r.iloc(2))).toBe(30);
  });
});

// ── Series: reshaping ────────────────────────────────────────────────────────

describe('Series.argsort', () => {
  it('ascending', () => {
    const s = new Series([3, 1, 2]);
    const r = s.argsort();
    expect(Number(r.iloc(0))).toBe(1); // index of min value
  });
});

describe('Series.repeat', () => {
  it('scalar repeats', () => {
    const s = new Series([1, 2]);
    const r = s.repeat(3);
    expect(r.size).toBe(6);
  });
  it('array repeats', () => {
    const s = new Series([1, 2, 3]);
    const r = s.repeat([1, 2, 1]);
    expect(r.size).toBe(4);
  });
});

describe('Series.mask', () => {
  it('replaces where condition true', () => {
    const s = new Series([1, 2, 3, 4]);
    const cond = [false, true, false, true];
    const r = s.mask(cond, 0);
    expect(Number(r.iloc(0))).toBe(1);
    expect(Number(r.iloc(1))).toBe(0);
    expect(Number(r.iloc(3))).toBe(0);
  });
});

describe('Series.align', () => {
  it('outer join aligns on union of index', () => {
    const a = new Series([1, 2], { index: ['x', 'y'] });
    const b = new Series([10, 20], { index: ['y', 'z'] });
    const [ra, rb] = a.align(b, { join: 'outer' });
    expect(ra.size).toBe(3);
    expect(rb.size).toBe(3);
  });
  it('inner join aligns on intersection', () => {
    const a = new Series([1, 2], { index: ['x', 'y'] });
    const b = new Series([10, 20], { index: ['y', 'z'] });
    const [ra, rb] = a.align(b, { join: 'inner' });
    expect(ra.size).toBe(1);
  });
});

describe('Series.filter', () => {
  it('filter by items', () => {
    const s = new Series([1, 2, 3], { index: ['a', 'b', 'c'] });
    const r = s.filter(['a', 'c']);
    expect(r.size).toBe(2);
  });
  it('filter by like', () => {
    const s = new Series([1, 2, 3], { index: ['foo', 'bar', 'foobar'] });
    const r = s.filter(undefined, 'foo');
    expect(r.size).toBe(2);
  });
  it('filter by regex', () => {
    const s = new Series([1, 2], { index: ['abc', 'xyz'] });
    const r = s.filter(undefined, undefined, '^a');
    expect(r.size).toBe(1);
  });
});

describe('Series.drop', () => {
  it('drops by label', () => {
    const s = new Series([1, 2, 3], { index: ['a', 'b', 'c'] });
    const r = s.drop('b');
    expect(r.size).toBe(2);
    expect(r.keys()).toEqual(['a', 'c']);
  });
  it('drops array of labels', () => {
    const s = new Series([1, 2, 3], { index: ['a', 'b', 'c'] });
    expect(s.drop(['a', 'c']).size).toBe(1);
  });
});

// ── Series: statistics ───────────────────────────────────────────────────────

describe('Series.idxmin / idxmax', () => {
  it('idxmin', () => {
    const s = new Series([3, 1, 2], { index: ['a', 'b', 'c'] });
    expect(s.idxmin()).toBe('b');
  });
  it('idxmax', () => {
    const s = new Series([3, 1, 2], { index: ['a', 'b', 'c'] });
    expect(s.idxmax()).toBe('a');
  });
});

describe('Series.mode', () => {
  it('returns most frequent value', () => {
    const s = new Series([1, 2, 2, 3]);
    const r = s.mode();
    expect(Number(r.iloc(0))).toBe(2);
  });
});

describe('Series.corr', () => {
  it('perfect positive correlation', () => {
    const a = new Series([1, 2, 3, 4, 5]);
    const b = new Series([2, 4, 6, 8, 10]);
    expect(a.corr(b)).toBeCloseTo(1, 5);
  });
  it('perfect negative correlation', () => {
    const a = new Series([1, 2, 3]);
    const b = new Series([3, 2, 1]);
    expect(a.corr(b)).toBeCloseTo(-1, 5);
  });
});

describe('Series.cov', () => {
  it('positive covariance', () => {
    const a = new Series([1, 2, 3]);
    const b = new Series([4, 5, 6]);
    expect(a.cov(b)).toBeGreaterThan(0);
  });
});

// ── Series: arithmetic reflected ─────────────────────────────────────────────

describe('Series reflected arithmetic', () => {
  it('radd', () => expect(Number(new Series([1, 2]).radd(10).iloc(0))).toBe(11));
  it('rsub', () => expect(Number(new Series([3]).rsub(10).iloc(0))).toBe(7));
  it('rmul', () => expect(Number(new Series([4]).rmul(3).iloc(0))).toBe(12));
  it('rdiv', () => expect(Number(new Series([2]).rdiv(10).iloc(0))).toBe(5));
  it('floordiv', () => expect(Number(new Series([7]).floordiv(2).iloc(0))).toBe(3));
  it('rfloordiv', () => expect(Number(new Series([3]).rfloordiv(10).iloc(0))).toBe(3));
});

// ── Series: case_when ────────────────────────────────────────────────────────

describe('Series.case_when', () => {
  it('applies first matching condition', () => {
    const s = new Series([1, 2, 3, 4, 5]);
    const r = s.case_when([
      [[true, false, true, false, true], 99],
    ]);
    expect(Number(r.iloc(0))).toBe(99);
    expect(Number(r.iloc(1))).toBe(2);
  });
});

// ── Series: IO ───────────────────────────────────────────────────────────────

describe('Series.to_csv / to_json / to_markdown / to_latex', () => {
  it('to_csv produces CSV string', () => {
    const s = new Series([1, 2], { name: 'val' });
    const csv = s.to_csv();
    expect(csv).toContain('val');
    expect(csv).toContain('1');
  });
  it('to_json produces JSON', () => {
    const s = new Series([1, 2], { index: ['a', 'b'], name: 'val' });
    const json = s.to_json();
    expect(JSON.parse(json)).toMatchObject({ a: 1, b: 2 });
  });
  it('to_markdown produces table', () => {
    const s = new Series([1, 2], { name: 'val' });
    const md = s.to_markdown();
    expect(md).toContain('|');
    expect(md).toContain('---');
  });
  it('to_latex produces tabular', () => {
    const s = new Series([1, 2]);
    const latex = s.to_latex();
    expect(latex).toContain('tabular');
  });
});

// ── DataFrame: aggregation ───────────────────────────────────────────────────

describe('DataFrame.agg', () => {
  it('string func returns row', () => {
    const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
    const r = df.agg('sum') as Record<string, unknown>;
    expect(r).toBeTruthy();
  });
  it('array of funcs', () => {
    const df = new DataFrame({ a: [1, 2, 3] });
    const r = df.agg(['sum', 'mean']) as Record<string, unknown>;
    expect(r['sum']).toBeDefined();
  });
});

describe('DataFrame.transform', () => {
  it('applies cumsum transform', () => {
    const df = new DataFrame({ a: [1, 2, 3] });
    const r = df.transform('cumsum');
    expect(Number(r.col('a').iloc(2))).toBe(6);
  });
});

// ── DataFrame: query ─────────────────────────────────────────────────────────

describe('DataFrame.query', () => {
  it('filters rows by condition', () => {
    const df = new DataFrame({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
    const r = df.query('a > 2');
    expect(r.shape[0]).toBe(2);
  });
  it('filters with equality', () => {
    const df = new DataFrame({ x: [1, 2, 3] });
    const r = df.query('x == 2');
    expect(r.shape[0]).toBe(1);
  });
});

// ── DataFrame: join ──────────────────────────────────────────────────────────

describe('DataFrame.join', () => {
  it('left join on index', () => {
    const left = new DataFrame({ a: [1, 2, 3] }, { index: ['x', 'y', 'z'] });
    const right = new DataFrame({ b: [10, 20] }, { index: ['x', 'y'] });
    const r = left.join(right);
    expect(r.shape[0]).toBe(3);
    expect(r.columns).toContain('b');
  });
  it('inner join', () => {
    const left = new DataFrame({ a: [1, 2] }, { index: ['x', 'y'] });
    const right = new DataFrame({ b: [10] }, { index: ['x'] });
    const r = left.join(right, { how: 'inner' });
    expect(r.shape[0]).toBe(1);
  });
});

// ── DataFrame: from_dict / from_records ──────────────────────────────────────

describe('DataFrame.from_dict', () => {
  it('creates from column dict', () => {
    const df = DataFrame.from_dict({ a: [1, 2], b: [3, 4] });
    expect(df.shape).toEqual([2, 2]);
    expect(df.columns).toContain('a');
  });
});

describe('DataFrame.from_records', () => {
  it('creates from array of records', () => {
    const df = DataFrame.from_records([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
    expect(df.shape).toEqual([2, 2]);
  });
  it('uses index column', () => {
    const df = DataFrame.from_records([{ id: 'x', v: 1 }, { id: 'y', v: 2 }], { index: 'id' });
    expect(df.index).toContain('x');
    expect(df.columns).not.toContain('id');
  });
});

// ── DataFrame: indexing ──────────────────────────────────────────────────────

describe('DataFrame.at / iat', () => {
  it('at by row label and column', () => {
    const df = new DataFrame({ a: [10, 20] }, { index: ['x', 'y'] });
    expect(df.at('x', 'a')).toBe(10);
  });
  it('iat by integer positions', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    expect(df.iat(1, 1)).toBe(4);
  });
});

describe('DataFrame.items / iterrows / itertuples', () => {
  it('items yields column series pairs', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    const pairs = df.items();
    expect(pairs.length).toBe(2);
    expect(pairs[0]![0]).toBe('a');
  });
  it('iterrows yields index-row pairs', () => {
    const df = new DataFrame({ a: [1, 2] });
    const rows = df.iterrows();
    expect(rows.length).toBe(2);
    expect(rows[0]![1]).toMatchObject({ a: 1 });
  });
  it('itertuples yields arrays', () => {
    const df = new DataFrame({ a: [1], b: [2] });
    const tuples = df.itertuples();
    expect(tuples[0]!.length).toBe(3); // index + 2 cols
  });
});

describe('DataFrame.keys', () => {
  it('returns column names', () => {
    const df = new DataFrame({ x: [1], y: [2] });
    expect(df.keys()).toEqual(['x', 'y']);
  });
});

describe('DataFrame.filter', () => {
  it('filter columns by items', () => {
    const df = new DataFrame({ a: [1], b: [2], c: [3] });
    const r = df.filter({ items: ['a', 'c'] });
    expect(r.columns).toEqual(['a', 'c']);
  });
  it('filter columns by like', () => {
    const df = new DataFrame({ foo: [1], bar: [2], foobar: [3] });
    const r = df.filter({ like: 'foo' });
    expect(r.columns).toContain('foo');
    expect(r.columns).toContain('foobar');
    expect(r.columns).not.toContain('bar');
  });
  it('filter columns by regex', () => {
    const df = new DataFrame({ a1: [1], b2: [2], a3: [3] });
    const r = df.filter({ regex: '^a' });
    expect(r.columns.every(c => c.startsWith('a'))).toBe(true);
  });
});

describe('DataFrame.pop / insert', () => {
  it('pop removes and returns column', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    const s = df.pop('b');
    expect(s).toBeDefined();
    expect(df.columns).not.toContain('b');
  });
  it('insert adds column at position', () => {
    const df = new DataFrame({ a: [1, 2], c: [5, 6] });
    df.insert(1, 'b', [3, 4]);
    expect(df.columns[1]).toBe('b');
  });
});

// ── DataFrame: properties ─────────────────────────────────────────────────────

describe('DataFrame.empty / T / transpose', () => {
  it('empty is true for empty df', () => expect(new DataFrame({}).empty).toBe(true));
  it('empty is false for non-empty df', () => expect(new DataFrame({ a: [1] }).empty).toBe(false));
  it('T transposes', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    const t = df.T;
    expect(t.shape[0]).toBe(2); // 2 original columns → 2 rows
    expect(t.shape[1]).toBe(2); // 2 original rows → 2 cols
  });
  it('transpose() same as T', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    const t = df.transpose();
    expect(t.shape).toEqual([2, 2]);
  });
});

describe('DataFrame.add_prefix / add_suffix', () => {
  it('add_prefix prepends to all column names', () => {
    const df = new DataFrame({ a: [1], b: [2] });
    const r = df.add_prefix('x_');
    expect(r.columns).toEqual(['x_a', 'x_b']);
  });
  it('add_suffix appends to all column names', () => {
    const df = new DataFrame({ a: [1], b: [2] });
    const r = df.add_suffix('_y');
    expect(r.columns).toEqual(['a_y', 'b_y']);
  });
});

describe('DataFrame.select_dtypes', () => {
  it('includes numeric columns', () => {
    const df = new DataFrame({ a: [1, 2], b: ['x', 'y'], c: [1.1, 2.2] });
    const r = df.select_dtypes({ include: 'number' });
    expect(r.columns).toContain('a');
    expect(r.columns).toContain('c');
    expect(r.columns).not.toContain('b');
  });
  it('excludes object (string) columns', () => {
    const df = new DataFrame({ a: [1, 2], b: ['x', 'y'] });
    const r = df.select_dtypes({ exclude: 'string' });
    expect(r.columns).toContain('a');
    expect(r.columns).not.toContain('b');
  });
});

describe('DataFrame.mode', () => {
  it('returns modal value per column', () => {
    const df = new DataFrame({ a: [1, 2, 2, 3], b: ['x', 'y', 'x', 'x'] });
    const r = df.mode();
    expect(Number(r.col('a').iloc(0))).toBe(2);
  });
});

describe('DataFrame.replace', () => {
  it('replaces scalar value', () => {
    const df = new DataFrame({ a: [1, 2, 3], b: [2, 2, 4] });
    const r = df.replace(2, 99);
    expect(Number(r.col('a').iloc(1))).toBe(99);
    expect(Number(r.col('b').iloc(0))).toBe(99);
  });
});

describe('DataFrame.align', () => {
  it('outer align unions indexes', () => {
    const a = new DataFrame({ x: [1, 2] }, { index: ['a', 'b'] });
    const b = new DataFrame({ x: [10, 20] }, { index: ['b', 'c'] });
    const [ra, rb] = a.align(b, { join: 'outer' });
    expect(ra.shape[0]).toBe(3);
    expect(rb.shape[0]).toBe(3);
  });
  it('inner align intersects', () => {
    const a = new DataFrame({ x: [1, 2] }, { index: ['a', 'b'] });
    const b = new DataFrame({ x: [10, 20] }, { index: ['b', 'c'] });
    const [ra] = a.align(b, { join: 'inner' });
    expect(ra.shape[0]).toBe(1);
  });
});

describe('DataFrame.idxmin / idxmax', () => {
  it('idxmin returns index label of min per column', () => {
    const df = new DataFrame({ a: [3, 1, 2] }, { index: ['x', 'y', 'z'] });
    const r = df.idxmin();
    expect(r['a']).toBe('y');
  });
  it('idxmax returns index label of max per column', () => {
    const df = new DataFrame({ a: [3, 1, 2] }, { index: ['x', 'y', 'z'] });
    const r = df.idxmax();
    expect(r['a']).toBe('x');
  });
});

describe('DataFrame.to_markdown / to_latex', () => {
  it('to_markdown produces pipe-delimited table', () => {
    const df = new DataFrame({ a: [1, 2], b: [3, 4] });
    const md = df.to_markdown();
    expect(md).toContain('|');
    expect(md).toContain('---');
    expect(md).toContain('a');
  });
  it('to_latex produces tabular environment', () => {
    const df = new DataFrame({ a: [1] });
    const latex = df.to_latex();
    expect(latex).toContain('tabular');
    expect(latex).toContain('\\\\');
  });
});

// ── Top-level functions ───────────────────────────────────────────────────────

describe('to_numeric', () => {
  it('converts string numbers', () => {
    const r = to_numeric(['1', '2.5', '3']);
    expect(Number(r.iloc(0))).toBe(1);
    expect(Number(r.iloc(1))).toBe(2.5);
  });
  it('coerces bad values to NaN', () => {
    const r = to_numeric(['1', 'bad', '3'], { errors: 'coerce' });
    expect(Number(r.iloc(1))).toBeNaN();
  });
});

describe('unique', () => {
  it('returns unique values', () => {
    expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });
  it('works on Series', () => {
    expect(unique(new Series([1, 2, 2, 3]))).toEqual([1, 2, 3]);
  });
});

describe('value_counts', () => {
  it('counts occurrences sorted', () => {
    const r = value_counts([1, 2, 2, 3, 3, 3]);
    expect(Number(r.iloc(0))).toBe(3); // 3 appears 3 times
  });
  it('normalize sums to 1', () => {
    const r = value_counts([1, 1, 2], { normalize: true });
    const sum = r.to_list().reduce((a: number, b) => a + Number(b), 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe('crosstab', () => {
  it('produces frequency table', () => {
    const idx = new Series(['a', 'a', 'b', 'b']);
    const col = new Series(['x', 'y', 'x', 'x']);
    const r = crosstab(idx, col);
    expect(r.columns).toContain('x');
    expect(r.columns).toContain('y');
    expect(Number(r.col('x').iloc(0))).toBe(1); // a,x
    expect(Number(r.col('x').iloc(1))).toBe(2); // b,x
  });
  it('margins adds totals', () => {
    const idx = ['a', 'b'];
    const col = ['x', 'y'];
    const r = crosstab(idx, col, { margins: true });
    expect(r.columns).toContain('All');
  });
});

describe('factorize', () => {
  it('encodes to integer codes', () => {
    const [codes, uniques] = factorize(['b', 'a', 'c', 'b', 'a']);
    expect(uniques).toHaveLength(3);
    expect(codes[0]).toBe(codes[3]); // both 'b'
    expect(codes[1]).toBe(codes[4]); // both 'a'
  });
  it('NA sentinel', () => {
    const [codes] = factorize([null, 'a', null], { na_sentinel: -1 });
    expect(codes[0]).toBe(-1);
    expect(codes[2]).toBe(-1);
  });
});

describe('wide_to_long', () => {
  it('reshapes wide to long', () => {
    const df = new DataFrame({ id: [1, 2], math_2020: [90, 80], math_2021: [95, 85] });
    const r = wide_to_long(df, ['math'], 'id', 'year');
    expect(r.columns).toContain('math');
    expect(r.columns).toContain('year');
    expect(r.shape[0]).toBe(4);
  });
});

describe('json_normalize', () => {
  it('flattens nested JSON', () => {
    const data = [{ a: 1, b: { c: 2, d: 3 } }, { a: 4, b: { c: 5, d: 6 } }];
    const r = json_normalize(data);
    expect(r.columns).toContain('a');
    expect(r.columns).toContain('b.c');
    expect(r.columns).toContain('b.d');
    expect(Number(r.col('b.c').iloc(0))).toBe(2);
  });
  it('custom sep', () => {
    const r = json_normalize([{ a: { b: 1 } }], { sep: '_' });
    expect(r.columns).toContain('a_b');
  });
});

describe('bdate_range', () => {
  it('skips weekends', () => {
    const r = bdate_range('2024-01-01', { periods: 5 });
    expect(r.size).toBe(5);
    // All should be weekdays
    for (let i = 0; i < r.size; i++) {
      const d = r.iloc(i) as Date;
      expect(d.getDay()).not.toBe(0); // not Sunday
      expect(d.getDay()).not.toBe(6); // not Saturday
    }
  });
});

describe('merge_ordered', () => {
  it('merges and sorts by key', () => {
    const left = new DataFrame({ date: [1, 3], val: [10, 30] });
    const right = new DataFrame({ date: [2, 4], info: [20, 40] });
    const r = merge_ordered(left, right, { on: 'date', how: 'outer' });
    expect(r.columns).toContain('val');
    expect(r.columns).toContain('info');
  });
});

describe('merge_asof', () => {
  it('matches backward', () => {
    const quotes = new DataFrame({ time: [1, 2, 3, 6], bid: [100, 101, 102, 103] });
    const trades = new DataFrame({ time: [2, 5], qty: [1, 2] });
    const r = merge_asof(quotes, trades, { on: 'time' });
    expect(r.columns).toContain('qty');
  });
});

describe('from_dummies', () => {
  it('reverses get_dummies', () => {
    const df = new DataFrame({ color_red: [1, 0, 1], color_blue: [0, 1, 0] });
    const r = from_dummies(df);
    expect(r.columns).toContain('color');
    expect(r.col('color').iloc(0)).toBe('red');
    expect(r.col('color').iloc(1)).toBe('blue');
  });
});

describe('interval_range', () => {
  it('generates intervals', () => {
    const r = interval_range({ start: 0, end: 5, freq: 1 });
    expect(r.size).toBe(5);
  });
});

describe('period_range', () => {
  it('generates periods', () => {
    const r = period_range('2024-01-01', { periods: 3, freq: 'D' });
    expect(r.size).toBe(3);
  });
});

// ── IO: read_html / to_html ──────────────────────────────────────────────────

describe('read_html / to_html', () => {
  it('to_html produces valid HTML table', () => {
    const df = new DataFrame({ name: ['Alice', 'Bob'], age: [30, 25] });
    const html = to_html(df);
    expect(html).toContain('<table');
    expect(html).toContain('<th>name</th>');
    expect(html).toContain('<td>Alice</td>');
  });
  it('read_html parses HTML table', () => {
    const html = `<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>`;
    const tables = read_html(html);
    expect(tables.length).toBe(1);
    expect(tables[0]!.columns).toContain('a');
    expect(Number(tables[0]!.col('a').iloc(0))).toBe(1);
  });
  it('to_html without index', () => {
    const df = new DataFrame({ x: [1] });
    const html = to_html(df, { index: false });
    expect(html).not.toContain('<th></th>');
  });
});

// ── IO: read_xml / to_xml ────────────────────────────────────────────────────

describe('read_xml / to_xml', () => {
  it('to_xml produces XML', () => {
    const df = new DataFrame({ name: ['Alice'], score: [95] });
    const xml = to_xml(df);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<name>Alice</name>');
  });
  it('read_xml parses XML', () => {
    const xml = `<?xml version="1.0"?><data><row><name>Alice</name><score>95</score></row><row><name>Bob</name><score>80</score></row></data>`;
    const r = read_xml(xml);
    expect(r.columns).toContain('name');
    expect(r.shape[0]).toBe(2);
  });
});

// ── IO: read_fwf ─────────────────────────────────────────────────────────────

describe('read_fwf', () => {
  it('parses fixed-width format', () => {
    const data = `name       age  city
Alice      30   NYC
Bob        25   LA `;
    const r = read_fwf(data);
    expect(r.columns).toContain('name');
    expect(r.columns).toContain('age');
    expect(r.shape[0]).toBe(2);
  });
  it('explicit colspecs', () => {
    const data = `Alice 30\nBob   25`;
    const r = read_fwf(data, { colspecs: [[0, 5], [6, 8]], names: ['name', 'age'], header: null });
    expect(r.shape).toEqual([2, 2]);
  });
});

// ── IO: stubs throw NotImplementedError ──────────────────────────────────────

describe('read_hdf / read_stata stubs', () => {
  it('read_hdf throws NotImplementedError', () => {
    expect(() => read_hdf('file.h5')).toThrow(NotImplementedError);
  });
  it('read_stata throws NotImplementedError', () => {
    expect(() => read_stata('file.dta')).toThrow(NotImplementedError);
  });
});
