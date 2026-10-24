/**
 * Top-level pd.pivot_table and pd.melt functions.
 */
import { DataFrame } from './dataframe.js';

export function pivot_table(
  df: DataFrame,
  options: {
    values?: string | string[];
    index?: string | string[];
    columns?: string | string[];
    aggfunc?: string | ((vals: unknown[]) => unknown);
    fill_value?: unknown;
    margins?: boolean;
    margins_name?: string;
    dropna?: boolean;
    observed?: boolean;
  } = {}
): DataFrame {
  // Delegate to DataFrame.pivot_table
  return (df as any).pivot_table(options);
}

export function melt(
  df: DataFrame,
  options: {
    id_vars?: string | string[];
    value_vars?: string | string[];
    var_name?: string;
    value_name?: string;
    ignore_index?: boolean;
  } = {}
): DataFrame {
  return (df as any).melt(options);
}
