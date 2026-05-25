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
    expect(npmParse({ overrides: { lodash: '4.17.21' } })).toStrictEqual([
      { key: 'lodash', value: '4.17.21' },
    ]);
  });

  it('should parse multiple flat overrides (preserves keys + values)', () => {
    expect(npmParse({ overrides: { lodash: '4.17.21', react: '18.2.0' } })).toStrictEqual([
      { key: 'lodash', value: '4.17.21' },
      { key: 'react', value: '18.2.0' },
    ]);
  });

  it('should preserve a "parent>child" string key verbatim', () => {
    expect(npmParse({ overrides: { 'parent>child': '1.0.0' } })).toStrictEqual([
      { key: 'parent>child', value: '1.0.0' },
    ]);
  });

  it('should flatten a nested object into "parent>child" keys', () => {
    expect(npmParse({ overrides: { parent: { child: '1.0.0' } } })).toStrictEqual([
      { key: 'parent>child', value: '1.0.0' },
    ]);
  });

  it('should support the "." key to pin the parent itself', () => {
    expect(npmParse({ overrides: { parent: { '.': '2.0.0', child: '1.0.0' } } })).toStrictEqual([
      { key: 'parent', value: '2.0.0' },
      { key: 'parent>child', value: '1.0.0' },
    ]);
  });

  it('should recurse into deeply nested overrides', () => {
    expect(
      npmParse({
        overrides: {
          a: {
            b: {
              c: '1.0.0',
            },
          },
        },
      }),
    ).toStrictEqual([{ key: 'a>b>c', value: '1.0.0' }]);
  });

  it('should handle a mix of flat, nested, and parent>child entries', () => {
    expect(
      npmParse({
        overrides: {
          lodash: '4.17.21',
          'parent>child': '1.0.0',
          react: {
            '.': '18.2.0',
            'react-dom': '18.2.0',
          },
        },
      }),
    ).toStrictEqual([
      { key: 'lodash', value: '4.17.21' },
      { key: 'parent>child', value: '1.0.0' },
      { key: 'react', value: '18.2.0' },
      { key: 'react>react-dom', value: '18.2.0' },
    ]);
  });

  it('should skip entries whose value is neither a string nor an object', () => {
    expect(npmParse({ overrides: { lodash: '4.17.21', bogus: 4, alsoBogus: null } })).toStrictEqual(
      [{ key: 'lodash', value: '4.17.21' }],
    );
  });
});
