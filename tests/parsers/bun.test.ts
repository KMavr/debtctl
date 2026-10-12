import { describe, expect, it } from 'vitest';
import { bunParse } from '../../src/parsers/bun.js';

describe('bun Parser', () => {
  it('should return [] when neither overrides nor resolutions is present', () => {
    expect(bunParse({ name: 'test-project', version: '1.0.0' })).toStrictEqual([]);
  });

  it('should parse overrides only', () => {
    expect(bunParse({ overrides: { foo: '1.2.3' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should parse resolutions only', () => {
    expect(bunParse({ resolutions: { foo: '1.2.3' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should merge overrides and resolutions with different keys', () => {
    expect(bunParse({ overrides: { foo: '1.0.0' }, resolutions: { bar: '2.0.0' } })).toStrictEqual([
      { key: 'bar', value: '2.0.0' },
      { key: 'foo', value: '1.0.0' },
    ]);
  });

  it('should let overrides win when both declare the same key', () => {
    expect(
      bunParse({
        overrides: { foo: '3.0.0' },
        resolutions: { foo: '1.0.0', bar: '2.0.0' },
      }),
    ).toStrictEqual([
      { key: 'foo', value: '3.0.0' },
      { key: 'bar', value: '2.0.0' },
    ]);
  });

  it('should skip patch: resolutions', () => {
    expect(
      bunParse({ resolutions: { foo: 'patch:foo@1.0.0#./patches/foo.patch', bar: '2.0.0' } }),
    ).toStrictEqual([{ key: 'bar', value: '2.0.0' }]);
  });
});
