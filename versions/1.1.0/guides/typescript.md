# TypeScript

pandas-ts is written in TypeScript and exports full type definitions. This page documents the key types and how to use them effectively.

## Core types

```ts
import type {
  Series,
  DataFrame,
  DType,
  Index,
  DatetimeIndex,
  Timestamp,
  Timedelta,
} from 'pandas-ts';
```

## Generic Series

`Series<T>` is generic over the value type:

```ts
const numericSeries: Series<number> = new Series([1, 2, 3]);
const strSeries: Series<string> = new Series(['a', 'b', 'c']);
const boolSeries: Series<boolean> = new Series([true, false, true]);
```

In most cases TypeScript infers the type automatically:

```ts
const s = new Series([1, 2, 3]);
// TypeScript infers: Series<number>
```

## DataFrame columns

```ts
const df = new DataFrame({ name: ['Alice', 'Bob'], age: [30, 25] });
// Inferred: DataFrame<{ name: string; age: number }>

// Column access is typed
const names = df.col('name');   // Series<string>
const ages = df.col('age');     // Series<number>
```

## DType

```ts
import type { DType, DTypeName } from 'pandas-ts';

const dtype: DType = new Series([1, 2, 3]).dtype;
dtype.name;    // DTypeName: 'int64' | 'float64' | 'object' | 'bool' | 'datetime64' | 'category'

// Check dtype
if (dtype.name === 'float64') {
  // numeric operations are safe
}
```

## SeriesOptions and DataFrameOptions

```ts
import type { SeriesOptions, DataFrameOptions } from 'pandas-ts';

const opts: SeriesOptions = {
  index: ['a', 'b', 'c'],
  name: 'my_series',
  dtype: 'float64',
};

const dfOpts: DataFrameOptions = {
  index: [0, 1, 2],
  columns: ['x', 'y', 'z'],
};
```

## GroupBy types

```ts
import type { DataFrameGroupBy, SeriesGroupBy } from 'pandas-ts';

const gbdf: DataFrameGroupBy = df.groupby('city');
const gbs: SeriesGroupBy = s.groupby(labels);
```

## Window types

```ts
import type { RollingWindow, ExpandingWindow, ExponentialMovingWindow } from 'pandas-ts';

const rolling: RollingWindow = s.rolling(3);
const expanding: ExpandingWindow = s.expanding();
const ewm: ExponentialMovingWindow = s.ewm({ span: 5 });
```

## Offset types

```ts
import type { DateOffset } from 'pandas-ts';
import { BusinessDay, MonthEnd, Week } from 'pandas-ts';

function advanceDate(offset: DateOffset, date: Date): Date {
  return offset.apply(date);
}

advanceDate(new BusinessDay(1), new Date());
advanceDate(new MonthEnd(1), new Date());
```

## Strict nullability

pandas-ts uses `null` (not `undefined`) as the missing-value sentinel in output types. When `skipna` is false, numeric reductions can return `null | number`:

```ts
const result: number | null = s.mean({ skipna: false });
```

## Utility types

```ts
import type {
  Scalar,
  AggFunc,
  JoinHow,
  Axis,
} from 'pandas-ts';

// AggFunc: 'sum' | 'mean' | 'min' | 'max' | 'count' | 'std' | 'var' | 'first' | 'last'
// JoinHow: 'inner' | 'outer' | 'left' | 'right'
// Axis: 0 | 1 | 'index' | 'columns'
```
