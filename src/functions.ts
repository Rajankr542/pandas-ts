/**
 * Top-level pandas-ts functions: concat, merge, etc.
 */

import { DataFrame } from './dataframe.js';

export function concat(dfs: DataFrame[], options: { axis?: 0 | 1; ignore_index?: boolean } = {}): DataFrame {
  return DataFrame.concat(dfs, options);
}

export function merge(
  left: DataFrame,
  right: DataFrame,
  options: {
    how?: 'inner' | 'left' | 'right' | 'outer';
    on?: string | string[];
    left_on?: string | string[];
    right_on?: string | string[];
  } = {}
): DataFrame {
  return left.merge(right, options);
}
