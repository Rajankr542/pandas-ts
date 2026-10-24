/**
 * DType system for pandas-ts.
 * Mirrors pandas dtype objects: pd.int64, pd.float64, etc.
 */

export type DTypeKind =
  | 'int'
  | 'uint'
  | 'float'
  | 'bool'
  | 'string'
  | 'datetime'
  | 'timedelta'
  | 'category'
  | 'object'
  | 'complex';

export interface DType {
  readonly name: string;
  readonly itemsize: number;
  readonly kind: DTypeKind;
}

function makeDType(name: string, itemsize: number, kind: DTypeKind): DType {
  return Object.freeze({ name, itemsize, kind });
}

// Signed integers
export const int8 = makeDType('int8', 1, 'int');
export const int16 = makeDType('int16', 2, 'int');
export const int32 = makeDType('int32', 4, 'int');
export const int64 = makeDType('int64', 8, 'int');

// Unsigned integers
export const uint8 = makeDType('uint8', 1, 'uint');
export const uint16 = makeDType('uint16', 2, 'uint');
export const uint32 = makeDType('uint32', 4, 'uint');
export const uint64 = makeDType('uint64', 8, 'uint');

// Floats
export const float32 = makeDType('float32', 4, 'float');
export const float64 = makeDType('float64', 8, 'float');

// Bool
export const bool_ = makeDType('bool', 1, 'bool');

// String / object
export const string_ = makeDType('string', 0, 'string');
export const object_ = makeDType('object', 0, 'object');

// Datetime / timedelta
export const datetime64 = makeDType('datetime64[ns]', 8, 'datetime');
export const timedelta64 = makeDType('timedelta64[ns]', 8, 'timedelta');

// Category
export const category = makeDType('category', 0, 'category');

/** All built-in dtypes by name */
export const dtypes: Readonly<Record<string, DType>> = {
  int8, int16, int32, int64,
  uint8, uint16, uint32, uint64,
  float32, float64,
  'bool': bool_,
  'bool_': bool_,
  string: string_,
  'string_': string_,
  object: object_,
  'object_': object_,
  'datetime64[ns]': datetime64,
  'datetime64': datetime64,
  'timedelta64[ns]': timedelta64,
  'timedelta64': timedelta64,
  category,
};

/**
 * Normalize a dtype specifier to a DType object.
 * Accepts a DType object, a string name, or a constructor (Number, String, Boolean, BigInt).
 */
export function normalizeDType(spec: DType | string | unknown): DType {
  if (typeof spec === 'object' && spec !== null && 'name' in spec && 'kind' in spec) {
    return spec as DType;
  }
  if (typeof spec === 'string') {
    const found = dtypes[spec];
    if (found) return found;
    throw new TypeError(`Unknown dtype: '${spec}'`);
  }
  if (spec === Number) return float64;
  if (spec === BigInt) return int64;
  if (spec === Boolean) return bool_;
  if (spec === String) return string_;
  throw new TypeError(`Cannot normalize dtype from: ${String(spec)}`);
}
