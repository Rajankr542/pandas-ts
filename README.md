# pandas-ts

[![npm version](https://img.shields.io/npm/v/pandas-ts)](https://www.npmjs.com/package/pandas-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![node](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)
![platform](https://img.shields.io/badge/platform-Node.js%20%7C%20TypeScript-blue)
[![pandas api coverage](https://img.shields.io/badge/pandas_api_coverage-~99%25-brightgreen)](https://pandas-ts.cyfora.in)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/rajankr542)

<a href="https://cyfora.in">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Rajankr542/numera/main/docs/images/cyfora-logo-dark.png" width="180">
    <img alt="Cyfora" src="https://raw.githubusercontent.com/Rajankr542/numera/main/docs/images/cyfora-logo-light.png" width="180">
  </picture>
</a>

**pandas for TypeScript & JavaScript, powered by a C++ core.**

- **📊 Broad API**: ~99% pandas parity — Series (152+ methods), DataFrame (134+ methods), GroupBy, Rolling, Resample, IO and tseries
- **⚙️ Backed by @cyfora/numera**: math-heavy operations (hist, quantile, corrcoef, linalg.norm, gradient, interp…) run in numera's C++ core
- **✅ Validated**: 601 tests across 14 files, including differential cases against Python pandas
- **🔒 Type-safe**: full TypeScript declarations, ESM + CJS dual output
- **📦 Pure TypeScript**: no compiler or build tools needed — installs like any npm package

[Docs](https://pandas-ts.cyfora.in) • [Compatibility](https://pandas-ts.cyfora.in/compatibility) • [Roadmap](https://pandas-ts.cyfora.in/roadmap) • [Contributing](https://github.com/Rajankr542/pandas-ts/blob/main/CONTRIBUTING.md)

---

## Install

```bash
npm install pandas-ts
```

Requires Node.js ≥ 18. No native compilation step — `@cyfora/numera`'s prebuilt binaries are fetched automatically.

---

## Quick Start

```ts
import pd from 'pandas-ts';
// or named imports:
import { Series, DataFrame, read_csv } from 'pandas-ts';

// --- Series ---
const s = new pd.Series([10, 20, 30, 40, 50], { name: 'sales' });
console.log(s.mean());      // 30
console.log(s.std());       // 15.811...
console.log(s.describe());  // count/mean/std/min/25%/50%/75%/max

// String accessor
const names = new pd.Series(['Alice Smith', 'Bob Jones', 'Carol White']);
console.log(names.str.upper().tolist());   // ['ALICE SMITH', 'BOB JONES', 'CAROL WHITE']
console.log(names.str.split(' ').tolist()); // [['Alice','Smith'], ['Bob','Jones'], ['Carol','White']]

// Datetime accessor
const dates = pd.date_range('2024-01-01', { periods: 5, freq: 'D' });
const ts = new pd.Series([100, 110, 105, 120, 115], { index: dates });
console.log(ts.dt.day_of_week.tolist()); // [0, 1, 2, 3, 4]

// --- DataFrame ---
const df = new pd.DataFrame({
  name:   ['Alice', 'Bob', 'Carol', 'Dave'],
  dept:   ['Eng', 'Eng', 'HR', 'HR'],
  salary: [95000, 88000, 72000, 68000],
  yoe:    [5, 3, 7, 4],
});

console.log(df.shape);           // [4, 4]
console.log(df.dtypes);          // { name: 'string', dept: 'string', salary: 'number', yoe: 'number' }
console.log(df['salary'].mean()); // 80750

// Filter & select
const eng = df.loc(df['dept'].eq('Eng'));
console.log(eng.to_string());

// GroupBy + aggregation
const byDept = df.groupby('dept').agg({ salary: 'mean', yoe: 'sum' });
console.log(byDept.to_string());

// --- IO ---
const csv = await read_csv('./data/sales.csv');
const top10 = csv.nlargest(10, 'revenue');
await top10.to_csv('./output/top10.csv');
```

---

## A quick tour

### Series

```ts
import { Series } from 'pandas-ts';

const s = new Series([3, 1, 4, 1, 5, 9, 2, 6]);

// Arithmetic (named methods — see Differences from pandas)
s.add(10).tolist();           // [13, 11, 14, 11, 15, 19, 12, 16]
s.mul(2).sub(1).tolist();     // [5, 1, 7, 1, 9, 17, 3, 11]

// Reductions
s.sum();      // 31
s.mean();     // 3.875
s.median();   // 3.5
s.min();      // 1
s.max();      // 9
s.var();      // variance
s.std();      // std deviation
s.skew();     // skewness
s.kurt();     // kurtosis
s.quantile(0.75); // 75th percentile

// Sorting & ranking
s.sort_values().tolist();     // [1, 1, 2, 3, 4, 5, 6, 9]
s.rank().tolist();            // ranks with average tie-breaking

// Rolling window
s.rolling(3).mean().tolist(); // 3-period moving average

// EWM
s.ewm({ span: 3 }).mean().tolist();

// Cumulative
s.cumsum().tolist();
s.cumprod().tolist();
s.cummax().tolist();
s.cummin().tolist();

// Apply
s.apply(x => x ** 2).tolist(); // [9, 1, 16, 1, 25, 81, 4, 36]

// Value counts
s.value_counts().to_string();  // freq table

// Boolean masks
s.gt(4).tolist();  // [false, false, false, false, true, true, false, true]
s.between(2, 5).tolist();

// loc / iloc / at / iat
s.iloc(0);       // 3
s.iloc([0, 2]);  // Series([3, 4])

// Reshape
s.to_frame('values');      // DataFrame
s.reset_index();
```

### DataFrame

```ts
import { DataFrame, Series } from 'pandas-ts';

const df = new DataFrame({
  product: ['A', 'B', 'A', 'C', 'B', 'C'],
  region:  ['North', 'South', 'North', 'East', 'South', 'East'],
  q1: [100, 200, 150, 80,  220, 95],
  q2: [110, 190, 160, 90,  210, 100],
});

// Basic info
df.shape;          // [6, 4]
df.columns;        // ['product', 'region', 'q1', 'q2']
df.index;          // RangeIndex(0, 6)
df.dtypes;
df.describe();
df.info();

// Selection
df['q1'];                          // Series
df[['q1', 'q2']];                  // DataFrame
df.loc(df['product'].eq('A'));     // filter rows
df.iloc([0, 2, 4]);                // rows by position

// Mutation
const df2 = df.assign({ total: df => df['q1'].add(df['q2']) });
const df3 = df2.drop(['q1', 'q2'], { axis: 1 });

// Sort
df.sort_values('q1', { ascending: false }).head(3).to_string();

// Aggregation
df.agg({ q1: 'sum', q2: 'mean' });
df.sum();
df.mean();
df.corr();   // powered by numera C++ core

// Merge / join
const left  = new DataFrame({ id: [1, 2, 3], val: ['a', 'b', 'c'] });
const right = new DataFrame({ id: [2, 3, 4], score: [10, 20, 30] });
const merged = left.merge(right, { on: 'id', how: 'inner' });
// id: [2, 3], val: ['b', 'c'], score: [10, 20]

// Pivot table
df.pivot_table({ values: 'q1', index: 'region', columns: 'product', aggfunc: 'sum' });

// Melt
df.melt({ id_vars: ['product', 'region'], value_vars: ['q1', 'q2'] });

// Transpose
df[['q1', 'q2']].T;

// Apply
df[['q1', 'q2']].apply(col => col.sub(col.mean()).div(col.std()), { axis: 0 }); // z-score

// Rename / reindex
df.rename({ columns: { q1: 'Q1', q2: 'Q2' } });
df.reindex([5, 4, 3, 2, 1, 0]);

// Missing data
df.dropna();
df.fillna(0);
df.isna().sum();
```

### GroupBy & aggregation

```ts
import { DataFrame } from 'pandas-ts';

const df = new DataFrame({
  category: ['X', 'Y', 'X', 'Y', 'X', 'Y'],
  sub:      ['a', 'a', 'b', 'b', 'a', 'b'],
  value:    [10, 20, 30, 40, 50, 60],
});

// Single-key groupby
const g = df.groupby('category');
g.sum().to_string();
g.mean().to_string();
g.agg({ value: ['min', 'max', 'mean', 'std'] }).to_string();

// Multi-key groupby
df.groupby(['category', 'sub']).sum().to_string();

// Transform (returns same shape as input)
df.groupby('category')['value'].transform('mean'); // group mean broadcast back

// Filter groups
df.groupby('category').filter(g => g['value'].sum() > 50);

// Apply arbitrary function to each group
df.groupby('category').apply(grp => grp.nlargest(1, 'value'));

// Named aggregations
df.groupby('category').agg({ value: 'sum' });
```

### IO

```ts
import pd, { read_csv, read_json, read_excel } from 'pandas-ts';

// CSV
const df = await read_csv('./sales.csv', {
  parse_dates: ['date'],
  dtype: { id: 'number' },
  index_col: 'id',
});
await df.to_csv('./output.csv', { index: false });

// JSON
const df2 = await read_json('./data.json', { orient: 'records' });
await df2.to_json('./output.json', { orient: 'records', lines: true });

// Excel
const df3 = await read_excel('./report.xlsx', { sheet_name: 'Sheet1' });
await df3.to_excel('./report_out.xlsx', { sheet_name: 'Summary' });

// SQL (bring your own connection)
import Database from 'better-sqlite3';
const db = new Database('app.db');
const df4 = await pd.read_sql('SELECT * FROM orders WHERE status = ?', db, {
  params: ['shipped'],
});
await df4.to_sql('orders_shipped', db, { if_exists: 'replace' });

// Clipboard, HTML, XML, Feather, Pickle also supported
```

### tseries.offsets

```ts
import { Timestamp } from 'pandas-ts';
import {
  BusinessDay, MonthEnd, MonthBegin,
  YearEnd, YearBegin, QuarterEnd,
  Week, Day, Hour, Minute,
} from 'pandas-ts/tseries/offsets';

const t = new Timestamp('2024-01-31');

console.log(t.add(MonthEnd(1)).isoformat());   // 2024-02-29
console.log(t.add(BusinessDay(5)).isoformat()); // skips weekends
console.log(t.add(QuarterEnd(1)).isoformat()); // 2024-03-31

// date_range with offsets
import pd from 'pandas-ts';
const monthEnds = pd.date_range('2024-01-01', { periods: 6, freq: 'ME' });
// [2024-01-31, 2024-02-29, 2024-03-31, ...]

const bizDays = pd.bdate_range('2024-01-01', '2024-01-31');
// business days only

// Resample time-series
const ts = new pd.Series(
  Array.from({ length: 90 }, (_, i) => Math.random() * 100),
  { index: pd.date_range('2024-01-01', { periods: 90, freq: 'D' }) },
);
ts.resample('ME').mean().to_string(); // monthly averages
ts.resample('W').sum().to_string();   // weekly totals
```

### pd.testing

```ts
import { assert_series_equal, assert_frame_equal, assert_index_equal } from 'pandas-ts/testing';
import { Series, DataFrame } from 'pandas-ts';

// Passes silently, throws on mismatch — just like Python pandas.testing
assert_series_equal(
  new Series([1.0, 2.0, 3.0]),
  new Series([1.0, 2.0, 3.0]),
);

assert_frame_equal(
  new DataFrame({ a: [1, 2], b: [3, 4] }),
  new DataFrame({ a: [1, 2], b: [3, 4] }),
);

// Use in Vitest / Jest
import { test, expect } from 'vitest';
test('rolling mean is correct', () => {
  const s = new Series([1, 2, 3, 4, 5]);
  const result = s.rolling(3).mean();
  assert_series_equal(result.dropna(), new Series([2, 3, 4], { index: [2, 3, 4] }));
});
```

---

## How it works

```
your code ──► TypeScript API (pandas-compatible)
                   │  delegates via @cyfora/numera
                   ▼
              C++ core (arrays, stats, linalg, ufuncs)
                   │
                   ▼
         Node.js native addon (N-API / node-gyp prebuilt)
```

pandas-ts is a pure TypeScript library — it ships no native code of its own. For
math-heavy operations (histograms, quantiles, correlation, covariance, gradient,
interpolation, convolution, linear algebra norms, …) it delegates to
[`@cyfora/numera`](https://www.npmjs.com/package/@cyfora/numera), which is a
NumPy port backed by a compiled C++ N-API addon. Everything else — DataFrame
construction, indexing, groupby, IO, string/datetime accessors, window methods —
is implemented directly in TypeScript.

This means:

- Pure TypeScript paths are fast and have zero native-build friction.
- Numeric-heavy paths get native C++ performance without any extra setup.
- Prebuilt `@cyfora/numera` binaries cover macOS (arm64, x64) and Linux (x64).
  Windows support follows numera's release schedule.

---

## Differences from pandas

pandas-ts follows pandas semantics as closely as JavaScript/TypeScript allows,
but a few things are unavoidably different:

| Topic | Python pandas | pandas-ts |
|---|---|---|
| **Arithmetic operators** | `s + 1`, `df * 2` | `s.add(1)`, `df.mul(2)` — JS doesn't support operator overloading |
| **eval** | `df.eval('a + b')` | `df.evalDataFrame('a + b')` — `eval` is a reserved word |
| **HDF5 / Stata / SAS / ORC** | Full read/write | Stub — returns `null` / throws with a clear message |
| **DataFrame.plot** | Matplotlib integration | Not included — bring your own renderer (e.g. Plotly, Observable Plot) |
| **style** | Rich HTML styler | Stub — `.style` property exists, full rendering is a roadmap item |
| **MultiIndex advanced ops** | Full cartesian joins | Core MultiIndex is supported; some advanced slicing ops are partial |
| **Categorical dtype** | First-class | `.cat` accessor fully supported; internal storage is JS string arrays |

For everything else — method names, argument names, default values, return
shapes — pandas-ts matches Python pandas behaviour exactly.

---

## Performance

Most DataFrame operations (filtering, groupby, sort, merge, string accessors,
rolling windows, …) are pure TypeScript and run at typical V8 speeds. For a
production data pipeline processing millions of rows, performance is comparable
to a well-optimised Python/pandas script.

Math-heavy operations — `corr()`, `cov()`, `hist()`, `quantile()`, `gradient()`,
`interp()`, `norm()` and similar — are delegated to `@cyfora/numera`'s C++ core
and run at native speed. These paths avoid JS ↔ native round-trip overhead by
passing typed arrays (Float64Array) directly across the N-API boundary.

Benchmarks against Python pandas for common workflows are planned for the v1.1
milestone.

---

## Contributing

Issues and PRs are welcome at **https://github.com/Rajankr542/pandas-ts**.

```bash
git clone https://github.com/Rajankr542/pandas-ts.git
cd pandas-ts
npm install
npm run build
npm test          # 601 tests
npm run typecheck # 0 type errors
```

Please open an issue first for anything beyond a small bug fix, so we can
discuss approach before you invest time writing code.

---

## Support

If pandas-ts saves you time, consider buying me a coffee ☕

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/rajankr542)

---

## License

MIT © [Rajan Kumar](https://github.com/Rajankr542) — [Cyfora](https://cyfora.in)
