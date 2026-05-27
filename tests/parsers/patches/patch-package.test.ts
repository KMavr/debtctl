import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { patchPackageParse } from '../../../src/parsers/patches/patch-package.js';

const PATCH_BODY = '--- a/index.js\n+++ b/index.js\n@@ -1 +1 @@\n-old\n+new\n';

describe('patchPackageParse', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-patch-package-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const writePatch = async (filename: string, body: string = PATCH_BODY) => {
    const patchesPath = path.join(tempDir, 'patches');
    await fs.mkdir(patchesPath, { recursive: true });
    await fs.writeFile(path.join(patchesPath, filename), body);
  };

  it('should return an empty array when the patches directory does not exist', async () => {
    expect(await patchPackageParse(tempDir)).toStrictEqual([]);
  });

  it('should return an empty array when the patches directory is empty', async () => {
    await fs.mkdir(path.join(tempDir, 'patches'));
    expect(await patchPackageParse(tempDir)).toStrictEqual([]);
  });

  it('should ignore files that do not end in .patch', async () => {
    await writePatch('foo+1.0.0.patch');
    await writePatch('README.md');
    await writePatch('bar.txt');

    const patches = await patchPackageParse(tempDir);

    expect(patches).toHaveLength(1);
    expect(patches[0].key).toBe('foo');
  });

  it('should detect an unscoped patch and extract the package name', async () => {
    await writePatch('foo+1.0.0.patch');

    const patches = await patchPackageParse(tempDir);

    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({
      key: 'foo',
      source: 'patch-package',
      patchFilePath: path.join('patches', 'foo+1.0.0.patch'),
    });
  });

  it('should detect a scoped patch and reconstruct the @scope/name key', async () => {
    await writePatch('@bar+foo+2.3.4.patch');

    const patches = await patchPackageParse(tempDir);

    expect(patches).toHaveLength(1);
    expect(patches[0].key).toBe('@bar/foo');
    expect(patches[0].patchFilePath).toBe(path.join('patches', '@bar+foo+2.3.4.patch'));
  });

  it('should detect multiple patches and sort them alphabetically by key', async () => {
    await writePatch('foo+1.0.0.patch');
    await writePatch('bar+2.0.0.patch');
    await writePatch('@scope+baz+3.0.0.patch');

    const patches = await patchPackageParse(tempDir);

    expect(patches.map((patch) => patch.key)).toStrictEqual(['@scope/baz', 'bar', 'foo']);
  });

  it('should populate contentHash with a sha256-prefixed digest', async () => {
    await writePatch('foo+1.0.0.patch');

    const patches = await patchPackageParse(tempDir);

    expect(patches[0].contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('should produce different content hashes for patches with different bodies', async () => {
    await writePatch('foo+1.0.0.patch', 'one body\n');
    await writePatch('bar+1.0.0.patch', 'another body\n');

    const patches = await patchPackageParse(tempDir);
    const fooPatch = patches.find((patch) => patch.key === 'foo');
    const barPatch = patches.find((patch) => patch.key === 'bar');

    expect(fooPatch?.contentHash).not.toBe(barPatch?.contentHash);
  });
});
