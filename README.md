# pandas-ts

> **pandas for TypeScript & JavaScript, with a C++ core so it can run at native speed.**

[![npm version](https://img.shields.io/npm/v/pandas-ts.svg)](https://www.npmjs.com/package/pandas-ts)
[![license](https://img.shields.io/npm/l/pandas-ts.svg)](./LICENSE)
[![status](https://img.shields.io/badge/status-pre--alpha-orange.svg)](#project-status)

`pandas-ts` aims to be a **100% API-compatible port of Python's [pandas](https://pandas.pydata.org/)**
for the JavaScript ecosystem, with full TypeScript types. Heavy computation runs in a
**C++ core**, exposed as a Node.js native addon (N-API) and compiled to WebAssembly for browsers.
The goal is to get as close as possible to the speed of pandas itself.

---

## ⚠️ Project status

**This is a pre-alpha placeholder release (`0.0.x`).** It reserves the package name and sets up the
project. **The `DataFrame` and `Series` APIs are not available yet.** Don't use this in production.

Follow the [roadmap](#roadmap) to see progress, and watch the repository for releases.

---

## Vision

- **Familiar API.** If you know pandas, you should already know `pandas-ts`. Method names, arguments,
  and behavior follow pandas closely. Where they differ, it's because of JavaScript language limits,
  and those differences are documented.
- **Native performance.** Columnar memory, vectorized kernels, and multi-threaded operations are
  written in modern C++ and run with no copying between JS and native memory where possible.
- **Runs anywhere.** Node.js, Bun, and Deno use the native addon. Browsers and edge runtimes use
  the WebAssembly build. A pure-JS fallback covers everything else.
- **TypeScript-first.** Strong types for dtypes, columns, and method results.
- **Interoperable.** Planned support for Apache Arrow, CSV, JSON, Parquet, and Excel.

## Planned API (preview)

> The following shows the **intended** API. It does **not** work in the current release.

```ts
import * as pd from 'pandas-ts';

const df = pd.DataFrame({
  city: ['Delhi', 'Mumbai', 'Delhi', 'Pune'],
  sales: [120, 340, 90, 210],
  year: [2024, 2024, 2025, 2025],
});

df.head();
df.describe();

const summary = df
  .groupby('city')
  .agg({ sales: ['sum', 'mean'] })
  .sort_values(['sales', 'sum'], { ascending: false });

const csv = await pd.read_csv('data.csv');
csv.to_parquet('data.parquet');
```

## Installation

```bash
npm install pandas-ts
# or
yarn add pandas-ts
# or
pnpm add pandas-ts
```

Prebuilt native binaries are planned for macOS (x64/arm64), Linux (x64/arm64, glibc and musl),
and Windows (x64). On other platforms the WebAssembly build will be used automatically.

## Current usage (0.0.x)

Only basic build information is exported for now:

```ts
import { VERSION, info, isNativeAvailable } from 'pandas-ts';

console.log(VERSION);             // "0.0.1"
console.log(info());              // { version, stage: 'pre-alpha', ... }
console.log(isNativeAvailable()); // false (native core not shipped yet)
```

CommonJS also works:

```js
const { VERSION } = require('pandas-ts');
```

## Architecture

```
┌──────────────────────────────────────────────┐
│        TypeScript API (pandas-compatible)    │
│   DataFrame · Series · Index · GroupBy · IO  │
└───────────────┬──────────────────────────────┘
                │ zero-copy buffers (TypedArrays)
     ┌──────────┴───────────┬──────────────────┐
     ▼                      ▼                  ▼
┌──────────────┐   ┌────────────────┐   ┌─────────────┐
│ Native addon │   │  WebAssembly   │   │  Pure JS    │
│  (N-API)     │   │  (browser/edge)│   │  fallback   │
└──────┬───────┘   └───────┬────────┘   └─────────────┘
       └─────────┬─────────┘
                 ▼
     ┌───────────────────────────┐
     │      C++ core engine      │
     │ columnar storage · SIMD   │
     │ hashing · sort · groupby  │
     │ joins · rolling · parsers │
     └───────────────────────────┘
```

## Roadmap

- [x] Reserve package name and set up the project (`0.0.1`)
- [ ] C++ core: columnar storage, dtypes (int, float, bool, string, datetime, category), null handling
- [ ] N-API bindings and prebuilt binaries for major platforms
- [ ] WebAssembly build and pure-JS fallback
- [ ] `Series`: construction, indexing, arithmetic, comparisons, reductions
- [ ] `DataFrame`: construction, `loc` / `iloc`, selection, assignment, `head` / `tail` / `describe`
- [ ] `Index`, `RangeIndex`, `DatetimeIndex`, `MultiIndex`
- [ ] `groupby`, `agg`, `transform`, `apply`
- [ ] `merge`, `join`, `concat`
- [ ] `pivot`, `pivot_table`, `melt`, `stack` / `unstack`
- [ ] `rolling`, `expanding`, `ewm`, `resample`
- [ ] Missing data: `isna`, `fillna`, `dropna`, `interpolate`
- [ ] String (`.str`) and datetime (`.dt`) accessors
- [ ] IO: CSV, JSON, Parquet, Arrow, Excel
- [ ] Benchmarks against pandas, Polars, and Danfo.js
- [ ] Documentation site and API reference

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Rajan

---

_pandas-ts is an independent project. It is not affiliated with or endorsed by the pandas
development team or NumFOCUS._
