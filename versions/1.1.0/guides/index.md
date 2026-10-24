# pandas-ts

pandas-ts is a TypeScript and JavaScript port of Python's [pandas](https://pandas.pydata.org/) library. It provides familiar `Series` and `DataFrame` types for data manipulation, plus the entire pandas ecosystem: GroupBy, rolling windows, resampling, IO, and datetime support.

Math-heavy operations — histograms, quantiles, correlations, linear algebra — are powered by [`@cyfora/numera`](https://numera.cyfora.in), the NumPy port with a C++ core.

## Coverage

| Area | Methods | Status |
|---|---|---|
| Series | 152+ | ~95% parity |
| DataFrame | 134+ | ~90% parity |
| Top-level pd.* | 30 functions | ✅ |
| GroupBy | 30+ methods | ✅ |
| Rolling / Expanding / EWM | ~20 each | ✅ |
| .str accessor | 58 methods | ✅ |
| .dt accessor | 45 methods | ✅ |
| .cat accessor | 12 methods | ✅ |
| IO | 28 functions | ✅ |
| tseries.offsets | 16 classes | ✅ |
| pd.testing | 4 functions | ✅ |

## Quick example

```ts
import pd, { read_csv } from 'pandas-ts';

// Read and explore
const df = read_csv('sales.csv');
df.head();
df.describe();

// Filter and group
const summary = df
  .loc(df.col('revenue').gt(1000))
  .groupby('region')
  .agg({ revenue: ['sum', 'mean'] });

// Time series
const dates = pd.date_range('2024-01-01', { periods: 12, freq: 'MS' });
```

## Install

```bash
npm install pandas-ts
```

[Get started →](/guides/installation.html)   [Browse the API →](/reference/index.html)
