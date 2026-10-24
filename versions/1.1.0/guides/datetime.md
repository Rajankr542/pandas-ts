# Datetime

pandas-ts provides comprehensive datetime support through the `Timestamp`, `Timedelta`, `DatetimeIndex` classes and the `.dt` accessor.

## Timestamp

```ts
import { Timestamp } from 'pandas-ts';

const ts = new Timestamp('2024-01-15');
ts.year;    // => 2024
ts.month;   // => 1
ts.day;     // => 15
ts.hour;    // => 0

// From various inputs
new Timestamp(1705276800000);         // from Unix ms
new Timestamp('2024-01-15 10:30:00');
new Timestamp(new Date());

// Arithmetic
const ts2 = ts.add('1 day');
const ts3 = ts.add({ hours: 6 });
ts.diff(ts2).days;    // => -1
```

## Timedelta

```ts
import { Timedelta } from 'pandas-ts';

const td = new Timedelta('7 days');
td.days;    // => 7
td.total_seconds();    // => 604800

new Timedelta({ days: 1, hours: 6, minutes: 30 });
new Timedelta('1 day 6:30:00');
```

## date_range

```ts
import pd from 'pandas-ts';

// Daily range
const daily = pd.date_range('2024-01-01', { periods: 10, freq: 'D' });
daily.length;    // => 10

// Monthly
const monthly = pd.date_range('2024-01-01', { periods: 12, freq: 'MS' });

// With end date
const range = pd.date_range('2024-01-01', '2024-12-31', { freq: 'W' });

// Business days
const bdays = pd.date_range('2024-01-01', { periods: 5, freq: 'B' });
```

## to_datetime

```ts
import pd from 'pandas-ts';

// Parse a single date
pd.to_datetime('2024-01-15').year;    // => 2024

// Parse an array (returns DatetimeIndex)
pd.to_datetime(['2024-01-01', '2024-02-01', '2024-03-01']);

// With format
pd.to_datetime('15/01/2024', { format: '%d/%m/%Y' });

// Coerce errors
pd.to_datetime(['2024-01-01', 'not-a-date'], { errors: 'coerce' });
```

## The .dt accessor

When a Series contains datetime values, the `.dt` accessor provides date/time properties:

```ts
const dates = new Series(pd.date_range('2024-01-01', { periods: 5, freq: 'D' }));

// Date components
dates.dt.year.to_list();        // => [2024, 2024, 2024, 2024, 2024]
dates.dt.month.to_list();       // => [1, 1, 1, 1, 1]
dates.dt.day.to_list();         // => [1, 2, 3, 4, 5]
dates.dt.dayofweek.to_list();   // => [0, 1, 2, 3, 4] (Mon=0)
dates.dt.dayofyear.to_list();   // => [1, 2, 3, 4, 5]
dates.dt.weekday.to_list();     // => [0, 1, 2, 3, 4]
dates.dt.quarter.to_list();     // => [1, 1, 1, 1, 1]

// Time components
dates.dt.hour.to_list();
dates.dt.minute.to_list();
dates.dt.second.to_list();

// Boolean flags
dates.dt.is_month_start.to_list();   // => [true, false, false, false, false]
dates.dt.is_month_end.to_list();
dates.dt.is_year_start.to_list();
dates.dt.is_year_end.to_list();
dates.dt.is_leap_year.to_list();

// Operations
dates.dt.floor('H');    // floor to nearest hour
dates.dt.ceil('D');     // ceil to nearest day
dates.dt.round('min');  // round to nearest minute
dates.dt.strftime('%Y-%m-%d').to_list();
```

## Resampling

```ts
import pd from 'pandas-ts';

const df = new pd.DataFrame({
  date: pd.date_range('2024-01-01', { periods: 365, freq: 'D' }),
  value: Array.from({ length: 365 }, () => Math.random() * 100),
});

// Aggregate by month
const monthly = df.resample('ME', { on: 'date' }).mean();
monthly.shape;    // => [12, 1]

// Aggregate by quarter
const quarterly = df.resample('QE', { on: 'date' }).sum();
```

## infer_freq

```ts
import { infer_freq } from 'pandas-ts';

infer_freq(['2024-01-01','2024-01-02','2024-01-03']);    // => 'D'
infer_freq(['2024-01-01','2024-02-01','2024-03-01']);    // => 'MS'
infer_freq(['2024-01-01','2024-04-01','2024-07-01']);    // => 'QS'
infer_freq(['2024-01-01T00:00','2024-01-01T01:00']);     // => 'H'
```
