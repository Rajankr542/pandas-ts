# Pandas Public API Reference
> Source: pandas 3.x official documentation — for TypeScript port reference.

---

## 1. Series Methods

### Attributes / Properties
| Name | Description |
|------|-------------|
| `index` | The index (axis labels) of the Series |
| `array` | The ExtensionArray backing this Series |
| `values` | Return as ndarray or ndarray-like |
| `dtype` | dtype of the underlying data |
| `dtypes` | Alias for dtype |
| `shape` | Tuple of the shape of underlying data |
| `nbytes` | Number of bytes in underlying data |
| `ndim` | Number of dimensions (always 1) |
| `size` | Number of elements |
| `T` | Transpose (returns self for Series) |
| `memory_usage` | Memory usage in bytes |
| `hasnans` | True if there are any NaNs |
| `empty` | True if Series is empty |
| `name` | Name of the Series |
| `flags` | Properties associated with this object |
| `is_unique` | True if values are unique |
| `is_monotonic_increasing` | True if values monotonically increasing |
| `is_monotonic_decreasing` | True if values monotonically decreasing |
| `attrs` | Dict of user-defined metadata |

### Conversion
| Method | Description |
|--------|-------------|
| `astype(dtype)` | Cast to specified dtype |
| `convert_dtypes()` | Convert to best nullable dtypes |
| `infer_objects()` | Infer better dtypes for object columns |
| `copy(deep=True)` | Make a copy |
| `to_numpy()` | Convert to NumPy ndarray |
| `to_period(freq)` | Convert DatetimeIndex → PeriodIndex |
| `to_timestamp(freq, how)` | Cast to DatetimeIndex |
| `to_list()` | Return list of values |
| `tolist()` | Alias for to_list |

### Indexing / Iteration
| Method | Description |
|--------|-------------|
| `at` | Access single value by label |
| `iat` | Access single value by integer position |
| `loc` | Label-based selection |
| `iloc` | Integer-location based selection |
| `get(key, default)` | Get item by key |
| `items()` | Iterate (index, value) tuples lazily |
| `keys()` | Alias for index |
| `pop(item)` | Return item and remove from Series |
| `item()` | Return first element as Python scalar |
| `xs(key, axis, level, drop_level)` | Cross-section |

### Binary Operators
| Method | Description |
|--------|-------------|
| `add(other)` | Addition |
| `sub(other)` | Subtraction |
| `mul(other)` | Multiplication |
| `div(other)` | Floating division |
| `truediv(other)` | Floating division (alias) |
| `floordiv(other)` | Integer division |
| `mod(other)` | Modulo |
| `pow(other)` | Exponentiation |
| `divmod(other)` | Integer division and modulo |
| `radd(other)` | Reflected addition |
| `rsub(other)` | Reflected subtraction |
| `rmul(other)` | Reflected multiplication |
| `rdiv(other)` | Reflected division |
| `rtruediv(other)` | Reflected truediv |
| `rfloordiv(other)` | Reflected floor division |
| `rmod(other)` | Reflected modulo |
| `rpow(other)` | Reflected power |
| `rdivmod(other)` | Reflected divmod |
| `lt(other)` | Less than |
| `gt(other)` | Greater than |
| `le(other)` | Less than or equal |
| `ge(other)` | Greater than or equal |
| `ne(other)` | Not equal |
| `eq(other)` | Equal |
| `combine(other, func)` | Combine with func |
| `combine_first(other)` | Update nulls with other |
| `round(decimals)` | Round values |
| `dot(other)` | Dot product |
| `product()` | Alias for prod |

### Function Application / GroupBy / Window
| Method | Description |
|--------|-------------|
| `apply(func)` | Apply function to values |
| `agg(func)` | Aggregate with one or more ops |
| `aggregate(func)` | Alias for agg |
| `transform(func)` | Call func producing same-shape Series |
| `map(func, na_action)` | Map values via function/dict |
| `groupby(by, level, ...)` | Group Series |
| `rolling(window, ...)` | Rolling window calculations |
| `expanding(min_periods)` | Expanding window calculations |
| `ewm(com, span, ...)` | Exponentially weighted calculations |
| `pipe(func, *args, **kwargs)` | Apply chainable functions |

### Computations / Descriptive Stats
| Method | Description |
|--------|-------------|
| `abs()` | Absolute value |
| `all()` | All elements True? |
| `any()` | Any element True? |
| `autocorr(lag)` | Lag-N autocorrelation |
| `between(left, right)` | Boolean mask for range |
| `clip(lower, upper)` | Trim values |
| `corr(other)` | Correlation with other Series |
| `count()` | Non-NA count |
| `cov(other)` | Covariance with other Series |
| `cummax()` | Cumulative maximum |
| `cummin()` | Cumulative minimum |
| `cumprod()` | Cumulative product |
| `cumsum()` | Cumulative sum |
| `describe()` | Descriptive statistics |
| `diff(periods)` | First discrete difference |
| `factorize()` | Encode as enumerated type |
| `kurt()` | Unbiased kurtosis |
| `kurtosis()` | Alias for kurt |
| `max()` | Maximum |
| `mean()` | Mean |
| `median()` | Median |
| `min()` | Minimum |
| `mode()` | Mode(s) |
| `nlargest(n)` | Largest n elements |
| `nsmallest(n)` | Smallest n elements |
| `pct_change(periods)` | Fractional change |
| `prod()` | Product |
| `quantile(q)` | Value at quantile |
| `rank()` | Numerical ranks |
| `sem()` | Standard error of the mean |
| `skew()` | Unbiased skew |
| `std()` | Standard deviation |
| `sum()` | Sum |
| `var()` | Variance |
| `unique()` | Unique values |
| `nunique()` | Number of unique elements |
| `value_counts()` | Counts of unique values |

### Reindexing / Selection / Label Manipulation
| Method | Description |
|--------|-------------|
| `align(other, join, ...)` | Align two objects on axes |
| `case_when(caselist)` | Replace values where conditions True |
| `drop(labels, ...)` | Remove index labels |
| `droplevel(level)` | Remove index level(s) |
| `drop_duplicates(keep)` | Remove duplicate values |
| `duplicated(keep)` | Indicate duplicate values |
| `equals(other)` | Test element equality |
| `head(n)` | First n rows |
| `idxmax()` | Row label of maximum value |
| `idxmin()` | Row label of minimum value |
| `isin(values)` | Check membership in values |
| `reindex(index, ...)` | Conform to new index |
| `reindex_like(other)` | Conform to other's index |
| `rename(index, ...)` | Alter index labels or name |
| `rename_axis(mapper, ...)` | Set index axis name |
| `reset_index(level, drop, ...)` | Reset index |
| `sample(n, frac, ...)` | Random sample |
| `set_axis(labels, ...)` | Assign index |
| `take(indices)` | Elements at positional indices |
| `tail(n)` | Last n rows |
| `truncate(before, after)` | Truncate before/after index value |
| `where(cond, other)` | Replace where condition False |
| `mask(cond, other)` | Replace where condition True |
| `add_prefix(prefix)` | Prefix index labels |
| `add_suffix(suffix)` | Suffix index labels |
| `filter(items, like, regex)` | Subset by index labels |
| `first_valid_index()` | Index of first non-missing value |
| `last_valid_index()` | Index of last non-missing value |

### Missing Data Handling
| Method | Description |
|--------|-------------|
| `bfill()` | Backward fill NA values |
| `dropna()` | Remove missing values |
| `ffill()` | Forward fill NA values |
| `fillna(value)` | Fill NA with value |
| `interpolate()` | Fill NaN via interpolation |
| `isna()` | Detect missing values |
| `isnull()` | Alias for isna |
| `notna()` | Detect non-missing values |
| `notnull()` | Alias for notna |
| `replace(to_replace, value)` | Replace values |

### Reshaping / Sorting
| Method | Description |
|--------|-------------|
| `argsort()` | Integer indices that would sort |
| `argmin()` | Integer position of minimum |
| `argmax()` | Integer position of maximum |
| `reorder_levels(order)` | Rearrange MultiIndex levels |
| `sort_values(ascending, ...)` | Sort by values |
| `sort_index(ascending, ...)` | Sort by index |
| `swaplevel(i, j)` | Swap MultiIndex levels |
| `unstack(level)` | Pivot MultiIndex to DataFrame |
| `explode()` | Transform list-like to rows |
| `searchsorted(value)` | Find insertion point |
| `repeat(repeats)` | Repeat elements |
| `squeeze()` | Squeeze to scalar if possible |

### Combining / Comparing / Joining
| Method | Description |
|--------|-------------|
| `compare(other)` | Show differences from other |
| `update(other)` | Modify in place from other |

### Time Series
| Method | Description |
|--------|-------------|
| `asfreq(freq)` | Convert to specified frequency |
| `asof(where)` | Last row without NaN before where |
| `shift(periods, freq)` | Shift by periods |
| `resample(rule)` | Resample time-series data |
| `tz_convert(tz)` | Convert timezone |
| `tz_localize(tz)` | Localize timezone |
| `at_time(time)` | Select at time of day |
| `between_time(start, end)` | Select between times |

### Serialization / IO
| Method | Description |
|--------|-------------|
| `to_pickle(path)` | Serialize to file |
| `to_csv(path)` | Write to CSV |
| `to_dict(into)` | Convert to dict |
| `to_excel(writer)` | Write to Excel sheet |
| `to_frame(name)` | Convert to DataFrame |
| `to_xarray()` | Return xarray object |
| `to_hdf(path, key)` | Write to HDF5 |
| `to_sql(name, con)` | Write to SQL database |
| `to_json(path)` | Convert to JSON |
| `to_string(buf)` | Render string representation |
| `to_clipboard()` | Copy to clipboard |
| `to_latex(buf)` | Render as LaTeX |
| `to_markdown(buf)` | Print as Markdown |
| `from_arrow(data)` | Construct from Arrow object |

### Plotting
| Method | Description |
|--------|-------------|
| `plot` | Plot accessor |
| `plot.area()` | Area plot |
| `plot.bar()` | Bar plot |
| `plot.barh()` | Horizontal bar plot |
| `plot.box()` | Box plot |
| `plot.density()` | Density plot |
| `plot.hist()` | Histogram |
| `plot.kde()` | KDE plot |
| `plot.line()` | Line plot |
| `plot.pie()` | Pie chart |
| `hist(by, ax, ...)` | Draw histogram |

---

## 2. DataFrame Methods

### Constructor / Class Methods
| Method | Description |
|--------|-------------|
| `DataFrame(data, index, columns, dtype, copy)` | Constructor |
| `DataFrame.from_dict(data, orient, dtype)` | From dict |
| `DataFrame.from_records(data, index, ...)` | From records/ndarray |
| `DataFrame.from_arrow(data)` | From Arrow object |

### Attributes / Properties
| Name | Description |
|------|-------------|
| `index` | Row labels |
| `columns` | Column labels |
| `dtypes` | Column dtypes |
| `info(verbose, buf, ...)` | Concise summary |
| `select_dtypes(include, exclude)` | Subset columns by dtype |
| `values` | NumPy representation |
| `axes` | List of axes |
| `ndim` | Number of dimensions |
| `size` | Number of elements |
| `shape` | Dimensionality tuple |
| `memory_usage(index, deep)` | Memory usage per column |
| `empty` | True if DataFrame is empty |
| `T` | Transpose |
| `attrs` | User-defined metadata dict |
| `flags` | Properties |
| `style` | Styler object |

### Conversion
| Method | Description |
|--------|-------------|
| `astype(dtype)` | Cast to dtype |
| `convert_dtypes()` | Convert to best nullable dtypes |
| `infer_objects()` | Infer better dtypes |
| `copy(deep)` | Make a copy |
| `to_numpy(dtype, copy, na_value)` | Convert to NumPy array |

### Indexing / Iteration
| Method | Description |
|--------|-------------|
| `head(n)` | First n rows |
| `tail(n)` | Last n rows |
| `at` | Single value by label pair |
| `iat` | Single value by integer position |
| `loc` | Label-based selection |
| `iloc` | Integer-location based selection |
| `insert(loc, column, value)` | Insert column |
| `items()` | Iterate (column, Series) pairs |
| `keys()` | Info axis |
| `iterrows()` | Iterate (index, Series) row pairs |
| `itertuples(index, name)` | Iterate rows as namedtuples |
| `pop(item)` | Return column and remove |
| `xs(key, axis, level)` | Cross-section |
| `get(key, default)` | Get column by key |
| `isin(values)` | Whether each element in values |
| `where(cond, other)` | Replace where condition False |
| `mask(cond, other)` | Replace where condition True |
| `query(expr)` | Query columns with boolean expression |
| `isetitem(loc, value)` | Set column at position |

### Binary Operators
| Method | Description |
|--------|-------------|
| `add(other, axis, level, fill_value)` | Addition |
| `sub(other, ...)` | Subtraction |
| `mul(other, ...)` | Multiplication |
| `div(other, ...)` | Floating division |
| `truediv(other, ...)` | Floating division |
| `floordiv(other, ...)` | Integer division |
| `mod(other, ...)` | Modulo |
| `pow(other, ...)` | Exponentiation |
| `dot(other)` | Matrix multiplication |
| `radd(other, ...)` | Reflected addition |
| `rsub(other, ...)` | Reflected subtraction |
| `rmul(other, ...)` | Reflected multiplication |
| `rdiv(other, ...)` | Reflected division |
| `rtruediv(other, ...)` | Reflected truediv |
| `rfloordiv(other, ...)` | Reflected floor division |
| `rmod(other, ...)` | Reflected modulo |
| `rpow(other, ...)` | Reflected power |
| `lt(other, axis, level)` | Less than |
| `gt(other, ...)` | Greater than |
| `le(other, ...)` | Less than or equal |
| `ge(other, ...)` | Greater than or equal |
| `ne(other, ...)` | Not equal |
| `eq(other, ...)` | Equal |
| `combine(other, func, fill_value)` | Column-wise combine |
| `combine_first(other)` | Update nulls with other |

### Function Application / GroupBy / Window
| Method | Description |
|--------|-------------|
| `apply(func, axis, raw, ...)` | Apply function along axis |
| `map(func, na_action)` | Apply function elementwise |
| `pipe(func, *args, **kwargs)` | Chainable functions |
| `agg(func, axis)` | Aggregate |
| `aggregate(func, axis)` | Alias for agg |
| `transform(func, axis)` | Call func producing same-shape DF |
| `groupby(by, level, as_index, ...)` | Group DataFrame |
| `rolling(window, min_periods, ...)` | Rolling window |
| `expanding(min_periods, ...)` | Expanding window |
| `ewm(com, span, ...)` | Exponentially weighted |

### Computations / Descriptive Stats
| Method | Description |
|--------|-------------|
| `abs()` | Absolute value |
| `all(axis, bool_only, skipna)` | All True? |
| `any(axis, bool_only, skipna)` | Any True? |
| `clip(lower, upper, axis)` | Trim values |
| `corr(method, min_periods)` | Pairwise column correlation |
| `corrwith(other, axis, drop)` | Pairwise correlation with other |
| `count(axis, numeric_only)` | Non-NA cell count |
| `cov(min_periods, ddof)` | Pairwise covariance |
| `cummax(axis, skipna)` | Cumulative maximum |
| `cummin(axis, skipna)` | Cumulative minimum |
| `cumprod(axis, skipna)` | Cumulative product |
| `cumsum(axis, skipna)` | Cumulative sum |
| `describe(percentiles, include)` | Descriptive statistics |
| `diff(periods, axis)` | First discrete difference |
| `eval(expr, inplace)` | Evaluate expression |
| `kurt(axis, skipna)` | Unbiased kurtosis |
| `kurtosis(axis, skipna)` | Alias for kurt |
| `max(axis, skipna)` | Maximum |
| `mean(axis, skipna)` | Mean |
| `median(axis, skipna)` | Median |
| `min(axis, skipna)` | Minimum |
| `mode(axis, numeric_only, dropna)` | Mode |
| `pct_change(periods)` | Fractional change |
| `prod(axis, skipna, min_count)` | Product |
| `product(axis, ...)` | Alias for prod |
| `quantile(q, axis, numeric_only)` | Values at quantile |
| `rank(axis, method, numeric_only)` | Numerical ranks |
| `round(decimals)` | Round numeric columns |
| `sem(axis, skipna, ddof)` | Standard error of mean |
| `skew(axis, skipna)` | Unbiased skew |
| `sum(axis, skipna, min_count)` | Sum |
| `std(axis, skipna, ddof)` | Standard deviation |
| `var(axis, skipna, ddof)` | Variance |
| `nunique(axis, dropna)` | Distinct element count |
| `value_counts(subset, normalize)` | Frequency of distinct rows |

### Reindexing / Selection / Label Manipulation
| Method | Description |
|--------|-------------|
| `add_prefix(prefix, axis)` | Prefix labels |
| `add_suffix(suffix, axis)` | Suffix labels |
| `align(other, join, axis)` | Align two objects |
| `at_time(time, asof, axis)` | Select at time of day |
| `between_time(start, end)` | Select between times |
| `drop(labels, axis, index, columns)` | Drop labels |
| `drop_duplicates(subset, keep)` | Remove duplicate rows |
| `duplicated(subset, keep)` | Indicate duplicate rows |
| `equals(other)` | Test element equality |
| `filter(items, like, regex, axis)` | Subset by labels |
| `idxmax(axis, skipna)` | Index of maximum |
| `idxmin(axis, skipna)` | Index of minimum |
| `reindex(labels, index, columns)` | Conform to new index |
| `reindex_like(other)` | Conform to other's index |
| `rename(mapper, index, columns)` | Rename labels |
| `rename_axis(mapper, index)` | Set axis name |
| `reset_index(level, drop)` | Reset index |
| `sample(n, frac, replace)` | Random sample |
| `select(criteria)` | Select subset |
| `set_axis(labels, axis)` | Assign axis |
| `set_index(keys, drop, append)` | Set index from columns |
| `take(indices, axis)` | Elements at positional indices |
| `truncate(before, after, axis)` | Truncate by index value |

### Missing Data Handling
| Method | Description |
|--------|-------------|
| `bfill(axis, inplace, limit)` | Backward fill |
| `dropna(axis, how, thresh, subset)` | Remove missing values |
| `ffill(axis, inplace, limit)` | Forward fill |
| `fillna(value, axis, inplace)` | Fill NA |
| `interpolate(method, axis, limit)` | Interpolate |
| `isna()` | Detect missing |
| `isnull()` | Alias for isna |
| `notna()` | Detect non-missing |
| `notnull()` | Alias for notna |
| `replace(to_replace, value)` | Replace values |

### Reshaping / Sorting / Transposing
| Method | Description |
|--------|-------------|
| `droplevel(level, axis)` | Remove index/column levels |
| `pivot(columns, index, values)` | Reshape by given index/column values |
| `pivot_table(values, index, columns)` | Spreadsheet-style pivot |
| `reorder_levels(order, axis)` | Rearrange MultiIndex levels |
| `sort_values(by, axis, ascending)` | Sort by values |
| `sort_index(axis, level, ascending)` | Sort by labels |
| `nlargest(n, columns, keep)` | First n rows by columns desc |
| `nsmallest(n, columns, keep)` | First n rows by columns asc |
| `swaplevel(i, j, axis)` | Swap MultiIndex levels |
| `stack(level, dropna, sort)` | Stack columns to index |
| `unstack(level, fill_value)` | Pivot index level to columns |
| `melt(id_vars, value_vars, ...)` | Unpivot wide to long |
| `explode(column)` | List-like elements to rows |
| `squeeze(axis)` | Squeeze to scalar |
| `to_xarray()` | Return xarray object |
| `transpose(*args)` | Transpose |

### Combining / Comparing / Joining
| Method | Description |
|--------|-------------|
| `assign(**kwargs)` | Assign new columns |
| `compare(other, align_axis, ...)` | Show differences |
| `join(other, on, how, lsuffix, ...)` | Join columns of another DF |
| `merge(right, how, on, left_on, ...)` | Database-style join |
| `update(other, join, overwrite)` | Modify in-place from other |

### Time Series
| Method | Description |
|--------|-------------|
| `asfreq(freq, method, how)` | Convert to frequency |
| `asof(where, subset)` | Last row without NaN before where |
| `shift(periods, freq, axis)` | Shift index |
| `first_valid_index()` | Index of first non-missing value |
| `last_valid_index()` | Index of last non-missing value |
| `resample(rule, closed, label)` | Resample time-series |
| `to_period(freq)` | Convert to period |
| `to_timestamp(freq, how)` | Cast to timestamps |
| `tz_convert(tz, axis)` | Convert timezone |
| `tz_localize(tz, axis)` | Localize timezone |

### Serialization / IO
| Method | Description |
|--------|-------------|
| `to_orc(path, engine, index)` | Write to ORC format |
| `to_parquet(path, engine, ...)` | Write to Parquet |
| `to_pickle(path, compression)` | Serialize to pickle |
| `to_csv(path, sep, na_rep, ...)` | Write to CSV |
| `to_hdf(path, key, mode)` | Write to HDF5 |
| `to_sql(name, con, schema, ...)` | Write to SQL |
| `to_dict(orient, into)` | Convert to dict |
| `to_excel(excel_writer, ...)` | Write to Excel |
| `to_json(path, orient, ...)` | Convert to JSON |
| `to_html(buf, columns, ...)` | Render as HTML table |
| `to_xml(path, index, ...)` | Render as XML |
| `to_feather(path, **kwargs)` | Write to Feather |
| `to_latex(buf, columns, ...)` | Render as LaTeX |
| `to_stata(path, convert_dates)` | Export to Stata dta |
| `to_records(index, column_dtypes)` | Convert to record array |
| `to_string(buf, na_rep, ...)` | Render string representation |
| `to_clipboard(excel, sep)` | Copy to clipboard |
| `to_markdown(buf, mode, index)` | Print as Markdown |
| `to_iceberg(table_identifier, ...)` | Write to Iceberg table |

### Plotting
| Method | Description |
|--------|-------------|
| `plot` | Plot accessor |
| `plot.area()` | Area chart |
| `plot.bar()` | Bar chart |
| `plot.barh()` | Horizontal bar |
| `plot.box()` | Box plot |
| `plot.density()` | Density plot |
| `plot.hexbin(x, y)` | Hexbin plot |
| `plot.hist()` | Histogram |
| `plot.kde()` | KDE plot |
| `plot.line()` | Line plot |
| `plot.pie()` | Pie chart |
| `plot.scatter(x, y)` | Scatter plot |
| `boxplot(column, by, ax)` | Box plot |
| `hist(column, by, ax)` | Histogram |

### Sparse Accessor
| Method | Description |
|--------|-------------|
| `sparse.density` | Ratio of non-sparse to total |
| `sparse.from_spmatrix(data)` | From scipy sparse matrix |
| `sparse.to_coo()` | Convert to scipy COO matrix |
| `sparse.to_dense()` | Convert to dense DataFrame |

---

## 3. Top-Level `pd.*` Functions

### Data Manipulations
| Function | Description |
|----------|-------------|
| `pd.melt(frame, id_vars, value_vars, ...)` | Wide to long format |
| `pd.pivot(data, columns, index, values)` | Reshape by index/column |
| `pd.pivot_table(data, values, index, columns, ...)` | Spreadsheet-style pivot |
| `pd.crosstab(index, columns, values, ...)` | Cross tabulation |
| `pd.cut(x, bins, right, labels, ...)` | Bin into discrete intervals |
| `pd.qcut(x, q, labels, ...)` | Quantile-based binning |
| `pd.merge(left, right, how, on, ...)` | Database-style join |
| `pd.merge_ordered(left, right, on, ...)` | Ordered merge with fill |
| `pd.merge_asof(left, right, on, ...)` | Merge by key distance |
| `pd.concat(objs, axis, join, ...)` | Concatenate objects |
| `pd.get_dummies(data, prefix, ...)` | Indicator/dummy variables |
| `pd.from_dummies(data, sep, default_category)` | Reverse of get_dummies |
| `pd.factorize(values, sort, ...)` | Encode as enumerated type |
| `pd.unique(values)` | Unique values (hash-based) |
| `pd.value_counts(values, sort, ...)` | Count unique values |
| `pd.lreshape(data, groups, dropna)` | Wide to long (multiple cols) |
| `pd.wide_to_long(df, stubnames, i, j, ...)` | Wide to long format |

### Missing Data
| Function | Description |
|----------|-------------|
| `pd.isna(obj)` | Detect missing values |
| `pd.isnull(obj)` | Alias for isna |
| `pd.notna(obj)` | Detect non-missing values |
| `pd.notnull(obj)` | Alias for notna |

### Numeric
| Function | Description |
|----------|-------------|
| `pd.to_numeric(arg, errors, downcast)` | Convert to numeric type |
| `pd.array(data, dtype, copy)` | Create ExtensionArray |
| `pd.interval_range(start, end, periods, freq)` | Fixed frequency IntervalIndex |

### Datetime-Like
| Function | Description |
|----------|-------------|
| `pd.to_datetime(arg, errors, dayfirst, ...)` | Convert to datetime |
| `pd.to_timedelta(arg, unit, errors)` | Convert to timedelta |
| `pd.date_range(start, end, periods, freq, tz)` | Fixed frequency DatetimeIndex |
| `pd.bdate_range(start, end, periods, freq, tz)` | Business day DatetimeIndex |
| `pd.period_range(start, end, periods, freq)` | Fixed frequency PeriodIndex |
| `pd.timedelta_range(start, end, periods, freq)` | Fixed frequency TimedeltaIndex |
| `pd.infer_freq(index)` | Infer frequency of DatetimeIndex |

### Scalars / Special Values
| Name | Description |
|------|-------------|
| `pd.Timestamp` | Pandas replacement for datetime |
| `pd.Timedelta` | Pandas replacement for timedelta |
| `pd.NaT` | Not a Time (missing datetime) |
| `pd.NA` | NA scalar (nullable dtypes) |
| `pd.Period` | Single time span |
| `pd.Interval` | Interval object |

### Evaluation
| Function | Description |
|----------|-------------|
| `pd.eval(expr, parser, engine, ...)` | Evaluate expression string |

### Datetime Formats
| Function | Description |
|----------|-------------|
| `pd.tseries.frequencies.to_offset(freq)` | Convert frequency string to DateOffset |

### JSON
| Function | Description |
|----------|-------------|
| `pd.json_normalize(data, record_path, meta, ...)` | Normalize semi-structured JSON |

### Hashing
| Function | Description |
|----------|-------------|
| `pd.util.hash_array(vals, ...)` | Hash 1D array |
| `pd.util.hash_pandas_object(obj, ...)` | Hash Index/Series/DataFrame |

### Interchange
| Function | Description |
|----------|-------------|
| `pd.api.interchange.from_dataframe(df)` | Build DataFrame from interchange protocol |

---

## 4. GroupBy Methods

> Obtained via `df.groupby(...)` → `DataFrameGroupBy` or `Series.groupby(...)` → `SeriesGroupBy`

### Indexing / Iteration
| Method | Description |
|--------|-------------|
| `__iter__()` | GroupBy iterator |
| `groups` | Dict {group name → group labels} |
| `indices` | Dict {group name → group indices} |
| `get_group(name)` | Construct DF/Series from group |
| `Grouper(*args, **kwargs)` | Specify groupby instruction |
| `NamedAgg(column, aggfunc)` | Named aggregation helper |

### Function Application
| Method | Description |
|--------|-------------|
| `apply(func, *args, **kwargs)` | Apply function group-wise |
| `agg(func, engine, ...)` | Aggregate |
| `aggregate(func, ...)` | Alias for agg |
| `transform(func, *args, ...)` | Call func on each group, same-shape |
| `pipe(func, *args, **kwargs)` | Apply func to GroupBy object |
| `filter(func, dropna)` | Filter groups by criterion |

### Computations / Descriptive Stats
| Method | Description |
|--------|-------------|
| `all(skipna)` | All values truthy in group |
| `any(skipna)` | Any value truthy in group |
| `bfill(limit)` | Backward fill per group |
| `corr(method, ...)` | Pairwise correlation |
| `corrwith(other, ...)` | *(DataFrame only)* pairwise correlation |
| `count()` | Count excluding missing |
| `cov(min_periods, ddof)` | Covariance |
| `cumcount(ascending)` | Number items 0..n-1 per group |
| `cummax(numeric_only, skipna)` | Cumulative max per group |
| `cummin(numeric_only, skipna)` | Cumulative min per group |
| `cumprod(numeric_only, skipna)` | Cumulative product per group |
| `cumsum(numeric_only, skipna)` | Cumulative sum per group |
| `describe(percentiles, ...)` | Descriptive stats per group |
| `diff(periods)` | First discrete difference |
| `ewm(com, span, halflife, ...)` | EWM per group |
| `expanding(min_periods)` | Expanding per group |
| `ffill(limit)` | Forward fill per group |
| `first(numeric_only, ...)` | First entry per group |
| `head(n)` | First n rows per group |
| `idxmax(skipna, numeric_only)` | Index of max per group |
| `idxmin(skipna, numeric_only)` | Index of min per group |
| `last(numeric_only, ...)` | Last entry per group |
| `max(numeric_only, ...)` | Max per group |
| `mean(numeric_only, ...)` | Mean per group |
| `median(numeric_only, skipna)` | Median per group |
| `min(numeric_only, ...)` | Min per group |
| `ngroup(ascending)` | Number each group 0..n-1 |
| `nth(n)` | Nth row from each group |
| `nunique(dropna)` | Unique count per group |
| `nlargest(n, keep)` | *(SeriesGroupBy)* Largest n |
| `nsmallest(n, keep)` | *(SeriesGroupBy)* Smallest n |
| `unique()` | *(SeriesGroupBy)* Unique values per group |
| `ohlc()` | Open/high/low/close per group |
| `pct_change(periods, ...)` | Pct change per group |
| `prod(numeric_only, ...)` | Product per group |
| `quantile(q, ...)` | Quantile per group |
| `rank(method, ascending, ...)` | Rank per group |
| `resample(rule, closed, ...)` | Resample within each group |
| `rolling(window, ...)` | Rolling per group |
| `sample(n, frac, replace, ...)` | Random sample per group |
| `sem(ddof, numeric_only)` | Std error of mean per group |
| `shift(periods, freq)` | Shift per group |
| `size()` | Group sizes |
| `skew(skipna, numeric_only)` | Unbiased skew per group |
| `kurt(skipna, numeric_only)` | Kurtosis per group |
| `std(ddof, engine, ...)` | Std dev per group |
| `sum(numeric_only, min_count)` | Sum per group |
| `var(ddof, engine, ...)` | Variance per group |
| `tail(n)` | Last n rows per group |
| `take(indices)` | Elements at positional indices per group |
| `value_counts(subset, normalize, ...)` | Frequency counts per group |
| `is_monotonic_increasing` | *(SeriesGroupBy)* Monotonic increasing per group |
| `is_monotonic_decreasing` | *(SeriesGroupBy)* Monotonic decreasing per group |

### Plotting
| Method | Description |
|--------|-------------|
| `boxplot(subplots, column, ...)` | Box plots per group |
| `hist(column, by, ...)` | Histograms per group |
| `plot` | Plot accessor per group |

---

## 5. Resample Methods

> Obtained via `df.resample(rule)` or `series.resample(rule)` → `Resampler`

### Indexing / Iteration
| Method | Description |
|--------|-------------|
| `__iter__()` | Iterator |
| `groups` | Dict {group name → labels} |
| `indices` | Dict {group name → indices} |
| `get_group(name)` | Construct DF from group |

### Function Application
| Method | Description |
|--------|-------------|
| `apply(func)` | Aggregate using one or more ops |
| `aggregate(func)` | Alias for apply |
| `transform(arg, *args, **kwargs)` | Call function on each group |
| `pipe(func, *args, **kwargs)` | Apply func to Resampler |

### Upsampling
| Method | Description |
|--------|-------------|
| `ffill(limit)` | Forward fill |
| `bfill(limit)` | Backward fill |
| `nearest(limit)` | Resample by nearest value |
| `asfreq(fill_value)` | Values at new freq (reindex) |
| `interpolate(method, axis, limit, ...)` | Interpolate between timestamps |

### Computations / Descriptive Stats
| Method | Description |
|--------|-------------|
| `count()` | Count excluding missing |
| `nunique()` | Unique element count |
| `first(numeric_only, min_count)` | First non-null entry |
| `last(numeric_only, min_count)` | Last non-null entry |
| `max(numeric_only, min_count)` | Max per period |
| `mean(numeric_only)` | Mean per period |
| `median(numeric_only)` | Median per period |
| `min(numeric_only, min_count)` | Min per period |
| `ohlc()` | Open/high/low/close |
| `prod(numeric_only, min_count)` | Product per period |
| `size()` | Group sizes |
| `sem(ddof, numeric_only)` | Std error of mean |
| `std(ddof, numeric_only)` | Std deviation |
| `sum(numeric_only, min_count)` | Sum per period |
| `var(ddof, numeric_only)` | Variance |
| `quantile(q)` | Value at given quantile |

---

## 6. Rolling / Expanding / EWM Methods

### Rolling (`.rolling(window, ...)`)
| Method | Description |
|--------|-------------|
| `count(numeric_only)` | Count non-NaN |
| `sum(numeric_only, engine, ...)` | Rolling sum |
| `mean(numeric_only, engine, ...)` | Rolling mean |
| `median(numeric_only, engine, ...)` | Rolling median |
| `var(ddof, numeric_only, ...)` | Rolling variance |
| `std(ddof, numeric_only, ...)` | Rolling std dev |
| `min(numeric_only, engine, ...)` | Rolling minimum |
| `max(numeric_only, engine, ...)` | Rolling maximum |
| `first(numeric_only)` | First (left-most) element |
| `last(numeric_only)` | Last (right-most) element |
| `corr(other, pairwise, ddof)` | Rolling correlation |
| `cov(other, pairwise, ddof)` | Rolling covariance |
| `skew(numeric_only)` | Rolling skewness |
| `kurt(numeric_only)` | Rolling kurtosis |
| `apply(func, raw, engine, ...)` | Rolling custom aggregation |
| `pipe(func, *args, **kwargs)` | Apply func to Rolling object |
| `aggregate(func)` | Rolling aggregation |
| `quantile(q, interpolation)` | Rolling quantile |
| `sem(ddof, numeric_only)` | Rolling std error of mean |
| `rank(method, ascending, pct)` | Rolling rank |
| `nunique(numeric_only)` | Rolling unique count |

### Weighted Window (`.rolling(window, win_type=...)`)
| Method | Description |
|--------|-------------|
| `mean(numeric_only)` | Weighted mean |
| `sum(numeric_only)` | Weighted sum |
| `var(ddof, numeric_only)` | Weighted variance |
| `std(ddof, numeric_only)` | Weighted std dev |

### Expanding (`.expanding(min_periods, ...)`)
| Method | Description |
|--------|-------------|
| `count(numeric_only)` | Expanding count |
| `sum(numeric_only, engine, ...)` | Expanding sum |
| `mean(numeric_only, engine, ...)` | Expanding mean |
| `median(numeric_only, engine, ...)` | Expanding median |
| `var(ddof, numeric_only, ...)` | Expanding variance |
| `std(ddof, numeric_only, ...)` | Expanding std dev |
| `min(numeric_only, engine, ...)` | Expanding minimum |
| `max(numeric_only, engine, ...)` | Expanding maximum |
| `first(numeric_only)` | Expanding first element |
| `last(numeric_only)` | Expanding last element |
| `corr(other, pairwise, ddof)` | Expanding correlation |
| `cov(other, pairwise, ddof)` | Expanding covariance |
| `skew(numeric_only)` | Expanding skewness |
| `kurt(numeric_only)` | Expanding kurtosis |
| `apply(func, raw, engine, ...)` | Expanding custom aggregation |
| `pipe(func, *args, **kwargs)` | Apply func to Expanding object |
| `aggregate(func)` | Expanding aggregation |
| `quantile(q, interpolation)` | Expanding quantile |
| `sem(ddof, numeric_only)` | Expanding std error of mean |
| `rank(method, ascending, pct)` | Expanding rank |
| `nunique(numeric_only)` | Expanding unique count |

### EWM / ExponentialMovingWindow (`.ewm(com, span, halflife, alpha, ...)`)
| Method | Description |
|--------|-------------|
| `mean(numeric_only, ...)` | EWM mean |
| `sum(numeric_only, ...)` | EWM sum |
| `std(bias, numeric_only)` | EWM standard deviation |
| `var(bias, numeric_only)` | EWM variance |
| `corr(other, pairwise, ...)` | EWM correlation |
| `cov(other, pairwise, ...)` | EWM covariance |

### Window Indexers
| Class | Description |
|-------|-------------|
| `api.indexers.BaseIndexer` | Base class for custom window bounds |
| `api.indexers.FixedForwardWindowIndexer` | Fixed-length forward-looking window |
| `api.indexers.VariableOffsetWindowIndexer` | Variable offset window (e.g., BusinessDay) |

---

## 7. String Accessor (`.str`) Methods

> Accessed via `Series.str.*` or `Index.str.*`

### Text Transformation
| Method | Description |
|--------|-------------|
| `capitalize()` | Capitalize first character |
| `casefold()` | Casefold (aggressive lowercase) |
| `lower()` | Lowercase |
| `upper()` | Uppercase |
| `swapcase()` | Swap case |
| `title()` | Title case |
| `strip(to_strip)` | Strip leading/trailing whitespace |
| `lstrip(to_strip)` | Strip leading |
| `rstrip(to_strip)` | Strip trailing |
| `center(width, fillchar)` | Center with fillchar |
| `ljust(width, fillchar)` | Left-justify |
| `rjust(width, fillchar)` | Right-justify |
| `pad(width, side, fillchar)` | Pad to width |
| `zfill(width)` | Zero-fill on left |
| `wrap(width)` | Wrap long strings |
| `normalize(form)` | Unicode normalize |
| `translate(table)` | Map characters |
| `encode(encoding, errors)` | Encode bytes |
| `decode(encoding, errors)` | Decode bytes |
| `removeprefix(prefix)` | Remove prefix if present |
| `removesuffix(suffix)` | Remove suffix if present |
| `repeat(repeats)` | Repeat strings |
| `replace(pat, repl, n, case, flags, regex)` | Replace pattern |

### Searching / Matching
| Method | Description |
|--------|-------------|
| `contains(pat, case, flags, na, regex)` | Test if pattern contained |
| `startswith(pat, na)` | Test if starts with pat |
| `endswith(pat, na)` | Test if ends with pat |
| `match(pat, case, flags, na)` | Test if matches pattern at start |
| `fullmatch(pat, case, flags, na)` | Test if full string matches |
| `find(sub, start, end)` | Lowest index of substring |
| `rfind(sub, start, end)` | Highest index of substring |
| `index(sub, start, end)` | Lowest index (raises if not found) |
| `rindex(sub, start, end)` | Highest index (raises if not found) |
| `count(pat, flags)` | Count pattern occurrences |
| `findall(pat, flags)` | Find all occurrences |

### Extracting
| Method | Description |
|--------|-------------|
| `extract(pat, flags, expand)` | Extract groups from first match |
| `extractall(pat, flags)` | Extract groups from all matches |
| `slice(start, stop, step)` | Slice strings |
| `slice_replace(start, stop, repl)` | Replace slice |
| `get(i)` | Get element at position i |
| `get_dummies(sep)` | Dummy variables from string labels |

### Splitting / Joining
| Method | Description |
|--------|-------------|
| `split(pat, n, expand, regex)` | Split string on pattern |
| `rsplit(pat, n, expand)` | Split from right |
| `partition(sep)` | Split into (before, sep, after) |
| `rpartition(sep)` | Split from right into tuple |
| `join(sep)` | Join list-like elements |
| `cat(others, sep, na_rep, join)` | Concatenate strings |

### Inspection / Type Checking
| Method | Description |
|--------|-------------|
| `len()` | Length of string |
| `isalnum()` | All alphanumeric? |
| `isalpha()` | All alphabetic? |
| `isdigit()` | All digits? |
| `isspace()` | All whitespace? |
| `islower()` | All lowercase? |
| `isupper()` | All uppercase? |
| `istitle()` | Title-cased? |
| `isnumeric()` | All numeric? |
| `isdecimal()` | All decimal? |
| `isascii()` | All ASCII? |

---

## 8. Datetime Accessor (`.dt`) Methods

> Accessed via `Series.dt.*` for datetime/timedelta/period Series

### Datetime Properties
| Property | Description |
|----------|-------------|
| `date` | Array of `datetime.date` objects |
| `time` | Array of `datetime.time` objects |
| `timetz` | Array of `datetime.time` with tz |
| `year` | Year |
| `month` | Month (1=Jan, 12=Dec) |
| `day` | Day |
| `hour` | Hour |
| `minute` | Minute |
| `second` | Second |
| `microsecond` | Microsecond |
| `nanosecond` | Nanosecond |
| `dayofweek` | Day of week (0=Mon, 6=Sun) |
| `day_of_week` | Alias for dayofweek |
| `weekday` | Alias for dayofweek |
| `dayofyear` | Ordinal day of year |
| `day_of_year` | Alias for dayofyear |
| `quarter` | Quarter |
| `days_in_month` | Days in month |
| `daysinmonth` | Alias for days_in_month |
| `is_month_start` | First day of month? |
| `is_month_end` | Last day of month? |
| `is_quarter_start` | First day of quarter? |
| `is_quarter_end` | Last day of quarter? |
| `is_year_start` | First day of year? |
| `is_year_end` | Last day of year? |
| `is_leap_year` | Belongs to leap year? |
| `tz` | Timezone |
| `freq` | Frequency string |
| `unit` | Precision unit |

### Datetime Methods
| Method | Description |
|--------|-------------|
| `isocalendar()` | ISO 8601 year/week/day DataFrame |
| `to_period(freq)` | Cast to PeriodArray |
| `to_pydatetime()` | Return as `datetime.datetime` Series |
| `tz_localize(tz, ambiguous, nonexistent)` | Localize tz-naive |
| `tz_convert(tz)` | Convert tz-aware |
| `normalize()` | Convert times to midnight |
| `strftime(date_format)` | Format as string |
| `round(freq, ambiguous, nonexistent)` | Round to frequency |
| `floor(freq, ambiguous, nonexistent)` | Floor to frequency |
| `ceil(freq, ambiguous, nonexistent)` | Ceil to frequency |
| `month_name(locale)` | Month names |
| `day_name(locale)` | Day names |
| `as_unit(unit, round_ok)` | Convert precision unit |

### Timedelta Properties
| Property | Description |
|----------|-------------|
| `days` | Days component |
| `seconds` | Seconds component (< 1 day) |
| `microseconds` | Microseconds component (< 1 second) |
| `nanoseconds` | Nanoseconds component (< 1 microsecond) |
| `components` | DataFrame of all components |

### Timedelta Methods
| Method | Description |
|--------|-------------|
| `to_pytimedelta()` | Return as `datetime.timedelta` Series |
| `total_seconds()` | Total duration in seconds |
| `as_unit(unit, round_ok)` | Convert precision unit |

### Period Properties (`.dt` on PeriodIndex Series)
| Property | Description |
|----------|-------------|
| `qyear` | Fiscal year |
| `start_time` | Start timestamp of period |
| `end_time` | End timestamp of period |

---

## 9. Categorical Accessor (`.cat`) Methods

> Accessed via `Series.cat.*` for Categorical dtype Series

### Properties
| Property | Description |
|----------|-------------|
| `categories` | Index of categories |
| `ordered` | Whether ordered categorical |
| `codes` | Integer codes of categories |

### Methods
| Method | Description |
|--------|-------------|
| `rename_categories(new_categories)` | Rename categories |
| `reorder_categories(new_categories, ordered)` | Reorder categories |
| `add_categories(new_categories)` | Add new categories |
| `remove_categories(removals)` | Remove categories |
| `remove_unused_categories()` | Remove unobserved categories |
| `set_categories(new_categories, ordered, rename)` | Set categories |
| `as_ordered()` | Set as ordered |
| `as_unordered()` | Set as unordered |

---

## 10. IO Functions

### Pickling
| Function | Description |
|----------|-------------|
| `pd.read_pickle(filepath, compression, ...)` | Load pickled object |
| `df.to_pickle(path, compression, ...)` | Serialize to pickle |

### Flat File / CSV
| Function | Description |
|----------|-------------|
| `pd.read_csv(filepath, sep, header, names, index_col, usecols, dtype, engine, skiprows, nrows, na_values, keep_default_na, parse_dates, date_format, chunksize, compression, encoding, ...)` | Read CSV |
| `pd.read_table(filepath, sep, ...)` | Read general delimited file |
| `pd.read_fwf(filepath, colspecs, widths, ...)` | Read fixed-width formatted file |
| `df.to_csv(path, sep, na_rep, float_format, columns, header, index, index_label, mode, encoding, compression, quoting, ...)` | Write CSV |

### Clipboard
| Function | Description |
|----------|-------------|
| `pd.read_clipboard(sep, dtype_backend)` | Read from clipboard |
| `df.to_clipboard(excel, sep)` | Write to clipboard |

### Excel
| Function | Description |
|----------|-------------|
| `pd.read_excel(io, sheet_name, header, names, index_col, usecols, dtype, engine, skiprows, nrows, na_values, parse_dates, ...)` | Read Excel |
| `df.to_excel(excel_writer, sheet_name, na_rep, columns, header, index, index_label, startrow, startcol, engine, merge_cells, ...)` | Write Excel |
| `pd.ExcelFile(path, engine, storage_options)` | Excel file reader class |
| `pd.ExcelWriter(path, engine, date_format, ...)` | Excel file writer class |

### JSON
| Function | Description |
|----------|-------------|
| `pd.read_json(path, orient, typ, dtype, convert_axes, convert_dates, keep_default_dates, lines, chunksize, compression, ...)` | Read JSON |
| `pd.json_normalize(data, record_path, meta, meta_prefix, record_prefix, errors, sep, max_level)` | Normalize semi-structured JSON |
| `df.to_json(path, orient, date_format, double_precision, force_ascii, date_unit, default_handler, lines, compression, index, indent, ...)` | Convert to JSON |

### HTML
| Function | Description |
|----------|-------------|
| `pd.read_html(io, match, flavor, header, index_col, skiprows, attrs, parse_dates, thousands, encoding, decimal, converters, na_values, keep_default_na, ...)` | Read HTML tables |
| `df.to_html(buf, columns, col_space, header, index, na_rep, formatters, float_format, sparsify, index_names, justify, max_rows, max_cols, show_dimensions, decimal, bold_rows, classes, escape, notebook, border, table_id, render_links, ...)` | Render as HTML |

### XML
| Function | Description |
|----------|-------------|
| `pd.read_xml(path, xpath, namespaces, elems_only, attrs_only, names, dtype, converters, parse_dates, encoding, parser, stylesheet, iterparse, compression, ...)` | Read XML |
| `df.to_xml(path, index, root_name, row_name, na_rep, attr_cols, elem_cols, namespaces, prefix, encoding, xml_declaration, pretty_print, parser, stylesheet, compression, ...)` | Render as XML |

### HDF5
| Function | Description |
|----------|-------------|
| `pd.read_hdf(path, key, mode, errors, where, start, stop, columns, iterator, chunksize, ...)` | Read from HDF5 |
| `df.to_hdf(path, key, mode, complevel, complib, append, format, index, min_itemsize, nan_rep, data_columns, ...)` | Write to HDF5 |
| `pd.HDFStore` | HDF5 file handle class |

### Feather
| Function | Description |
|----------|-------------|
| `pd.read_feather(path, columns, use_threads, storage_options, dtype_backend)` | Read Feather format |
| `df.to_feather(path, **kwargs)` | Write Feather format |

### Parquet
| Function | Description |
|----------|-------------|
| `pd.read_parquet(path, engine, columns, storage_options, use_nullable_dtypes, dtype_backend, filesystem, filters, ...)` | Read Parquet |
| `df.to_parquet(path, engine, compression, index, partition_cols, storage_options, ...)` | Write Parquet |

### ORC
| Function | Description |
|----------|-------------|
| `pd.read_orc(path, columns, dtype_backend, filesystem, ...)` | Read ORC |
| `df.to_orc(path, engine, index, engine_kwargs)` | Write ORC |

### Iceberg (experimental)
| Function | Description |
|----------|-------------|
| `pd.read_iceberg(table_identifier, catalog_name, ...)` | Read Iceberg table |
| `df.to_iceberg(table_identifier, catalog_name, ...)` | Write Iceberg table |

### SAS
| Function | Description |
|----------|-------------|
| `pd.read_sas(filepath, format, index, encoding, chunksize, iterator)` | Read SAS (XPORT or SAS7BDAT) |

### SPSS
| Function | Description |
|----------|-------------|
| `pd.read_spss(path, usecols, convert_categoricals, dtype_backend)` | Read SPSS file |

### SQL
| Function | Description |
|----------|-------------|
| `pd.read_sql(sql, con, index_col, coerce_float, params, parse_dates, columns, chunksize, dtype_backend, dtype)` | Read SQL query or table |
| `pd.read_sql_query(sql, con, index_col, coerce_float, params, parse_dates, chunksize, dtype, dtype_backend)` | Read SQL query |
| `pd.read_sql_table(table_name, con, schema, index_col, coerce_float, parse_dates, columns, chunksize, dtype_backend)` | Read SQL table |
| `df.to_sql(name, con, schema, if_exists, index, index_label, chunksize, dtype, method)` | Write to SQL |

### Stata
| Function | Description |
|----------|-------------|
| `pd.read_stata(filepath, convert_dates, convert_categoricals, index_col, convert_missing, preserve_dtypes, columns, order_categoricals, chunksize, iterator, compression, storage_options)` | Read Stata file |
| `df.to_stata(path, convert_dates, write_index, byteorder, time_stamp, data_label, variable_labels, version, convert_strl, compression, storage_options, value_labels)` | Write Stata file |

---

## Additional Notes for TypeScript Port

### Key Patterns
1. **Inplace operations** — many methods accept `inplace=True`; in TS this should return a new object or mutate based on design choice
2. **Axis parameter** — `axis=0` means rows, `axis=1` means columns; TS port should use clear named parameters
3. **`skipna`** — most aggregation functions default to skipping NaN; preserve this default
4. **Accessors** — `.str`, `.dt`, `.cat`, `.sparse`, `.list`, `.struct` are lazy proxy objects
5. **MultiIndex** — many methods accept `level` for MultiIndex operations

### Extension Accessors
| Accessor | Applies to |
|----------|-----------|
| `.str` | object/string dtype Series and Index |
| `.dt` | datetime64, timedelta64, Period Series |
| `.cat` | Categorical dtype Series |
| `.sparse` | Sparse arrays |
| `.list` | ArrowDtype list-type Series |
| `.struct` | ArrowDtype struct-type Series |

### Special Types to Implement
| Type | Description |
|------|-------------|
| `pd.NA` | Nullable NA (works with Int64, boolean, StringDtype) |
| `pd.NaT` | Missing timestamp value |
| `pd.Timestamp` | Scalar datetime |
| `pd.Timedelta` | Scalar timedelta |
| `pd.Period` | Single time span |
| `pd.Interval` | Single interval |
| `pd.Categorical` | Categorical data type |
| `pd.DatetimeTZDtype` | TZ-aware datetime dtype |
| `pd.CategoricalDtype` | Categorical dtype |
| `pd.IntervalDtype` | Interval dtype |
| `pd.PeriodDtype` | Period dtype |
| `pd.SparseDtype` | Sparse dtype |
| `pd.StringDtype` | String dtype |
| `pd.BooleanDtype` | Nullable boolean dtype |
| `pd.Int8Dtype` through `pd.UInt64Dtype` | Nullable integer dtypes |
| `pd.Float32Dtype`, `pd.Float64Dtype` | Nullable float dtypes |
