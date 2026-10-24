# Installation

## Install the package

```bash
npm install pandas-ts
```

```bash
pnpm add pandas-ts
```

```bash
yarn add pandas-ts
```

pandas-ts is a pure TypeScript package. No compiler, CMake or Python required.

## Peer dependency: @cyfora/numera

pandas-ts lists `@cyfora/numera` as a regular dependency — it is installed automatically. numera ships prebuilt C++ binaries for:

| Platform | Architectures | Node.js |
|---|---|---|
| macOS 13.3+ | arm64 (Apple Silicon), x64 (Intel) | {{node}} |
| Linux (glibc ≥ 2.28: Ubuntu 20.04+, Debian 10+) | x64, arm64 | {{node}} |

On unsupported platforms numera falls back to a pure-JavaScript implementation automatically.

## Importing

pandas-ts is an ES module. The default export is the `pd` namespace:

```ts
import pd from 'pandas-ts';

const s = new pd.Series([1, 2, 3]);
s.mean();    // => 2
```

Named imports also work:

```ts
import { Series, DataFrame, read_csv, concat } from 'pandas-ts';
```

CommonJS is also supported via dynamic import:

```js
const { Series } = await import('pandas-ts');
```

## Verify the installation

```ts
import { Series } from 'pandas-ts';

const s = new Series([3, 4]);
console.log(s.norm());    // => 5  (powered by numera's C++ linalg.norm)
console.log(s.mean());    // => 3.5
```
