# Contributing to pandas-ts

Thanks for your interest in contributing! The project is in an early (pre-alpha) stage, so
the architecture and APIs may change a lot.

## Getting started

```bash
git clone <repository-url>
cd pandas-ts
npm install
npm run build
npm test
```

Requirements: Node.js 18 or newer.

## Scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run build`     | Build ESM, CommonJS, and type declarations   |
| `npm run typecheck` | Type-check the source without emitting files |
| `npm test`          | Run smoke tests against the built output     |

## Guidelines

- **Match pandas.** Method names, argument names, defaults, and behavior should follow the
  [pandas API reference](https://pandas.pydata.org/docs/reference/index.html). Document any
  difference you can't avoid.
- **Performance matters.** Put hot paths in the C++ core. Avoid copying data between JS and native memory.
- **Type everything.** Public APIs must have full TypeScript types and TSDoc comments.
- **Test against pandas.** New behavior should include tests, with expected values taken from real pandas output where possible.
- Update `CHANGELOG.md` under `[Unreleased]` for user-facing changes.

## Reporting issues

Please include your Node.js version, OS/architecture, a small reproduction, and the matching
pandas behavior if relevant.
