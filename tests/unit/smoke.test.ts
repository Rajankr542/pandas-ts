import { describe, it, expect } from 'vitest';
import { VERSION, info, isNativeAvailable } from '../../src/index.js';

describe('smoke', () => {
  it('exports VERSION', () => {
    expect(typeof VERSION).toBe('string');
  });

  it('info() returns build info', () => {
    const buildInfo = info();
    expect(buildInfo.version).toBe(VERSION);
    expect(buildInfo.stage).toBe('pre-alpha');
  });

  it('isNativeAvailable() returns false', () => {
    expect(isNativeAvailable()).toBe(false);
  });
});
