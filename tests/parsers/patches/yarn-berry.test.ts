import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { yarnBerryPatchesParse } from '../../../src/parsers/patches/yarn-berry.js';

const PATCH_BODY = '--- a/index.js\n+++ b/index.js\n@@ -1 +1 @@\n-old\n+new\n';

describe('yarnBerryPatchesParse', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-yarn-berry-patches-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const writePatchFile = async (relativePath: string, body: string = PATCH_BODY) => {
    const absolutePath = path.join(tempDir, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, body);
  };

  it('should return an empty array when packageJson has no resolutions field', async () => {
    expect(await yarnBerryPatchesParse({}, tempDir)).toStrictEqual([]);
  });

  it('should return an empty array when resolutions is empty', async () => {
    expect(await yarnBerryPatchesParse({ resolutions: {} }, tempDir)).toStrictEqual([]);
  });

  it('should return an empty array when resolutions is not an object', async () => {
    expect(await yarnBerryPatchesParse({ resolutions: 'nope' }, tempDir)).toStrictEqual([]);
  });

  it('should ignore non-patch resolutions like plain version pins', async () => {
    const patches = await yarnBerryPatchesParse(
      { resolutions: { foo: '1.2.3', bar: 'npm:^2.0.0' } },
      tempDir,
    );
    expect(patches).toStrictEqual([]);
  });

  it('should skip patch entries that have no @npm marker (workspace patches)', async () => {
    const patches = await yarnBerryPatchesParse(
      { resolutions: { foo: 'patch:foo@workspace%3A.#./.yarn/patches/foo.patch' } },
      tempDir,
    );
    expect(patches).toStrictEqual([]);
  });

  it('should skip patch entries that have no #./ path marker', async () => {
    const patches = await yarnBerryPatchesParse(
      { resolutions: { foo: 'patch:foo@npm%3A1.0.0' } },
      tempDir,
    );
    expect(patches).toStrictEqual([]);
  });

  it('should detect an unscoped patch resolution', async () => {
    await writePatchFile('.yarn/patches/foo-npm-1.0.0-abc123.patch');

    const patches = await yarnBerryPatchesParse(
      {
        resolutions: {
          foo: 'patch:foo@npm%3A1.0.0#./.yarn/patches/foo-npm-1.0.0-abc123.patch',
        },
      },
      tempDir,
    );

    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({
      key: 'foo',
      source: 'yarn-berry',
      patchFilePath: '.yarn/patches/foo-npm-1.0.0-abc123.patch',
    });
  });

  it('should detect a scoped patch resolution', async () => {
    await writePatchFile('.yarn/patches/@bar-baz-npm-2.3.4-def456.patch');

    const patches = await yarnBerryPatchesParse(
      {
        resolutions: {
          '@bar/baz': 'patch:@bar/baz@npm%3A2.3.4#./.yarn/patches/@bar-baz-npm-2.3.4-def456.patch',
        },
      },
      tempDir,
    );

    expect(patches).toHaveLength(1);
    expect(patches[0].key).toBe('@bar/baz');
    expect(patches[0].patchFilePath).toBe('.yarn/patches/@bar-baz-npm-2.3.4-def456.patch');
  });

  it('should detect a patch resolution with the plain @npm: form (not URL-encoded)', async () => {
    await writePatchFile('.yarn/patches/foo-npm-1.0.0-abc123.patch');

    const patches = await yarnBerryPatchesParse(
      {
        resolutions: {
          foo: 'patch:foo@npm:1.0.0#./.yarn/patches/foo-npm-1.0.0-abc123.patch',
        },
      },
      tempDir,
    );

    expect(patches).toHaveLength(1);
    expect(patches[0].key).toBe('foo');
  });

  it('should detect multiple patches and sort them alphabetically by key', async () => {
    await writePatchFile('.yarn/patches/foo-npm-1.0.0-abc.patch');
    await writePatchFile('.yarn/patches/bar-npm-2.0.0-def.patch');
    await writePatchFile('.yarn/patches/@scope-baz-npm-3.0.0-ghi.patch');

    const patches = await yarnBerryPatchesParse(
      {
        resolutions: {
          foo: 'patch:foo@npm%3A1.0.0#./.yarn/patches/foo-npm-1.0.0-abc.patch',
          bar: 'patch:bar@npm%3A2.0.0#./.yarn/patches/bar-npm-2.0.0-def.patch',
          '@scope/baz':
            'patch:@scope/baz@npm%3A3.0.0#./.yarn/patches/@scope-baz-npm-3.0.0-ghi.patch',
        },
      },
      tempDir,
    );

    expect(patches.map((patch) => patch.key)).toStrictEqual(['@scope/baz', 'bar', 'foo']);
  });

  it('should populate contentHash with a sha256-prefixed digest', async () => {
    await writePatchFile('.yarn/patches/foo-npm-1.0.0-abc.patch');

    const patches = await yarnBerryPatchesParse(
      {
        resolutions: {
          foo: 'patch:foo@npm%3A1.0.0#./.yarn/patches/foo-npm-1.0.0-abc.patch',
        },
      },
      tempDir,
    );

    expect(patches[0].contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('should produce different content hashes for patches with different bodies', async () => {
    await writePatchFile('.yarn/patches/foo-npm-1.0.0-abc.patch', 'one body\n');
    await writePatchFile('.yarn/patches/bar-npm-1.0.0-def.patch', 'another body\n');

    const patches = await yarnBerryPatchesParse(
      {
        resolutions: {
          foo: 'patch:foo@npm%3A1.0.0#./.yarn/patches/foo-npm-1.0.0-abc.patch',
          bar: 'patch:bar@npm%3A1.0.0#./.yarn/patches/bar-npm-1.0.0-def.patch',
        },
      },
      tempDir,
    );

    const fooPatch = patches.find((patch) => patch.key === 'foo');
    const barPatch = patches.find((patch) => patch.key === 'bar');
    expect(fooPatch?.contentHash).not.toBe(barPatch?.contentHash);
  });

  it('should mix patch and non-patch resolutions correctly', async () => {
    await writePatchFile('.yarn/patches/foo-npm-1.0.0-abc.patch');

    const patches = await yarnBerryPatchesParse(
      {
        resolutions: {
          foo: 'patch:foo@npm%3A1.0.0#./.yarn/patches/foo-npm-1.0.0-abc.patch',
          bar: '^2.0.0',
          baz: 'npm:qux@^3.0.0',
        },
      },
      tempDir,
    );

    expect(patches).toHaveLength(1);
    expect(patches[0].key).toBe('foo');
  });
});
