# Coming from pandas

If you know Python pandas, you already know most of pandas-ts. This page shows how common patterns translate.

## Import

```python
# Python
import pandas as pd
```

```ts
// TypeScript
import pd from 'pandas-ts';
// or:
import { Series, DataFrame, read_csv } from 'pandas-ts';
```

## Arithmetic operators

Python has operator overloading; JavaScript does not. Use named methods:

| Python pandas | pandas-ts |
|---|---|
| `s + 1` | `s.add(1)` |
| `s - 1` | `s.sub(1)` |
| `s * 2` | `s.mul(2)` |
| `s / 2` | `s.div(2)` |
| `s ** 2` | `s.pow(2)` |
| `s1 + s2` | `s1.add(s2)` |
| `df['a'] + df['b']` | `df.col('a').add(df.col('b'))` |

## Construction

```python
s = pd.Series([1, 2, 3])
df = pd.DataFrame({'a': [1,2,3], 'b': [4,5,6]})
```

```ts
const s = new Series([1, 2, 3]);
const df = new DataFrame({ a: [1,2,3], b: [4,5,6] });
```

## Column access

```python
df['sales']
df.sales
df[['a','b']]
```

```ts
df.col('sales')            // returns a Series
df.loc_cols(['a', 'b'])    // DataFrame with two columns
```

## Boolean indexing

```python
df[df['sales'] > 100]
```

```ts
df.loc(df.col('sales').gt(100))
```

## eval

```python
df.eval('a + b')
pd.eval('2 + 3')
```

```ts
df.evalExpr('a + b')    // eval is a reserved word in JS
import { pdEval } from 'pandas-ts';
pdEval('2 + 3')         // => 5
```

## GroupBy

```python
df.groupby('city').agg({'sales': ['sum', 'mean']})
```

```ts
df.groupby('city').agg({ sales: ['sum', 'mean'] })
```

## Apply

```python
s.apply(lambda x: x**2)
```

```ts
s.apply(x => x**2)
```

## IO

```python
pd.read_csv('data.csv')
df.to_csv('out.csv')
```

```ts
import { read_csv } from 'pandas-ts';
read_csv('data.csv')
df.to_csv('out.csv')
```

## Keyword arguments

Python uses keyword arguments directly; TypeScript uses an options object:

```python
np.sum(a, axis=0, keepdims=True)
df.sort_values('sales', ascending=False)
```

```ts
df.sort_values('sales', { ascending: false })
```
