import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseOverrides } from '../../src/parsers/index.js';

describe('parseOverrides dispatcher', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-dispatcher-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should route "npm" to npmParse', async () => {
    expect(await parseOverrides('npm', { overrides: { foo: '1.2.3' } }, tempDir)).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should route "pnpm" to pnpmParse', async () => {
    expect(
      await parseOverrides('pnpm', { pnpm: { overrides: { foo: '1.2.3' } } }, tempDir),
    ).toStrictEqual([{ key: 'foo', value: '1.2.3' }]);
  });

  it('should route "yarn-classic" to yarnClassicParse', async () => {
    expect(
      await parseOverrides('yarn-classic', { resolutions: { foo: '1.2.3' } }, tempDir),
    ).toStrictEqual([{ key: 'foo', value: '1.2.3' }]);
  });

  it('should route "yarn-berry" to yarnBerryParse', async () => {
    expect(
      await parseOverrides('yarn-berry', { resolutions: { '**/foo': '1.2.3' } }, tempDir),
    ).toStrictEqual([{ key: '**/foo', value: '1.2.3' }]);
  });

  it('should return [] when the manager has no overrides in the given package.json', async () => {
    expect(await parseOverrides('npm', { name: 'empty' }, tempDir)).toStrictEqual([]);
  });
});
