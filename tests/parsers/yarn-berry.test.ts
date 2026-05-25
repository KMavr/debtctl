import { describe, expect, it } from 'vitest';
import { yarnBerryParse } from '../../src/parsers/yarn-berry.js';

describe('Yarn Berry Parser', () => {
  it('should return [] when resolutions is missing', () => {
    expect(yarnBerryParse({ name: 'test-project', version: '1.0.0' })).toStrictEqual([]);
  });

  it('should return [] when resolutions is {}', () => {
    expect(yarnBerryParse({ resolutions: {} })).toStrictEqual([]);
  });

  it('should return one override for a single entry', () => {
    expect(yarnBerryParse({ resolutions: { foo: '1.2.3' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should return all overrides for multiple entries (preserves keys + values)', () => {
    expect(yarnBerryParse({ resolutions: { foo: '1.2.3', bar: '4.5.6' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
      { key: 'bar', value: '4.5.6' },
    ]);
  });

  it("should skip entries whose value isn't a string", () => {
    expect(yarnBerryParse({ resolutions: { foo: '1.2.3', bar: 4 } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should preserve glob and descriptor selector keys verbatim', () => {
    expect(
      yarnBerryParse({
        resolutions: {
          '**/lodash': '4.17.21',
          'react@18/lodash': '4.17.21',
          '@scope/pkg': '2.0.0',
        },
      }),
    ).toStrictEqual([
      { key: '**/lodash', value: '4.17.21' },
      { key: 'react@18/lodash', value: '4.17.21' },
      { key: '@scope/pkg', value: '2.0.0' },
    ]);
  });
});
