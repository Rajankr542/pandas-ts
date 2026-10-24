# Testing

`pd.testing` provides utilities for comparing Series and DataFrames in your test suites, mirroring `pandas.testing`.

## assert_series_equal

```ts
import { assert_series_equal, Series } from 'pandas-ts';

// Passes silently
assert_series_equal(
  new Series([1, 2, 3]),
  new Series([1, 2, 3])
);

// Approximate equality (default rtol=1e-5, atol=1e-8)
assert_series_equal(
  new Series([1.0]),
  new Series([1.0000001])
);    // passes — within tolerance

// Strict equality
assert_series_equal(
  new Series([1.0]),
  new Series([1.0000001]),
  { check_exact: true }
);    // throws AssertionError
```

### Options

| Option | Default | Description |
|---|---|---|
| `check_dtype` | `true` | Check that dtypes are the same |
| `check_names` | `true` | Check that names match |
| `check_exact` | `false` | Require exact equality (no tolerance) |
| `rtol` | `1e-5` | Relative tolerance for floats |
| `atol` | `1e-8` | Absolute tolerance for floats |

## assert_frame_equal

```ts
import { assert_frame_equal, DataFrame } from 'pandas-ts';

assert_frame_equal(
  new DataFrame({ x: [1, 2], y: [3, 4] }),
  new DataFrame({ x: [1, 2], y: [3, 4] })
);    // passes
```

## assert_index_equal

```ts
import { assert_index_equal } from 'pandas-ts';

assert_index_equal(['a','b','c'], ['a','b','c']);    // passes
```

## AssertionError

All assert functions throw `AssertionError` on failure:

```ts
import { assert_series_equal, AssertionError, Series } from 'pandas-ts';

try {
  assert_series_equal(new Series([1]), new Series([2]));
} catch (e) {
  e instanceof AssertionError;    // => true
  console.log(e.message);         // describes the mismatch
}
```

## Using with vitest or Jest

```ts
import { describe, it } from 'vitest';
import { assert_series_equal, AssertionError } from 'pandas-ts';

describe('my transform', () => {
  it('returns expected values', () => {
    const result = myTransform(input);
    assert_series_equal(result, expected, { rtol: 1e-4 });
  });

  it('throws on bad input', () => {
    expect(() => myTransform(badInput))
      .toThrow(AssertionError);
  });
});
```
