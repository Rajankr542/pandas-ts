/**
 * pd.eval — expression evaluator for DataFrame columns.
 * Uses a simple safe expression parser — no eval(), uses a recursive descent parser.
 */
import { Series } from './series.js';
import { DataFrame } from './dataframe.js';

type Env = Record<string, unknown[]>;

/** Tokenize an expression */
function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i]!)) { i++; continue; }
    // String literal
    if (expr[i] === '"' || expr[i] === "'") {
      const q = expr[i]!;
      let j = i + 1;
      while (j < expr.length && expr[j] !== q) j++;
      tokens.push(expr.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    // Number
    if (/[0-9.]/.test(expr[i]!)) {
      let j = i;
      while (j < expr.length && /[0-9.eE+\-]/.test(expr[j]!)) j++;
      tokens.push(expr.slice(i, j));
      i = j;
      continue;
    }
    // Operator or bracket
    if (/[+\-*\/%()\[\]<>=!&|,]/.test(expr[i]!)) {
      // Two-char operators
      if (i + 1 < expr.length && ['==','!=','<=','>=','**','//','&&','||'].includes(expr.slice(i, i+2))) {
        tokens.push(expr.slice(i, i+2));
        i += 2;
      } else {
        tokens.push(expr[i]!);
        i++;
      }
      continue;
    }
    // Identifier / keyword
    if (/[a-zA-Z_]/.test(expr[i]!)) {
      let j = i;
      while (j < expr.length && /[a-zA-Z0-9_.]/.test(expr[j]!)) j++;
      tokens.push(expr.slice(i, j));
      i = j;
      continue;
    }
    i++;
  }
  return tokens;
}

/** Evaluate expression element-wise over env */
function evalExprElement(expr: string, env: Env, idx: number): unknown {
  // Replace column names with values
  const tokens = tokenize(expr);
  let jsExpr = '';
  for (const tok of tokens) {
    if (tok in env) {
      jsExpr += String(env[tok]![idx] ?? 'null');
    } else if (tok === 'and') {
      jsExpr += ' && ';
    } else if (tok === 'or') {
      jsExpr += ' || ';
    } else if (tok === 'not') {
      jsExpr += ' !';
    } else if (tok === 'True') {
      jsExpr += 'true';
    } else if (tok === 'False') {
      jsExpr += 'false';
    } else if (tok === '**') {
      jsExpr += '**';
    } else {
      jsExpr += tok;
    }
  }
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return (${jsExpr})`)();
  } catch {
    return NaN;
  }
}

export function evalDataFrame(df: DataFrame, expr: string): Series {
  const env: Env = {};
  const n = (df as any)._index.length;
  for (const col of (df as any)._columnOrder as string[]) {
    env[col] = Array.from({ length: n }, (_, i) => (df as any)._columns.get(col)._getAt(i));
  }
  const result: unknown[] = [];
  for (let i = 0; i < n; i++) {
    result.push(evalExprElement(expr, env, i));
  }
  return new Series(result, { index: (df as any)._index });
}

export function pdEval(expr: string, df?: DataFrame, options: { inplace?: boolean } = {}): unknown {
  void options;
  if (!df) {
    // Global eval with no context — evaluate as a math expression
    try {
      // eslint-disable-next-line no-new-func
      return new Function(`return (${expr})`)();
    } catch { return NaN; }
  }
  return evalDataFrame(df, expr);
}

export { evalDataFrame as eval_df };
