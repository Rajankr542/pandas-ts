# tseries.offsets

Date offset classes for date arithmetic. All offset classes have three methods:
- `apply(date)` — move the date forward (or backward for negative n)
- `rollforward(date)` — snap to the next valid date if not already on one
- `rollback(date)` — snap to the previous valid date

## Available offsets

| Class | Aliases | Description |
|---|---|---|
| `BusinessDay` | `BDay` | A business day (Mon–Fri) |
| `MonthEnd` | `ME` | Last calendar day of the month |
| `MonthBegin` | `MS` | First calendar day of the month |
| `YearEnd` | `YE` | Last day of the year |
| `YearBegin` | `YS` | First day of the year |
| `QuarterEnd` | `QE` | Last day of the quarter |
| `QuarterBegin` | `QS` | First day of the quarter |
| `Week` | — | A calendar week |
| `Day` | — | A calendar day |
| `Hour` | `H` | One hour |
| `Minute` | `T`, `Min` | One minute |
| `Second` | `S` | One second |
| `Milli` | `Millisecond`, `ms` | One millisecond |
| `BusinessHour` | `BH` | A business hour (09:00–17:00) |

## Examples

```ts
import { BusinessDay, MonthEnd, YearEnd, Week } from 'pandas-ts';

// Advance by 1 business day (Friday -> Monday)
new BusinessDay(1).apply(new Date('2024-01-05')).toDateString();
// => 'Mon Jan 08 2024'

// Last day of the current month
new MonthEnd(1).apply(new Date('2024-02-10')).toDateString();
// => 'Thu Feb 29 2024'  (2024 is a leap year)

// Advance to Dec 31
new YearEnd(1).apply(new Date('2024-06-15')).toISOString().slice(0,10);
// => '2024-12-31'

// 2 weeks forward
new Week(2).apply(new Date('2024-01-01')).getDate();
// => 15
```

## Using with date_range

```ts
import pd, { MonthEnd } from 'pandas-ts';

// Monthly date range ending on month-end
const dates = pd.date_range('2024-01-31', { periods: 6, freq: 'ME' });

// Quarter ends
const quarters = pd.date_range('2024-01-01', { periods: 4, freq: 'QE' });
```

## rollforward and rollback

```ts
import { BusinessDay, MonthEnd } from 'pandas-ts';
const bd = new BusinessDay();

bd.rollforward(new Date('2024-01-06'));  // Saturday -> Monday
bd.rollback(new Date('2024-01-07'));     // Sunday -> Friday

// Snap to month end
const me = new MonthEnd();
me.rollforward(new Date('2024-01-15')).toDateString();  // => 'Wed Jan 31 2024'
me.rollback(new Date('2024-01-15')).toDateString();     // => 'Sun Dec 31 2023'
```

## BusinessHour

```ts
import { BusinessHour } from 'pandas-ts';

const bh = new BusinessHour();

// Default: 09:00-17:00 Mon-Fri
bh.apply(new Date('2024-01-05T12:00:00')).getHours();   // => 13

// Custom hours
const extendedBH = new BusinessHour(1, '08:00', '20:00');
```

## Negative offsets

```ts
// Go backward
new BusinessDay(-2).apply(new Date('2024-01-10')).toDateString();
// => 'Mon Jan 08 2024' (Wednesday - 2 bdays = Monday)

new MonthEnd(-1).apply(new Date('2024-03-31')).toISOString().slice(0,10);
// => '2024-02-29'
```
