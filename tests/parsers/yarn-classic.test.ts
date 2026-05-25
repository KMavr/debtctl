import { describe, expect, it } from 'vitest';
import { yarnClassicParse } from '../../src/parsers/yarn-classic.js';

describe('Yarn Classic Parser', () => {
  it('should return [] when resolutions is missing', () => {
    expect(
      yarnClassicParse({ packageManager: 'yarn@1.0.0', version: '1.0.0', name: 'test-project' }),
    ).toStrictEqual([]);
  });

  it('should return [] when resolution is {} ', () => {
    expect(yarnClassicParse({})).toStrictEqual([]);
  });

  it('should return one override for each entry', () => {
    expect(
      yarnClassicParse({
        packageManager: 'yarn@1.0.0',
        version: '1.0.0',
        name: 'test-project',
        resolutions: { foo: '1.2.3' },
      }),
    ).toStrictEqual([{ key: 'foo', value: '1.2.3' }]);
  });

  it('should return all overrides for multiple entries (preserves keys + values)', () => {
    expect(
      yarnClassicParse({
        packageManager: 'yarn@1.0.0',
        version: '1.0.0',
        name: 'test-project',
        resolutions: { foo: '1.2.3', bar: '4.5.6' },
      }),
    ).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
      { key: 'bar', value: '4.5.6' },
    ]);
  });

  it("should skip entries whose value isn't a string", () => {
    expect(
      yarnClassicParse({
        packageManager: 'yarn@1.0.0',
        version: '1.0.0',
        name: 'test-project',
        resolutions: { foo: '1.2.3', bar: 4 },
      }),
    ).toStrictEqual([{ key: 'foo', value: '1.2.3' }]);
  });
});
