import { describe, it, expect } from 'vitest';
import { float64, int64, bool_, normalizeDType, dtypes } from '../../src/dtype.js';

describe('dtype', () => {
  it('float64 has correct properties', () => {
    expect(float64.name).toBe('float64');
    expect(float64.itemsize).toBe(8);
    expect(float64.kind).toBe('float');
  });

  it('int64 has correct properties', () => {
    expect(int64.name).toBe('int64');
    expect(int64.itemsize).toBe(8);
    expect(int64.kind).toBe('int');
  });

  it('normalizeDType from string', () => {
    expect(normalizeDType('float64')).toBe(float64);
    expect(normalizeDType('int64')).toBe(int64);
    expect(normalizeDType('bool')).toBe(bool_);
  });

  it('normalizeDType from DType object passes through', () => {
    expect(normalizeDType(float64)).toBe(float64);
  });

  it('normalizeDType throws on unknown string', () => {
    expect(() => normalizeDType('notadtype')).toThrow();
  });

  it('dtypes registry contains all basic types', () => {
    expect(dtypes['float64']).toBeDefined();
    expect(dtypes['int32']).toBeDefined();
  });
});
