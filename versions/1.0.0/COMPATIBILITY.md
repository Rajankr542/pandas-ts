# Compatibility with pandas 2.2

pandas-ts aims to match Python pandas closely. This page lists every known difference.

## Arithmetic operators

Python pandas uses operator overloading (`+`, `-`, `*`, `/`). JavaScript has no operator overloading, so pandas-ts uses named methods:

| pandas (Python) | pandas-ts (TypeScript) |
|---|---|
| `s + 1` | `s.add(1)` |
| `s - 1` | `s.sub(1)` |
| `s * 2` | `s.mul(2)` |
| `s / 2` | `s.div(2)` |
| `s // 2` | `s.floordiv(2)` |
| `s % 2` | `s.mod(2)` |
| `s ** 2` | `s.pow(2)` |
| `s1 + s2` | `s1.add(s2)` |
| `df['a'] + df['b']` | `df.col('a').add(df.col('b'))` |

## DataFrame.eval and pd.eval

In pandas, `df.eval('a + b')` is a method named `eval`. In pandas-ts, this is `df.evalExpr('a + b')` because `eval` is a reserved identifier in JavaScript.

The top-level `pd.eval` is available as the named export `pdEval`:

```ts
import { pdEval } from 'pandas-ts';
pdEval('2 + 3');    // => 5
```

## Column access

In Python, `df['sales']` or `df.sales` returns a Series. In TypeScript, the bracket and dot operators work differently:

```ts
// pandas-ts
df.col('sales')           // returns a Series
df.get('sales')           // same as col()
```

## Not yet implemented (stubs)

| Feature | Status |
|---|---|
| `read_hdf` / `to_hdf` | Stub — requires a native HDF5 C library |
| `read_stata` | Stub — requires a Stata binary parser |
| `read_sas` | Not implemented |
| `read_spss` | Not implemented |
| `read_orc` | Not implemented |
| `DataFrame.style` | Stub — CSS styling not rendered |
| `DataFrame.plot` | Not implemented — requires a chart renderer |

## NaN and null

pandas-ts treats `null`, `undefined`, and `NaN` all as missing values. `isna(null)`, `isna(undefined)`, and `isna(NaN)` all return `true`, matching pandas behaviour for `None` and `NaN`.

## Integer precision

JavaScript `number` is an IEEE 754 double, which is exact up to 2^53. pandas-ts stores integer Series as JavaScript numbers. For very large integers (> 9007199254740991), precision may be lost.

## dtypes

| pandas | pandas-ts |
|---|---|
| `int64` | `'int64'` |
| `float64` | `'float64'` |
| `object` | `'object'` (strings and mixed) |
| `bool` | `'bool'` |
| `datetime64[ns]` | `'datetime64'` |
| `timedelta64[ns]` | `'timedelta64'` |
| `category` | `'category'` |

## Index

pandas-ts Index is backed by a plain JavaScript array. Operations that require sorted index lookups (like `searchsorted`) work correctly but may be slower than pandas for very large indexes.

## iloc returns scalars directly

In pandas, `s.iloc[1]` returns a scalar. In pandas-ts, `s.iloc(1)` also returns the scalar directly — no need to call `.item()`.
