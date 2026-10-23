# pandas-ts Architecture

## Overview

pandas-ts is a TypeScript/JavaScript port of Python's pandas library. The implementation is structured in layers:

1. **TypeScript API layer** (`src/`) — Public-facing classes and functions, fully typed
2. **Pure-JS computation** — Initial implementation uses typed arrays (Float64Array, Int32Array, etc.) for columnar storage
3. **C++ native addon** (planned, `native/`) — NAPI-based high-performance kernels (not yet implemented)
4. **WASM fallback** (planned) — For browser/edge environments

## Key Design Decisions

- See `DECISIONS.md` for numbered decision log
- Columns are stored as TypedArrays internally (Float64Array, Int32Array, etc.)
- NA/NaN handling mirrors pandas exactly
- API surface mirrors pandas 2.x

## Directory Structure

```
src/              # TypeScript public API
  index.ts        # Main entry point
  dtype.ts        # DType objects
  errors.ts       # Error classes  
  na.ts           # NA/NaN/NaT constants
  series.ts       # Series class
  dataframe.ts    # DataFrame class
  index/          # Index types
  groupby/        # GroupBy classes
  window/         # Rolling/Expanding/EWM
  io/             # IO functions
tests/
  unit/           # vitest unit tests
docs/
  plans/          # Implementation plans
```
