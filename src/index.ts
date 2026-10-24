/**
 * pandas-ts
 *
 * A pandas-compatible DataFrame & Series library for TypeScript and JavaScript.
 *
 * @packageDocumentation
 */

export { VERSION, info, isNativeAvailable } from './meta.js';
export type { ReleaseStage, Backend, BuildInfo } from './types.js';

// Core types
export { Series } from './series.js';
export { DataFrame } from './dataframe.js';

// DType system
export type { DType, DTypeKind } from './dtype.js';
export {
  int8, int16, int32, int64,
  uint8, uint16, uint32, uint64,
  float32, float64,
  bool_, string_, object_, datetime64, timedelta64, category,
  dtypes, normalizeDType,
} from './dtype.js';

// Errors
export {
  PandasTsError, ValueError, IndexError, KeyError,
  MergeError, OutOfBoundsDatetime, NotImplementedError, ParserError,
  MemoryError, AttributeError, DtypeError, EmptyDataError, OptionError,
} from './errors.js';
export { PandasTypeError as TypeError } from './errors.js';

// NA / NaT
export { NA, NaT, NaN_, isNA, isNaN_, isNaT, isMissing } from './na.js';

// Top-level convenience functions
export { concat, merge } from './functions.js';

// New types
export { Categorical } from './categorical.js';
export type { CategoricalOptions } from './categorical.js';
export { Period } from './period.js';
export type { PeriodFreq } from './period.js';
export { Interval, IntervalIndex } from './interval.js';
export type { IntervalClosed } from './interval.js';

// Top-level utility functions
export {
  cut, qcut, get_dummies, date_range, to_datetime, isna, notna, timedelta_range,
  to_numeric, to_timedelta, unique, value_counts, crosstab, factorize,
  wide_to_long, lreshape, json_normalize, interval_range, period_range,
  bdate_range, from_dummies, merge_ordered, merge_asof,
} from './functions.js';
export { Timedelta } from './timedelta.js';
export type { TimedeltaUnit } from './timedelta.js';
export { Timestamp } from './timestamp.js';

// Window functions
export { Rolling } from './window/rolling.js';
export { Expanding } from './window/expanding.js';
export { EWM } from './window/ewm.js';

// GroupBy
export { DataFrameGroupBy } from './groupby/dataframe_groupby.js';
export { SeriesGroupBy } from './groupby/series_groupby.js';

// IO functions
export {
  read_csv, to_csv, parseCsv, toCsvString,
  read_json, to_json, parseJson, toJsonString,
  read_parquet, to_parquet,
  read_excel, to_excel, read_excel_all_sheets,
  read_sql, read_sql_query, read_sql_table, to_sql,
  read_feather, to_feather,
  read_pickle, to_pickle,
  read_clipboard, to_clipboard,
  read_html, to_html,
  read_xml, to_xml,
  read_fwf,
  read_hdf, to_hdf,
  read_stata, to_stata,
} from './io/index.js';

// Accessors
export { StringAccessor } from './accessors/string_accessor.js';
export { DatetimeAccessor } from './accessors/datetime_accessor.js';
export { CategoricalAccessor } from './accessors/categorical_accessor.js';

// Index types
export { Index } from './index_types/index.js';
export { RangeIndex } from './index_types/range_index.js';
export { Int64Index } from './index_types/int64_index.js';
export { Float64Index } from './index_types/float64_index.js';
export { StringIndex } from './index_types/string_index.js';
export { DatetimeIndex } from './index_types/datetime_index.js';
export { MultiIndex } from './index_types/multi_index.js';

// Resample
export { DataFrameResampler, SeriesResampler } from './resample/resample.js';
export type { ResampleFreq, ResampleOptions } from './resample/resample.js';
