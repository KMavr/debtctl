import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parsePatchedDependencies } from '../../../src/parsers/patches/patchedDependencies.js';

const PATCH_BODY = '--- a/index.js\n+++ b/index.js\n@@ -1 +1 @@\n-old\n+new\n';

describe('parsePatchedDependencies', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-patched-dependencies-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const writePatchFile = async (relativePath: string) => {
    const absolutePath = path.join(tempDir, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, PATCH_BODY);
  };

  it('should return an empty array when patchedDependencies is undefined', async () => {
    expect(await parsePatchedDependencies(undefined, 'bun', tempDir)).toStrictEqual([]);
  });

  it('should return an empty array when patchedDependencies is not an object', async () => {
    expect(await parsePatchedDependencies('nope', 'bun', tempDir)).toStrictEqual([]);
  });

  it('should return an empty array when patchedDependencies is an empty object', async () => {
    expect(await parsePatchedDependencies({}, 'bun', tempDir)).toStrictEqual([]);
  });

  it('should tag each patch with the given source', async () => {
    await writePatchFile('patches/foo@1.0.0.patch');
    const patchedDependencies = { 'foo@1.0.0': 'patches/foo@1.0.0.patch' };

    const bunPatches = await parsePatchedDependencies(patchedDependencies, 'bun', tempDir);
    const pnpmPatches = await parsePatchedDependencies(patchedDependencies, 'pnpm', tempDir);

    expect(bunPatches[0].source).toBe('bun');
    expect(pnpmPatches[0].source).toBe('pnpm');
  });

  it('should strip the version from unscoped and scoped keys and sort by key', async () => {
    await writePatchFile('patches/foo@1.0.0.patch');
    await writePatchFile('patches/@bar__baz@2.3.4.patch');

    const patches = await parsePatchedDependencies(
      {
        'foo@1.0.0': 'patches/foo@1.0.0.patch',
        '@bar/baz@2.3.4': 'patches/@bar__baz@2.3.4.patch',
      },
      'bun',
      tempDir,
    );

    expect(patches.map((patch) => patch.key)).toEqual(['@bar/baz', 'foo']);
  });

  it('should resolve the patch path against cwd and hash its content', async () => {
    await writePatchFile('patches/foo@1.0.0.patch');

    const [patch] = await parsePatchedDependencies(
      { 'foo@1.0.0': 'patches/foo@1.0.0.patch' },
      'bun',
      tempDir,
    );

    expect(patch.patchFilePath).toBe('patches/foo@1.0.0.patch');
    expect(patch.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
