import { describe, expect, it } from 'vitest';
import { npmParse } from '../../src/parsers/npm.js';

describe('npm Parser', () => {
  it('should return [] when overrides is missing', () => {
    expect(npmParse({ name: 'test-project', version: '1.0.0' })).toStrictEqual([]);
  });

  it('should return [] when overrides is {}', () => {
    expect(npmParse({ overrides: {} })).toStrictEqual([]);
  });

  it('should parse a single flat override', () => {
    expect(npmParse({ overrides: { foo: '1.2.3' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should parse multiple flat overrides (preserves keys + values)', () => {
    expect(npmParse({ overrides: { foo: '1.2.3', bar: '4.5.6' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
      { key: 'bar', value: '4.5.6' },
    ]);
  });

  it('should preserve a "parent>child" string key verbatim', () => {
    expect(npmParse({ overrides: { 'foo>bar': '1.2.3' } })).toStrictEqual([
      { key: 'foo>bar', value: '1.2.3' },
    ]);
  });

  it('should flatten a nested object into "parent>child" keys', () => {
    expect(npmParse({ overrides: { foo: { bar: '1.2.3' } } })).toStrictEqual([
      { key: 'foo>bar', value: '1.2.3' },
    ]);
  });

  it('should support the "." key to pin the parent itself', () => {
    expect(npmParse({ overrides: { foo: { '.': '2.0.0', bar: '1.2.3' } } })).toStrictEqual([
      { key: 'foo', value: '2.0.0' },
      { key: 'foo>bar', value: '1.2.3' },
    ]);
  });

  it('should recurse into deeply nested overrides', () => {
    expect(
      npmParse({
        overrides: {
          foo: {
            bar: {
              baz: '1.2.3',
            },
          },
        },
      }),
    ).toStrictEqual([{ key: 'foo>bar>baz', value: '1.2.3' }]);
  });

  it('should handle a mix of flat, nested, and parent>child entries', () => {
    expect(
      npmParse({
        overrides: {
          foo: '1.2.3',
          'bar>baz': '4.5.6',
          qux: {
            '.': '7.8.9',
            quux: '7.8.9',
          },
        },
      }),
    ).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
      { key: 'bar>baz', value: '4.5.6' },
      { key: 'qux', value: '7.8.9' },
      { key: 'qux>quux', value: '7.8.9' },
    ]);
  });

  it('should skip entries whose value is neither a string nor an object', () => {
    expect(npmParse({ overrides: { foo: '1.2.3', bogus: 4, alsoBogus: null } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });
});
