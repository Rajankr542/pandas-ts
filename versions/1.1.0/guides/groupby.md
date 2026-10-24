# GroupBy

GroupBy follows the **split-apply-combine** paradigm:

1. **Split** the data into groups based on some criteria
2. **Apply** a function to each group independently
3. **Combine** the results back into a DataFrame or Series

## Basic usage

```ts
import { DataFrame, Series } from 'pandas-ts';

const df = new DataFrame({
  city: ['Delhi', 'Mumbai', 'Delhi', 'Pune', 'Mumbai', 'Delhi'],
  sales: [100, 200, 150, 300, 250, 200],
  year: [2023, 2023, 2024, 2024, 2024, 2024],
});

// Group by one column
const byCity = df.groupby('city');

// Common aggregations
byCity.sum().col('sales').to_list();    // => [450, 450, 300]
byCity.mean().col('sales').to_list();   // => [150, 225, 300]
byCity.count().col('sales').to_list();  // => [3, 2, 1]
```

## Multiple aggregations

```ts
// Named aggregation
df.groupby('city').agg({
  sales: ['sum', 'mean', 'std', 'count'],
  year: 'min',
});
// columns: ['sales_sum', 'sales_mean', 'sales_std', 'sales_count', 'year_min']
```

## Group by multiple columns

```ts
df.groupby(['city', 'year']).sum().col('sales').to_list();
```

## Transform

Transform returns a Series/DataFrame with the same index as the input, with each value replaced by the result of the group function:

```ts
// Normalize within group (subtract group mean)
const z_score = df.groupby('city').transform(s => {
  const mean = s.mean();
  const std = s.std();
  return s.sub(mean).div(std);
});

// Fill NaN with group mean
df.assign({
  sales: df.groupby('city').transform(s => s.fillna(s.mean())).col('sales')
})
```

## Filter

Return only groups that satisfy a condition:

```ts
// Keep only cities with total sales > 400
df.groupby('city').filter(grp => grp.col('sales').sum() > 400);
```

## apply

Apply an arbitrary function to each group:

```ts
// Get top 2 rows per group by sales
df.groupby('city').apply(grp =>
  grp.sort_values('sales', { ascending: false }).head(2)
);
```

## SeriesGroupBy

```ts
const s = new Series([1, 2, 3, 4, 5, 6], { index: ['a','b','a','b','a','b'] });
s.groupby(s.index).sum().to_list();    // => [9, 12]
s.groupby(s.index).mean().to_list();   // => [3, 4]
```

## Iteration

```ts
// Iterate over groups
for (const [key, group] of df.groupby('city')) {
  console.log(key, group.shape);
}
```

## GroupBy with time series

```ts
import pd from 'pandas-ts';

const ts = new pd.DataFrame({
  date: pd.date_range('2024-01-01', { periods: 12, freq: 'MS' }),
  value: Array.from({ length: 12 }, () => Math.random() * 100),
});

// Resample monthly to quarterly
ts.resample('QS', { on: 'date' }).sum();
```
