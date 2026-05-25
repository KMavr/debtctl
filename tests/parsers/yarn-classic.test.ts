import { describe, expect, it } from 'vitest';
import { yarnClassicParse } from '../../src/parsers/yarn-classic.js';

describe('Yarn Classic Parser', () => {
  it('should return [] when resolutions is missing', () => {
    expect(yarnClassicParse({ name: 'test-project', version: '1.0.0' })).toStrictEqual([]);
  });

  it('should return [] when resolutions is {}', () => {
    expect(yarnClassicParse({ resolutions: {} })).toStrictEqual([]);
  });

  it('should return one override for each entry', () => {
    expect(yarnClassicParse({ resolutions: { foo: '1.2.3' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should return all overrides for multiple entries (preserves keys + values)', () => {
    expect(yarnClassicParse({ resolutions: { foo: '1.2.3', bar: '4.5.6' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
      { key: 'bar', value: '4.5.6' },
    ]);
  });

  it("should skip entries whose value isn't a string", () => {
    expect(yarnClassicParse({ resolutions: { foo: '1.2.3', bar: 4 } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });
});
