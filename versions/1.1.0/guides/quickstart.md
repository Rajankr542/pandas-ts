# Quickstart

A ten-minute tour of pandas-ts. Assumes you have [installed](/guides/installation.html) the package.

```ts norun
import pd, { Series, DataFrame, read_csv } from 'pandas-ts';
```

## Create a Series

```ts
const s = new Series([10, 20, 30, 40, 50], { name: 'prices' });
s.mean();       // => 30
s.std();        // => 15.811388300841896
s.min();        // => 10
s.max();        // => 50
s.sum();        // => 150
```

## Create a DataFrame

```ts
const df = new DataFrame({
  city:  ['Delhi', 'Mumbai', 'Delhi', 'Pune', 'Mumbai'],
  sales: [120, 340, 90, 210, 180],
  year:  [2023, 2023, 2024, 2024, 2024],
});
df.shape;           // => [5, 3]
df.columns;         // => ['city', 'sales', 'year']
df.head(3);         // first 3 rows
df.describe();      // stats for numeric columns
```

## Filter and select

```ts
// Boolean indexing
const highSales = df.loc(df.col('sales').gt(150));
highSales.shape;    // => [3, 3]

// Column access
df.col('sales').sum();    // => 940
```

## GroupBy

```ts
const summary = df.groupby('city').agg({ sales: ['sum', 'mean'] });
summary.columns;    // => ['sales_sum', 'sales_mean']
summary.index;      // => ['Delhi', 'Mumbai', 'Pune']
```

## Merge

```ts
const left  = new DataFrame({ id: [1,2,3], name: ['Alice','Bob','Carol'] });
const right = new DataFrame({ id: [1,2,3], score: [90, 85, 92] });
const merged = left.merge(right, { on: 'id' });
merged.col('score').to_list();    // => [90, 85, 92]
```

## Time series

```ts
const dates = pd.date_range('2024-01-01', { periods: 12, freq: 'MS' });
const ts = new Series(
  Array.from({ length: 12 }, (_, i) => i * 10),
  { index: dates }
);
ts.rolling(3).mean().to_list();   // 3-month moving average
```

## IO

```ts
// Read
const df2 = pd.read_csv('data.csv');
const df3 = pd.read_json('[{"a":1},{"a":2}]');

// Write
df.to_csv('output.csv');
df.to_json();    // returns JSON string
```

## Arithmetic

JavaScript has no operator overloading, so arithmetic uses named methods:

```ts
const a = new Series([1, 2, 3]);
const b = new Series([4, 5, 6]);
a.add(b).to_list();    // => [5, 7, 9]
a.mul(2).to_list();    // => [2, 4, 6]
a.pow(2).to_list();    // => [1, 4, 9]
```

## Missing data

```ts
const s = new Series([1, null, NaN, 4]);
s.isna().to_list();     // => [false, true, true, false]
s.dropna().to_list();   // => [1, 4]
s.fillna(0).to_list();  // => [1, 0, 0, 4]
```
