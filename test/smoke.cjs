// Smoke test for the CommonJS build.
const assert = require('node:assert/strict');
const pkg = require('../package.json');
const { VERSION, info, isNativeAvailable } = require('pandas-ts');

assert.equal(VERSION, pkg.version, 'VERSION must match package.json version');
assert.equal(info().version, pkg.version);
assert.equal(isNativeAvailable(), false);

console.log('CJS smoke test passed');
