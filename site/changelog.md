# Changelog

## 1.1.0 — 2026-10-24

### New features

- **DataFrame axis=1 reductions**: `sum(1)`, `mean(1)`, `min(1)`, `max(1)` now return a row-wise `Series`
- **`DataFrame.dropna(axis=1)`**: drops columns with any/all/thresh NA values
- **`DataFrame.concat(axis=1)`**: column-wise concatenation; duplicate column names are auto-suffixed
- **`DataFrame.apply(axis=1)`**: row-wise apply receiving a `Series` per row
- **`DataFrame.diff(axis=1)`**: column-wise diff
- **`DataFrame.to_dict()` all orientations**: `dict`, `list`, `records`, `series`, `split`, `index` all implemented
- **`DataFrame.to_string()`**: real tab-separated rendering with `max_rows` / `max_cols` truncation
- **`DataFrame.convert_dtypes()`**: promotes numeric-string `object`/`string` columns to `float64`
- **`DataFrame.corr_matrix('spearman')`**: rank-then-Pearson implementation
- **`Series.at_time(hh:mm)`**: filters a datetime-indexed Series by time of day
- **`Series.between_time(start, end)`**: filters by time range (handles midnight wrap)
- **`Series.tz_convert(tz)`**: re-expresses `Date` values in another timezone via `Intl.DateTimeFormat`
- **`Series.tz_localize(tz)`**: attaches timezone metadata to naive datetime series
- **`Series.unstack(level)`**: pivots MultiIndex tuple index to columns
- **`Rolling.corr(other)`**: real Pearson cross-correlation over sliding windows
- **`Rolling.cov(other)`**: real sample covariance over sliding windows
- **`JSON orient='table'`**: full read + write of pandas Table Schema format
- **Parquet optional peer deps**: `read_parquet`/`to_parquet` work when `parquet-wasm` + `apache-arrow` are installed; otherwise throw a clear `NotImplementedError` with install hint
- **Clipboard optional peer deps**: same pattern using `clipboardy`
- **`CategoricalAccessor.reorder_categories()`**: remaps values to new order
- **`CategoricalAccessor.as_ordered()`**: sorts categories alphabetically
- **`CategoricalAccessor.as_unordered()`**: preserves values, returns unordered copy
- **`DatetimeAccessor.tz_localize()`** / **`.tz_convert()`**: real timezone operations
- **`StringAccessor.encode(encoding)`** / **`.decode(encoding)`**: `BufferEncoding`-aware encode/decode
- **`Index.astype(dtype)`**: converts index values to `int64`, `float64`, `str`, or `bool`

### Coverage update

- Series: **160+ methods** (was 152+)
- DataFrame: **145+ methods** (was 134+)
- Tests: **642** (was 601) across **15 files** (was 14)
- Honest API surface coverage: **~95%** (HDF5/Stata/Pickle/Sparse remain out of scope; see [Compatibility](../compatibility))

---

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
