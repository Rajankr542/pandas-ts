/**
 * pandas.testing equivalents — assert_frame_equal, assert_series_equal, etc.
 * Throws AssertionError (extends Error) when assertions fail.
 */
import { Series } from './series.js';
import { DataFrame } from './dataframe.js';
import { isMissing } from './na.js';

export class AssertionError extends Error {
  constructor(message: string) { super(message); this.name = 'AssertionError'; }
}

export interface AssertOptions {
  check_dtype?: boolean;
  check_index_type?: boolean;
  check_names?: boolean;
  check_exact?: boolean;
  rtol?: number;
  atol?: number;
  check_like?: boolean;
  obj?: string;
}

function approxEqual(a: number, b: number, rtol = 1e-5, atol = 1e-8): boolean {
  if (isNaN(a) && isNaN(b)) return true;
  if (!isFinite(a) && !isFinite(b)) return a === b;
  return Math.abs(a - b) <= atol + rtol * Math.abs(b);
}

export function assert_series_equal(left: Series, right: Series, options: AssertOptions = {}): void {
  const rtol = options.rtol ?? 1e-5;
  const atol = options.atol ?? 1e-8;
  const checkDtype = options.check_dtype !== false;
  const checkNames = options.check_names !== false;
  const checkExact = options.check_exact ?? false;
  const obj = options.obj ?? 'Series';

  if ((left as any).size !== (right as any).size) {
    throw new AssertionError(`${obj} are different lengths: left=${(left as any).size}, right=${(right as any).size}`);
  }

  if (checkDtype) {
    const ld = (left as any)._dtype.name;
    const rd = (right as any)._dtype.name;
    if (ld !== rd) throw new AssertionError(`${obj} dtype mismatch: left=${ld}, right=${rd}`);
  }

  if (checkNames) {
    if ((left as any).name !== (right as any).name) {
      throw new AssertionError(`${obj} name mismatch: left=${(left as any).name}, right=${(right as any).name}`);
    }
  }

  // Check index
  const li = (left as any)._index as (string | number)[];
  const ri = (right as any)._index as (string | number)[];
  if (!options.check_like) {
    for (let i = 0; i < li.length; i++) {
      if (li[i] !== ri[i]) throw new AssertionError(`${obj} index mismatch at position ${i}: left=${li[i]}, right=${ri[i]}`);
    }
  }

  // Check values
  for (let i = 0; i < (left as any).size; i++) {
    const lv = (left as any)._getAt(i);
    const rv = (right as any)._getAt(i);
    if (isMissing(lv) && isMissing(rv)) continue;
    if (isMissing(lv) !== isMissing(rv)) {
      throw new AssertionError(`${obj} value mismatch at index ${li[i]}: left=${lv}, right=${rv}`);
    }
    if (typeof lv === 'number' && typeof rv === 'number') {
      if (checkExact) {
        if (lv !== rv) throw new AssertionError(`${obj} value mismatch at index ${li[i]}: left=${lv}, right=${rv}`);
      } else {
        if (!approxEqual(lv, rv, rtol, atol)) {
          throw new AssertionError(`${obj} value mismatch at index ${li[i]}: left=${lv}, right=${rv} (rtol=${rtol}, atol=${atol})`);
        }
      }
    } else {
      if (lv !== rv) throw new AssertionError(`${obj} value mismatch at index ${li[i]}: left=${lv}, right=${rv}`);
    }
  }
}

export function assert_frame_equal(left: DataFrame, right: DataFrame, options: AssertOptions = {}): void {
  const obj = options.obj ?? 'DataFrame';

  if (left.shape[0] !== right.shape[0] || left.shape[1] !== right.shape[1]) {
    throw new AssertionError(`${obj} shape mismatch: left=${JSON.stringify(left.shape)}, right=${JSON.stringify(right.shape)}`);
  }

  const lCols = (left as any)._columnOrder as string[];
  const rCols = (right as any)._columnOrder as string[];

  if (!options.check_like) {
    for (let i = 0; i < lCols.length; i++) {
      if (lCols[i] !== rCols[i]) throw new AssertionError(`${obj} column mismatch at position ${i}: left=${lCols[i]}, right=${rCols[i]}`);
    }
  }

  for (const col of lCols) {
    const ls = (left as any)._columns.get(col);
    const rs = (right as any)._columns.get(col);
    if (!rs) throw new AssertionError(`${obj} missing column in right: ${col}`);
    assert_series_equal(ls, rs, { ...options, obj: `${obj}[${col}]` });
  }
}

export function assert_index_equal(left: (string | number)[], right: (string | number)[], options: AssertOptions = {}): void {
  void options;
  if (left.length !== right.length) {
    throw new AssertionError(`Index lengths differ: left=${left.length}, right=${right.length}`);
  }
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) throw new AssertionError(`Index mismatch at ${i}: left=${left[i]}, right=${right[i]}`);
  }
}

export function assert_numpy_array_equal(left: unknown[], right: unknown[], options: AssertOptions = {}): void {
  if (left.length !== right.length) throw new AssertionError(`Array length mismatch: ${left.length} vs ${right.length}`);
  for (let i = 0; i < left.length; i++) {
    const lv = left[i], rv = right[i];
    if (typeof lv === 'number' && typeof rv === 'number' && !options.check_exact) {
      if (!approxEqual(lv, rv, options.rtol ?? 1e-5, options.atol ?? 1e-8)) {
        throw new AssertionError(`Array mismatch at [${i}]: ${lv} != ${rv}`);
      }
    } else if (lv !== rv) {
      throw new AssertionError(`Array mismatch at [${i}]: ${lv} != ${rv}`);
    }
  }
}

export const testing = { assert_series_equal, assert_frame_equal, assert_index_equal, assert_numpy_array_equal };
