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
  read_excel, to_excel,
} from './io/index.js';

// Accessors
export { StringAccessor } from './accessors/string_accessor.js';
export { DatetimeAccessor } from './accessors/datetime_accessor.js';
export { CategoricalAccessor } from './accessors/categorical_accessor.js';
