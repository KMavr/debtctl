import { describe, expect, it } from 'vitest';
import { parseOverrides } from '../../src/parsers/index.js';

describe('parseOverrides dispatcher', () => {
  it('should route "npm" to npmParse', () => {
    expect(parseOverrides('npm', { overrides: { foo: '1.2.3' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should route "pnpm" to pnpmParse', () => {
    expect(parseOverrides('pnpm', { pnpm: { overrides: { foo: '1.2.3' } } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should route "yarn-classic" to yarnClassicParse', () => {
    expect(parseOverrides('yarn-classic', { resolutions: { foo: '1.2.3' } })).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should route "yarn-berry" to yarnBerryParse', () => {
    expect(parseOverrides('yarn-berry', { resolutions: { '**/foo': '1.2.3' } })).toStrictEqual([
      { key: '**/foo', value: '1.2.3' },
    ]);
  });

  it('should return [] when the manager has no overrides in the given package.json', () => {
    expect(parseOverrides('npm', { name: 'empty' })).toStrictEqual([]);
  });
});
