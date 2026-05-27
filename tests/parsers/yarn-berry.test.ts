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
          '**/foo': '1.2.3',
          'bar@1/foo': '1.2.3',
          '@scope/baz': '2.0.0',
        },
      }),
    ).toStrictEqual([
      { key: '**/foo', value: '1.2.3' },
      { key: 'bar@1/foo', value: '1.2.3' },
      { key: '@scope/baz', value: '2.0.0' },
    ]);
  });

  it('should exclude patch protocol values from overrides', () => {
    const overrides = yarnBerryParse({
      resolutions: {
        foo: '^1.0.0',
        bar: 'patch:bar@npm%3A2.0.0#./.yarn/patches/bar.patch',
      },
    });

    expect(overrides).toStrictEqual([{ key: 'foo', value: '^1.0.0' }]);
  });
});
