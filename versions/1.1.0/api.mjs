// API reference data for pandas-ts 1.0.0
// Each entry: { name, sig, desc, returns, args?, example }

export const categories = [
  {
    id: "series",
    title: "Series",
    intro: "A one-dimensional labeled array capable of holding any data type. The axis labels are collectively referred to as the index.",
    entries: [
      {
        name: "new Series",
        sig: "new Series(data, options?)",
        desc: "Construct a Series. `data` can be an array, object, typed array, or another Series. `options.index` sets the index labels; `options.name` names the Series; `options.dtype` overrides dtype inference.",
        returns: "Series",
        args: [
          { name: "data", type: "unknown[] | TypedArray | Record<string, unknown>", desc: "The data for the Series." },
          { name: "options?", type: "{ index?, name?, dtype? }", desc: "Construction options." }
        ],
        example: `import { Series } from 'pandas-ts';
const s = new Series([1, 2, 3, 4, 5], { name: 'numbers' });
s.mean();    // => 3
s.std();     // => 1.5811388300841898`
      },
      {
        name: "Series#size",
        sig: "s.size",
        desc: "Return the number of elements in the Series.",
        returns: "number",
        example: `const s = new Series([10, 20, 30]);
s.size;    // => 3`
      },
      {
        name: "Series#dtype",
        sig: "s.dtype",
        desc: "Return the dtype of the underlying data.",
        returns: "DType",
        example: `new Series([1, 2, 3]).dtype.name;        // => 'int64'
new Series([1.5, 2.5]).dtype.name;      // => 'float64'
new Series(['a', 'b']).dtype.name;      // => 'object'`
      },
      {
        name: "Series#mean",
        sig: "s.mean(options?)",
        desc: "Return the mean of the values, excluding NaN by default.",
        returns: "number",
        example: `new Series([1, 2, 3, 4, 5]).mean();    // => 3`
      },
      {
        name: "Series#std",
        sig: "s.std(options?)",
        desc: "Return the sample standard deviation (ddof=1 by default).",
        returns: "number",
        example: `new Series([1, 2, 3, 4, 5]).std();    // => 1.5811388300841898`
      },
      {
        name: "Series#sum",
        sig: "s.sum()",
        desc: "Return the sum of the values.",
        returns: "number",
        example: `new Series([1, 2, 3, 4, 5]).sum();    // => 15`
      },
      {
        name: "Series#min",
        sig: "s.min()",
        desc: "Return the minimum value.",
        returns: "unknown",
        example: `new Series([3, 1, 2]).min();    // => 1`
      },
      {
        name: "Series#max",
        sig: "s.max()",
        desc: "Return the maximum value.",
        returns: "unknown",
        example: `new Series([3, 1, 2]).max();    // => 3`
      },
      {
        name: "Series#median",
        sig: "s.median()",
        desc: "Return the median of the values.",
        returns: "number",
        example: `new Series([1, 3, 2]).median();    // => 2`
      },
      {
        name: "Series#quantile",
        sig: "s.quantile(q)",
        desc: "Return value at the given quantile (0–1).",
        returns: "number",
        args: [{ name: "q", type: "number", desc: "Quantile between 0 and 1." }],
        example: `new Series([1, 2, 3, 4, 5]).quantile(0.5);    // => 3`
      },
      {
        name: "Series#head",
        sig: "s.head(n?)",
        desc: "Return the first n rows. Default n is 5.",
        returns: "Series",
        example: `new Series([1,2,3,4,5,6]).head(3).to_list();    // => [1, 2, 3]`
      },
      {
        name: "Series#tail",
        sig: "s.tail(n?)",
        desc: "Return the last n rows. Default n is 5.",
        returns: "Series",
        example: `new Series([1,2,3,4,5,6]).tail(3).to_list();    // => [4, 5, 6]`
      },
      {
        name: "Series#iloc",
        sig: "s.iloc(i)",
        desc: "Purely integer-location based indexing for selection by position.",
        returns: "unknown",
        example: `const s = new Series([10, 20, 30], { index: ['a', 'b', 'c'] });
s.iloc(1);    // => 20`
      },
      {
        name: "Series#loc",
        sig: "s.loc(label)",
        desc: "Access a group of rows and columns by label(s).",
        returns: "unknown",
        example: `const s = new Series([10, 20, 30], { index: ['a', 'b', 'c'] });
s.loc('b');    // => 20`
      },
      {
        name: "Series#fillna",
        sig: "s.fillna(value)",
        desc: "Fill NA/NaN values with the specified value or method.",
        returns: "Series",
        example: `import { Series } from 'pandas-ts';
const s = new Series([1, NaN, 3]);
s.fillna(0).to_list();    // => [1, 0, 3]`
      },
      {
        name: "Series#dropna",
        sig: "s.dropna()",
        desc: "Return a new Series with missing values removed.",
        returns: "Series",
        example: `new Series([1, NaN, 3]).dropna().to_list();    // => [1, 3]`
      },
      {
        name: "Series#sort_values",
        sig: "s.sort_values(options?)",
        desc: "Sort by the values.",
        returns: "Series",
        example: `new Series([3,1,2]).sort_values().to_list();    // => [1, 2, 3]`
      },
      {
        name: "Series#value_counts",
        sig: "s.value_counts(options?)",
        desc: "Return a Series containing counts of unique values, sorted by frequency.",
        returns: "Series",
        example: `new Series(['a','b','a','c','b','b']).value_counts().to_list();    // => [3, 2, 1]`
      },
      {
        name: "Series#apply",
        sig: "s.apply(fn)",
        desc: "Apply a function element-wise.",
        returns: "Series",
        example: `new Series([1, 2, 3]).apply(x => x ** 2).to_list();    // => [1, 4, 9]`
      },
      {
        name: "Series#map",
        sig: "s.map(mapping)",
        desc: "Map values using an input correspondence or function.",
        returns: "Series",
        example: `new Series(['a','b','c']).map({ a: 1, b: 2, c: 3 }).to_list();    // => [1, 2, 3]`
      },
      {
        name: "Series#groupby",
        sig: "s.groupby(by)",
        desc: "Group the Series using a mapper or by a Series of values.",
        returns: "SeriesGroupBy",
        example: `const s = new Series([1, 2, 3, 4], { index: ['a','b','a','b'] });
s.groupby(s.index).sum().to_list();    // => [4, 6]`
      },
      {
        name: "Series#rolling",
        sig: "s.rolling(window)",
        desc: "Provide rolling window calculations.",
        returns: "RollingWindow",
        example: `new Series([1,2,3,4,5]).rolling(3).mean().to_list();    // => [NaN, NaN, 2, 3, 4]`
      },
      {
        name: "Series#cumsum",
        sig: "s.cumsum()",
        desc: "Return cumulative sum.",
        returns: "Series",
        example: `new Series([1, 2, 3]).cumsum().to_list();    // => [1, 3, 6]`
      },
      {
        name: "Series#diff",
        sig: "s.diff(periods?)",
        desc: "First discrete difference of element.",
        returns: "Series",
        example: `new Series([1, 3, 6, 10]).diff().to_list();    // => [NaN, 2, 3, 4]`
      },
      {
        name: "Series#corr",
        sig: "s.corr(other)",
        desc: "Compute Pearson correlation with another Series.",
        returns: "number",
        example: `const a = new Series([1,2,3,4,5]);
const b = new Series([2,4,6,8,10]);
a.corr(b);    // => 1`
      },
      {
        name: "Series#add",
        sig: "s.add(other)",
        desc: "Element-wise addition. `other` can be a scalar or another Series.",
        returns: "Series",
        example: `new Series([1, 2, 3]).add(10).to_list();    // => [11, 12, 13]
new Series([1, 2, 3]).add(new Series([4, 5, 6])).to_list();    // => [5, 7, 9]`
      },
      {
        name: "Series#sub",
        sig: "s.sub(other)",
        desc: "Element-wise subtraction.",
        returns: "Series",
        example: `new Series([10, 20, 30]).sub(5).to_list();    // => [5, 15, 25]`
      },
      {
        name: "Series#mul",
        sig: "s.mul(other)",
        desc: "Element-wise multiplication.",
        returns: "Series",
        example: `new Series([1, 2, 3]).mul(3).to_list();    // => [3, 6, 9]`
      },
      {
        name: "Series#div",
        sig: "s.div(other)",
        desc: "Element-wise true division.",
        returns: "Series",
        example: `new Series([10, 20, 30]).div(2).to_list();    // => [5, 10, 15]`
      },
      {
        name: "Series#pow",
        sig: "s.pow(exp)",
        desc: "Element-wise exponentiation.",
        returns: "Series",
        example: `new Series([2, 3, 4]).pow(2).to_list();    // => [4, 9, 16]`
      },
      {
        name: "Series#abs",
        sig: "s.abs()",
        desc: "Return Series with absolute numeric value of each element.",
        returns: "Series",
        example: `new Series([-1, 2, -3]).abs().to_list();    // => [1, 2, 3]`
      },
      {
        name: "Series#round",
        sig: "s.round(decimals?)",
        desc: "Round each value to the given number of decimals.",
        returns: "Series",
        example: `new Series([1.234, 5.678]).round(2).to_list();    // => [1.23, 5.68]`
      },
      {
        name: "Series#clip",
        sig: "s.clip(lower?, upper?)",
        desc: "Trim values at input threshold(s).",
        returns: "Series",
        example: `new Series([1, 5, 10, 15]).clip(3, 12).to_list();    // => [3, 5, 10, 12]`
      },
      {
        name: "Series#unique",
        sig: "s.unique()",
        desc: "Return unique values as an array.",
        returns: "unknown[]",
        example: `new Series([1, 2, 2, 3, 3, 3]).unique();    // => [1, 2, 3]`
      },
      {
        name: "Series#nunique",
        sig: "s.nunique()",
        desc: "Return the number of unique elements in the Series.",
        returns: "number",
        example: `new Series([1, 2, 2, 3]).nunique();    // => 3`
      },
      {
        name: "Series#isna",
        sig: "s.isna()",
        desc: "Detect missing values. Returns a boolean Series.",
        returns: "Series",
        example: `new Series([1, NaN, null, 4]).isna().to_list();    // => [false, true, true, false]`
      },
      {
        name: "Series#notna",
        sig: "s.notna()",
        desc: "Detect existing (non-missing) values.",
        returns: "Series",
        example: `new Series([1, NaN, 3]).notna().to_list();    // => [true, false, true]`
      },
      {
        name: "Series#describe",
        sig: "s.describe()",
        desc: "Generate descriptive statistics: count, mean, std, min, 25%, 50%, 75%, max.",
        returns: "Series",
        example: `new Series([1,2,3,4,5]).describe().index;
// => ['count','mean','std','min','25%','50%','75%','max']`
      },
      {
        name: "Series#to_list",
        sig: "s.to_list()",
        desc: "Return the Series as a plain JavaScript array.",
        returns: "unknown[]",
        example: `new Series([1, 2, 3]).to_list();    // => [1, 2, 3]`
      },
      {
        name: "Series#norm",
        sig: "s.norm(ord?)",
        desc: "Compute vector norm (powered by @cyfora/numera). Default L2 norm.",
        returns: "number",
        args: [{ name: "ord", type: "number", desc: "Order of the norm. Default 2." }],
        example: `new Series([3, 4]).norm();    // => 5`
      },
      {
        name: "Series#hist",
        sig: "s.hist(bins?, options?)",
        desc: "Compute histogram (powered by @cyfora/numera). Returns bin counts and edges.",
        returns: "{ hist: number[], edges: number[] }",
        example: `const { hist, edges } = new Series([1,2,2,3,3,3]).hist(3);
hist;     // => [1, 2, 3]
edges.length;    // => 4`
      },
      {
        name: "Series#percentile",
        sig: "s.percentile(q)",
        desc: "Return value at the given percentile (0–100 scale), powered by @cyfora/numera.",
        returns: "number",
        example: `new Series([1,2,3,4,5]).percentile(50);    // => 3`
      },
      {
        name: "Series#interp",
        sig: "s.interp(xp, fp)",
        desc: "One-dimensional linear interpolation (powered by @cyfora/numera). Treats the Series values as x-coordinates.",
        returns: "Series",
        example: `new Series([0, 1, 2]).interp([0, 1, 2], [0, 10, 20]).to_list();    // => [0, 10, 20]`
      },
      {
        name: "Series#at_time",
        sig: "s.at_time(time)",
        desc: "Select values at a particular time of day from a datetime-indexed Series. `time` is a string in 'HH:MM' format.",
        returns: "Series",
        example: `const dates = [new Date('2024-01-01T09:00:00'), new Date('2024-01-01T12:00:00')];
const s = new Series([10, 20], { index: dates });
s.at_time('09:00').to_list();    // => [10]`
      },
      {
        name: "Series#between_time",
        sig: "s.between_time(start_time, end_time)",
        desc: "Select values between two times of day from a datetime-indexed Series. Both arguments are 'HH:MM' strings. Handles midnight wrap-around.",
        returns: "Series",
        example: `s.between_time('08:00', '10:00').to_list();    // values in that time window`
      },
      {
        name: "Series#tz_convert",
        sig: "s.tz_convert(tz)",
        desc: "Convert a datetime Series to a different timezone. Uses `Intl.DateTimeFormat` to re-express each `Date` value in the target timezone.",
        returns: "Series",
        example: `const s = new Series([new Date('2024-06-01T15:00:00Z')]);
s.tz_convert('America/New_York').iloc(0).getHours();    // => 11`
      },
      {
        name: "Series#tz_localize",
        sig: "s.tz_localize(tz)",
        desc: "Attach timezone metadata to a naive datetime Series. Passing `null` strips the timezone. The return value carries a `_tz` property.",
        returns: "Series",
        example: `const s = new Series([new Date('2024-01-01T12:00:00')]);
const loc = s.tz_localize('UTC');`
      },
      {
        name: "Series#unstack",
        sig: "s.unstack(level?)",
        desc: "Pivot a MultiIndex (tuple) index level into columns, producing a DataFrame-like object. `level` defaults to -1 (innermost).",
        returns: "DataFrame-like",
        example: `const s = new Series([1,2,3,4], { index: [['a',0],['a',1],['b',0],['b',1]] });
const df = s.unstack();    // columns: [0, 1], index: ['a', 'b']`
      }
    ]
  },
  {
    id: "dataframe",
    title: "DataFrame",
    intro: "Two-dimensional, size-mutable, potentially heterogeneous tabular data. Contains labeled axes (rows and columns).",
    entries: [
      {
        name: "new DataFrame",
        sig: "new DataFrame(data, options?)",
        desc: "Construct a DataFrame from an object of arrays, an array of objects, another DataFrame, or a 2D array.",
        returns: "DataFrame",
        args: [
          { name: "data", type: "Record<string, unknown[]> | object[] | DataFrame | unknown[][]", desc: "The data." },
          { name: "options?", type: "{ index?, columns? }", desc: "Construction options." }
        ],
        example: `import { DataFrame } from 'pandas-ts';
const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
df.shape;    // => [3, 2]`
      },
      {
        name: "DataFrame#shape",
        sig: "df.shape",
        desc: "Return a [rows, columns] tuple.",
        returns: "[number, number]",
        example: `new DataFrame({ x: [1,2,3], y: [4,5,6] }).shape;    // => [3, 2]`
      },
      {
        name: "DataFrame#columns",
        sig: "df.columns",
        desc: "Return the column labels of the DataFrame.",
        returns: "string[]",
        example: `new DataFrame({ a: [1], b: [2], c: [3] }).columns;    // => ['a', 'b', 'c']`
      },
      {
        name: "DataFrame#index",
        sig: "df.index",
        desc: "Return the row labels of the DataFrame.",
        returns: "unknown[]",
        example: `new DataFrame({ a: [1,2,3] }).index;    // => [0, 1, 2]`
      },
      {
        name: "DataFrame#dtypes",
        sig: "df.dtypes",
        desc: "Return a Series with the dtype of each column.",
        returns: "Record<string, DType>",
        example: `const df = new DataFrame({ a: [1,2], b: ['x','y'] });
df.dtypes;    // => { a: DType('int64'), b: DType('object') }`
      },
      {
        name: "DataFrame#head",
        sig: "df.head(n?)",
        desc: "Return the first n rows. Default n is 5.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1,2,3,4,5,6] });
df.head(3).shape;    // => [3, 1]`
      },
      {
        name: "DataFrame#tail",
        sig: "df.tail(n?)",
        desc: "Return the last n rows.",
        returns: "DataFrame",
        example: `new DataFrame({ a: [1,2,3,4,5,6] }).tail(2).shape;    // => [2, 1]`
      },
      {
        name: "DataFrame#describe",
        sig: "df.describe()",
        desc: "Generate descriptive statistics for numeric columns: count, mean, std, min, 25%, 50%, 75%, max.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1,2,3,4,5] });
df.describe().index;    // => ['count','mean','std','min','25%','50%','75%','max']`
      },
      {
        name: "DataFrame#col",
        sig: "df.col(name)",
        desc: "Select a single column by name, returning it as a Series.",
        returns: "Series",
        args: [{ name: "name", type: "string", desc: "Column name." }],
        example: `const df = new DataFrame({ a: [1,2,3], b: [4,5,6] });
df.col('a').to_list();    // => [1, 2, 3]`
      },
      {
        name: "DataFrame#assign",
        sig: "df.assign(cols)",
        desc: "Assign new columns to a DataFrame. Returns a new DataFrame with all existing columns plus any new ones.",
        returns: "DataFrame",
        args: [{ name: "cols", type: "Record<string, Series | unknown[]>", desc: "Columns to assign." }],
        example: `const df = new DataFrame({ a: [1,2,3] });
df.assign({ b: df.col('a').mul(2) }).columns;    // => ['a', 'b']`
      },
      {
        name: "DataFrame#drop",
        sig: "df.drop(labels, options?)",
        desc: "Drop specified labels from rows or columns.",
        returns: "DataFrame",
        args: [
          { name: "labels", type: "string | string[]", desc: "Labels to drop." },
          { name: "options?", type: "{ axis? }", desc: "axis=0 (rows) or axis=1 (columns). Default 0." }
        ],
        example: `const df = new DataFrame({ a: [1,2], b: [3,4], c: [5,6] });
df.drop(['b'], { axis: 1 }).columns;    // => ['a', 'c']`
      },
      {
        name: "DataFrame#rename",
        sig: "df.rename(mapping)",
        desc: "Rename columns using a mapping.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1,2], b: [3,4] });
df.rename({ a: 'alpha', b: 'beta' }).columns;    // => ['alpha', 'beta']`
      },
      {
        name: "DataFrame#fillna",
        sig: "df.fillna(value)",
        desc: "Fill NA/NaN values.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1, NaN, 3] });
df.fillna(0).col('a').to_list();    // => [1, 0, 3]`
      },
      {
        name: "DataFrame#dropna",
        sig: "df.dropna(options?)",
        desc: "Remove missing values.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1, NaN, 3], b: [4, 5, NaN] });
df.dropna().shape;    // => [1, 2]`
      },
      {
        name: "DataFrame#groupby",
        sig: "df.groupby(by, options?)",
        desc: "Group the DataFrame by one or more columns.",
        returns: "DataFrameGroupBy",
        example: `const df = new DataFrame({ city: ['A','B','A'], sales: [100, 200, 150] });
df.groupby('city').sum().col('sales').to_list();    // => [250, 200]`
      },
      {
        name: "DataFrame#merge",
        sig: "df.merge(right, options?)",
        desc: "Merge DataFrame objects with a database-style join.",
        returns: "DataFrame",
        args: [
          { name: "right", type: "DataFrame", desc: "Right DataFrame to merge." },
          { name: "options?", type: "{ on?, how?, left_on?, right_on? }", desc: "Merge options. how defaults to 'inner'." }
        ],
        example: `const left = new DataFrame({ id: [1,2], name: ['Alice','Bob'] });
const right = new DataFrame({ id: [1,2], score: [90, 85] });
left.merge(right, { on: 'id' }).col('score').to_list();    // => [90, 85]`
      },
      {
        name: "DataFrame#pivot_table",
        sig: "df.pivot_table(options)",
        desc: "Create a spreadsheet-style pivot table as a DataFrame.",
        returns: "DataFrame",
        example: `const df = new DataFrame({
  city: ['A','A','B','B'],
  year: [2023,2024,2023,2024],
  sales: [100,120,200,180]
});
const pt = df.pivot_table({ index: 'city', columns: 'year', values: 'sales', aggfunc: 'sum' });
pt.shape;    // => [2, 2]`
      },
      {
        name: "DataFrame#melt",
        sig: "df.melt(options?)",
        desc: "Unpivot a DataFrame from wide to long format.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ id: [1,2], jan: [100,200], feb: [110,210] });
const melted = df.melt({ id_vars: 'id', value_vars: ['jan','feb'], var_name: 'month', value_name: 'sales' });
melted.shape;    // => [4, 3]`
      },
      {
        name: "DataFrame#sort_values",
        sig: "df.sort_values(by, options?)",
        desc: "Sort by the values along either axis.",
        returns: "DataFrame",
        args: [
          { name: "by", type: "string | string[]", desc: "Column(s) to sort by." },
          { name: "options?", type: "{ ascending? }", desc: "Sort direction." }
        ],
        example: `const df = new DataFrame({ a: [3,1,2], b: ['c','a','b'] });
df.sort_values('a').col('a').to_list();    // => [1, 2, 3]`
      },
      {
        name: "DataFrame#query",
        sig: "df.query(expr)",
        desc: "Query the columns of a DataFrame with a boolean expression string.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1,2,3,4,5], b: [10,20,30,40,50] });
df.query('a > 3').col('a').to_list();    // => [4, 5]`
      },
      {
        name: "DataFrame#evalExpr",
        sig: "df.evalExpr(expr)",
        desc: "Evaluate an expression against the DataFrame columns. Returns a Series with the result. (Note: named `evalExpr` because `eval` is reserved in JavaScript.)",
        returns: "Series",
        example: `const df = new DataFrame({ a: [1,2,3], b: [4,5,6] });
df.evalExpr('a + b').to_list();    // => [5, 7, 9]`
      },
      {
        name: "DataFrame#corr",
        sig: "df.corr(method?)",
        desc: "Compute pairwise Pearson correlation of columns.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1,2,3,4], b: [2,4,6,8] });
df.corr().col('a').iloc(1);    // => 1  (perfect correlation)`
      },
      {
        name: "DataFrame#cov_matrix",
        sig: "df.cov_matrix(min_periods?, ddof?)",
        desc: "Compute pairwise covariance of columns (powered by numera).",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1,2,3,4,5] });
df.cov_matrix().col('a').iloc(0);    // => 2.5`
      },
      {
        name: "DataFrame#to_csv",
        sig: "df.to_csv(path?, options?)",
        desc: "Write DataFrame to a CSV file or return as a string.",
        returns: "string | void",
        example: `const df = new DataFrame({ a: [1,2], b: [3,4] });
df.to_csv();    // => 'a,b\\n1,3\\n2,4\\n'`
      },
      {
        name: "DataFrame#to_json",
        sig: "df.to_json(path?, options?)",
        desc: "Convert the DataFrame to a JSON string.",
        returns: "string | void",
        example: `new DataFrame({ a: [1,2] }).to_json();
// => '[{"a":1},{"a":2}]'`
      },
      {
        name: "DataFrame#T",
        sig: "df.T",
        desc: "Transpose the DataFrame (swap rows and columns).",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1,2], b: [3,4] });
df.T.shape;    // => [2, 2]`
      },
      {
        name: "DataFrame#sum (axis=1)",
        sig: "df.sum(axis?)",
        desc: "Sum of values. When `axis=0` (default) returns a column-wise record. When `axis=1` returns a row-wise Series.",
        returns: "Record<string,number> | Series",
        example: `const df = new DataFrame({ a: [1,2], b: [3,4] });
df.sum(1).to_list();    // => [4, 6]`
      },
      {
        name: "DataFrame#mean (axis=1)",
        sig: "df.mean(axis?)",
        desc: "Mean of values. When `axis=1` returns a row-wise Series.",
        returns: "Record<string,number> | Series",
        example: `df.mean(1).to_list();    // => [2, 3]`
      },
      {
        name: "DataFrame#dropna (axis=1)",
        sig: "df.dropna({ axis?, how?, thresh? })",
        desc: "Remove missing values. `axis=1` drops columns (instead of rows) that contain NA values according to `how`/`thresh`.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1, null], b: [3, 4] });
df.dropna({ axis: 1 }).columns;    // => ['b']`
      },
      {
        name: "DataFrame#concat (axis=1)",
        sig: "DataFrame.concat(dfs, { axis? })",
        desc: "Concatenate DataFrames. `axis=1` stacks them side-by-side (column-wise). Duplicate column names are auto-suffixed with `_1`, `_2`, etc.",
        returns: "DataFrame",
        example: `const df1 = new DataFrame({ a: [1,2] });
const df2 = new DataFrame({ b: [3,4] });
DataFrame.concat([df1, df2], { axis: 1 }).columns;    // => ['a','b']`
      },
      {
        name: "DataFrame#to_dict",
        sig: "df.to_dict(orient?)",
        desc: "Convert the DataFrame to a dictionary. `orient` controls the output shape: `'dict'` (default), `'list'`, `'records'`, `'series'`, `'split'`, `'index'`.",
        returns: "object",
        example: `const df = new DataFrame({ a: [1,2], b: [3,4] });
df.to_dict('records');    // => [{ a:1, b:3 }, { a:2, b:4 }]
df.to_dict('split');      // => { index:[0,1], columns:['a','b'], data:[[1,3],[2,4]] }`
      },
      {
        name: "DataFrame#to_string",
        sig: "df.to_string({ index?, max_rows?, max_cols? })",
        desc: "Render the DataFrame to a tab-separated string suitable for console output. Truncates to `max_rows` / `max_cols` with `...` indicators.",
        returns: "string",
        example: `const df = new DataFrame({ x: [1,2,3], y: [4,5,6] });
console.log(df.to_string({ max_rows: 10 }));`
      },
      {
        name: "DataFrame#convert_dtypes",
        sig: "df.convert_dtypes()",
        desc: "Convert columns to the best possible dtype. String/object columns whose values are all numeric strings are promoted to `float64`.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: ['1','2','3'], b: ['x','y','z'] });
df.convert_dtypes().col('a').dtype.name;    // => 'float64'`
      },
      {
        name: "DataFrame#corr_matrix (spearman)",
        sig: "df.corr_matrix(method?, min_periods?)",
        desc: "Compute pairwise correlation. Supports `'pearson'` (default) and `'spearman'` (rank-based). Returns a square DataFrame.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ a: [1,2,3,4], b: [4,3,2,1] });
df.corr_matrix('spearman').col('b').iloc(0);    // => -1`
      }
    ]
  },
  {
    id: "functions",
    title: "Top-level functions",
    intro: "Functions available directly on the `pd` namespace (the default export), mirroring pandas top-level functions.",
    entries: [
      {
        name: "pd.concat",
        sig: "pd.concat(objs, options?)",
        desc: "Concatenate pandas objects along a particular axis.",
        returns: "DataFrame | Series",
        example: `import pd from 'pandas-ts';
const a = new pd.DataFrame({ x: [1,2] });
const b = new pd.DataFrame({ x: [3,4] });
pd.concat([a, b]).shape;    // => [4, 1]`
      },
      {
        name: "pd.merge",
        sig: "pd.merge(left, right, options?)",
        desc: "Merge DataFrame or named Series objects with a database-style join.",
        returns: "DataFrame",
        example: `const left = new pd.DataFrame({ id: [1,2], val: ['a','b'] });
const right = new pd.DataFrame({ id: [1,2], score: [10,20] });
pd.merge(left, right, { on: 'id' }).shape;    // => [2, 3]`
      },
      {
        name: "pd.date_range",
        sig: "pd.date_range(start, options)",
        desc: "Return a fixed frequency DatetimeIndex.",
        returns: "DatetimeIndex",
        example: `pd.date_range('2024-01-01', { periods: 5, freq: 'D' }).length;    // => 5`
      },
      {
        name: "pd.to_datetime",
        sig: "pd.to_datetime(arg, options?)",
        desc: "Convert argument to datetime.",
        returns: "Timestamp | DatetimeIndex",
        example: `pd.to_datetime('2024-01-15').year;    // => 2024`
      },
      {
        name: "pd.read_csv",
        sig: "pd.read_csv(path, options?)",
        desc: "Read a comma-separated values (CSV) file into a DataFrame.",
        returns: "DataFrame",
        example: `// Node.js only
const df = pd.read_csv('data.csv');
df.columns;    // column names from the header row`
      },
      {
        name: "pd.isna",
        sig: "pd.isna(obj)",
        desc: "Detect missing values. Returns boolean Series/DataFrame/scalar.",
        returns: "boolean | Series | DataFrame",
        example: `import { isna } from 'pandas-ts';
isna(null);        // => true
isna(NaN);         // => true
isna(0);           // => false`
      },
      {
        name: "pd.notna",
        sig: "pd.notna(obj)",
        desc: "Detect non-missing values. Inverse of `isna`.",
        returns: "boolean | Series | DataFrame",
        example: `import { notna } from 'pandas-ts';
notna(1);       // => true
notna(NaN);     // => false`
      },
      {
        name: "pd.cut",
        sig: "pd.cut(x, bins, options?)",
        desc: "Bin values into discrete intervals.",
        returns: "Series",
        example: `import { cut } from 'pandas-ts';
cut(new pd.Series([1,2,3,4,5]), 2).dtype.name;    // => 'category'`
      },
      {
        name: "pd.qcut",
        sig: "pd.qcut(x, q, options?)",
        desc: "Quantile-based discretization function.",
        returns: "Series",
        example: `import { qcut } from 'pandas-ts';
qcut(new pd.Series([1,2,3,4,5,6,7,8,9,10]), 4).nunique();    // => 4`
      },
      {
        name: "pd.get_dummies",
        sig: "pd.get_dummies(data, options?)",
        desc: "Convert categorical variable into dummy/indicator variables.",
        returns: "DataFrame",
        example: `pd.get_dummies(new pd.Series(['a','b','a'])).shape;    // => [3, 2]`
      },
      {
        name: "pd.crosstab",
        sig: "pd.crosstab(index, columns, options?)",
        desc: "Compute a cross-tabulation of two (or more) factors.",
        returns: "DataFrame",
        example: `const idx = new pd.Series(['a','a','b','b']);
const col = new pd.Series([1,2,1,2]);
pd.crosstab(idx, col).shape;    // => [2, 2]`
      },
      {
        name: "pd.eval",
        sig: "pd.eval(expr, df?)",
        desc: "Evaluate an expression string. With a DataFrame, evaluates column expressions. Without one, evaluates scalar math.",
        returns: "Series | number",
        example: `import { pdEval } from 'pandas-ts';
pdEval('2 + 3');    // => 5
pdEval('a + b', new pd.DataFrame({ a: [1,2], b: [3,4] })).to_list();    // => [4, 6]`
      },
      {
        name: "pd.infer_freq",
        sig: "pd.infer_freq(dates)",
        desc: "Infer the most likely frequency of a DatetimeIndex.",
        returns: "string | null",
        example: `import { infer_freq } from 'pandas-ts';
infer_freq(['2024-01-01','2024-01-02','2024-01-03']);    // => 'D'
infer_freq(['2024-01-01','2024-02-01','2024-03-01']);    // => 'MS'`
      },
      {
        name: "pd.wide_to_long",
        sig: "pd.wide_to_long(df, stubnames, i, j, options?)",
        desc: "Wide panel to long format. Less flexible but more user-friendly than melt.",
        returns: "DataFrame",
        example: `const df = new pd.DataFrame({
  id: [1, 2],
  sales_2023: [100, 200],
  sales_2024: [110, 220],
});
pd.wide_to_long(df, ['sales'], 'id', 'year').shape;    // => [4, 2]`
      },
      {
        name: "pd.json_normalize",
        sig: "pd.json_normalize(data, options?)",
        desc: "Normalize semi-structured JSON data into a flat table.",
        returns: "DataFrame",
        example: `pd.json_normalize([{ a: 1, b: { c: 2 } }, { a: 3, b: { c: 4 } }]).columns;
// => ['a', 'b.c']`
      }
    ]
  },
  {
    id: "groupby",
    title: "GroupBy",
    intro: "Groupby operations follow the split-apply-combine paradigm. Group a DataFrame or Series, apply an aggregation or transformation, and combine into a result.",
    entries: [
      {
        name: "DataFrameGroupBy#sum",
        sig: "gbdf.sum()",
        desc: "Compute sum of group values.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ g: ['a','b','a'], v: [1,2,3] });
df.groupby('g').sum().col('v').to_list();    // => [4, 2]`
      },
      {
        name: "DataFrameGroupBy#mean",
        sig: "gbdf.mean()",
        desc: "Compute mean of groups.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ g: ['a','a','b'], v: [1,3,2] });
df.groupby('g').mean().col('v').to_list();    // => [2, 2]`
      },
      {
        name: "DataFrameGroupBy#min",
        sig: "gbdf.min()",
        desc: "Compute minimum of group values.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ g: ['a','b','a'], v: [1,2,3] });
df.groupby('g').min().col('v').to_list();    // => [1, 2]`
      },
      {
        name: "DataFrameGroupBy#max",
        sig: "gbdf.max()",
        desc: "Compute maximum of group values.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ g: ['a','b','a'], v: [1,2,3] });
df.groupby('g').max().col('v').to_list();    // => [3, 2]`
      },
      {
        name: "DataFrameGroupBy#count",
        sig: "gbdf.count()",
        desc: "Compute count of group values.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ g: ['a','b','a','b','b'], v: [1,2,3,4,5] });
df.groupby('g').count().col('v').to_list();    // => [2, 3]`
      },
      {
        name: "DataFrameGroupBy#std",
        sig: "gbdf.std(ddof?)",
        desc: "Compute standard deviation of groups.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ g: ['a','a','b','b'], v: [1,3,2,4] });
df.groupby('g').std().col('v').to_list();    // => [1.414..., 1.414...]`
      },
      {
        name: "DataFrameGroupBy#agg",
        sig: "gbdf.agg(func)",
        desc: "Aggregate using one or more operations.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ g: ['a','b','a'], v: [1,2,3] });
df.groupby('g').agg({ v: ['sum', 'mean'] }).columns;    // => ['v_sum', 'v_mean']`
      },
      {
        name: "DataFrameGroupBy#transform",
        sig: "gbdf.transform(fn)",
        desc: "Call func producing a like-indexed DataFrame.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ g: ['a','a','b'], v: [1,3,2] });
df.groupby('g').transform(s => s.sub(s.mean())).col('v').to_list();    // => [-1, 1, 0]`
      },
      {
        name: "DataFrameGroupBy#filter",
        sig: "gbdf.filter(fn)",
        desc: "Return a copy of a DataFrame excluding elements from groups that do not satisfy the boolean criterion specified by func.",
        returns: "DataFrame",
        example: `const df = new DataFrame({ g: ['a','a','b'], v: [1,2,3] });
df.groupby('g').filter(grp => grp.col('v').sum() > 2).col('v').to_list();    // => [1, 2, 3]`
      },
      {
        name: "SeriesGroupBy#sum",
        sig: "gbs.sum()",
        desc: "Compute sum of groups for a Series.",
        returns: "Series",
        example: `const s = new Series([1, 2, 3, 4], { index: ['a','b','a','b'] });
s.groupby(s.index).sum().to_list();    // => [4, 6]`
      },
      {
        name: "SeriesGroupBy#mean",
        sig: "gbs.mean()",
        desc: "Compute mean of groups for a Series.",
        returns: "Series",
        example: `const s = new Series([1, 3, 2, 4], { index: ['a','a','b','b'] });
s.groupby(s.index).mean().to_list();    // => [2, 3]`
      }
    ]
  },
  {
    id: "io",
    title: "IO",
    intro: "Functions for reading data into DataFrames and writing DataFrames to files. All read/write functions are available at the top level (`pd.read_csv`, `pd.to_csv`, etc.).",
    entries: [
      {
        name: "read_csv",
        sig: "read_csv(path, options?)",
        desc: "Read a CSV file into a DataFrame. Supports header, sep, index_col, usecols, dtype, na_values, skiprows, nrows, encoding, and more.",
        returns: "DataFrame",
        args: [
          { name: "path", type: "string", desc: "Path to the CSV file." },
          { name: "options?", type: "{ sep?, header?, index_col?, usecols?, dtype?, na_values?, skiprows?, nrows? }", desc: "Parse options." }
        ],
        example: `import { read_csv } from 'pandas-ts';
const df = read_csv('sales.csv');
df.head()`
      },
      {
        name: "to_csv",
        sig: "df.to_csv(path?, options?)",
        desc: "Write DataFrame to CSV. If path is omitted, returns a string.",
        returns: "string | void",
        example: `const csv = df.to_csv();    // returns string
df.to_csv('output.csv');    // writes file`
      },
      {
        name: "read_json",
        sig: "read_json(path, options?)",
        desc: "Convert a JSON string or file to a DataFrame.",
        returns: "DataFrame",
        example: `read_json('[{"a":1,"b":2},{"a":3,"b":4}]').shape;    // => [2, 2]`
      },
      {
        name: "to_json",
        sig: "df.to_json(path?, options?)",
        desc: "Convert the object to a JSON string. If path is omitted, returns a string.",
        returns: "string | void",
        example: `new DataFrame({ a: [1,2] }).to_json();    // => '[{"a":1},{"a":2}]'`
      },
      {
        name: "read_excel",
        sig: "read_excel(path, options?)",
        desc: "Read an Excel file into a DataFrame (powered by xlsx). Supports sheet_name, header, usecols.",
        returns: "DataFrame",
        example: `const df = read_excel('data.xlsx', { sheet_name: 'Sheet1' });`
      },
      {
        name: "to_excel",
        sig: "df.to_excel(path, options?)",
        desc: "Write DataFrame to an Excel file.",
        returns: "void",
        example: `df.to_excel('output.xlsx', { sheet_name: 'Results' });`
      },
      {
        name: "read_parquet",
        sig: "read_parquet(path)",
        desc: "Read a Parquet file into a DataFrame. **Stub** — throws unless a compatible Parquet parser is provided.",
        returns: "DataFrame",
        example: `// throws: 'Parquet read requires a native parser'`
      },
      {
        name: "read_sql",
        sig: "read_sql(query, connection, options?)",
        desc: "Read SQL query or database table into a DataFrame.",
        returns: "DataFrame",
        args: [
          { name: "query", type: "string", desc: "SQL query string or table name." },
          { name: "connection", type: "Connection", desc: "Database connection object." }
        ],
        example: `const df = read_sql('SELECT * FROM users', db);
df.shape;    // rows x columns`
      },
      {
        name: "read_feather",
        sig: "read_feather(path)",
        desc: "Load a feather-format object from the file path.",
        returns: "DataFrame",
        example: `const df = read_feather('data.feather');`
      },
      {
        name: "to_feather",
        sig: "df.to_feather(path)",
        desc: "Write out the binary feather-format representation of the DataFrame.",
        returns: "void",
        example: `df.to_feather('output.feather');`
      }
    ]
  },
  {
    id: "offsets",
    title: "tseries.offsets",
    intro: "Date offset classes for arithmetic on dates. All offsets have `apply(date)`, `rollforward(date)` and `rollback(date)` methods.",
    entries: [
      {
        name: "BusinessDay",
        sig: "new BusinessDay(n?)",
        desc: "A business-day offset. Skips Saturday and Sunday.",
        returns: "BusinessDay",
        args: [{ name: "n", type: "number", desc: "Number of business days. Default 1." }],
        example: `import { BusinessDay } from 'pandas-ts';
const bd = new BusinessDay(1);
bd.apply(new Date('2024-01-05')).toDateString();    // Friday -> Monday: 'Mon Jan 08 2024'`
      },
      {
        name: "MonthEnd",
        sig: "new MonthEnd(n?)",
        desc: "An offset corresponding to the last business day of the month.",
        returns: "MonthEnd",
        example: `import { MonthEnd } from 'pandas-ts';
new MonthEnd(1).apply(new Date('2024-01-15')).getDate();    // => 31`
      },
      {
        name: "MonthBegin",
        sig: "new MonthBegin(n?)",
        desc: "An offset corresponding to the first calendar day of the month.",
        returns: "MonthBegin",
        example: `new MonthBegin(1).apply(new Date('2024-01-15')).getDate();    // => 1`
      },
      {
        name: "YearEnd",
        sig: "new YearEnd(n?, month?)",
        desc: "An offset for the last day of the year.",
        returns: "YearEnd",
        example: `new YearEnd(1).apply(new Date('2024-06-01')).toISOString().slice(0,10);    // => '2024-12-31'`
      },
      {
        name: "YearBegin",
        sig: "new YearBegin(n?)",
        desc: "An offset for the first day of the year.",
        returns: "YearBegin",
        example: `new YearBegin(1).apply(new Date('2024-06-01')).toISOString().slice(0,10);    // => '2025-01-01'`
      },
      {
        name: "QuarterEnd",
        sig: "new QuarterEnd(n?, startingMonth?)",
        desc: "DateOffset increments between Quarter end dates.",
        returns: "QuarterEnd",
        example: `new QuarterEnd(1).apply(new Date('2024-01-15')).toISOString().slice(0,10);    // => '2024-03-31'`
      },
      {
        name: "QuarterBegin",
        sig: "new QuarterBegin(n?, startingMonth?)",
        desc: "DateOffset increments between Quarter start dates.",
        returns: "QuarterBegin",
        example: `new QuarterBegin(1).apply(new Date('2024-02-15')).toISOString().slice(0,10);    // => '2024-04-01'`
      },
      {
        name: "Week",
        sig: "new Week(n?, weekday?)",
        desc: "A week offset.",
        returns: "Week",
        example: `new Week(2).apply(new Date('2024-01-01')).getDate();    // => 15`
      },
      {
        name: "Day",
        sig: "new Day(n?)",
        desc: "A calendar day offset.",
        returns: "Day",
        example: `new Day(7).apply(new Date('2024-01-01')).getDate();    // => 8`
      },
      {
        name: "Hour",
        sig: "new Hour(n?)",
        desc: "An hour offset.",
        returns: "Hour",
        example: `new Hour(6).apply(new Date('2024-01-01T00:00:00')).getHours();    // => 6`
      },
      {
        name: "Minute",
        sig: "new Minute(n?)",
        desc: "A minute offset.",
        returns: "Minute",
        example: `new Minute(30).apply(new Date('2024-01-01T10:00:00')).getMinutes();    // => 30`
      },
      {
        name: "Second",
        sig: "new Second(n?)",
        desc: "A second offset.",
        returns: "Second",
        example: `new Second(45).apply(new Date('2024-01-01T10:00:00')).getSeconds();    // => 45`
      },
      {
        name: "BusinessHour",
        sig: "new BusinessHour(n?, start?, end?)",
        desc: "DateOffset subclass representing possibly n business hours. Default business hours: 09:00–17:00.",
        returns: "BusinessHour",
        example: `import { BusinessHour } from 'pandas-ts';
// Advancing from end of business hours rolls to next morning
const bh = new BusinessHour(1);
bh.rollforward(new Date('2024-01-05T18:00:00')).getHours();    // => 9`
      }
    ]
  },
  {
    id: "testing",
    title: "pd.testing",
    intro: "Test utilities for comparing Series and DataFrames. Mirrors pandas.testing.",
    entries: [
      {
        name: "assert_series_equal",
        sig: "assert_series_equal(left, right, options?)",
        desc: "Check that two Series are equal. Raises AssertionError if not. Supports check_dtype, check_names, check_exact, rtol, atol.",
        returns: "void",
        args: [
          { name: "left", type: "Series", desc: "Left Series." },
          { name: "right", type: "Series", desc: "Right Series." },
          { name: "options?", type: "{ check_dtype?, rtol?, atol?, check_exact? }", desc: "Comparison options." }
        ],
        example: `import { assert_series_equal } from 'pandas-ts';
assert_series_equal(new Series([1, 2, 3]), new Series([1, 2, 3]));    // passes
assert_series_equal(new Series([1.0]), new Series([1.0000001]));      // passes (within rtol)`
      },
      {
        name: "assert_frame_equal",
        sig: "assert_frame_equal(left, right, options?)",
        desc: "Check that two DataFrames are equal. Raises AssertionError if not.",
        returns: "void",
        example: `import { assert_frame_equal } from 'pandas-ts';
const a = new DataFrame({ x: [1, 2] });
assert_frame_equal(a, a);    // passes`
      },
      {
        name: "assert_index_equal",
        sig: "assert_index_equal(left, right, options?)",
        desc: "Check that left and right Index objects are equal.",
        returns: "void",
        example: `import { assert_index_equal } from 'pandas-ts';
assert_index_equal(['a','b','c'], ['a','b','c']);    // passes`
      },
      {
        name: "AssertionError",
        sig: "class AssertionError extends Error",
        desc: "Error class thrown when assertions fail. Extends the built-in Error class.",
        returns: "AssertionError",
        example: `import { AssertionError } from 'pandas-ts';
try {
  assert_series_equal(new Series([1]), new Series([2]));
} catch (e) {
  e instanceof AssertionError;    // => true
}`
      }
    ]
  }
];
