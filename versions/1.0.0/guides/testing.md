# Testing

`pd.testing` provides utilities for comparing Series and DataFrames in your tests. These mirror `pandas.testing`.

## assert_series_equal

```ts
import { assert_series_equal, AssertionError } from 'pandas-ts';

const a = new Series([1, 2, 3]);
const b = new Series([1, 2, 3]);
assert_series_equal(a, b);  // passes silently

// Approximate equality (default rtol=1e-5)
assert_series_equal(
  new Series([1.0]),
  new Series([1.0000001]),
);  // passes

// Strict equality
assert_series_equal(
  new Series([1.0]),
  new Series([1.0000001]),
  { check_exact: true },
);  // throws AssertionError
```

### Options

| Option | Default | Description |
|---|---|---|
| `check_dtype` | `true` | Check that dtypes are the same |
| `check_names` | `true` | Check that names are the same |
| `check_exact` | `false` | Require exact equality for floats |
| `rtol` | `1e-5` | Relative tolerance for float comparison |
| `atol` | `1e-8` | Absolute tolerance for float comparison |

## assert_frame_equal

```ts
import { assert_frame_equal } from 'pandas-ts';

const a = new DataFrame({ x: [1, 2], y: [3, 4] });
assert_frame_equal(a, a);  // passes

// Ignore column order
assert_frame_equal(
  new DataFrame({ a: [1,2], b: [3,4] }),
  new DataFrame({ b: [3,4], a: [1,2] }),
  { check_like: true }
);  // passes
```

## assert_index_equal

```ts
import { assert_index_equal } from 'pandas-ts';
assert_index_equal(['a','b','c'], ['a','b','c']);  // passes
assert_index_equal([0,1,2], [0,1,2]);              // passes
```

## Using with vitest / Jest

```ts
import { describe, it, expect } from 'vitest';
import { assert_series_equal, AssertionError, Series } from 'pandas-ts';

describe('my transform', () => {
  it('returns expected values', () => {
    const input = new Series([1, 2, 3, 4, 5]);
    const result = input.rolling(2).mean();
    assert_series_equal(
      result.dropna(),
      new Series([1.5, 2.5, 3.5, 4.5]),
      { rtol: 1e-10 }
    );
  });

  it('throws AssertionError on mismatch', () => {
    expect(() => {
      assert_series_equal(new Series([1]), new Series([2]));
    }).toThrow(AssertionError);
  });
});
```

## Testing IO round-trips

```ts
import { assert_frame_equal, DataFrame } from 'pandas-ts';

const df = new DataFrame({ a: [1, 2, 3], b: ['x', 'y', 'z'] });
const csv = df.to_csv();
const df2 = pd.read_csv(csv);
assert_frame_equal(df, df2, { check_dtype: false });  // types may widen after CSV round-trip
```
