---
title: "feat: pandas-ts — 100% Pandas-Compatible DataFrame Library for TypeScript"
type: feat
status: active
date: 2026-10-01
---

# pandas-ts — Complete Implementation Plan

## Summary

Build `pandas-ts`: a 100% pandas-compatible DataFrame and Series library for TypeScript/JavaScript. The library mirrors every public pandas API — `DataFrame`, `Series`, `Index`, `MultiIndex`, `GroupBy`, `Resample`, `IO`, `Plotting`, all scalar types (`Timestamp`, `Timedelta`, `Period`), all accessor namespaces (`str`, `dt`, `cat`), all offset types (`tseries.offsets`), all error classes (`pandas.errors`), and all top-level utility functions — backed by a three-layer execution stack: a TypeScript API layer, a C++ native Node-API addon (NAPI) that handles hot-path computation, and optional CUDA/GPU dispatch for massively parallel workloads. `@cyfora/numera` (the in-house NumPy port, located at `../numera`) is the numerical foundation: all array math, broadcasting, linear algebra, random, and FFT flow through numera's C++ core rather than being re-implemented. The project mirrors numera's own proven architecture: TypeScript API → C++20 core → optional accelerators.

The full API audit (see **API Coverage Gap Analysis** section) confirmed **1,296 total public symbols** across pandas 3.0.6. This plan covers 100% through 27 implementation units (U1–U27).

---

## Problem Frame

Python's pandas is the dominant data manipulation library. No TypeScript equivalent covers its full API surface, forcing TypeScript/JavaScript data engineers to drop to Python or accept severely limited alternatives. `pandas-ts` closes this gap: one package, full pandas semantics, native-speed computation, GPU optional, runs inside Node.js and Deno.

---

## Requirements

- R1. Every public pandas class exists: `DataFrame`, `Series`, `Index`, `RangeIndex`, `MultiIndex`, `Categorical`, `Period`, `Interval`.
- R2. Every public pandas method on those classes is callable with the same signature (argument names, defaults, behaviour) as pandas ≥ 2.x.
- R3. All pandas IO functions are implemented: `read_csv`, `read_json`, `read_parquet`, `read_excel`, `read_sql`, `to_csv`, `to_json`, `to_parquet`, `to_excel`, `read_feather`, `to_feather`, `read_hdf`, `to_hdf`, `read_pickle`, `to_pickle`, `read_html`, `read_xml`.
- R4. GroupBy, Resample, Rolling, Expanding, and EWM aggregations match pandas semantics exactly (same NaN handling, same default ddof, same sort behaviour).
- R5. All dtypes map correctly: `bool`, `int8`/`int16`/`int32`/`int64`, `uint8`–`uint64`, `float32`/`float64`, `complex64`/`complex128`, `string`, `object`, `category`, `datetime64[ns]`, `timedelta64[ns]`, `period`, `interval`, `ArrowDtype`.
- R6. `@cyfora/numera` is the exclusive numerical backend. No independent array math re-implementation.
- R7. A C++20 native addon exposes hot-path operations not feasible at JS speed: merge/join kernels, sort kernels, groupby hash-aggregation, string internment, rolling windows.
- R8. CUDA path is gated behind an opt-in build flag (`PANDAS_TS_CUDA=ON`). When available it accelerates sort, groupby, join, rolling, and element-wise DataFrame ops.
- R9. Public API is TypeScript-first: strict types, full generics over dtypes, no `any` in the public surface.
- R10. ESM + CJS dual output, Node ≥ 18, prebuilt NAPI binaries for macOS arm64/x64 and Linux x64/arm64. WASM fallback for environments without native binaries (browser, Deno, edge runtimes).
- R11. A differential test suite runs every implemented method against real pandas (via a Python subprocess driver) and compares results.
- R12. Benchmark suite measures every hot-path operation against pandas and reports a geo-mean speed ratio.

---

## Scope Boundaries

- No browser-native CSV file picker UI — IO is stream/buffer-based.
- No built-in plotting renderer beyond data preparation helpers compatible with Vega/D3/Observable Plot.
- No pandas internals that are explicitly private (`_*`) or undocumented.
- No Python process dependency at runtime — differential tests are dev-only.
- Spark/Dask distributed out-of-core processing is deferred.

### Deferred to Follow-Up Work

- Full Arrow/IPC zero-copy transfer (planned but deferred to v2).
- Dask-style lazy evaluation graph.
- Browser/WASM build optimisation (WASM path ships as fallback, not primary).
- GPU memory pool and CUDA stream-level scheduling.

---

## Context & Research

### What @cyfora/numera Provides (Verified Against Source — Do NOT Reimplement)

**The single most important rule:** if numera can do it, pandas-ts does NOT write C++ for it. numera is an active project (`@cyfora/numera@1.0.1`, last commit today). pandas-ts lists it as a `dependency` and calls it — not duplicates it.

#### What numera has RIGHT NOW (verified from source and ROADMAP)

Milestones 0–10 + P0–P2 are ✅ complete. This is what pandas-ts can call today:

| Category | numera exports to call | pandas-ts use case |
|---|---|---|
| **Array creation** | `np.zeros`, `np.ones`, `np.empty`, `np.full`, `np.arange`, `np.linspace`, `np.eye`, `np.identity`, `np.fromTypedArray`, `np.array`, `np.asarray`, `np.*Like` | Build result columns; allocate intermediate buffers |
| **Element-wise arithmetic** | `np.add`, `np.subtract`, `np.multiply`, `np.divide`, `np.power`, `np.mod`, `np.floorDivide`, `np.abs`, `np.negative`, `np.sqrt`, `np.exp`, `np.log` + full `out=`, `where=`, `dtype=`, `casting=`, `order=` | `df['a'] + df['b']`, `df.abs()`, `series ** 2` |
| **Complex helpers** | `np.real`, `np.imag`, `np.conj`, `np.angle`, `np.iscomplex`, `np.isreal` | complex64/128 column ops |
| **Broadcasting** | `np.broadcastShapes`, `np.broadcastTo` | DataFrame/Series alignment for binary ops |
| **Reductions** | `np.sum`, `np.prod`, `np.min`, `np.max`, `np.mean`, `np.std`, `np.variance`, `np.argmin`, `np.argmax` (all support `axis`, `keepdims`, `dtype`, `ddof`, `initial`) | `df.sum()`, `df.mean()`, `df.std()`, `df.min()`, `df.max()` |
| **Indexing** | `NDArray.get()`, `.slice()`, `.set()`, `np.where()`, `np.take()`, `np.nonzero()` | `df.iloc[]`, `series.iloc[]`, boolean masking |
| **Shape ops** | `np.reshape`, `np.transpose`, `np.squeeze`, `np.expandDims`, `np.ravel`, `np.swapAxes`, `np.moveAxis` | `df.T`, internal reshaping |
| **Linear algebra** | `np.matmul`, `np.dot`, `np.inner`, `np.outer`, `np.linalg.{det,inv,solve,eig,eigh,svd,qr,lstsq,norm,eigvals,eigvalsh}` | `df.dot()`, `df.corr()`, `df.cov()`, `series.corr()` |
| **Random** | `np.random.defaultRng`, `np.random.{rand,randn,random,uniform,normal,randint,integers,choice,shuffle,permutation}`, `np.random.Generator`, `np.random.RandomState` | `df.sample()`, `series.sample()` |
| **FFT** | `np.fft.{fft,ifft,rfft,irfft,fft2,ifft2,fftn,ifftn,fftfreq,rfftfreq}` | Available as pass-through; not a core pandas API |
| **Dtype system** | `np.int8/16/32/64`, `np.uint8/16/32/64`, `np.float16/32/64`, `np.complex64/128`, `np.bool`, `np.DType`, `np.dtype`, `np.promoteTypes`, `np.canCast` | Re-export directly; extend with pandas-only dtypes |
| **Memory** | `NDArray._native` (C++ `MemoryBuffer`, 64B aligned, refcounted, RAII) | Columns are `NDArray` instances — memory managed by numera |
| **Error classes** | `NativpyError`, `ValueError`, `ShapeError`, `BroadcastError`, `DTypeError`, `IndexError`, `LinAlgError`, `MemoryError`, `NotImplementedError` | Catch in pandas-ts bindings; re-throw as `PandasTsError` subclasses |

#### numera's roadmap (P3–P15) — arriving during pandas-ts development

numera is actively completing parity with NumPy 2.5.3. pandas-ts initially ships a **pure-TS or thin-C++ fallback** for each capability below; when the numera function ships, the fallback is replaced with a delegation call. Each replacement is tracked as a `D-NNN` decision entry in `DECISIONS.md`.

| numera milestone | Functions arriving | pandas-ts benefit when shipped |
|---|---|---|
| **P3** (next) | `floor`, `ceil`, `round`, `trunc`, `rint`, `sign`, `clip`, `maximum`, `minimum`, `fmax`, `fmin`, `logicalAnd/Or/Not/Xor`, `diff`, `fill`, `view(dtype)`, `tobytes`, `tolist`, `finfo`, `iinfo`, `issubdtype` | `df.round()`, `df.clip()`, `series.round()`, boolean column ops |
| **P4** | Trig/inverse/hyp: `sin`, `cos`, `tan`, `arcsin/cos/tan/2`, `sinh/cosh/tanh/arcsinh/arccosh/arctanh`, `deg2rad`, `rad2deg`; exp/log: `exp2`, `expm1`, `log2`, `log10`, `log1p`, `logaddexp`; rounding: complete set; complex: `conj`, `angle` | `df.apply(np.sin)`, element-wise trig on numeric columns |
| **P5** | Comparison ufuncs: `equal`, `notEqual`, `less`, `lessEqual`, `greater`, `greaterEqual`; logic: `all`, `any` (with axis); float predicates: `isnan`, `isinf`, `isfinite`; bitwise ops | `df == other`, `df < value`, `df.all()`, `df.any()`, `series.isna()` |
| **P6** | `concatenate`, `stack`, `vstack`, `hstack`, `split`, `tile`, `repeat`, `pad`, `flip`, `roll`, `broadcastArrays` | `pd.concat()` internals; eliminates pandas-ts's own concat kernel |
| **P7** | `logspace`, `geomspace`, `meshgrid`, `diag`, `tril`, `triu`, `copy`, `astype` | Internal construction helpers |
| **P8** | `takeAlongAxis`, `putAlongAxis`, `diagonal`, `trace`, `argwhere`, `flatnonzero`, `countNonzero` | `df.trace()`, advanced indexing internals |
| **P9** | `sort`, `argsort` (quicksort/stable/heapsort), `partition`, `argpartition`, `lexsort`, `searchsorted`, `unique` (with returnIndex/Inverse/Counts), `isin`, `ediff1d` | **Eliminates pandas-ts's own sort kernel entirely**; `series.sort_values()`, `series.unique()`, `series.searchsorted()` |
| **P10** | `median`, `percentile`, `quantile`, `average`, `cumsum`, `cumprod`, `cumulativeSum`, `cumulativeProd`, `diff`, `gradient`, `cov`, `corrcoef`, `histogram`, `histogramdd`, `bincount`, `digitize`, `nansum`, `nanmean`, `nanstd`, `nanvar`, `nanmin`, `nanmax` | `df.cumsum()`, `df.diff()`, `df.quantile()`, `df.corr()`, `df.hist()`, `series.value_counts()` internals |

**Strategy:** pandas-ts builds thin fallbacks for P3–P10 capabilities on day one. The fallbacks are clearly marked with `// TODO(numera-PX): replace when numera PX ships`. CI runs a check that counts TODO replacements so they don't get forgotten.

#### How a DataFrame column IS a numera NDArray

```
// WRONG (original plan — creates a redundant buffer system):
Column { buffer: MemoryBuffer, dtype: DType, na_mask: BitBuffer }

// CORRECT (what we actually build):
Column { data: NDArray,     // ← a 1-D @cyfora/numera NDArray (native memory, refcounted)
         na_mask: NDArray   // ← a 1-D bool NDArray | null (null = all valid)
}
```

A Column IS an `NDArray` from numera, already in native C++ memory. When `df['price'].sum()` is called:
1. TypeScript gets the column's `NDArray` handle from the native `DataFrameWrap`.
2. Calls `np.sum(column.data)` → this goes straight into numera's C++ BLAS-backed kernel.
3. Wraps the result scalar or NDArray in a new `Series`.

**Zero reimplementation. Zero C++ for any numeric operation.**

#### What pandas-ts C++ core IS responsible for (genuinely new, never in numera)

| pandas-ts C++ | Why numera will never cover it |
|---|---|
| `DataFrame` struct — heterogeneous named column map + index | numera has only homogeneous `NDArray`, no named column tables |
| `Index` types — `RangeIndex`, `StringIndex`, `MultiIndex`, `DatetimeIndex` | numera has no index concept |
| GroupBy hash-aggregation — key hashing, group formation, dispatch to np reductions | No groupby in numera |
| Merge/Join kernel — hash-join, sort-merge join, producing `(left_idx, right_idx)` | No join in numera |
| Sort kernel (fallback until P9 ships) — `lexsort` on mixed-type columns | numera sort is planned P9, not yet shipped |
| Rolling/Expanding window engine — deque-based O(n) min/max, Welford accumulator | No windowing in numera |
| String intern pool + str ops — dictionary-encoded string column | numera has no string dtype |
| Datetime64[ns] column arithmetic — ns-precision epoch arithmetic, tz handling | numera has no datetime dtype |
| NA mask — 1-bit-per-row validity for nullable integer columns | numera uses float NaN, different from pandas nullable integer NA |
| IO parsers — CSV SIMD, Parquet (Arrow C++), JSON, Excel | No IO in numera |

### Revised C++ Core: What We Actually Build in native/

The `native/core/` directory is precisely scoped — no overlap with numera:

```
native/core/              ← pandas-ts ONLY, genuinely new work
  column.hpp/.cpp         # Column = {NDArray data; NDArray|null na_mask}
  na.hpp                  # NA/NaT sentinels + nullable-integer mask helpers
  error.hpp/.cpp          # PandasTsError hierarchy (distinct from numera errors)
  dataframe.hpp/.cpp      # column name map + insertion-order + index reference
  series.hpp/.cpp         # (name, Column, Index)
  index/
    range_index.hpp       # (start, stop, step) — no buffer, O(1) label lookup
    column_index.hpp      # NDArray-backed Int64/Float64/String/DateTime index
    multi_index.hpp       # levels[] NDArrays + codes NDArray
  groupby.hpp/.cpp        # hash table: KeyTuple → row_id list; agg calls np reductions
  merge.hpp/.cpp          # hash-join + sort-merge join → (left_idx, right_idx) NDArrays
  sort.hpp/.cpp           # lexsort on NDArray columns; replaced by np.lexsort when P9 ships
  rolling.hpp/.cpp        # O(n) sliding window; calls np.sum/mean/std per window
  strings.hpp/.cpp        # int32 codes NDArray + string intern pool + str ops
  datetime.hpp/.cpp       # datetime64[ns] / timedelta64[ns] arithmetic on int64 NDArrays
  io/
    csv.hpp/.cpp          # SIMD CSV parser → NDArray columns (backed by udsv/csv-parser)
    json.hpp/.cpp         # JSON reader/writer → NDArray columns
    parquet.hpp/.cpp      # parquet-wasm + apache-arrow → NDArray columns
```

**No `memory.hpp`, no `dtype.hpp`, no `ufunc.hpp`, no `reduce.hpp` — those live in numera.**

### npm Dependencies — Precise Decisions (Based on Ecosystem Audit)

Criteria: production-ready, actively maintained, performance-justified, no redundancy with numera.

| Purpose | Package | Decision | Rationale |
|---|---|---|---|
| **Parquet read/write** | `parquet-wasm` v0.7.2 | ✅ **Use** | Rust/WASM, actively maintained, Arrow IPC output chains to `apache-arrow`. Zero C++ compilation needed. |
| **Arrow IPC / columnar** | `apache-arrow` v21+ | ✅ **Use** | 3–6M weekly DL, v21.2.0 Jul 2026. `makeVector` from TypedArray is zero-copy. Direct interop with numera NDArray via `.toTypedArray()`. |
| **CSV large files** | `csv-parser` | ✅ **Use** | Best memory profile at 5M+ rows (50–70MB RSS); streaming API fits columnar loading. Backend for `read_csv`. |
| **CSV small/medium** | `udsv` | ✅ **Use** | 2–5× faster than PapaParse; columnar typed output native. Backend for in-memory CSV parse path. |
| **Excel** | `xlsx` (SheetJS CE v0.18.5) | ✅ **Use** | 10–15M DL/wk, broadest format support (xls/xlsx/xlsb/ods). Only the CE npm version (v0.18.5). |
| **HDF5** | `h5wasm` v0.10.3 | ✅ **Use** | NIST-maintained, WASM-based (no native build), full read/write, compound dtypes, Node entry point. |
| **SQLite** | `better-sqlite3` v13+ | ✅ **Use** | 10.4M DL/wk, synchronous API, v13.0.3 Aug 2026. Standard. |
| **PostgreSQL** | `pg` v8+ | ✅ **Use** | 57M DL/wk, de-facto standard. |
| **MySQL** | `mysql2` v3+ | ✅ **Use** | 10.6M DL/wk, pure JS. |
| **Datetime / timezone** | `@js-temporal/polyfill` v0.5.1 | ✅ **Use** | **Nanosecond precision via BigInt** — only npm package with ns precision. Full IANA tz. TC39 Temporal-conformant. Critical for `datetime64[ns]`. |
| **Expression eval** (`DataFrame.eval`) | `mathjs` v15+ | ✅ **Use** | 3.7M DL/wk, safe sandboxed eval (no `Function()`), v15.2.0 active. |
| **ORC format** | none | ❌ **Use DuckDB npm** | No production ORC npm package. Use `duckdb` package which reads ORC, or document ORC→Parquet conversion. |
| **Stata/SAS/SPSS** | none | ❌ **Python subprocess** | No maintained Node reader. `read_stata`/`read_sas`/`read_spss` spawn Python `pyreadstat` subprocess in dev; throw `NotImplementedError` with clear message at runtime. |
| **fast-csv** | — | ❌ **Reject** | Slowest in every benchmark; OOM at 1M+ rows. |
| **papaparse** | — | ❌ **Reject (server)** | OOM crash above 1M rows (1539MB RSS). Fine for browser; not for Node server-side pandas-ts use. |
| **exceljs** | — | ❌ **Defer** | 2× slower than SheetJS for read. Worth revisiting only for rich Excel export with styling. |
| **luxon / dayjs / date-fns** | — | ❌ **Reject** | Millisecond precision only — incompatible with `datetime64[ns]`. |
| **filtrex** | — | ❌ **Reject** | No update in 2+ years; maintenance unclear. |
| **hdf5.node** | — | ❌ **Reject** | Abandoned. Use `h5wasm` instead. |

### Relevant Code and Patterns

- `../numera/packages/numera/src/index.ts` — canonical list of everything numera exports today. Check this before implementing any math operation in pandas-ts.
- `../numera/packages/numera/src/ndarray.ts` — `NDArray` class: every column's data is one of these. Understand `_native`, `_wrap`, shape/strides, `.get()`, `.slice()`, `.set()`, `.toTypedArray()`.
- `../numera/packages/numera/src/ufunc.ts` — `add`, `subtract`, etc. These ARE the pandas-ts DataFrame arithmetic backends.
- `../numera/packages/numera/src/reduce.ts` — `sum`, `mean`, `std`, `variance`, etc. These ARE `DataFrame.sum()`, `DataFrame.mean()` etc.
- `../numera/packages/numera/src/linalg.ts` — `matmul`, `dot`, `linalg.*`. Used for `DataFrame.dot()`, `.corr()`, `.cov()`.
- `../numera/packages/numera/src/creation.ts` — `zeros`, `ones`, `arange`, `fromTypedArray`. Used when constructing result columns.
- `../numera/packages/numera/src/random.ts` — `defaultRng`, `Generator`. Used for `DataFrame.sample()`.
- `../numera/ROADMAP.md` — **Read before every implementation sprint.** Check if a planned numera function has shipped; if so, replace the pandas-ts fallback with a delegation call.
- `../numera/PROGRESS.md` — Detailed changelog of what shipped and when.
- `../numera/native/bindings/` — NAPI binding pattern: `Napi::ObjectWrap`, `translate_errors`, basic finalizers. Mirror exactly.
- `../numera/CMakeLists.txt` — CMake + cmake-js build system to replicate.
- `src/index.ts` — existing package skeleton with `Backend` and `BuildInfo` types.
- `package.json` — dual ESM/CJS output config, NAPI keywords already present.

### Institutional Learnings

- numera D-003: strides in bytes — NDArrays already handle this; pandas-ts gets it for free.
- numera D-005: int64/uint64 → JS via BigInt64Array for exact access. pandas-ts must follow the same convention for index labels and datetime64 values.
- numera D-007 / D-023: `NAPI_EXPERIMENTAL` + `NODE_ADDON_API_REQUIRE_BASIC_FINALIZERS` — mandatory in pandas-ts addon too. Copy the CMake option pattern exactly.
- numera D-026: prebuilds bundled in package, resolved before local build. pandas-ts uses the identical packaging pattern.
- numera D-031: manual releases only, no CI release workflow.
- numera D-032: numera is actively completing NumPy parity P3–P15. Check ROADMAP before each sprint — a just-shipped numera function may replace a pandas-ts fallback, reducing maintained code.
- numera D-051: table-driven ufunc registry (just shipped P2-7). The binary/unary drivers handle `out=`, `where=`, `dtype=`, `casting=`, `order=`. pandas-ts's arithmetic code should use these advanced params correctly.

### External References

- pandas 2.x API reference: https://pandas.pydata.org/docs/reference/
- pandas source on GitHub: https://github.com/pandas-dev/pandas
- Apache Arrow columnar format (IPC, Parquet): https://arrow.apache.org/
- CUDA Thrust library (GPU sort/reduce/scan): https://thrust.github.io/
- Node-Addon-API (node-addon-api v8): https://github.com/nodejs/node-addon-api
- cmake-js v8: https://github.com/cmake-js/cmake-js
- DuckDB (C++ columnar engine, reference for hash-join/groupby kernels): https://duckdb.org/

---

## Key Technical Decisions

- **Columns ARE numera NDArrays, not separate buffers**: Each DataFrame column is a 1-D numera `NDArray`. There is no separate `MemoryBuffer` in pandas-ts C++. When arithmetic or reduction is needed on a column, the existing numera C++ kernels are called directly on the NDArray. This is the single most important architectural decision — it eliminates entire categories of duplicated C++ code.
- **`@cyfora/numera` handles ALL numerical computation**: arithmetic (add/subtract/multiply/…), reductions (sum/mean/std/var/…), linalg (matmul/dot/corr/cov/…), random (sample), FFT, broadcasting, dtype promotion — all delegated to numera. pandas-ts writes zero new C++ for any of these.
- **pandas-ts C++ is pandas-specific only**: The pandas-ts C++ addon (`native/`) implements exactly and only what pandas needs that numera does not provide: DataFrame/Series/Index structures, GroupBy hash-aggregation, merge/join, argsort/lexsort, rolling window engine, string intern pool, datetime64 arithmetic, NA mask for nullable integers, and IO parsers.
- **Re-use numera's DType objects in TypeScript**: `pd.int64`, `pd.float64`, etc. ARE `np.int64`, `np.float64` from numera. pandas-ts re-exports and extends numera's dtype objects rather than defining a parallel dtype system. The additional pandas-only dtypes (`StringDtype`, `CategoricalDtype`, `DatetimeTZDtype`, etc.) are added as extensions on top.
- **NAPI bindings mirror numera's pattern exactly**: `Napi::ObjectWrap` for every native object (`DataFrameWrap`, `SeriesWrap`, `IndexWrap`), `translate_errors` adapter, `NODE_ADDON_API_REQUIRE_BASIC_FINALIZERS`, `NAPI_EXPERIMENTAL`.
- **CUDA is a compile-time opt-in**: The CMake variable `PANDAS_TS_CUDA=ON` enables the `native/cuda/` subdirectory and Thrust-based kernels. The TypeScript API is identical regardless of CUDA availability; a runtime `backend()` query reports what is active.
- **WASM fallback**: A separate build target compiles the C++ core to WebAssembly (Emscripten). Shipped as a fallback for non-Node environments. Not the primary path.
- **Differential testing via Python subprocess**: A vitest driver spawns `python3 -c "import pandas; ..."` for each test case, captures the pandas result as JSON, and compares it to the pandas-ts result. Mirrors numera's differential test pattern.
- **Index as a first-class native object**: `RangeIndex`, `Int64Index`, `Float64Index`, `StringIndex`, and `MultiIndex` are each C++ objects with their own native type, not JS arrays.
- **GroupBy hash-aggregation in C++**: The groupby kernel builds a hash table over key columns in native code (similar to DuckDB's AggregateHashTable). The actual per-group aggregation (sum, mean, etc.) calls numera reduction functions on the group's NDArray slice.
- **String column stored as dictionary-encoded**: String columns use an `int32` NDArray (index codes) + a string intern pool (`unordered_map<int32_t, string>`), matching pandas' `StringDtype` and Arrow dictionary encoding. This avoids JS string GC pressure.
- **NaN/NA semantics match pandas exactly**: `NA` (pandas NA sentinel), `NaN` (float NaN), `NaT` (datetime NA), and `pd.NA` (nullable integer NA) are all native types. Float NaN lives inside the NDArray's float64 buffer. Nullable integer NA is a separate bool NDArray mask.
- **numera roadmap-aware fallback strategy**: For capabilities numera plans but hasn't yet shipped (P3–P10: trig, comparison ufuncs, sort, concat, cumulative, nan-reductions, quantile, etc.), pandas-ts ships a pure-TypeScript fallback. The fallback is annotated with `// TODO(numera-PX): replace when numera PX ships`. When numera ships the function, the fallback is replaced with a single delegation call. This keeps the C++ surface small and ensures pandas-ts benefits from every numera improvement automatically.
- **IO delegates to npm; no IO in pandas-ts C++**: CSV parsing uses `csv-parser` + `udsv` (Node.js streams → columnar TypedArrays → NDArrays). Parquet uses `parquet-wasm` + `apache-arrow` (Arrow IPC → zero-copy TypedArray → NDArray via `np.fromTypedArray`). Excel uses `xlsx` CE. HDF5 uses `h5wasm`. No Apache Arrow C++ compilation; no SIMD CSV parser in C++ — these npm packages already provide optimized implementations.
- **Selected npm ecosystem packages**: `@js-temporal/polyfill` for nanosecond-precision datetime (only npm package with ns precision via BigInt); `mathjs` for safe sandboxed `DataFrame.eval()`; `better-sqlite3`/`pg`/`mysql2` for SQL connectors. See Context → npm Dependencies for the full decision table.

---

## Open Questions

### Resolved During Planning

- **Which numera version to depend on?**: Use workspace path `../numera` during development, published `@cyfora/numera` for releases.
- **How to share C++ memory between numera NDArrays and pandas-ts columns?**: Both use the same `MemoryBuffer` pattern; columns can vend their raw pointer to numera `fromTypedArray` without a copy.
- **Monorepo or standalone?**: Standalone package (`pandas-ts`) mirroring numera's own standalone structure.

### Deferred to Implementation

- Exact hash-table collision policy for groupby kernel (Robin Hood vs. open addressing) — decide when benchmarking.
- Whether `MultiIndex` NAPI wrapping uses a single C++ class with variant storage or multiple subclasses — decide when implementing MultiIndex.
- CUDA stream reuse strategy across multiple DataFrame ops — decide when implementing CUDA kernels.
- Arrow IPC zero-copy path — deferred to v2.

---

## Output Structure

```
pandas-ts/
├── CMakeLists.txt                  # top-level CMake (mirrors numera)
├── package.json
├── tsconfig.json / tsconfig.*.json
├── vitest.config.ts
├── vitest.diff.config.ts           # differential test config
├── pnpm-workspace.yaml
├── ARCHITECTURE.md
├── DECISIONS.md
├── COMPATIBILITY.md                # pandas API coverage tracker
├── PERFORMANCE.md
├── ROADMAP.md
│
├── native/
│   ├── core/                       # C++20 static lib — pandas-specific ONLY
│   │   │                           # NOTE: NO memory.hpp, dtype.hpp, ufunc.hpp, reduce.hpp here.
│   │   │                           # Those live in numera (nativpy_core) which this lib links against.
│   │   ├── column.hpp/.cpp         # Column = {NDArray data; NDArray na_mask}
│   │   ├── na.hpp                  # NA/NaT sentinels + nullable-integer mask helpers
│   │   ├── error.hpp/.cpp          # PandasTsError hierarchy (distinct from numera errors)
│   │   ├── index/
│   │   │   ├── range_index.hpp     # (start, stop, step) — no buffer, O(1)
│   │   │   ├── column_index.hpp    # NDArray-backed Int64/Float64/DateTime index
│   │   │   └── multi_index.hpp     # levels[] NDArrays + codes NDArray
│   │   ├── dataframe.hpp/.cpp      # DataFrame: column name map + index + column order
│   │   ├── series.hpp/.cpp         # Series: (name, Column, Index)
│   │   ├── groupby.hpp/.cpp        # hash table: KeyTuple → row_id list; agg calls np reductions
│   │   ├── merge.hpp/.cpp          # hash-join + sort-merge join → (left_idx, right_idx) NDArrays
│   │   ├── sort.hpp/.cpp           # lexsort on NDArray columns (argsort + gather)
│   │   ├── rolling.hpp/.cpp        # O(n) sliding window; calls np.sum/mean/std per window
│   │   ├── strings.hpp/.cpp        # int32 codes NDArray + string intern pool + str ops
│   │   ├── datetime.hpp/.cpp       # datetime64[ns] / timedelta64[ns] arithmetic on int64 NDArrays
│   │   └── io/
│   │       ├── csv.hpp/.cpp        # SIMD CSV parser → NDArray columns
│   │       ├── json.hpp/.cpp       # JSON reader/writer → NDArray columns
│   │       └── parquet.hpp/.cpp    # Apache Arrow C++ → NDArray columns
│   │
│   ├── bindings/                   # Node-API (node-addon-api v8)
│   │   ├── addon.cpp               # Init, module registration
│   │   ├── dataframe_wrap.hpp/.cpp
│   │   ├── series_wrap.hpp/.cpp
│   │   ├── index_wrap.hpp/.cpp
│   │   ├── groupby_wrap.hpp/.cpp
│   │   ├── io_wrap.hpp/.cpp
│   │   └── errors.hpp              # translate_errors adapter
│   │
│   └── cuda/                       # CUDA kernels (optional, PANDAS_TS_CUDA=ON)
│       ├── CMakeLists.txt
│       ├── sort.cu
│       ├── groupby.cu
│       ├── join.cu
│       ├── rolling.cu
│       └── element_wise.cu
│
├── src/                            # TypeScript public API
│   ├── index.ts                    # re-exports everything
│   ├── addon.ts                    # NAPI addon loader (mirrors numera/addon.ts)
│   ├── dtype.ts                    # dtype objects + normalization
│   ├── errors.ts                   # typed JS error classes
│   ├── na.ts                       # NA / NaN / NaT constants
│   ├── dataframe.ts                # DataFrame class
│   ├── series.ts                   # Series class
│   ├── index/
│   │   ├── range_index.ts
│   │   ├── int64_index.ts
│   │   ├── float64_index.ts
│   │   ├── string_index.ts
│   │   ├── datetime_index.ts
│   │   ├── timedelta_index.ts
│   │   └── multi_index.ts
│   ├── groupby/
│   │   ├── dataframe_groupby.ts
│   │   └── series_groupby.ts
│   ├── resample.ts
│   ├── window/
│   │   ├── rolling.ts
│   │   ├── expanding.ts
│   │   └── ewm.ts
│   ├── io/
│   │   ├── csv.ts
│   │   ├── json.ts
│   │   ├── parquet.ts
│   │   ├── excel.ts
│   │   ├── sql.ts
│   │   ├── feather.ts
│   │   ├── hdf.ts
│   │   ├── pickle.ts
│   │   ├── html.ts
│   │   └── xml.ts
│   ├── categorical.ts
│   ├── period.ts
│   ├── interval.ts
│   ├── plotting.ts                 # data prep helpers for Vega/D3
│   ├── arrays/
│   │   ├── string_array.ts
│   │   ├── masked_array.ts
│   │   └── arrow_array.ts
│   └── compat/
│       └── arrow.ts                # Apache Arrow JS interop
│
├── tests/
│   ├── unit/                       # vitest unit tests
│   ├── differential/               # pandas differential test cases
│   └── native/                     # C++ CTest tests
│
├── benchmarks/
│   ├── pandas_ts/                  # Node.js benchmark suite
│   └── pandas/                     # Python pandas benchmark suite (for comparison)
│
├── python/
│   ├── generators/                 # scripts that generate differential test JSON from pandas
│   └── requirements.txt            # pandas, pyarrow (dev only)
│
└── scripts/
    ├── api-coverage.mjs
    ├── build-prebuilds.mjs
    └── release.mjs
```

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Layer Stack

```
User TypeScript code
        │
        ▼
src/ TypeScript API
  ┌─ DataFrame / Series / Index / GroupBy / IO / Window ─────────────────────┐
  │  type-safe wrappers, NaN/NA handling, axis resolution                     │
  │                                                                           │
  │  arithmetic / reductions / linalg → delegates to @cyfora/numera NDArray  │
  │  (np.add, np.sum, np.matmul, np.linalg.*, np.random.*, np.fft.*)         │
  └───────────────────────────────────────────────────────────────────────────┘
        │  Node-API  (node-addon-api v8, NAPI_EXPERIMENTAL)
        │
        ├── pandas-ts native addon (DataFrameWrap, SeriesWrap, IndexWrap, …)
        │       │  links against
        │       ▼
        │   pandas-ts C++ core (native/core/)
        │   Pandas-specific ONLY:
        │     column.hpp     — Column = {NDArray data; NDArray na_mask}
        │     dataframe      — column map + index
        │     groupby        — hash-aggregation (calls np reductions per group)
        │     merge          — hash-join + sort-merge
        │     sort           — argsort / lexsort
        │     rolling        — O(n) window (calls np reductions per window)
        │     strings        — dictionary-encoded string column
        │     datetime       — ns-precision int64 arithmetic
        │     io/csv/json    — SIMD parsers → NDArray columns
        │       │  links against
        │       ▼
        │   nativpy_core (numera C++ static library — ../numera/native/core/)
        │   Provides for FREE (DO NOT REWRITE):
        │     MemoryBuffer, DType (14 types), NDArray (shape+strides+offset)
        │     Ufuncs (add/sub/mul/div/pow/mod/abs/sqrt/exp/log/…)
        │     Reductions (sum/mean/min/max/std/var/argmin/argmax/prod)
        │     Broadcasting (broadcastShapes, broadcastTo)
        │     Indexing (get/slice/set, where, take, nonzero)
        │     Linalg (matmul/dot/inv/solve/svd/eig/qr/lstsq/norm)
        │     Random (PCG64, MT19937, normal/uniform/integers/choice/…)
        │     FFT (fft/ifft/rfft/irfft/fft2/fftn/…)
        │
        └── @cyfora/numera TS addon (for TypeScript-level numera calls)
                │
                ▼  (same nativpy_core lib, different NAPI surface)
            nativpy.node (numera's own prebuilt NAPI addon)
```

**Key rule**: If numera can do it, pandas-ts does NOT write C++ for it.
```

### DataFrame Internal Layout

```
DataFrame
  │
  ├── columns: Map<string, Column>
  │     Column {
  │       data: NDArray      ← 1-D numera NDArray (native memory, refcounted)
  │       na_mask: NDArray   ← 1-D bool NDArray or null (null = all valid)
  │     }
  │
  ├── index: Index  (RangeIndex | ColumnIndex | MultiIndex)
  │
  └── columns_order: string[]   (preserves insertion order, like pandas)
```

### GroupBy Hash-Aggregation

```
groupby(keys: string[]) → GroupByHandle (C++ native handle)
  │
  ├── C++ HashTable<KeyTuple, vector<row_id>>   (pandas-ts C++)
  ├── .sum()   → for each group: np.sum(column.data.get(row_ids))  ← numera
  ├── .mean()  → np.mean(column.data.get(row_ids))                 ← numera
  └── .apply() → JS callback per group DataFrame
```

### CUDA Dispatch

```
op request (e.g., sort)
        │
        ├─ CUDA available AND column fits GPU budget?
        │     ▼ YES
        │   cuda/sort.cu  →  Thrust stable_sort_by_key  →  result NDArray
        │
        └─ NO (fallback)
              native/core/sort.hpp  →  std::stable_sort / radix sort on NDArray data
```

---

## Implementation Units

### U1. Project Infrastructure & Build System

**Goal:** Establish the complete build infrastructure — CMake, cmake-js, TypeScript configs, pnpm workspace, vitest, C++ test harness, prebuilds script — mirroring numera's proven setup.

**Requirements:** R6, R9, R10

**Dependencies:** None

**Files:**
- Create: `CMakeLists.txt`
- Create: `pnpm-workspace.yaml`
- Create: `vitest.config.ts`
- Create: `vitest.diff.config.ts`
- Modify: `package.json` (add cmake-js, node-addon-api, vitest devDeps; add build/test scripts)
- Modify: `tsconfig.json`, `tsconfig.esm.json`, `tsconfig.cjs.json`, `tsconfig.types.json`
- Create: `ARCHITECTURE.md`
- Create: `DECISIONS.md`
- Create: `COMPATIBILITY.md`
- Create: `ROADMAP.md`
- Create: `scripts/api-coverage.mjs`
- Create: `scripts/build-prebuilds.mjs`
- Create: `scripts/release.mjs`
- Create: `python/requirements.txt`
- Test: `tests/unit/smoke.test.ts`

**Approach:**
- Copy CMakeLists structure from `../numera/CMakeLists.txt` — set project name `pandas_ts`, define `PANDAS_TS_CUDA` option default OFF.
- `native/core/` compiles to a static library `pandas_ts_core`. `native/bindings/` compiles the NAPI addon `pandas_ts.node`. `native/cuda/` is a conditional sub-directory.
- cmake-js config passes `NAPI_EXPERIMENTAL`, `NODE_ADDON_API_REQUIRE_BASIC_FINALIZERS` to match numera D-007/D-023.
- pnpm workspace: root workspace with a `packages/pandas-ts/` inner package for ESM/CJS split (mirrors numera layout).
- Prebuilds targets: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`.
- `COMPATIBILITY.md` will be machine-generated by `scripts/api-coverage.mjs` against a pandas API inventory JSON.

**Patterns to follow:**
- `../numera/CMakeLists.txt`
- `../numera/package.json` (scripts, devDeps)
- `../numera/vitest.config.ts`

**Test scenarios:**
- Happy path: `pnpm build` produces `packages/pandas-ts/dist/index.js` and a `.node` addon binary.
- Happy path: `pnpm typecheck` exits 0.
- Happy path: `pnpm test` runs vitest and the smoke test passes.
- Edge case: build on a machine without CUDA — `PANDAS_TS_CUDA` defaults OFF, build succeeds.
- Edge case: build with `PANDAS_TS_CUDA=ON` on a machine without a CUDA toolkit — CMake reports an actionable error.

**Verification:**
- `node -e "import('@cyfora/pandas-ts').then(m => console.log(m.VERSION))"` prints the version.
- `pnpm test:native` (C++ CTest) exits 0.

---

### U2. C++ Core: Column, NA Mask, and Error Hierarchy

**Goal:** Implement the foundational pandas-ts C++ types: the `Column` struct (a named wrapper around a numera `NDArray` + nullable integer NA mask), the NA/NaT sentinel helpers, and the typed error hierarchy. This unit does NOT reimplement memory management, dtype system, or arithmetic — those are inherited from numera's `nativpy_core` static library which pandas-ts links against.

**Requirements:** R5, R7

**Dependencies:** U1

**Files:**
- Create: `native/core/na.hpp` (NA/NaT sentinels, nullable integer mask helpers)
- Create: `native/core/error.hpp` (PandasTsError hierarchy, distinct from numera's NativpyError)
- Create: `native/core/column.hpp` / `native/core/column.cpp`
- Test: `tests/native/column_test.cpp`

**Approach:**
- **No `memory.hpp`, no `dtype.hpp` in pandas-ts** — the plan's original proposal to create these was wrong. pandas-ts links against `nativpy_core` (numera's C++ static library) and uses numera's `MemoryBuffer`, `DType`, `NDArray`, and `UfuncRegistry` directly.
- `Column` = `{ NDArray data; NDArray na_mask; }` where `data` is a 1-D numera NDArray and `na_mask` is a 1-D bool NDArray (null = all valid, allocated lazily). For float columns, NaN is the NA sentinel (like pandas). For integer columns, the mask is the NA indicator (pandas nullable integer semantics).
- `NaT` stored as `INT64_MIN` in `int64` datetime64 columns — matching pandas. numera can store this in an `int64` NDArray.
- `na.hpp`: helpers `is_na(col, i)`, `set_na(col, i)`, `make_na_mask(n)`, `merge_masks(a, b)`.
- Error hierarchy: `PandasTsError` (base) → `ValueError`, `TypeError`, `IndexError`, `MergeError`, `OutOfBoundsDatetime`, `MemoryError`, `NotImplementedError`, `ParserError`, `KeyError`. All carry string messages matching pandas format. These are **distinct** from numera's `NativpyError` hierarchy — they are pandas-specific.
- `translate_errors` in bindings maps each C++ error kind to the corresponding JS error class.

**Patterns to follow:**
- `../numera/native/core/error.hpp` — error kind enum + `translate_errors` pattern to replicate.
- `../numera/native/core/ndarray.hpp` — `NDArray` is the type used for `Column.data`. Link against, don't copy.

**Test scenarios:**
- Happy path: create `Column` wrapping a numera `int64` NDArray, check `is_na(0)` returns false.
- Happy path: set NA on position 3, `is_na(3)` returns true, others remain false.
- Happy path: `float64` column — NA is NaN (no explicit mask needed).
- Happy path: `merge_masks(a, b)` — result mask is OR of both input masks.
- Edge case: zero-length column — `is_na` never called, no crash.
- Edge case: `NaT` in `int64` column — `is_na` checks `INT64_MIN` sentinel.
- Error path: `PandasTsError` hierarchy — `ValueError` IS-A `PandasTsError`, not IS-A `NativpyError`.

**Verification:**
- `ctest --test-dir build-tests -R "column"` passes.
- ASan/UBSan clean: `pnpm test:asan` exits 0.

---

### U3. C++ Core: Index Types

**Goal:** Implement `RangeIndex`, `Int64Index`, `Float64Index`, `StringIndex`, `DatetimeIndex`, `TimedeltaIndex`, and `MultiIndex` as C++ value types.

**Requirements:** R1, R5, R7

**Dependencies:** U2

**Files:**
- Create: `native/core/index.hpp`
- Create: `native/core/index.cpp`
- Create: `native/core/multi_index.hpp`
- Create: `native/core/multi_index.cpp`
- Test: `tests/native/index_test.cpp`

**Approach:**
- `IndexKind` enum: `Range`, `Int64`, `Float64`, `String`, `Datetime`, `Timedelta`, `Multi`.
- `Index` is a tagged union: `{IndexKind kind; union { RangeIndex range; Column column; MultiIndex multi; }}`.
- `RangeIndex`: `{int64_t start; int64_t stop; int64_t step;}` — no buffer, O(1) construction like pandas.
- `Column`-backed indices hold a typed column + an optional sorted-order cache for binary search.
- `MultiIndex`: vector of `Column` (one per level) + a `labels` column of combined codes. Mirrors pandas MultiIndex internal structure.
- `.loc[label]` → `find(label)` → returns positional integer(s). For `RangeIndex`, `(label - start) / step`. For column-backed, sorted binary search or hash lookup.
- Index alignment for binary ops: `align(IndexA, IndexB, join='outer'|'inner'|'left'|'right')` → returns a pair of integer arrays (positional maps).

**Patterns to follow:**
- pandas source `pandas/core/indexes/` — specifically `range.py`, `base.py`, `multi.py`

**Test scenarios:**
- Happy path: `RangeIndex(0, 10, 2)` — `len == 5`, `find(4) == 2`, `find(3) == npos`.
- Happy path: `Int64Index([3,1,2])` — `find(1) == 1`.
- Happy path: `MultiIndex` two levels — `find((level0_val, level1_val))` returns correct integer position.
- Edge case: `RangeIndex` with step -1 — reverse range, `find` still works.
- Edge case: duplicate labels in `Int64Index` — `find` returns all positions (pandas behaviour).
- Error path: `find` on incompatible dtype → `TypeError`.

**Verification:**
- `ctest --test-dir build-tests -R "index"` passes.

---

### U4. C++ Core: DataFrame and Series Objects

**Goal:** Implement `DataFrame` (column map + index + column order) and `Series` (single column + index + name) as core C++ types with their full method set.

**Requirements:** R1, R2, R7

**Dependencies:** U2, U3

**Files:**
- Create: `native/core/dataframe.hpp`
- Create: `native/core/dataframe.cpp`
- Create: `native/core/series.hpp`
- Create: `native/core/series.cpp`
- Test: `tests/native/dataframe_test.cpp`
- Test: `tests/native/series_test.cpp`

**Approach:**
- `DataFrame` = `{unordered_map<string,Column> columns; vector<string> columns_order; Index index;}`.
- Core methods implemented natively (the ones Python pandas implements in Cython/C): `.head(n)`, `.tail(n)`, `.iloc[...]`, `.loc[...]`, `.at[...]`, `.iat[...]`, `.shape`, `.dtypes`, `.copy(deep)`, `.astype(dtype)`, `.reset_index()`, `.set_index()`, `.rename(columns/index)`, `.drop(labels, axis)`, `.reindex(index)`, `.fillna(value/method)`, `.dropna(axis, how, thresh)`, `.isnull()`, `.notnull()`, `.describe()`, `.info()`, `.memory_usage()`, `.T` (transpose).
- Arithmetic ops (`add`, `sub`, `mul`, `div`, `mod`, `pow`, `eq`, `ne`, `lt`, `le`, `gt`, `ge`) — **all delegate to numera**: extract the two column NDArrays, call `np.add(colA.data, colB.data)`, wrap result as a new Column. Zero C++ arithmetic code in pandas-ts.
- `Series.value_counts()`, `Series.unique()`, `Series.nunique()` — use numera's sort (`np.sort` is not in numera yet, so these use the C++ sort kernel from U5). `Series.sort_values()` uses U5's argsort kernel.

**Patterns to follow:**
- `../numera/native/core/ndarray.hpp` for the general object layout pattern.
- pandas source `pandas/core/frame.py` and `pandas/core/series.py` for method semantics.

**Test scenarios:**
- Happy path: create DataFrame from column map, `shape` returns `(n_rows, n_cols)`.
- Happy path: `df.iloc[2:5, 1:3]` returns sub-DataFrame with correct values and index.
- Happy path: `df.dtypes` returns correct DType per column.
- Happy path: `df.fillna(0)` replaces NA mask bits with 0 in each column.
- Happy path: `df.dropna(axis=0, how='any')` removes rows with any NA.
- Happy path: `df.astype({'col1': 'float64'})` converts column dtype.
- Edge case: zero-column DataFrame — `shape == (0, 0)`, `dtypes` is empty.
- Edge case: DataFrame with duplicate column names (pandas allows it) — both columns accessible via positional access.
- Error path: `df.iloc[10]` on a 5-row DataFrame → `IndexError`.
- Integration: `df['colA'] + df['colB']` delegates to numera, produces new column with correct values.

**Verification:**
- `ctest --test-dir build-tests -R "dataframe|series"` passes.
- Differential: `df.describe()` output matches `pd.DataFrame(...).describe()`.

---

### U5. C++ Core: Sort, Merge/Join, and Concatenate Kernels

**Goal:** Implement the performance-critical sort, merge/join (hash-join + sort-merge), and concat kernels in native C++.

**Requirements:** R2, R7

**Dependencies:** U2, U3, U4

**Files:**
- Create: `native/core/sort.hpp`
- Create: `native/core/sort.cpp`
- Create: `native/core/merge.hpp`
- Create: `native/core/merge.cpp`
- Create: `native/core/concat.hpp`
- Create: `native/core/concat.cpp`
- Test: `tests/native/sort_test.cpp`
- Test: `tests/native/merge_test.cpp`

**Approach:**
- `argsort(column, ascending, na_position)` → `int64_t[]` indices. Uses radix sort for integer/float columns, std::stable_sort for others.
- `lexsort(columns[], ascending[], na_position)` → stable integer index sort across multiple sort keys (same semantics as `DataFrame.sort_values(by=[...], ascending=[...])`).
- `merge(left_df, right_df, how, left_on, right_on)`:
  - `how='inner'|'left'|'right'|'outer'`
  - Uses hash-join for equality joins (probe table for smaller side), sort-merge for range/inequality joins.
  - Produces `(left_idx_array, right_idx_array)` row mapping, then reassembles result DataFrame.
- `concat(dfs[], axis, join, ignore_index)` — aligns columns (axis=0) or rows (axis=1), handles missing columns with NaN fill.
- All sort/merge kernels handle NA: `na_position='last'|'first'` matches pandas default.

**Patterns to follow:**
- DuckDB hash-join pattern (open addressing, linear probing, Robin Hood hash).
- pandas source `pandas/core/reshape/merge.py` for `how` semantics.

**Test scenarios:**
- Happy path: sort int column ascending — output indices produce sorted values.
- Happy path: sort with NaN in float column, `na_position='last'` — NaNs land at end.
- Happy path: inner join on int key — result has only matching rows, correct columns from both sides.
- Happy path: left join — all left rows preserved, NaN for missing right-side values.
- Happy path: outer join — union of all rows, NaN fill on both sides.
- Happy path: `concat` axis=0 — stacks rows, column union, NaN fill for missing columns.
- Edge case: join on zero matching keys (inner join) → empty DataFrame with correct schema.
- Edge case: sort 0-length column → 0-length index array, no crash.
- Error path: join key column dtype mismatch (int left, string right) → `MergeError`.

**Verification:**
- `ctest --test-dir build-tests -R "sort|merge|concat"` passes.
- Differential: `pd.merge(left, right, how='outer')` result matches pandas-ts.

---

### U6. C++ Core: GroupBy Hash-Aggregation Kernel

**Goal:** Implement the GroupBy hash-aggregation kernel: key hashing, group accumulation, and all standard aggregation functions (sum, mean, min, max, count, std, var, first, last, nunique, agg).

**Requirements:** R2, R4, R7

**Dependencies:** U2, U3, U4, U5

**Files:**
- Create: `native/core/groupby.hpp`
- Create: `native/core/groupby.cpp`
- Test: `tests/native/groupby_test.cpp`

**Approach:**
- `GroupByHandle` holds a hash table mapping `KeyTuple → vector<row_id>`.
- Key hashing: FNV-1a over typed key values (int64, float64, string intern ID).
- Each aggregation method (`sum`, `mean`, `min`, `max`, `count`, `std`, `var`, `first`, `last`, `nunique`) iterates over groups and accumulates into a result column.
- `mean` uses Welford's online algorithm for numerical stability.
- `std`/`var` match pandas default `ddof=1`.
- `nunique` uses a per-group `unordered_set`.
- `agg({'col': 'sum', 'col2': 'mean'})` — multiple aggregations per column.
- `transform` — returns a same-size result DataFrame with group values broadcast back to original row positions.
- `apply(fn)` — iterates groups, calls JS callback with group DataFrame, reassembles.
- `GroupBy.groups` — returns JS Map of key → index array.

**Patterns to follow:**
- pandas source `pandas/core/groupby/groupby.py` and `pandas/_libs/groupby.pyx`.

**Test scenarios:**
- Happy path: group by int column, `.sum()` — one row per group, correct sum.
- Happy path: group by two columns — tuple keys, correct groups formed.
- Happy path: `.agg({'a': 'sum', 'b': 'mean'})` — correct multi-column aggregation.
- Happy path: `.transform('mean')` — broadcast group mean back to original DataFrame shape.
- Happy path: `.apply(fn)` — fn receives sub-DataFrame per group, return value reassembled.
- Edge case: group by column with NA values — NA group is excluded by default (pandas `dropna=True`).
- Edge case: single-row groups — aggregations of size-1 groups are correct (mean == value, std == NaN for ddof=1).
- Edge case: empty DataFrame — groupby returns empty result with correct schema.
- Error path: aggregate function name not in registry → `ValueError`.

**Verification:**
- `ctest --test-dir build-tests -R "groupby"` passes.
- Differential: `df.groupby('key').sum()` matches `pd.DataFrame(...).groupby('key').sum()`.

---

### U7. C++ Core: Rolling, Expanding, and EWM Window Kernels

**Goal:** Implement sliding-window (Rolling), expanding-window, and exponentially weighted (EWM) aggregations at C++ speed.

**Requirements:** R2, R4, R7

**Dependencies:** U2, U4

**Files:**
- Create: `native/core/rolling.hpp`
- Create: `native/core/rolling.cpp`
- Test: `tests/native/rolling_test.cpp`

**Approach:**
- `RollingKernel(window, min_periods, center, closed)` — matches pandas `Rolling` constructor parameters exactly.
- `sum`, `mean`, `std`, `var`, `min`, `max`, `median`, `count`, `corr`, `cov`, `apply(fn)` — all implemented.
- O(n) deque-based min/max (monotonic deque).
- O(n) Welford for mean/std with `min_periods` NaN fill.
- `center=True` shifts the window forward by `window//2`.
- `closed='left'|'right'|'both'|'neither'` — controls edge inclusivity.
- Expanding: same interface but window grows from index 0 to current position.
- EWM: `alpha`, `span`, `halflife`, `com` parameter conversion matches pandas. Adjust/non-adjust modes. `ignore_na` flag.

**Patterns to follow:**
- pandas source `pandas/core/window/rolling.py` and `pandas/_libs/window/`.

**Test scenarios:**
- Happy path: `rolling(3).mean()` on `[1,2,3,4,5]` → `[NaN, NaN, 2, 3, 4]`.
- Happy path: `rolling(3, min_periods=1).mean()` → `[1, 1.5, 2, 3, 4]`.
- Happy path: `rolling(3, center=True).sum()` — centered window NaN fill matches pandas.
- Happy path: `expanding().sum()` → cumulative sum with NaN fill for first window.
- Happy path: `ewm(span=3).mean()` — matches pandas EWM to float64 precision.
- Edge case: `rolling(3).mean()` on 2-element Series → all NaN (window larger than data).
- Edge case: NA values in column — `min_periods` determines whether result is NaN.
- Error path: `window <= 0` → `ValueError`.

**Verification:**
- Differential: `Series.rolling(3).mean()` output matches pandas within float64 tolerance.

---

### U8. C++ Core: String Operations and Datetime Arithmetic

**Goal:** Implement `str` accessor operations on string columns (`.str.contains`, `.str.replace`, `.str.split`, `.str.lower/upper`, etc.) and datetime64/timedelta64 arithmetic and `.dt` accessor.

**Requirements:** R2, R5, R7

**Dependencies:** U2, U4

**Files:**
- Create: `native/core/strings.hpp`
- Create: `native/core/strings.cpp`
- Create: `native/core/datetime.hpp`
- Create: `native/core/datetime.cpp`
- Test: `tests/native/strings_test.cpp`
- Test: `tests/native/datetime_test.cpp`

**Approach:**
- String column: dictionary-encoded — `int32` index buffer + interned string pool (`unordered_map<int32_t, string>`). Operations like `.lower()` decode, transform, re-encode.
- `str.contains(pattern, regex=True)` — uses C++ `<regex>` for regex mode, `string::find` for literal mode.
- `str.split(sep, expand=True)` — returns a new DataFrame when `expand=True`.
- `str.pad`, `str.strip`, `str.replace`, `str.extract` (regex groups → DataFrame columns).
- Datetime64: stored as `int64_t` nanoseconds since Unix epoch (matching pandas `datetime64[ns]`).
- `dt` accessor: `.year`, `.month`, `.day`, `.hour`, `.minute`, `.second`, `.nanosecond`, `.dayofweek`, `.dayofyear`, `.quarter`, `.week`.
- Datetime arithmetic: `datetime64 + timedelta64 → datetime64`, `datetime64 - datetime64 → timedelta64`.
- Timezone support: UTC offset stored as metadata; local conversions via a vendored tz database (Howard Hinnant `date` library or `std::chrono` C++20).

**Patterns to follow:**
- pandas source `pandas/core/strings/accessor.py` and `pandas/_libs/tslibs/`.

**Test scenarios:**
- Happy path: `Series(['Hello','World']).str.lower()` → `['hello', 'world']`.
- Happy path: `Series(['abc', 'bcd']).str.contains('b')` → `[True, True]`.
- Happy path: `Series(['a,b', 'c,d']).str.split(',', expand=True)` → 2-column DataFrame.
- Happy path: datetime Series `.dt.year` returns correct year for each element.
- Happy path: `datetime_series + pd.Timedelta('1D')` → each date shifted by one day.
- Edge case: `str.contains` with `NA` values — returns `NA` for those positions (pandas behaviour).
- Edge case: datetime with `NaT` — `.dt.year` on NaT position returns `NaT` / NA.
- Error path: `.str` accessor on non-string column → `AttributeError`.

**Verification:**
- Differential: `Series.str.contains(pattern)` result matches pandas.

---

### U9. NAPI Bindings Layer

**Goal:** Expose all C++ core objects to JavaScript via Node-API: `DataFrameWrap`, `SeriesWrap`, `IndexWrap`, `GroupByWrap`, `RollingWrap`, `IOWrap`. Mirror numera's binding pattern exactly.

**Requirements:** R7, R9, R10

**Dependencies:** U2, U3, U4, U5, U6, U7, U8

**Files:**
- Create: `native/bindings/addon.cpp`
- Create: `native/bindings/dataframe_wrap.hpp`
- Create: `native/bindings/dataframe_wrap.cpp`
- Create: `native/bindings/series_wrap.hpp`
- Create: `native/bindings/series_wrap.cpp`
- Create: `native/bindings/index_wrap.hpp`
- Create: `native/bindings/index_wrap.cpp`
- Create: `native/bindings/groupby_wrap.hpp`
- Create: `native/bindings/groupby_wrap.cpp`
- Create: `native/bindings/rolling_wrap.hpp`
- Create: `native/bindings/rolling_wrap.cpp`
- Create: `native/bindings/io_wrap.hpp`
- Create: `native/bindings/io_wrap.cpp`
- Create: `native/bindings/errors.hpp`
- Test: `tests/unit/bindings.test.ts`

**Approach:**
- Each `*Wrap` is a `Napi::ObjectWrap<T>` that holds a C++ object by value.
- Finalizers are basic (no JS calls, no allocations) — `NODE_ADDON_API_REQUIRE_BASIC_FINALIZERS` enforced.
- Every entry point wrapped by `translate_errors(env, [&]{ ... })` that maps each `PandasTsError` subclass to the corresponding JS error class registered in `errors.ts`.
- Numeric column data is returned to JS as `Napi::ArrayBuffer` backed by the column's native buffer (zero-copy where possible; the column's `shared_ptr` keeps the buffer alive via the ArrayBuffer's external deleter).
- DataFrame creation from JS: accepts `{columns: {name: TypedArray}, index?: TypedArray}` — constructs C++ columns directly from the TypedArrays without a copy.
- `DataFrameWrap::ToArrow()` — returns an Arrow IPC buffer (uses Apache Arrow C++ lib) for interop.

**Patterns to follow:**
- `../numera/native/bindings/` — `NDArrayWrap`, `translate_errors`, addon init pattern.

**Test scenarios:**
- Happy path: `new DataFrame({a: Int32Array([1,2,3])})` → accessible from JS, `shape == [3,1]`.
- Happy path: result buffer from `.sum()` is a zero-copy `Float64Array` backed by native memory.
- Happy path: `translate_errors` maps `ValueError` in C++ to a JS `ValueError` with the correct message.
- Integration: DataFrame created from JS TypedArrays, `groupby().sum()` result is a new DataFrame accessible from JS with correct values.
- Error path: GC of a DataFrame JS object drops the `shared_ptr` reference — no double-free (verify with ASan run).

**Verification:**
- `pnpm test:asan` (C++ ASan+UBSan run) exits 0.
- `pnpm test:native` CTest passes.

---

### U10. TypeScript API: Core Types, dtype, errors, NA

**Goal:** Implement the TypeScript-level `dtype` objects, `NA`/`NaN`/`NaT` constants, typed error classes, and the addon loader — the foundation of the public TypeScript surface.

**Requirements:** R5, R9

**Dependencies:** U9

**Files:**
- Modify: `src/index.ts` (replace stub with real exports)
- Create: `src/addon.ts`
- Create: `src/dtype.ts`
- Create: `src/errors.ts`
- Create: `src/na.ts`
- Test: `tests/unit/dtype.test.ts`
- Test: `tests/unit/errors.test.ts`

**Approach:**
- `src/addon.ts` mirrors `../numera/packages/numera/src/addon.ts`: tries `PANDAS_TS_ADDON_PATH` env var, then prebuild in `prebuilds/<platform>-<arch>/pandas_ts.node`, then local `build/Release/`.
- `DType` objects: `pd.int8`, `pd.float64`, `pd.bool_`, `pd.string_`, `pd.datetime64`, etc. — each is a `{ name: string; itemsize: number; kind: DTypeKind; }` object.
- Error classes: `PandasTsError`, `ValueError`, `TypeError`, `IndexError`, `MergeError`, `OutOfBoundsDatetime` — extend `Error`, carry `message` matching pandas format.
- `NA`: a singleton `pd.NA` (pandas NA object semantics — propagates through bool ops).
- `NaT`: a singleton `pd.NaT`.

**Patterns to follow:**
- `../numera/packages/numera/src/dtype.ts`
- `../numera/packages/numera/src/errors.ts`
- `../numera/packages/numera/src/addon.ts`

**Test scenarios:**
- Happy path: `pd.float64.name === 'float64'`, `pd.float64.itemsize === 8`.
- Happy path: `pd.NA` propagates — `pd.NA + 1 === pd.NA`, `pd.NA === pd.NA` is `false` (like Python `pd.NA`).
- Happy path: `new ValueError('msg') instanceof PandasTsError` is `true`.
- Error path: loading addon on unsupported platform → throws `NotImplementedError` with platform info.

**Verification:**
- `pnpm typecheck` exits 0.
- `pnpm test` (vitest dtype + errors tests) pass.

---

### U11. TypeScript API: Series and DataFrame Classes

**Goal:** Implement the full `Series` and `DataFrame` TypeScript classes, wrapping the native handles and exposing every public pandas method.

**Requirements:** R1, R2, R5, R9

**Dependencies:** U10

**Files:**
- Create: `src/series.ts`
- Create: `src/dataframe.ts`
- Create: `src/index/range_index.ts`
- Create: `src/index/int64_index.ts`
- Create: `src/index/float64_index.ts`
- Create: `src/index/string_index.ts`
- Create: `src/index/datetime_index.ts`
- Create: `src/index/timedelta_index.ts`
- Create: `src/index/multi_index.ts`
- Test: `tests/unit/series.test.ts`
- Test: `tests/unit/dataframe.test.ts`
- Test: `tests/unit/index.test.ts`
- Test: `tests/differential/series_diff.test.ts`
- Test: `tests/differential/dataframe_diff.test.ts`

**Approach:**
- `DataFrame` constructor: `new DataFrame(data, {index?, columns?, dtype?})` — `data` can be plain object of arrays, array of objects, 2D array, numera NDArray, TypedArray map. Constructor dispatches to NAPI.
- All accessor properties (`.shape`, `.dtypes`, `.index`, `.columns`, `.values`, `.T`) are getters backed by NAPI calls.
- Method chaining: all methods return a new `DataFrame`/`Series` (immutable-result semantics matching pandas).
- `.iloc` and `.loc` are `ILocIndexer` / `LocIndexer` objects with `__getitem__` emulated via a `Proxy`.
- `.str` accessor returns a `StringAccessor` (backed by NAPI string ops).
- `.dt` accessor returns a `DatetimeAccessor`.
- `.plot` accessor returns a `PlotAccessor` (data-prep only, no rendering).
- Arithmetic operators: `add`, `sub`, `mul`, `div`, `mod`, `pow`, `eq`, `ne`, `lt`, `le`, `gt`, `ge` as named methods (JS does not support operator overloading).
- All methods carry full JSDoc with `@param` and `@example` matching pandas docs.

**Patterns to follow:**
- `../numera/packages/numera/src/ndarray.ts` for the TypeScript class wrapper pattern.
- pandas 2.x API reference for every method signature.

**Test scenarios:**
- Happy path: `new DataFrame({a: [1,2,3], b: [4,5,6]}).shape` → `[3, 2]`.
- Happy path: `df.dtypes` → `{a: 'int64', b: 'int64'}`.
- Happy path: `df.iloc[{rows: [0,2], cols: [0]}]` → 2-row, 1-column DataFrame.
- Happy path: `df.loc[{rows: 'label'}]` on string-indexed DataFrame → correct row.
- Happy path: `df.fillna(0)` — NA values replaced, dtype preserved.
- Happy path: `df.groupby('a').sum()` → returns grouped DataFrame.
- Happy path: `df.sort_values('a')` → sorted by column `a`.
- Happy path: `df.merge(df2, {how: 'inner', on: 'key'})` → joined result.
- Happy path: `series.str.lower()` → lowercased string Series.
- Happy path: `series.dt.year` → integer Series of years.
- Edge case: `new DataFrame({})` → `shape == [0, 0]`.
- Edge case: `df.drop(['a'], {axis: 1})` on non-existent column → `KeyError`.
- Integration: `df['a'].sum()` delegates to numera ndarray sum under the hood, correct result.
- Covers: differential test — `df.describe()` matches pandas output within tolerance.

**Verification:**
- All vitest unit tests pass.
- `pnpm test:diff` (differential tests against pandas) passes.

---

### U12. TypeScript API: GroupBy, Resample, Rolling, Expanding, EWM

**Goal:** Implement the TypeScript API surface for `DataFrameGroupBy`, `SeriesGroupBy`, `Resample`, `Rolling`, `Expanding`, and `EWM`.

**Requirements:** R2, R4, R9

**Dependencies:** U6, U7, U11

**Files:**
- Create: `src/groupby/dataframe_groupby.ts`
- Create: `src/groupby/series_groupby.ts`
- Create: `src/resample.ts`
- Create: `src/window/rolling.ts`
- Create: `src/window/expanding.ts`
- Create: `src/window/ewm.ts`
- Test: `tests/unit/groupby.test.ts`
- Test: `tests/unit/rolling.test.ts`
- Test: `tests/differential/groupby_diff.test.ts`
- Test: `tests/differential/rolling_diff.test.ts`

**Approach:**
- `df.groupby(by, {axis?, level?, as_index?, sort?, dropna?})` → `DataFrameGroupBy`. `by` can be a string, array of strings, or a function.
- `DataFrameGroupBy` exposes: `.sum()`, `.mean()`, `.min()`, `.max()`, `.count()`, `.std()`, `.var()`, `.first()`, `.last()`, `.nunique()`, `.agg(spec)`, `.transform(fn)`, `.apply(fn)`, `.filter(fn)`, `.pipe(fn)`, `.groups`, `.ngroups`, `.size()`, `.get_group(key)`.
- `Resample` wraps a `DatetimeIndex` group-by with time-bucket semantics. `df.resample('1D')` → daily. Frequencies: `D`, `H`, `T`, `S`, `W`, `M`, `Q`, `A` and their multiples.
- `Rolling`, `Expanding`, `EWM` wrap native window handles. All aggregation methods return a DataFrame/Series.

**Patterns to follow:**
- pandas source `pandas/core/groupby/` and `pandas/core/resample.py`.

**Test scenarios:**
- Happy path: `df.groupby('key').mean()` → correct mean per group.
- Happy path: `.agg({a: 'sum', b: ['mean', 'std']})` → multi-level column result.
- Happy path: `.transform('mean')` → same shape as input, group mean broadcast.
- Happy path: `series.rolling(3, {minPeriods: 1}).mean()` → matches pandas.
- Happy path: `series.ewm({span: 3}).mean()` → matches pandas to float64 precision.
- Happy path: `df.resample('1D').sum()` → daily aggregation.
- Edge case: `groupby` with `dropna=false` — NA key group included.
- Edge case: `resample` with irregular time index — gaps filled as NaN.
- Integration: `df.groupby('key').apply(subdf => subdf.sort_values('val'))` reassembles correctly.

**Verification:**
- Differential tests against pandas groupby, resample, rolling, ewm pass.

---

### U13. IO Layer: CSV, JSON, Parquet, Excel, SQL, Feather, HDF, Pickle, HTML, XML

**Goal:** Implement all `read_*` and `to_*` IO functions.

**Requirements:** R3, R7

**Dependencies:** U11

**Files:**
- Create: `native/core/io/csv.hpp` / `.cpp`
- Create: `native/core/io/json.hpp` / `.cpp`
- Create: `native/core/io/parquet.hpp` / `.cpp` (uses Apache Arrow C++ lib)
- Create: `native/core/io/feather.hpp` / `.cpp` (Arrow IPC)
- Create: `src/io/csv.ts`
- Create: `src/io/json.ts`
- Create: `src/io/parquet.ts`
- Create: `src/io/excel.ts`
- Create: `src/io/sql.ts`
- Create: `src/io/feather.ts`
- Create: `src/io/hdf.ts`
- Create: `src/io/pickle.ts`
- Create: `src/io/html.ts`
- Create: `src/io/xml.ts`
- Test: `tests/unit/io_csv.test.ts`
- Test: `tests/unit/io_json.test.ts`
- Test: `tests/unit/io_parquet.test.ts`

**Approach:**
- `read_csv(filepath_or_buffer, options)` — SIMD-accelerated C++ CSV parser (handles quoted fields, custom separators, header row, dtype inference, NA values, encoding). Parameters match pandas `pd.read_csv` exactly (>60 parameters).
- `read_json(filepath_or_buffer, options)` — supports `orient` parameter: `records`, `split`, `index`, `columns`, `values`, `table`. C++ JSON parser.
- `read_parquet` / `to_parquet` — wraps Apache Arrow C++ library (vendored or linked). Supports column selection, filters, row groups.
- `read_excel` / `to_excel` — uses a JS library (e.g., `xlsx` or `exceljs`) via async call from TS layer; not performance-critical.
- `read_sql(query, connection)` — accepts a connection object conforming to a `Connection` interface (compatible with `pg`, `mysql2`, `better-sqlite3`).
- `read_feather` / `to_feather` — Arrow IPC format. Fastest IO format.
- `read_hdf` / `to_hdf` — HDF5 via a Node.js HDF5 binding (`hdf5.node`).
- `read_pickle` / `to_pickle` — pandas pickle format compatibility. Uses Python subprocess in dev; a custom binary reader for the most common pickle opcodes at runtime.
- `read_html` — parses `<table>` elements from HTML string. Uses a JS HTML parser.
- `read_xml` — XPath-based column extraction.
- All `read_*` functions return `DataFrame`. All `to_*` functions return `void` or `Promise<void>`.

**Patterns to follow:**
- pandas source `pandas/io/parsers/readers.py`, `pandas/io/json/`, `pandas/io/parquet.py`.

**Test scenarios:**
- Happy path: `read_csv` round-trip — write CSV, read back, DataFrame matches original.
- Happy path: `read_csv` with custom `sep`, `header`, `na_values`, `dtype` params.
- Happy path: `read_json` with each `orient` value.
- Happy path: `read_parquet` round-trip with mixed dtypes.
- Happy path: `read_excel` reads `.xlsx` file, returns correct DataFrame.
- Edge case: CSV with quoted newlines in fields — parser handles correctly.
- Edge case: Parquet with nullable integer column — NA mask preserved.
- Error path: `read_csv` on non-existent file → `FileNotFoundError`.
- Error path: `read_csv` with unsupported encoding → `ValueError`.

**Verification:**
- Differential: CSV read/write round-trip matches pandas output.
- Parquet files written by pandas are readable by pandas-ts and vice versa.

---

### U14. TypeScript API: Categorical, Period, Interval, Sparse Arrays

**Goal:** Implement `Categorical`, `Period`, `Interval`, and `CategoricalIndex` types.

**Requirements:** R1, R5

**Dependencies:** U10, U11

**Files:**
- Create: `src/categorical.ts`
- Create: `src/period.ts`
- Create: `src/interval.ts`
- Create: `src/arrays/masked_array.ts`
- Create: `src/arrays/string_array.ts`
- Create: `src/arrays/arrow_array.ts`
- Test: `tests/unit/categorical.test.ts`
- Test: `tests/unit/period.test.ts`

**Approach:**
- `Categorical`: wraps dictionary-encoded string column (same as `strings.hpp` intern pool). Exposes `.categories`, `.codes`, `.ordered`, `.rename_categories()`, `.reorder_categories()`, `.add_categories()`, `.remove_categories()`, `.set_categories()`.
- `CategoricalDtype`: `{categories: Index, ordered: boolean}`.
- `Period`: a datetime-like with a specific frequency. Arithmetic: `Period + n → Period`.
- `Interval`: `{left, right, closed}`. `IntervalIndex` from array of intervals.
- `BooleanArray`, `IntegerArray` (nullable integer extension arrays): backed by `(values_buffer, mask_buffer)` pair.
- `StringDtype` extension array: same dictionary-encoded column.

**Patterns to follow:**
- pandas source `pandas/core/arrays/categorical.py`, `pandas/core/arrays/period.py`.

**Test scenarios:**
- Happy path: `Categorical(['a','b','a']).value_counts()` → `{a:2, b:1}`.
- Happy path: `Categorical` preserves category order.
- Happy path: `Period('2024-01', freq='M') + 3` → `Period('2024-04', freq='M')`.
- Edge case: assigning a value not in categories → `ValueError` (when `ordered=True`).

**Verification:**
- Differential: `pd.Categorical` operations match pandas-ts.

---

### U15. CUDA GPU Acceleration Layer

**Goal:** Implement CUDA kernels for sort, groupby, join, rolling, and element-wise ops, gated behind `PANDAS_TS_CUDA=ON`. TypeScript API is identical; GPU is selected automatically when available and beneficial.

**Requirements:** R8

**Dependencies:** U4, U5, U6, U7, U9

**Files:**
- Create: `native/cuda/CMakeLists.txt`
- Create: `native/cuda/sort.cu`
- Create: `native/cuda/groupby.cu`
- Create: `native/cuda/join.cu`
- Create: `native/cuda/rolling.cu`
- Create: `native/cuda/element_wise.cu`
- Create: `native/cuda/gpu_memory.hpp` / `.cu` (GPU column buffer, cudaMalloc RAII)
- Create: `src/gpu.ts` (TypeScript: `pd.gpu.isAvailable()`, `pd.gpu.info()`)
- Test: `tests/unit/gpu.test.ts`

**Approach:**
- Each C++ kernel function has a `_cuda` suffix. A dispatch table in each module checks `cuda_available()` at runtime; if true and column size > threshold (e.g., 100k rows), routes to the CUDA kernel, otherwise to the CPU kernel.
- `gpu_memory.hpp`: `GpuColumn` = RAII wrapper around `cudaMalloc` + `cudaMemcpy`. Column data is copied to device on first GPU op, cached until evicted or mutated.
- Sort: `thrust::stable_sort_by_key` on device.
- GroupBy: `thrust::sort` + `thrust::reduce_by_key` pattern.
- Rolling: custom `__global__` kernel for sliding window (Thrust doesn't directly support it).
- Element-wise: `thrust::transform`.
- Join: radix-based hash join on GPU using CUDA cooperative groups.
- `pd.gpu.isAvailable()` → NAPI call to `cuda_available()`. `pd.gpu.info()` → returns device name, memory, compute capability.
- When CUDA is not compiled in, `pd.gpu.isAvailable()` always returns `false`.

**Patterns to follow:**
- NVIDIA RAPIDS cuDF kernel patterns (open source reference, not a dependency).
- Thrust library documentation.

**Test scenarios:**
- Happy path (CUDA build): `pd.gpu.isAvailable()` returns `true` on a CUDA-capable machine.
- Happy path (CUDA build): `df.sort_values('col')` on 1M-row DataFrame — result identical to CPU path.
- Happy path (CUDA build): `df.groupby('key').sum()` on 1M rows — result matches CPU path.
- Happy path (no CUDA build): `pd.gpu.isAvailable()` returns `false`, all ops fall through to CPU.
- Edge case: GPU out-of-memory — fallback to CPU path, no crash.
- Integration: CPU and GPU paths produce bit-identical results for integer operations; float ops within `1e-10` relative tolerance.

**Verification:**
- GPU tests are tagged `@gpu` and skipped unless `PANDAS_TS_RUN_GPU_TESTS=1` env var is set.
- Benchmark: GPU sort of 10M-row int64 column must be ≥ 5× faster than CPU sort.

---

### U16. WASM Fallback Build

**Goal:** Compile the C++ core to WebAssembly via Emscripten, providing a fallback for browsers, Deno, and edge runtimes that cannot load native addons.

**Requirements:** R10

**Dependencies:** U2, U4, U5

**Files:**
- Create: `native/wasm/CMakeLists.txt`
- Create: `native/wasm/bindings_wasm.cpp` (Emscripten bindings, not NAPI)
- Create: `src/backends/wasm.ts` (WASM loader, mirrors addon.ts)
- Modify: `src/addon.ts` (add WASM fallback branch after NAPI failure)
- Test: `tests/unit/wasm_smoke.test.ts`

**Approach:**
- Emscripten compiles `native/core/` to `dist/wasm/pandas_ts.wasm` + `pandas_ts_wasm.js` glue.
- `bindings_wasm.cpp` uses `EMSCRIPTEN_BINDINGS` (embind) instead of NAPI.
- `src/addon.ts` detects environment: Node.js (tries NAPI first, WASM fallback), browser (WASM only).
- WASM build excludes IO modules that require filesystem (Parquet, HDF, Excel) — those fall back to a pure-JS implementation or throw `NotImplementedError`.
- WASM target is a separate npm export: `pandas-ts/wasm`.

**Test scenarios:**
- Happy path: in a simulated browser env (jsdom), `new DataFrame({a:[1,2,3]}).sum()` returns correct value via WASM path.
- Edge case: NAPI load failure in Node → automatic WASM fallback, no unhandled rejection.

**Verification:**
- `pnpm build:wasm` produces `dist/wasm/pandas_ts.wasm`.
- WASM smoke test passes in jsdom environment.

---

### U17. Differential Test Suite and API Coverage Tooling

**Goal:** Build the complete differential testing infrastructure (every method compared against real pandas) and the API coverage tracker (mirrors numera's `api:coverage` tooling).

**Requirements:** R11

**Dependencies:** U11, U12, U13

**Files:**
- Create: `python/generators/generate_cases.py`
- Create: `python/run_pandas.py` (subprocess driver that runs pandas and emits JSON)
- Create: `tests/differential/runner.ts` (vitest helper that calls Python and compares)
- Create: `scripts/api-coverage.mjs`
- Create: `COMPATIBILITY.md` (auto-generated output)
- Test: `tests/differential/*.diff.test.ts` (one file per module)

**Approach:**
- `generate_cases.py`: for every DataFrame/Series method in the pandas API, generates a set of JSON test cases: `{method, args, kwargs, input_df_json, expected_output_json}`.
- `runner.ts`: `diffTest(method, input, args)` function that spawns `python3 run_pandas.py` with the input, captures the JSON output, calls the pandas-ts equivalent, and deep-compares results (with float tolerance `1e-10` for floating-point columns).
- `scripts/api-coverage.mjs`: reads a `PANDAS_API.json` (generated from pandas `__all__` + attribute introspection) and cross-references against pandas-ts exports. Reports `N/M` coverage and per-method status (✅ implemented, 🟡 partial, ⬜ not started).
- `pnpm api:check` fails CI if coverage drops below a threshold.
- Differential test output format matches numera's (JSON cases in `tests/differential/cases/`, replayed by vitest).

**Patterns to follow:**
- `../numera/python/generators/generate_cases.py`
- `../numera/scripts/api-coverage.mjs`
- `../numera/vitest.diff.config.ts`

**Test scenarios:**
- Happy path: `pnpm test:diff` runs all differential tests, all pass.
- Happy path: `pnpm api:coverage` prints a coverage percentage.
- Edge case: Python subprocess unavailable → differential tests are skipped with a clear warning, unit tests still pass.

**Verification:**
- `pnpm api:check` passes (coverage threshold met).
- `pnpm test:diff` exits 0.

---

### U18. Benchmark Suite

**Goal:** Implement a benchmark suite for every hot-path operation, with automated comparison against Python pandas, producing a geo-mean speed ratio.

**Requirements:** R12

**Dependencies:** U5, U6, U7, U13

**Files:**
- Create: `benchmarks/pandas_ts/sort.bench.mjs`
- Create: `benchmarks/pandas_ts/groupby.bench.mjs`
- Create: `benchmarks/pandas_ts/merge.bench.mjs`
- Create: `benchmarks/pandas_ts/rolling.bench.mjs`
- Create: `benchmarks/pandas_ts/io_csv.bench.mjs`
- Create: `benchmarks/pandas_ts/creation.bench.mjs`
- Create: `benchmarks/pandas_ts/suite.bench.mjs` (runs all)
- Create: `benchmarks/pandas/suite_bench.py` (equivalent pandas benchmarks)
- Create: `benchmarks/compare.mjs` (reads both results, prints ratio table)
- Update: `PERFORMANCE.md`

**Approach:**
- Benchmark harness mirrors numera's: `node --expose-gc benchmarks/pandas_ts/suite.bench.mjs`.
- Each benchmark reports median wall time over 50 iterations with 5 warmup iterations.
- `compare.mjs` reads JSON output from both suites and prints a table: operation | pandas-ts time | pandas time | ratio.
- Geo-mean ratio is reported at the bottom.
- GPU benchmarks are in a separate file, skipped unless `PANDAS_TS_RUN_GPU_TESTS=1`.

**Patterns to follow:**
- `../numera/benchmarks/nativpy/suite.bench.mjs`
- `../numera/benchmarks/numpy/suite_bench.py`
- `../numera/benchmarks/compare.mjs`

**Test scenarios:**
- Happy path: `pnpm bench` completes without error.
- Happy path: `pnpm bench:pandas` (Python) completes.
- Happy path: `pnpm bench:compare` prints a ratio table with geo-mean.

**Verification:**
- All benchmarks run without error.
- Geo-mean ratio > 0.5× (within 2× of pandas) for pure CPU operations at initial release. Target > 1× (faster than pandas) for sort and groupby after SIMD optimisation.

---

## System-Wide Impact

- **Interaction graph**: IO functions that return DataFrames flow through the NAPI binding layer; arithmetic on DataFrame columns dispatches to `@cyfora/numera` NDArrays, which in turn call their own C++ core. Both native addons must coexist in the same Node.js process without symbol collisions — ensure separate `NODE_MODULE_NAME` values.
- **Error propagation**: All C++ errors surface as typed JS errors via `translate_errors`. TypeScript methods validate arguments before calling NAPI, throwing JS errors directly for obviously wrong inputs (avoids a round-trip to C++ for simple checks).
- **State lifecycle risks**: Column buffers are reference-counted via `shared_ptr`. A DataFrame's JS wrapper holds a reference; column slices hold a reference to the same buffer. If a user retains a slice, the original buffer stays alive — this is intentional (views, like pandas). Document this behaviour.
- **API surface parity**: Every pandas top-level function (`pd.concat`, `pd.merge`, `pd.get_dummies`, `pd.cut`, `pd.qcut`, `pd.pivot_table`, `pd.melt`, `pd.crosstab`, etc.) must also appear as a top-level export of `pandas-ts`.
- **Integration coverage**: Unit tests alone will not prove: (a) correct NA propagation through a chain of operations, (b) correct index alignment when two DataFrames with different indices are added together, (c) correct GroupBy → Rolling composition. These need integration tests.
- **Unchanged invariants**: `@cyfora/numera` is not modified by this project. The pandas-ts C++ core links against numera's C++ static library (`nativpy_core`) as a build-time dependency only; it does not expose any numera symbols through its own NAPI surface.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| pandas 2.x API surface is vast (~1060 callables by numera's own inventory count) | Phase delivery: implement the 80/20 set first (DataFrame/Series core, groupby, merge, sort, rolling, CSV/JSON/Parquet IO), then systematically expand using `api:coverage` gating. |
| CUDA build complexity (nvcc + cmake, driver versioning) | Fully optional behind `PANDAS_TS_CUDA=ON`. CPU path is complete and default. CUDA tests are skipped unless `PANDAS_TS_RUN_GPU_TESTS=1`. |
| numera `@cyfora/numera` API changes breaking pandas-ts | Pin to a specific numera version in `package.json`. Upgrade intentionally. |
| Apache Arrow C++ library (Parquet) adds significant build complexity | Vendor a specific commit of Arrow C++ in `third_party/`. Mirror how numera vendors pocketfft. |
| NAPI symbol collisions between numera and pandas-ts in the same process | Use distinct `NODE_MODULE_NAME` and distinct `.node` filenames. |
| pandas pickle format is complex / changes across versions | Implement read-only support for common pickle opcodes. Defer write-round-trip parity. |
| Float precision differences between C++ and Python | Differential tests use tolerance (`1e-10` relative); document known differences in COMPATIBILITY.md. |
| String intern pool memory growth for high-cardinality string columns | Document: high-cardinality columns should use `object` dtype (non-interned). Provide a `StringDtype(storage='python')` fallback. |

---

## Documentation / Operational Notes

- `COMPATIBILITY.md` is auto-generated by `scripts/api-coverage.mjs` — do not edit manually.
- `DECISIONS.md` records all architectural decisions as D-NNN entries (mirrors numera pattern). Start at D-001.
- Each new behaviour that differs from pandas must get a `COMPATIBILITY.md` entry (format: function name, what differs, why).
- Prebuilds are built manually by a maintainer on macOS (arm64 + x64 local builds) and Linux (in Docker `manylinux_2_28` containers). Mirrors numera's release process exactly.
- No CI release workflow — `pnpm release` is the single release path.

---

## API Coverage Gap Analysis

> Audited against **pandas 3.0.6** on 2026-10-01. Numbers are method/attribute counts across all public classes and accessors. This section is the authoritative gap register — every item here must be resolved by adding it to an implementation unit or explicitly deferring it.

### Coverage Summary

| Component | Total | In Plan | % | Status |
|-----------|------:|--------:|--:|--------|
| DataFrame | 203 | 186 | 92% | 🟡 17 gaps |
| Series | 203 | 196 | 97% | 🟡 7 gaps |
| Index | 91 | 70 | 77% | 🟡 21 gaps |
| MultiIndex | 108 | 80 | 74% | 🟡 28 gaps |
| DataFrameGroupBy | 64 | 19 | 30% | 🔴 45 gaps |
| Rolling | 24 | 13 | 54% | 🔴 11 gaps |
| Expanding | 24 | 20 | 83% | 🟡 4 gaps |
| EWM | 11 | 8 | 73% | 🟡 3 gaps |
| Resampler | 34 | 25 | 74% | 🟡 9 gaps |
| str accessor | 57 | 15 | 26% | 🔴 42 gaps |
| dt accessor | 56 | 14 | 25% | 🔴 42 gaps |
| cat accessor | 11 | 11 | 100% | ✅ |
| Categorical | 58 | 40 | 69% | 🟡 18 gaps |
| Period | 27 | 20 | 74% | 🟡 7 gaps |
| Interval | 11 | 11 | 100% | ✅ |
| Timestamp | 75 | 50 | 67% | 🟡 25 gaps |
| Timedelta | 22 | 15 | 68% | 🟡 7 gaps |
| DateOffset | 18 | 10 | 56% | 🟡 8 gaps |
| Top-level functions | 62 | 25 | 40% | 🔴 37 gaps |
| Top-level classes (exports) | 40 | 25 | 62% | 🟡 15 gaps |
| `pandas.errors` module | 50 | 8 | 16% | 🔴 42 gaps |
| `pandas.tseries.offsets` | 47 | 5 | 11% | 🔴 42 gaps |
| **TOTAL** | **1,296** | **866** | **67%** | 🔴 **430 gaps** |

**The original plan covered ~67% of the full pandas API surface.** The sections below enumerate every gap and assign each to a new implementation unit (U19–U27) or mark it as a documented deviation.

---

### Gap Register

#### G1 — DataFrame gaps (17 methods)

Missing from U11: `asfreq`, `asof`, `assign`, `at_time`, `attrs`, `between_time`, `boxplot`, `first_valid_index`, `from_arrow`, `from_dict`, `from_records`, `hist`, `isetitem`, `sparse`, `to_iceberg`, `to_orc`, `to_stata`.

→ Added to **U20** (DataFrame/Series completeness pass).

#### G2 — Series gaps (7 methods)

Missing from U11: `asfreq`, `asof`, `at_time`, `attrs`, `between_time`, `from_arrow`, `sparse`.

→ Added to **U20**.

#### G3 — Index gaps (21 methods)

Missing from U3/U11: `get_indexer`, `get_indexer_for`, `get_indexer_non_unique`, `get_loc`, `get_slice_bound`, `asof`, `asof_locs`, `slice_indexer`, `slice_locs`, `putmask`, `identical`, `is_`, `inferred_type`, `nlevels`, `shift`, `diff`, `fillna`, `infer_objects`, `to_flat_index`, `view`, `set_names`.

→ Added to **U21** (Index completeness pass).

#### G4 — MultiIndex gaps (28 methods)

Missing from U3: `equal_levels`, `get_loc_level`, `get_locs`, `set_codes`, `set_levels`, `remove_unused_levels`, `levshape`, `codes`, `levels` (property), plus all Index gaps above inherited by MultiIndex.

→ Added to **U21**.

#### G5 — GroupBy gaps (45 methods) 🔴 Critical

Missing from U6: `aggregate`, `all`, `any`, `bfill`, `boxplot`, `corr`, `corrwith`, `cov`, `cumcount`, `cummax`, `cummin`, `cumprod`, `cumsum`, `describe`, `diff`, `ewm`, `expanding`, `ffill`, `head`, `hist`, `idxmax`, `idxmin`, `indices`, `keys`, `kurt`, `level`, `median`, `ndim`, `ngroup`, `nth`, `ohlc`, `pct_change`, `plot`, `prod`, `quantile`, `rank`, `resample`, `rolling`, `sample`, `sem`, `shift`, `skew`, `tail`, `take`, `value_counts`.

→ Added to **U22** (GroupBy completeness pass).

#### G6 — Rolling/Expanding/EWM gaps (15 methods)

Rolling missing: `exclusions`, `first`, `kurt`, `last`, `ndim`, `nunique`, `pipe`, `quantile`, `rank`, `sem`, `skew`.
Expanding missing: `first`, `last`, `nunique`, `pipe`.
EWM missing: `online`, `corr`, `cov` (partial).

→ Added to **U22**.

#### G7 — Resampler gaps (9 methods)

Missing from U12: `nearest`, `ohlc`, `interpolate`, `indices`, `get_group` (on Resampler), `level`, `keys`, `exclusions`, `ndim`.

→ Added to **U22**.

#### G8 — str accessor gaps (42 methods) 🔴 Critical

Missing from U8: `capitalize`, `casefold`, `cat`, `center`, `decode`, `encode`, `extractall`, `findall`, `get`, `get_dummies`, `index` (str.index), `isalnum`, `isalpha`, `isascii`, `isdecimal`, `isdigit`, `islower`, `isnumeric`, `isspace`, `istitle`, `isupper`, `join`, `ljust`, `lstrip`, `normalize`, `partition`, `removeprefix`, `removesuffix`, `repeat`, `rfind`, `rindex`, `rjust`, `rpartition`, `rsplit`, `rstrip`, `slice`, `slice_replace`, `swapcase`, `title`, `translate`, `wrap`, `zfill`.

→ Added to **U23** (str/dt accessor completeness pass).

#### G9 — dt accessor gaps (42 methods) 🔴 Critical

Missing from U8: `as_unit`, `asfreq`, `ceil`, `components`, `date`, `day_name`, `day_of_week`, `day_of_year`, `days`, `days_in_month`, `daysinmonth`, `end_time`, `floor`, `freq`, `is_leap_year`, `is_month_end`, `is_month_start`, `is_quarter_end`, `is_quarter_start`, `is_year_end`, `is_year_start`, `isocalendar`, `microsecond`, `microseconds`, `month_name`, `nanoseconds`, `normalize`, `qyear`, `round`, `seconds`, `start_time`, `time`, `timetz`, `to_period`, `to_pydatetime`, `to_pytimedelta`, `to_timestamp`, `total_seconds`, `tz`, `unit`, `weekday`, `weekofyear`.

→ Added to **U23**.

#### G10 — Top-level function gaps (37) 🔴 Critical

Completely missing from plan: `array`, `bdate_range`, `col`, `describe_option`, `eval`, `from_dummies`, `get_option`, `infer_freq`, `json_normalize`, `lreshape`, `merge_asof`, `merge_ordered`, `option_context`, `pivot`, `read_clipboard`, `read_fwf`, `read_iceberg`, `read_orc`, `read_sas`, `read_spss`, `read_sql_query`, `read_sql_table`, `read_stata`, `read_table`, `reset_option`, `set_eng_float_format`, `set_option`, `show_versions`, `wide_to_long`.

Also missing classes: `ExcelFile`, `ExcelWriter`, `Grouper`, `HDFStore`, `NamedAgg`, `Flags`, `DatetimeTZDtype`, `SparseDtype`, `PeriodIndex`, `TimedeltaIndex`, `IntervalIndex`, `CategoricalIndex`, `Float32Dtype`, `Float64Dtype`, `UInt8Dtype`–`UInt64Dtype`, `Int8Dtype`–`Int16Dtype`/`Int32Dtype`.

→ Added to **U24** (top-level API completeness pass).

#### G11 — `pandas.errors` module (42 error types missing)

Plan only covers 8 error types. Missing: `AbstractMethodError`, `AttributeConflictWarning`, `CSSWarning`, `CategoricalConversionWarning`, `ChainedAssignmentError`, `ClosedFileError`, `DataError`, `DatabaseError`, `DtypeWarning`, `DuplicateLabelError`, `EmptyDataError`, `IncompatibilityWarning`, `IncompatibleFrequency`, `IndexingError`, `IntCastingNaNError`, `InvalidColumnName`, `InvalidComparison`, `InvalidIndexError`, `LossySetitemError`, `NoBufferPresent`, `NullFrequencyError`, `NumbaUtilError`, `OptionError`, `OutOfBoundsTimedelta`, `ParserError`, `ParserWarning`, `PerformanceWarning`, `PossibleDataLossError`, `PossiblePrecisionLoss`, `SpecificationError`, `UndefinedVariableError`, `UnsortedIndexError`, `UnsupportedFunctionCall`, `ValueLabelTypeMismatch` and 8 warning classes.

→ Added to **U25** (errors module completeness).

#### G12 — `pandas.tseries.offsets` (42 offset types missing)

Plan covers only `DateOffset`. Missing: `BDay`/`BusinessDay`, `BusinessHour`, `BMonthBegin`/`BMonthEnd`, `BQuarterBegin`/`BQuarterEnd`, `BYearBegin`/`BYearEnd`, `CustomBusinessDay`, `CustomBusinessHour`, `CBMonthBegin`/`CBMonthEnd`, `MonthBegin`/`MonthEnd`, `QuarterBegin`/`QuarterEnd`, `YearBegin`/`YearEnd`, `Hour`/`Minute`/`Second`/`Milli`/`Micro`/`Nano`, `Week`, `WeekOfMonth`, `LastWeekOfMonth`, `SemiMonthBegin`/`SemiMonthEnd`, `HalfYearBegin`/`HalfYearEnd`, `Easter`, `FY5253`, `FY5253Quarter`, `Tick`, `Day`.

→ Added to **U26** (tseries.offsets completeness).

#### G13 — Timestamp/Timedelta/Period/Categorical completeness gaps

`Timestamp` missing 25 methods: `as_unit`, `asm8`, `astimezone`, `ceil`, `combine`, `ctime`, `date`, `day_name`, `dst`, `floor`, `fold`, `fromisocalendar`, `fromisoformat`, `fromordinal`, `fromtimestamp`, `is_leap_year`, `is_month_*`/`is_quarter_*`/`is_year_*`, `isocalendar`, `isoweekday`, `month_name`, `normalize`, `resolution`, `strptime`, `timetuple`, `timetz`, `to_datetime64`, `to_julian_date`, `to_period`, `toordinal`, `utcfromtimestamp`, `utcnow`, `utctimetuple`, `value`.

`Timedelta` missing 7: `as_unit`, `asm8`, `ceil`, `floor`, `isoformat`, `resolution_string`, `view`.

`Categorical` missing 18: `check_for_ordered`, `delete`, `insert`, `interpolate`, `isin`, `item`, `nbytes`, `ndim`, `ravel`, `reshape`, `searchsorted`, `set_ordered`, `swapaxes`, `take`, `to_numpy`, `transpose`, `view` + `from_codes`.

→ Added to **U27** (scalar type completeness pass).

---

### New Implementation Units (Gap Closures)

### U19. IO Completeness Pass

**Goal:** Add all IO formats and functions not covered in U13: `read_orc`/`to_orc`, `read_stata`/`to_stata`, `read_sas`, `read_spss`, `read_fwf` (fixed-width), `read_table`, `read_clipboard`/`to_clipboard`, `read_iceberg`/`to_iceberg`, `read_sql_query`, `read_sql_table`, `to_html`, `to_latex`, `to_markdown`, `to_xarray`, `to_string`, `to_records`, `to_dict`, `ExcelFile`, `ExcelWriter`, `HDFStore`.

**Requirements:** R3

**Dependencies:** U13

**Files:**
- Create: `src/io/orc.ts`
- Create: `src/io/stata.ts`
- Create: `src/io/sas.ts`
- Create: `src/io/spss.ts`
- Create: `src/io/fwf.ts`
- Create: `src/io/clipboard.ts`
- Create: `src/io/iceberg.ts`
- Create: `src/io/excel_file.ts` (ExcelFile / ExcelWriter classes)
- Create: `native/core/io/orc.hpp/.cpp`
- Create: `native/core/io/stata.hpp/.cpp`
- Create: `native/core/io/sas.hpp/.cpp`
- Modify: `src/io/sql.ts` (add `read_sql_query`, `read_sql_table`)
- Modify: `src/dataframe.ts` (add `to_html`, `to_latex`, `to_markdown`, `to_xarray`, `to_string`, `to_records`, `to_dict`)
- Test: `tests/unit/io_orc.test.ts`
- Test: `tests/unit/io_stata.test.ts`

**Approach:**
- ORC: use Apache ORC C++ library (vendored in `third_party/`).
- Stata: implement `.dta` binary format reader/writer in C++ (format documented by StataCorp).
- SAS: implement SAS7BDAT and XPT format readers (read-only; write is not supported by pandas either for SAS).
- SPSS: implement `.sav` format reader via a lightweight C++ SPSS parser.
- FWF: pure C++ fixed-width parser, configurable column widths / inferred colspecs.
- Clipboard: delegates to OS clipboard via Node.js `child_process` (`pbpaste`/`xclip`/`powershell`).
- Iceberg: delegates to Apache Iceberg REST catalog API — requires a catalog URL config.
- `HDFStore`: a class wrapping the HDF5 binding with pandas-compatible `put`/`get`/`select`/`keys` API.

**Test scenarios:**
- Happy path: ORC round-trip — write, read back, DataFrame matches.
- Happy path: `read_fwf` with explicit `colspecs` — correct column boundaries.
- Happy path: `read_stata` on a `.dta` v117 file — correct dtypes and labels.
- Happy path: `df.to_html()` produces valid HTML table string.
- Happy path: `df.to_dict('records')` returns array of plain objects.
- Edge case: `read_sas` on XPT format — date columns converted to datetime64.
- Error path: `read_iceberg` without catalog config → `ValueError`.

**Verification:**
- Differential: `df.to_html()` matches `pd.DataFrame.to_html()`.
- `read_stata` / `to_stata` round-trip preserves dtypes and value labels.

---

### U20. DataFrame and Series Completeness Pass

**Goal:** Add the 17 DataFrame methods and 7 Series methods identified in G1/G2.

**Requirements:** R1, R2

**Dependencies:** U11

**Files:**
- Modify: `src/dataframe.ts` (add `assign`, `asfreq`, `asof`, `at_time`, `between_time`, `attrs`, `boxplot`, `first_valid_index`, `from_arrow`, `from_dict`, `from_records`, `hist`, `isetitem`, `sparse`, `to_iceberg`, `to_orc`, `to_stata`)
- Modify: `src/series.ts` (add `asfreq`, `asof`, `at_time`, `between_time`, `attrs`, `from_arrow`, `sparse`)
- Create: `src/arrays/sparse_array.ts`
- Create: `src/compat/arrow.ts` (Arrow JS → DataFrame/Series zero-copy)
- Modify: `tests/unit/dataframe.test.ts`
- Modify: `tests/unit/series.test.ts`

**Approach:**
- `assign(**kwargs)` — returns new DataFrame with added/replaced columns. Pure TS (no NAPI).
- `asfreq(freq, method, fill_value)` — reindex to DatetimeIndex with given frequency, fill gaps. Delegates to Resample internals.
- `asof(where, subset)` — for each label in `where`, returns last valid (non-NaN) entry on or before. Implemented as binary search in C++.
- `at_time(time, asof, axis)` — select rows at a specific time of day.
- `between_time(start_time, end_time)` — select rows between two times of day.
- `attrs` — a plain JS `Map<string, unknown>` stored on the DataFrame handle. Propagated through operations that preserve metadata.
- `from_arrow(arrow_table)` — accepts an Apache Arrow JS `Table` object, extracts column buffers zero-copy via Arrow C++ IPC bridge.
- `sparse` accessor — returns a `SparseFrameAccessor` wrapping the DataFrame in sparse storage.
- `hist(column, by, grid, xlabelsize, ylabelsize, xrot, yrot, figsize, layout, bins)` — data preparation only (returns binned data), no rendering.
- `isetitem(loc, value)` — set item by integer location without triggering `ChainedAssignmentError`.

**Test scenarios:**
- Happy path: `df.assign(c=df['a'] + df['b'])` — new column `c` present, original unchanged.
- Happy path: `df.from_arrow(arrow_table)` — dtypes preserved, values correct.
- Happy path: `df.attrs['source'] = 'csv'` — survives `.copy()` and `.head()`.
- Happy path: `df.between_time('09:00', '17:00')` on DatetimeIndex — only business-hours rows.
- Edge case: `asfreq` on non-DatetimeIndex → `TypeError`.

**Verification:**
- Differential: `df.assign(d=lambda df: df.a + 1)` matches pandas.

---

### U21. Index Completeness Pass

**Goal:** Add the 21 Index gaps and 28 MultiIndex gaps identified in G3/G4.

**Requirements:** R1, R2

**Dependencies:** U3, U11

**Files:**
- Modify: `native/core/index.hpp/.cpp` (add `get_indexer`, `get_indexer_non_unique`, `asof`, `asof_locs`, `slice_indexer`, `slice_locs`, `putmask`, `identical`, `inferred_type`, `shift`, `diff`, `fillna`, `infer_objects`, `to_flat_index`, `view`, `set_names`)
- Modify: `native/core/multi_index.hpp/.cpp` (add `equal_levels`, `get_loc_level`, `get_locs`, `set_codes`, `set_levels`, `remove_unused_levels`, `levshape`)
- Modify: `src/index/range_index.ts`, `int64_index.ts`, `string_index.ts`, `datetime_index.ts`, `multi_index.ts`
- Test: `tests/unit/index.test.ts`
- Test: `tests/native/index_test.cpp`

**Approach:**
- `get_indexer(target)` — for each label in `target`, return its positional index in this Index (-1 = not found). Returns `Int32Array`. Uses sorted binary search for monotonic indices, hash lookup for others.
- `get_indexer_non_unique(target)` — same but handles duplicate labels; returns `(indexer, missing)`.
- `asof(label)` — largest label ≤ given label. Binary search on sorted index.
- `slice_indexer(start, end, step)` — returns Python-style `slice` equivalent as `{start, stop, step}` integers.
- `putmask(mask, new_values)` — returns new Index with elements replaced where mask is True.
- `shift(periods, freq)` — shift index labels by `periods` (optionally with a freq for DatetimeIndex).
- `diff(periods)` — differences between consecutive index values.
- `set_names(names, level)` — set `.names` attribute (for MultiIndex, per-level names).
- MultiIndex `set_codes`/`set_levels` — replace internal codes or levels arrays.
- MultiIndex `get_loc_level(key, level)` — returns the indexer and remaining MultiIndex after fixing one level.
- MultiIndex `get_locs(seq)` — returns all positions matching a partial key sequence.

**Test scenarios:**
- Happy path: `Int64Index([3,1,4,1,5]).get_indexer([1,5])` → `[1,4]` (first occurrence).
- Happy path: `DatetimeIndex.asof('2024-01-03')` on sparse index returns nearest prior date.
- Happy path: MultiIndex `get_loc_level(('a',), level=0)` returns correct row positions.
- Edge case: `get_indexer` on unsorted index falls back to hash lookup.
- Error path: `set_codes` with codes out of range for levels → `ValueError`.

**Verification:**
- Differential: `index.get_indexer(target)` matches pandas output.

---

### U22. GroupBy, Rolling, Expanding, EWM, Resample Completeness Pass

**Goal:** Add the 45 GroupBy gaps (G5), 15 Rolling/Expanding/EWM gaps (G6), and 9 Resampler gaps (G7).

**Requirements:** R2, R4

**Dependencies:** U6, U7, U12

**Files:**
- Modify: `native/core/groupby.hpp/.cpp` (add `cumcount`, `cummax`, `cummin`, `cumprod`, `cumsum`, `diff`, `idxmax`, `idxmin`, `ngroup`, `nth`, `ohlc`, `pct_change`, `rank`, `shift`, `corr`, `corrwith`, `cov`, `bfill`, `ffill`, `sample`, `all`, `any`, `describe`, `quantile`, `median`, `kurt`, `skew`, `sem`, `prod`, `value_counts`)
- Modify: `native/core/rolling.hpp/.cpp` (add `kurt`, `skew`, `sem`, `quantile`, `rank`, `nunique`)
- Modify: `src/groupby/dataframe_groupby.ts`
- Modify: `src/groupby/series_groupby.ts`
- Modify: `src/window/rolling.ts`
- Modify: `src/window/expanding.ts`
- Modify: `src/window/ewm.ts`
- Modify: `src/resample.ts`
- Test: `tests/unit/groupby.test.ts`
- Test: `tests/unit/rolling.test.ts`
- Test: `tests/differential/groupby_diff.test.ts`

**Approach:**
- GroupBy cumulative ops (`cumsum`, `cummax`, etc.): iterate group row-id lists in order, accumulate running value per group.
- `ngroup()` — assigns an integer group label (0, 1, 2, …) to each row.
- `nth(n)` — returns the nth row of each group (negative n counts from end). Handles `dropna`.
- `ohlc()` — open/high/low/close aggregation: `first`/`max`/`min`/`last` per group. Finance-specific but in pandas core.
- `shift(periods)` on GroupBy — shifts values within each group independently.
- `rank(method, ascending, na_option, pct)` on GroupBy — ranks within group.
- `corr(min_periods)` / `cov` on GroupBy — pairwise correlation/covariance within each group.
- Rolling `kurt`/`skew`/`sem`: implement using incremental higher-moment accumulators.
- Rolling `quantile(q, interpolation)`: requires a sorted window data structure (e.g., order-statistics tree or approximate algorithm).
- Rolling `rank`: within each window, compute the rank of the rightmost element.
- Resample `nearest` — like `ffill`/`bfill` but chooses whichever boundary is closer.
- Resample `ohlc`, `interpolate` — same as GroupBy equivalents but for time-bucketed groups.
- EWM `online` — returns an `OnlineEWM` object for streaming / incremental computation.

**Test scenarios:**
- Happy path: `df.groupby('k').cumsum()` — within-group cumulative sum, correct index.
- Happy path: `df.groupby('k').nth(0)` — first row of each group.
- Happy path: `df.groupby('k').ohlc()` — produces multi-level column result.
- Happy path: `rolling(3).quantile(0.5)` — median of each window matches `rolling(3).median()`.
- Happy path: `rolling(3).rank()` — rank of each element within its window.
- Happy path: `resample('1D').nearest()` — nearest-neighbor fill.
- Edge case: `groupby.nth(-1)` — last row of each group.
- Edge case: `groupby.nth(10)` on a group with fewer than 11 rows — returns empty for that group.

**Verification:**
- Differential: `df.groupby('k').cumsum()` matches pandas.
- Differential: `rolling(5).quantile(0.25)` matches pandas.

---

### U23. str and dt Accessor Completeness Pass

**Goal:** Add all 42 missing `str` accessor methods (G8) and 42 missing `dt` accessor methods (G9).

**Requirements:** R2, R5

**Dependencies:** U8, U11

**Files:**
- Modify: `native/core/strings.hpp/.cpp` (add 42 missing string ops)
- Modify: `native/core/datetime.hpp/.cpp` (add 42 missing dt properties/methods)
- Create: `src/accessors/string_accessor.ts` (replace inline in series.ts)
- Create: `src/accessors/datetime_accessor.ts`
- Create: `src/accessors/timedelta_accessor.ts` (`.dt` on timedelta64 Series)
- Create: `src/accessors/period_accessor.ts` (`.dt` on Period Series)
- Test: `tests/unit/str_accessor.test.ts`
- Test: `tests/unit/dt_accessor.test.ts`
- Test: `tests/differential/str_diff.test.ts`
- Test: `tests/differential/dt_diff.test.ts`

**Approach:**

**str accessor additions:**
- `capitalize`, `casefold`, `swapcase`, `title` — single-pass character transforms in C++.
- `center(width, fillchar)`, `ljust`, `rjust`, `zfill` — padding operations.
- `get(i)` — access character or list element at position `i`.
- `get_dummies(sep)` — one-hot encoding of string column → DataFrame.
- `isalnum`, `isalpha`, `isascii`, `isdecimal`, `isdigit`, `islower`, `isnumeric`, `isspace`, `istitle`, `isupper` — character-class checks, vectorised in C++.
- `join(sep)` — join list-typed elements with separator.
- `cat(others, sep, na_rep, join)` — concatenate Series of strings.
- `normalize(form)` — Unicode normalization (NFC, NFD, NFKC, NFKD) via ICU or `std::wstring_convert`.
- `partition(sep)` / `rpartition` — split into (before, sep, after) triple → 3-column DataFrame.
- `removeprefix`, `removesuffix` — Python 3.9+ str methods.
- `rfind`, `rindex` — right-to-left search.
- `rsplit(sep, n, expand)` — right-split with max `n` splits.
- `slice(start, stop, step)` / `slice_replace` — substring extraction / replacement.
- `translate(table)` — character translation table.
- `wrap(width)` — word-wrap to given line width.
- `decode(encoding)`, `encode(encoding, errors)` — byte encoding/decoding (for bytes-dtype Series).
- `extractall(pat, flags)` — all matches of a regex pattern, returns multi-level indexed DataFrame.
- `findall(pat, flags)` — list of all matches per element.
- `repeat(repeats)` — repeat each string element.

**dt accessor additions:**
- All date components: `date`, `time`, `timetz`, `day_of_week`, `day_of_year`, `days_in_month`, `daysinmonth`, `is_leap_year`, `is_month_start`, `is_month_end`, `is_quarter_start`, `is_quarter_end`, `is_year_start`, `is_year_end`, `weekday`, `weekofyear`, `qyear`.
- Floor/ceil/round: `floor(freq)`, `ceil(freq)`, `round(freq)` — round datetime to nearest freq.
- `normalize()` — set time component to midnight.
- `day_name(locale)`, `month_name(locale)` — locale-aware name strings.
- `as_unit(unit)` — change resolution (ns → us → ms → s).
- `isocalendar()` — returns DataFrame with `year`, `week`, `day` ISO columns.
- `components` — for Timedelta Series: explode into `days`/`hours`/`minutes`/`seconds`/`ms`/`us`/`ns` columns.
- `days`, `seconds`, `microseconds`, `nanoseconds`, `total_seconds` — Timedelta component accessors.
- `start_time`, `end_time`, `to_period`, `to_timestamp` — Period Series conversions.
- `asfreq(freq)`, `freq` property — frequency of DatetimeIndex-backed Series.
- `tz` property — timezone string.
- Conversion: `to_pydatetime()`, `to_pytimedelta()` — Python object arrays.
- `unit` property — resolution unit string.

**Test scenarios:**
- Happy path: `Series(['hello world']).str.capitalize()` → `['Hello world']`.
- Happy path: `Series(['abc123']).str.isalnum()` → `[True]`.
- Happy path: `Series(['a,b,c']).str.rsplit(',', n=1, expand=True)` → 2-column DataFrame.
- Happy path: `datetime_series.dt.floor('H')` rounds to nearest hour.
- Happy path: `datetime_series.dt.isocalendar()` returns 3-column DataFrame.
- Happy path: `timedelta_series.dt.total_seconds()` matches pandas.
- Edge case: `str.get(100)` on short strings → `NaN` for those elements.
- Edge case: `dt.tz` on timezone-naive Series → `None`.
- Error path: `str.decode()` on non-bytes column → `ValueError`.

**Verification:**
- Differential: all 57 str methods pass against pandas.
- Differential: all 56 dt properties/methods pass against pandas.

---

### U24. Top-Level API and Dtype Completeness Pass

**Goal:** Add all 37 missing top-level functions (G10), all missing dtype classes, and all missing constructor classes.

**Requirements:** R1, R2, R5

**Dependencies:** U10, U11, U14

**Files:**
- Modify: `src/index.ts` (add all missing exports)
- Create: `src/functions/reshape.ts` (`pivot`, `melt`, `wide_to_long`, `lreshape`, `from_dummies`, `get_dummies`)
- Create: `src/functions/merge.ts` (`merge_asof`, `merge_ordered`)
- Create: `src/functions/io_misc.ts` (`json_normalize`, `read_table`, `read_fwf`, `read_clipboard`, `read_sas`, `read_spss`, `read_stata`, `read_iceberg`, `read_orc`)
- Create: `src/functions/datetime_funcs.ts` (`bdate_range`, `infer_freq`)
- Create: `src/functions/eval.ts` (`eval`, `col`)
- Create: `src/functions/options.ts` (`get_option`, `set_option`, `reset_option`, `describe_option`, `option_context`)
- Create: `src/functions/util.ts` (`array`, `factorize`, `unique`, `show_versions`, `set_eng_float_format`)
- Create: `src/dtypes/nullable_int.ts` (`Int8Dtype`–`Int64Dtype`, `UInt8Dtype`–`UInt64Dtype`)
- Create: `src/dtypes/nullable_float.ts` (`Float32Dtype`, `Float64Dtype`)
- Create: `src/dtypes/misc.ts` (`SparseDtype`, `DatetimeTZDtype`, `PeriodDtype`, `IntervalDtype`)
- Create: `src/excel_file.ts` (`ExcelFile`, `ExcelWriter`)
- Create: `src/hdf_store.ts` (`HDFStore`)
- Create: `src/grouper.ts` (`Grouper`, `NamedAgg`)
- Create: `src/flags.ts` (`Flags`)
- Test: `tests/unit/reshape.test.ts`
- Test: `tests/unit/merge_asof.test.ts`
- Test: `tests/unit/options.test.ts`
- Test: `tests/unit/dtypes.test.ts`

**Approach:**
- `eval(expr, local_dict, global_dict, inplace, target)` — evaluates a string expression against a DataFrame. Uses a sandboxed expression parser (adapted from `numexpr`-style parsing) with C++ acceleration for the actual computation.
- `col(name)` — pandas 3.x `col()` construct for use in `df.assign()` expressions.
- `merge_asof(left, right, on, left_on, right_on, by, tolerance, direction)` — inexact merge: for each row in left, find the nearest row in right that does not exceed the key value.
- `merge_ordered(left, right, on, left_by, right_by, fill_method, suffixes, how)` — merge with optional filling of NaN values in the result.
- `json_normalize(data, record_path, meta, sep)` — flattens nested JSON/dicts to a flat DataFrame.
- `option_context(option, value, ...)` — context manager for temporarily setting options. Maps to a `using` equivalent (async context / callback pattern in TS).
- `bdate_range(start, end, periods, freq, tz, normalize, name, weekmask, holidays, closed)` — business-day date range (excludes weekends and optionally custom holidays).
- `infer_freq(index, warn)` — infers the frequency of a DatetimeIndex.
- Nullable integer/float dtypes: `Int8Dtype()` etc. are singleton-like objects with `.name`, `.numpy_dtype`, `.kind`.
- `NamedAgg(column, aggfunc)` — a named tuple / plain object.
- `Flags(obj, allows_duplicate_labels)` — attached to DataFrame/Series via `.flags` property.

**Test scenarios:**
- Happy path: `pd.eval('a + b', local_dict={a: df.a, b: df.b})` → correct Series.
- Happy path: `pd.merge_asof(left, right, on='time', direction='backward')` — correct nearest match.
- Happy path: `pd.json_normalize([{a:1, b:{c:2}}])` → flat DataFrame with `a` and `b.c` columns.
- Happy path: `pd.bdate_range('2024-01-01', periods=5)` → 5 business days, no Saturday/Sunday.
- Happy path: `pd.get_option('display.max_rows')` returns current option value.
- Happy path: `pd.option_context('display.max_rows', 10, () => ...)` — option restored after callback.
- Edge case: `merge_asof` with no matching rows (all keys exceed right) → NaN fill on right columns.
- Error path: `eval` with an undefined column name → `UndefinedVariableError`.

**Verification:**
- Differential: `pd.merge_asof` result matches pandas.
- Differential: `pd.json_normalize` result matches pandas.

---

### U25. pandas.errors Module Completeness

**Goal:** Implement all 42 missing error and warning types from `pandas.errors` (G11).

**Requirements:** R1, R9

**Dependencies:** U10

**Files:**
- Modify: `src/errors.ts` (add all 42 error/warning classes)
- Modify: `native/bindings/errors.hpp` (map all new C++ error kinds to JS error classes)
- Test: `tests/unit/errors.test.ts`

**Approach:**
- Each pandas error class is an `Error` subclass in TypeScript with the same name and the same default message format as pandas.
- Warning classes are `Warning` subclasses that emit via `console.warn` and optionally integrate with a configurable warnings filter (`pd.options.mode.chained_assignment`).
- `ChainedAssignmentError` — raised when `df['col']['row'] = val` is detected (copy-on-write semantics from pandas 3.x).
- `DtypeWarning` — emitted by CSV/IO parsers when dtype inference is ambiguous.
- `PerformanceWarning` — emitted when a potentially slow code path is taken.
- `ParserError` / `ParserWarning` — from IO parsers.
- `OptionError` — from options system (U24).
- `DuplicateLabelError` — raised when `allows_duplicate_labels=False` and duplicate labels are introduced.

**Test scenarios:**
- Happy path: `new DuplicateLabelError('msg') instanceof PandasTsError` → `true`.
- Happy path: every error class in `pd.errors` is importable from `pandas-ts/errors`.
- Happy path: `ChainedAssignmentError` is thrown when chained assignment is attempted on a no-copy-on-write DataFrame.
- Happy path: `PerformanceWarning` is emitted (console.warn) when a slow path is triggered.
- Edge case: catching `MergeError` also catches it as `PandasTsError` (inheritance chain correct).

**Verification:**
- `import * as errors from 'pandas-ts/errors'` — all 50 pandas error types present.

---

### U26. pandas.tseries.offsets Completeness

**Goal:** Implement all 42 offset types from `pandas.tseries.offsets` (G12).

**Requirements:** R1, R5

**Dependencies:** U8, U14

**Files:**
- Create: `src/tseries/offsets.ts`
- Create: `native/core/offsets.hpp/.cpp` (offset arithmetic in C++)
- Test: `tests/unit/offsets.test.ts`
- Test: `tests/differential/offsets_diff.test.ts`

**Approach:**
- All offset types extend a base `BaseOffset` TS class.
- Each offset stores `n` (multiplier) and `normalize` flag.
- Core operations: `rollforward(dt)`, `rollback(dt)`, `isOnOffset(dt)`, arithmetic `dt + offset → dt`.
- Business day offsets (`BDay`, `BusinessHour`, `BMonthBegin`, etc.) use a weekday-aware calendar. Custom offsets (`CustomBusinessDay`) accept a `holidays` array and `weekmask` string.
- `Tick` subclass (Day, Hour, Minute, Second, Milli, Micro, Nano) — fixed-duration offsets stored as nanosecond counts.
- `Week(weekday=...)` — weekly offset optionally anchored to a specific day of week.
- `FY5253` / `FY5253Quarter` — fiscal year offsets (52/53-week fiscal calendar).
- `Easter` — Easter Sunday offset (Gregorian, uses an algorithm like Anonymous Gregorian).
- All offsets implement `freqstr` property returning the standard pandas frequency alias (e.g., `'B'`, `'BMS'`, `'QS-MAR'`).
- The `offsets` namespace is also exported as `pd.offsets` and `pd.tseries.offsets`.

**Test scenarios:**
- Happy path: `BDay(1).rollforward(Timestamp('2024-01-06'))` (Saturday) → Monday 2024-01-08.
- Happy path: `MonthEnd(1) + Timestamp('2024-01-15')` → `2024-01-31`.
- Happy path: `BQuarterEnd(1).rollforward('2024-02-01')` → end of Q1 2024.
- Happy path: `Week(weekday=4)` (weekly on Friday) — correct next Friday.
- Happy path: `CustomBusinessDay(holidays=['2024-01-01'])` — skips holiday.
- Edge case: `Easter(0).isOnOffset(Timestamp('2024-03-31'))` → `true` (Easter 2024).
- Error path: `BDay` applied to non-timestamp input → `TypeError`.

**Verification:**
- Differential: every offset `rollforward`/`rollback` matches pandas output.

---

### U27. Scalar Type Completeness Pass (Timestamp, Timedelta, Period, Categorical)

**Goal:** Add all missing methods on scalar types identified in G13: 25 Timestamp gaps, 7 Timedelta gaps, 18 Categorical gaps.

**Requirements:** R1, R2, R5

**Dependencies:** U8, U14

**Files:**
- Modify: `src/timestamp.ts` (add all 25 missing methods)
- Modify: `src/timedelta.ts` (add 7 missing methods)
- Modify: `src/categorical.ts` (add 18 missing methods)
- Modify: `native/core/datetime.hpp/.cpp` (add C++ backing for scalar ops)
- Test: `tests/unit/timestamp.test.ts`
- Test: `tests/unit/timedelta.test.ts`
- Test: `tests/differential/timestamp_diff.test.ts`

**Approach:**
- `Timestamp`: JS class wrapping a C++ `int64_t` nanoseconds value + optional timezone. Missing methods: `astimezone`, `asm8`, `as_unit`, `ceil`, `combine`, `ctime`, `date`, `day_name`, `dst`, `floor`, `fold`, `fromisocalendar`, `fromisoformat`, `fromordinal`, `fromtimestamp`, `isocalendar`, `isoweekday`, `month_name`, `normalize`, `resolution`, `strptime`, `timetuple`, `timetz`, `to_datetime64`, `to_julian_date`, `to_period`, `toordinal`, `utcfromtimestamp`, `utcnow`, `utctimetuple`, `value`.
- `Timedelta`: `as_unit`, `asm8`, `ceil`, `floor`, `isoformat`, `resolution_string`, `view`.
- `Categorical.from_codes(codes, categories, ordered)` — construct from integer codes + categories array.
- `Categorical` missing: `check_for_ordered`, `delete(loc)`, `insert(loc, item)`, `interpolate`, `isin(values)`, `item()`, `nbytes`, `ndim`, `ravel`, `reshape(shape)`, `searchsorted(value)`, `set_ordered(value)`, `swapaxes`, `take(indices)`, `to_numpy(dtype, na_value)`, `transpose`, `view`.
- Timestamp `normalize()` — sets time-of-day to 00:00:00.
- Timestamp `to_julian_date()` — Julian Day Number (float).
- Timestamp `fold` — DST fold disambiguation (0 or 1).
- `resolution` property — smallest non-zero component (nanosecond/microsecond/millisecond/second/minute/hour/day).

**Test scenarios:**
- Happy path: `Timestamp('2024-03-10 02:30', tz='America/New_York').dst()` → non-zero timedelta during DST.
- Happy path: `Timestamp.fromtimestamp(0, tz='UTC')` → `1970-01-01 00:00:00+00:00`.
- Happy path: `Timestamp('2024-01-15').to_julian_date()` → correct Julian day number.
- Happy path: `Timestamp('2024-03-15 14:30').floor('H')` → `2024-03-15 14:00`.
- Happy path: `Categorical.from_codes([0,1,0], ['a','b'])` → correct Categorical.
- Happy path: `Categorical(['a','b','a']).searchsorted('b')` → correct position.
- Edge case: `Timedelta.resolution_string` on sub-nanosecond → `'ns'`.
- Error path: `Categorical.from_codes([5], ['a','b'])` code out of bounds → `ValueError`.

**Verification:**
- Differential: `Timestamp` arithmetic and attribute access match pandas scalar behaviour.

---

## Sources & References

- Related code: `../numera/` — the numera package this project mirrors architecturally
- Related code: `src/index.ts` — existing package skeleton
- pandas API reference: https://pandas.pydata.org/docs/reference/
- pandas source: https://github.com/pandas-dev/pandas
- Apache Arrow C++: https://github.com/apache/arrow
- NVIDIA Thrust: https://github.com/NVIDIA/thrust
- NVIDIA RAPIDS cuDF (reference for CUDA DataFrame kernels): https://github.com/rapidsai/cudf
- node-addon-api v8: https://github.com/nodejs/node-addon-api
- cmake-js v8: https://github.com/cmake-js/cmake-js
- numera ARCHITECTURE.md: `../numera/ARCHITECTURE.md`
- numera DECISIONS.md: `../numera/DECISIONS.md`
- numera ROADMAP.md: `../numera/ROADMAP.md`
