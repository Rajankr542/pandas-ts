# Changelog

## 1.0.0 — 2026-10-24

Initial public release.

### What's included

- **Series** — 152+ methods, ~95% pandas parity
- **DataFrame** — 134+ methods, ~90% pandas parity
- **Top-level `pd.*`** — 30 functions: `concat`, `merge`, `merge_asof`, `cut`, `qcut`, `crosstab`, `factorize`, `wide_to_long`, `json_normalize`, `date_range`, `to_datetime`, `pivot_table`, `melt`, `eval`, `infer_freq`, `get_dummies`, `from_dummies`, `isna`, `notna`, `unique`, `value_counts`
- **GroupBy** — 30+ methods on DataFrameGroupBy and SeriesGroupBy
- **Rolling / Expanding / EWM** — full window methods including `skew`, `kurt`, `sem`, `corr`, `cov`
- **Resample** — DataFrameResampler + SeriesResampler
- **`.str` accessor** — 58 string methods
- **`.dt` accessor** — 45 datetime properties/methods
- **`.cat` accessor** — 12 categorical methods
- **Index types** — Index, RangeIndex, Int64Index, Float64Index, StringIndex, DatetimeIndex, MultiIndex
- **Scalars** — Timestamp, Timedelta with full arithmetic and parsing
- **IO** — CSV, JSON, Excel, Parquet, SQL, Feather, Pickle, Clipboard, HTML, XML, FWF (stub: HDF5, Stata)
- **tseries.offsets** — BusinessDay, MonthEnd, MonthBegin, YearEnd, YearBegin, QuarterEnd, QuarterBegin, Week, Day, Hour, Minute, Second, Milli, Micro, Nano, BusinessHour
- **pd.testing** — `assert_series_equal`, `assert_frame_equal`, `assert_index_equal`
- **pd.eval** — safe expression evaluator for DataFrame columns
- **pd.infer_freq** — detects `D`, `H`, `T`, `S`, `W`, `MS`, `ME`, `QS`, `QE`, `YS`, `YE`
- **@cyfora/numera integration** — hist, gradient, percentile, interp, average, norm, corrWithNumera, covWithNumera, ndiff, convolve, cumsumNumera, cumprodNumera; DataFrame.cov_matrix, corr_matrix
- **601 tests**, 14 test files, 0 type errors
