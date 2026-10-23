# Decision Log

## D-001 — Pure-TypeScript first, C++ later

**Date:** 2026-10-23  
**Status:** Active

Build the full pandas API surface in pure TypeScript using typed arrays (Float64Array, Int32Array, etc.) for columnar storage first. This lets us get the API right and testable before adding C++ complexity.

The C++ core will be added in a later phase for performance-critical paths (sort, groupby, join, rolling windows).

## D-002 — Columns stored as TypedArrays

**Date:** 2026-10-23  
**Status:** Active

Each column in a DataFrame is stored as a typed array appropriate to its dtype:
- `float64` → `Float64Array`
- `int32` → `Int32Array`
- `int64` → `BigInt64Array`
- `bool` → `Uint8Array` (0 = false, 1 = true)
- `string` → `string[]` (JS array, not typed)

A separate `Uint8Array` serves as the NA mask when needed (1 = NA, 0 = valid).

## D-003 — No operator overloading

**Date:** 2026-10-23  
**Status:** Active

JavaScript does not support operator overloading. All arithmetic and comparison operations are exposed as named methods:
- `df.add(other)` instead of `df + other`
- `df.eq(other)` instead of `df == other`

This is consistent with how pandas JS ports like Danfo.js handle this limitation.
