// Smoke test for the ESM build.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION, info, isNativeAvailable } from 'pandas-ts';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.equal(VERSION, pkg.version, 'VERSION must match package.json version');
assert.equal(info().version, pkg.version);
assert.equal(info().stage, 'pre-alpha');
assert.equal(isNativeAvailable(), false);

console.log('ESM smoke test passed');
