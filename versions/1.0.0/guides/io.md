# IO

pandas-ts supports reading and writing data in many formats. All IO functions are available as named exports and as methods on DataFrame.

## CSV

```ts
import { read_csv } from 'pandas-ts';

// Read
const df = read_csv('sales.csv');
const df2 = read_csv('data.csv', {
  sep: ';',
  header: 0,
  usecols: ['name', 'value'],
  na_values: ['N/A', 'missing'],
  skiprows: 2,
  nrows: 1000,
});

// Write
df.to_csv('output.csv');
const csvString = df.to_csv();   // returns string if no path given
```

## JSON

```ts
import { read_json } from 'pandas-ts';

// Read
const df = read_json('data.json');
const df2 = read_json('[{"a":1,"b":2},{"a":3,"b":4}]');  // from string
const df3 = read_json('records.json', { orient: 'records' });

// Write
df.to_json('output.json');
const jsonString = df.to_json();   // returns string
const compact = df.to_json(undefined, { orient: 'split' });
```

## Excel

```ts
import { read_excel } from 'pandas-ts';

// Read (requires xlsx peer dependency)
const df = read_excel('report.xlsx');
const df2 = read_excel('report.xlsx', {
  sheet_name: 'Sheet2',
  header: 1,
  usecols: 'A:D',
});

// Write
df.to_excel('output.xlsx');
df.to_excel('output.xlsx', { sheet_name: 'Results', index: false });
```

> **Note** Excel support requires the `xlsx` package: `npm install xlsx`

## Parquet

```ts
import { read_parquet } from 'pandas-ts';

// Read (stub — requires native parser)
const df = read_parquet('data.parquet');

// Write (stub)
df.to_parquet('output.parquet');
```

> **Note** Parquet support is a stub. It throws unless you provide a compatible parser via `pd.options.parquet.engine`.

## SQL

```ts
import { read_sql } from 'pandas-ts';

// Works with any database that returns row objects
const db = getDbConnection();
const df = read_sql('SELECT * FROM orders WHERE status = "open"', db);

// Write
df.to_sql('orders_backup', db, { if_exists: 'replace' });
```

## Feather

```ts
import { read_feather } from 'pandas-ts';

const df = read_feather('data.feather');
df.to_feather('output.feather');
```

## Clipboard

```ts
// Read tab-separated data from clipboard (browser or Electron only)
const df = await pd.read_clipboard();

// Write to clipboard
df.to_clipboard();
```

## HTML

```ts
import { read_html } from 'pandas-ts';

// Parse all tables from an HTML string or URL
const tables = read_html('<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>');
tables[0].shape;    // => [1, 2]
```

## XML

```ts
import { read_xml } from 'pandas-ts';

const df = read_xml('<data><row><a>1</a><b>2</b></row></data>', {
  xpath: './/row',
});
```

## Pickle

```ts
// Serialise/deserialise a DataFrame using a binary format
df.to_pickle('model.pkl');
const df2 = pd.read_pickle('model.pkl');
```
