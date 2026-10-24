# TypeScript

pandas-ts is written in TypeScript. Type declarations are included — no `@types` package needed.

## Imports

```ts
import pd from 'pandas-ts';
// or:
import {
  Series,
  DataFrame,
  read_csv,
  concat,
  merge,
  date_range,
  to_datetime,
  isna,
  cut,
  get_dummies,
  pdEval,
  infer_freq,
  BusinessDay,
  MonthEnd,
  assert_series_equal,
  assert_frame_equal,
  AssertionError,
} from 'pandas-ts';
```

## Key types

### Series

```ts
const s: Series = new Series([1, 2, 3]);
s.size;                    // number
s.dtype;                   // DType
s.name;                    // string | null
s.index;                   // (string | number)[]
s.to_list(): unknown[];
```

### DataFrame

```ts
const df: DataFrame = new DataFrame({ a: [1,2,3] });
df.shape;                  // [number, number]
df.columns;                // string[]
df.index;                  // (string | number)[]
df.col(name: string);      // Series
df.shape[0];               // number of rows
df.shape[1];               // number of columns
```

### DType

```ts
s.dtype.name;    // 'int64' | 'float64' | 'object' | 'bool' | 'datetime64' | 'category' | ...
```

### DateOffset (base class)

```ts
import { DateOffset, BusinessDay } from 'pandas-ts';

const bd: DateOffset = new BusinessDay(1);
bd.apply(new Date());        // Date
bd.rollforward(new Date());  // Date
bd.rollback(new Date());     // Date
```

### AssertionError

```ts
import { AssertionError } from 'pandas-ts';
try {
  assert_series_equal(a, b);
} catch (e: unknown) {
  if (e instanceof AssertionError) {
    console.error(e.message);
  }
}
```

## Generic patterns

```ts
// Type a function that accepts a Series
function standardize(s: Series): Series {
  return s.sub(s.mean()).div(s.std());
}

// Type a function that accepts a DataFrame
function summarize(df: DataFrame): DataFrame {
  return df.groupby('group').mean();
}
```

## ESM and CJS

pandas-ts ships both ESM and CommonJS bundles:

| Import style | File |
|---|---|
| `import` (ESM) | `dist/esm/index.js` |
| `require` (CJS) | `dist/cjs/index.js` |
| TypeScript types | `dist/types/index.d.ts` |

Both are selected automatically by Node.js and bundlers.
