import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pnpmPatchesParse } from '../../../src/parsers/patches/pnpm.js';

const PATCH_BODY = '--- a/index.js\n+++ b/index.js\n@@ -1 +1 @@\n-old\n+new\n';

describe('pnpmPatchesParse', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-pnpm-patches-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const writePatchFile = async (relativePath: string, body: string = PATCH_BODY) => {
    const absolutePath = path.join(tempDir, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, body);
  };

  it('should return an empty array when packageJson has no pnpm field', async () => {
    expect(await pnpmPatchesParse({}, tempDir)).toStrictEqual([]);
  });

  it('should return an empty array when pnpm has no patchedDependencies', async () => {
    expect(
      await pnpmPatchesParse({ pnpm: { overrides: { foo: '^1.0.0' } } }, tempDir),
    ).toStrictEqual([]);
  });

  it('should return an empty array when patchedDependencies is an empty object', async () => {
    expect(await pnpmPatchesParse({ pnpm: { patchedDependencies: {} } }, tempDir)).toStrictEqual(
      [],
    );
  });

  it('should return an empty array when pnpm is not an object', async () => {
    expect(await pnpmPatchesParse({ pnpm: 'not an object' }, tempDir)).toStrictEqual([]);
  });

  it('should return an empty array when patchedDependencies is not an object', async () => {
    expect(
      await pnpmPatchesParse({ pnpm: { patchedDependencies: 'nope' } }, tempDir),
    ).toStrictEqual([]);
  });

  it('should detect an unscoped patched dependency and strip the version', async () => {
    await writePatchFile('patches/foo@1.0.0.patch');

    const patches = await pnpmPatchesParse(
      { pnpm: { patchedDependencies: { 'foo@1.0.0': 'patches/foo@1.0.0.patch' } } },
      tempDir,
    );

    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({
      key: 'foo',
      source: 'pnpm',
      patchFilePath: 'patches/foo@1.0.0.patch',
    });
  });

  it('should detect a scoped patched dependency and strip the version using lastIndexOf', async () => {
    await writePatchFile('patches/@bar__baz@2.3.4.patch');

    const patches = await pnpmPatchesParse(
      {
        pnpm: {
          patchedDependencies: { '@bar/baz@2.3.4': 'patches/@bar__baz@2.3.4.patch' },
        },
      },
      tempDir,
    );

    expect(patches).toHaveLength(1);
    expect(patches[0].key).toBe('@bar/baz');
    expect(patches[0].patchFilePath).toBe('patches/@bar__baz@2.3.4.patch');
  });

  it('should detect multiple entries and sort them alphabetically by key', async () => {
    await writePatchFile('patches/foo@1.0.0.patch');
    await writePatchFile('patches/bar@2.0.0.patch');
    await writePatchFile('patches/@scope__baz@3.0.0.patch');

    const patches = await pnpmPatchesParse(
      {
        pnpm: {
          patchedDependencies: {
            'foo@1.0.0': 'patches/foo@1.0.0.patch',
            'bar@2.0.0': 'patches/bar@2.0.0.patch',
            '@scope/baz@3.0.0': 'patches/@scope__baz@3.0.0.patch',
          },
        },
      },
      tempDir,
    );

    expect(patches.map((patch) => patch.key)).toStrictEqual(['@scope/baz', 'bar', 'foo']);
  });

  it('should populate contentHash with a sha256-prefixed digest', async () => {
    await writePatchFile('patches/foo@1.0.0.patch');

    const patches = await pnpmPatchesParse(
      { pnpm: { patchedDependencies: { 'foo@1.0.0': 'patches/foo@1.0.0.patch' } } },
      tempDir,
    );

    expect(patches[0].contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('should produce different content hashes for patches with different bodies', async () => {
    await writePatchFile('patches/foo@1.0.0.patch', 'one body\n');
    await writePatchFile('patches/bar@1.0.0.patch', 'another body\n');

    const patches = await pnpmPatchesParse(
      {
        pnpm: {
          patchedDependencies: {
            'foo@1.0.0': 'patches/foo@1.0.0.patch',
            'bar@1.0.0': 'patches/bar@1.0.0.patch',
          },
        },
      },
      tempDir,
    );

    const fooPatch = patches.find((patch) => patch.key === 'foo');
    const barPatch = patches.find((patch) => patch.key === 'bar');
    expect(fooPatch?.contentHash).not.toBe(barPatch?.contentHash);
  });
});
