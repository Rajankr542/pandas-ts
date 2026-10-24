# Series basics

A `Series` is a one-dimensional labeled array. Each element has a label (the index).

## Construction

```ts
import { Series } from 'pandas-ts';

new Series([1, 2, 3]);
new Series([1, 2, 3], { index: ['a','b','c'], name: 'counts' });
new Series({ a: 1, b: 2, c: 3 });    // keys become the index
```

## Indexing

```ts
const s = new Series([10, 20, 30], { index: ['a','b','c'] });
s.loc('b');     // => 20  (by label)
s.iloc(1);      // => 20  (by position)
s.at('b');      // => 20
s.iat(1);       // => 20
```

## Arithmetic (named methods)

```ts
const s = new Series([1, 2, 3]);
s.add(10).to_list();           // => [11, 12, 13]
s.mul(2).to_list();            // => [2, 4, 6]
s.pow(2).to_list();            // => [1, 4, 9]
s.add(new Series([1,1,1])).to_list();    // => [2, 3, 4]
```

## Reductions

```ts
const s = new Series([1, 2, 3, 4, 5]);
s.sum();            // => 15
s.mean();           // => 3
s.min();            // => 1
s.max();            // => 5
s.std();            // => 1.5811388300841898
s.var();            // => 2.5
s.median();         // => 3
s.quantile(0.75);   // => 4
s.count();          // => 5
s.describe();       // Series with count, mean, std, min, 25%, 50%, 75%, max
```

## Cumulative operations

```ts
const s = new Series([1, 2, 3, 4]);
s.cumsum().to_list();    // => [1, 3, 6, 10]
s.cumprod().to_list();   // => [1, 2, 6, 24]
s.diff().to_list();      // => [NaN, 1, 1, 1]
```

## Sorting and ranking

```ts
new Series([3,1,2]).sort_values().to_list();    // => [1, 2, 3]
new Series([3,1,2]).argsort().to_list();        // => [1, 2, 0]
new Series([3,1,2]).rank().to_list();           // => [3, 1, 2]
```

## Rolling and expanding windows

```ts
const s = new Series([1,2,3,4,5]);
s.rolling(3).mean().to_list();       // => [NaN, NaN, 2, 3, 4]
s.expanding().sum().to_list();       // => [1, 3, 6, 10, 15]
s.ewm({ span: 3 }).mean().to_list(); // exponentially weighted mean
```

## Missing data

```ts
const s = new Series([1, null, NaN, 4]);
s.isna().to_list();      // => [false, true, true, false]
s.dropna().to_list();    // => [1, 4]
s.fillna(0).to_list();   // => [1, 0, 0, 4]
s.count();               // => 2  (non-null count)
```

## String accessor (.str)

```ts
const s = new Series(['hello', 'world', 'pandas-ts']);
s.str.upper().to_list();       // => ['HELLO', 'WORLD', 'PANDAS-TS']
s.str.len().to_list();         // => [5, 5, 9]
s.str.contains('o').to_list(); // => [true, true, false]
s.str.replace('l', 'L').to_list();
```

## Numera-powered methods

```ts
new Series([3, 4]).norm();                       // => 5  (L2 norm)
new Series([1,2,3,4,5]).percentile(50);          // => 3
new Series([1,2,3,4,5]).gradient().to_list();    // numerical gradient
new Series([1,2,2,3,3,3]).hist(3);               // { hist, edges }
```
