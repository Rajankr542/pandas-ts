/**
 * NA / NaN / NaT constants and helpers.
 */

import { PandasTsError } from './errors.js';

/** The NA singleton (pandas-style NA, not NaN) */
class _NA {
  private static _instance: _NA;

  private constructor() {}

  static getInstance(): _NA {
    if (!_NA._instance) _NA._instance = new _NA();
    return _NA._instance;
  }

  // NA propagates through all operations
  toString(): string { return '<NA>'; }
  valueOf(): never { throw new PandasTsError('boolean value of NA is ambiguous'); }

  [Symbol.toPrimitive](hint: string): never | string {
    if (hint === 'string') return '<NA>';
    throw new PandasTsError('boolean value of NA is ambiguous');
  }
}

/** pandas NA singleton — propagates through operations */
export const NA = _NA.getInstance();

/** NaN constant (standard JS NaN) */
export const NaN_ = NaN;

/** NaT (Not a Time) — stored internally as BigInt MIN (matching pandas) */
export const NAT_VALUE = BigInt('-9223372036854775808'); // INT64_MIN

class _NaT {
  private static _instance: _NaT;
  private constructor() {}
  static getInstance(): _NaT {
    if (!_NaT._instance) _NaT._instance = new _NaT();
    return _NaT._instance;
  }
  toString(): string { return 'NaT'; }
}

/** NaT singleton for missing datetime values */
export const NaT = _NaT.getInstance();

/** Returns true if value is NA (the singleton) */
export function isNA(value: unknown): boolean {
  return value === NA;
}

/** Returns true if value is NaN (float NaN) */
export function isNaN_(value: unknown): boolean {
  return typeof value === 'number' && isNaN(value);
}

/** Returns true if value is NaT */
export function isNaT(value: unknown): boolean {
  return value === NaT;
}

/** Returns true if value is any kind of missing (NA, NaN, null, undefined, NaT) */
export function isMissing(value: unknown): boolean {
  return value === null ||
    value === undefined ||
    value === NA ||
    value === NaT ||
    (typeof value === 'number' && isNaN(value));
}
