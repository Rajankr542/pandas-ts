# DataFrame basics

A `DataFrame` is a two-dimensional table with labeled axes (rows and columns).

## Construction

```ts
import { DataFrame } from 'pandas-ts';

// From object of arrays (most common)
const df = new DataFrame({ a: [1,2,3], b: [4,5,6] });

// From array of objects
new DataFrame([{ a:1, b:4 }, { a:2, b:5 }, { a:3, b:6 }]);

// With custom index
new DataFrame({ a: [1,2,3] }, { index: ['x','y','z'] });

// From a 2D array with column names
new DataFrame([[1,4],[2,5],[3,6]], { columns: ['a','b'] });
```

## Shape and info

```ts
df.shape        // => [3, 2]
df.columns      // => ['a', 'b']
df.index        // => [0, 1, 2]
df.dtypes       // => { a: DType('int64'), b: DType('int64') }
df.size         // => 6  (total elements)
df.info()       // prints column info to console
```

## Selection

```ts
df.col('a')                      // => Series
df.loc(df.col('a').gt(1))        // boolean indexing → DataFrame
df.iloc_row(0)                   // first row as Series
df.head(2)                       // first 2 rows
df.tail(2)                       // last 2 rows
df.sample(2)                     // 2 random rows
df.loc_cols(['a', 'b'])          // subset of columns
```

## Mutation (returns new DataFrame)

```ts
df.assign({ c: df.col('a').add(df.col('b')) })    // add column
df.drop(['b'], { axis: 1 })                        // drop column
df.drop([0, 1])                                    // drop rows by label
df.rename({ a: 'alpha' })                          // rename columns
df.fillna(0)                                       // fill NaN
df.replace(NaN, 0)                                 // replace values
df.set_index('a')                                  // use column as index
df.reset_index()                                   // reset to integer index
```

## Merge and concat

```ts
import { concat } from 'pandas-ts';
concat([df1, df2])                  // vertical (axis=0)
concat([df1, df2], { axis: 1 })     // horizontal

df1.merge(df2, { on: 'id' })        // inner join
df1.merge(df2, { on: 'id', how: 'left' })   // left join
df1.merge(df2, { on: 'id', how: 'outer' })  // outer join
df1.join(df2, { on: 'id' })         // join on index
```

## Aggregation

```ts
df.sum()               // sum of each column
df.mean()              // mean of each column
df.describe()          // count, mean, std, min, quartiles, max
df.nunique()           // count of unique values per column
df.corr()              // pairwise Pearson correlation
df.cov()               // pairwise covariance
```

## Pivot and reshape

```ts
// Pivot table
df.pivot_table({
  index: 'region',
  columns: 'year',
  values: 'sales',
  aggfunc: 'sum'
})

// Melt (wide to long)
df.melt({
  id_vars: 'id',
  value_vars: ['jan','feb','mar'],
  var_name: 'month',
  value_name: 'sales'
})

// Stack / unstack
df.stack()     // columns to index
df.unstack()   // index to columns
df.T           // transpose
```

## Apply and transform

```ts
// Apply function to each column
df.apply(col => col.sum())

// Apply function element-wise
df.applymap(x => x * 2)

// Named aggregation
df.groupby('category').agg({
  sales: ['sum', 'mean', 'std'],
  units: 'count'
})
```

## Sorting and filtering

```ts
df.sort_values('sales', { ascending: false })
df.sort_index()
df.query('sales > 100 and region == "West"')
df.nlargest(5, 'sales')
df.nsmallest(3, 'price')
```
