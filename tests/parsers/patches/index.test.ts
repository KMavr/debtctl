import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parsePatches } from '../../../src/parsers/patches/index.js';

const PATCH_BODY = '--- a/index.js\n+++ b/index.js\n@@ -1 +1 @@\n-old\n+new\n';

describe('parsePatches dispatcher', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-patches-dispatcher-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const writePatchFile = async (relativePath: string) => {
    const absolutePath = path.join(tempDir, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, PATCH_BODY);
  };

  it('should route "npm" to patch-package detection', async () => {
    await writePatchFile('patches/foo+1.0.0.patch');

    const patches = await parsePatches('npm', {}, tempDir);

    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ key: 'foo', source: 'patch-package' });
  });

  it('should route "yarn-classic" to patch-package detection', async () => {
    await writePatchFile('patches/foo+1.0.0.patch');

    const patches = await parsePatches('yarn-classic', {}, tempDir);

    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ key: 'foo', source: 'patch-package' });
  });

  it('should route "pnpm" to pnpm patchedDependencies detection', async () => {
    await writePatchFile('patches/foo@1.0.0.patch');

    const patches = await parsePatches(
      'pnpm',
      { pnpm: { patchedDependencies: { 'foo@1.0.0': 'patches/foo@1.0.0.patch' } } },
      tempDir,
    );

    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ key: 'foo', source: 'pnpm' });
  });

  it('should route "yarn-berry" to patch protocol resolutions detection', async () => {
    await writePatchFile('.yarn/patches/foo-npm-1.0.0-abc.patch');

    const patches = await parsePatches(
      'yarn-berry',
      {
        resolutions: {
          foo: 'patch:foo@npm%3A1.0.0#./.yarn/patches/foo-npm-1.0.0-abc.patch',
        },
      },
      tempDir,
    );

    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ key: 'foo', source: 'yarn-berry' });
  });

  it('should return [] when the manager has no patches in the given project', async () => {
    expect(await parsePatches('npm', {}, tempDir)).toStrictEqual([]);
    expect(await parsePatches('pnpm', {}, tempDir)).toStrictEqual([]);
    expect(await parsePatches('yarn-berry', {}, tempDir)).toStrictEqual([]);
  });
});
