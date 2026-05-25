import { describe, expect, it } from 'vitest';
import { pnpmParse } from '../../src/parsers/pnpm.js';

describe('pnpm Parser', () => {
  it('should return [] when the pnpm field is missing', () => {
    expect(pnpmParse({ name: 'test-project', version: '1.0.0' })).toStrictEqual([]);
  });

  it('should return [] when overrides is missing', () => {
    expect(pnpmParse({ pnpm: {} })).toStrictEqual([]);
  });

  it('should return [] when overrides is {}', () => {
    expect(pnpmParse({ pnpm: { overrides: {} } })).toStrictEqual([]);
  });

  it('should return one override for each entry', () => {
    expect(pnpmParse({ pnpm: { overrides: { foo: '1.2.3' } } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should return all overrides for multiple entries (preserves keys + values)', () => {
    expect(pnpmParse({ pnpm: { overrides: { foo: '1.2.3', bar: '4.5.6' } } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
      { key: 'bar', value: '4.5.6' },
    ]);
  });

  it("should skip entries whose value isn't a string", () => {
    expect(pnpmParse({ pnpm: { overrides: { foo: '1.2.3', bar: 4 } } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });
});
