import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { init } from '../../src/commands/init.js';
import { PackageJson, Sidecar } from '../../src/types.js';

const SIDECAR_FILENAME = '.debtctl.json';

const documentedMeta = {
  reason: 'Foo bar',
  owner: 'John Doe',
  revisitWhen: { type: 'date', expires: '2099-01-01' },
} satisfies Sidecar['overrides'][string];

describe('init command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-init-'));
    await fs.writeFile(path.join(tempDir, 'package-lock.json'), '{}');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const writePackageJson = async (contents: PackageJson): Promise<void> => {
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify(contents));
  };

  const writeSidecarFixture = async (sidecar: Sidecar): Promise<void> => {
    await fs.writeFile(path.join(tempDir, SIDECAR_FILENAME), JSON.stringify(sidecar));
  };

  const readSidecarFromDisk = async (): Promise<Sidecar> => {
    const raw = await fs.readFile(path.join(tempDir, SIDECAR_FILENAME), 'utf8');
    return JSON.parse(raw);
  };

  it('should create .debtctl.json with stubs when no sidecar exists', async () => {
    await writePackageJson({ overrides: { foo: '1.2.3', bar: '4.5.6' } });

    const result = await init(tempDir);
    const sidecar = await readSidecarFromDisk();

    expect(result).toStrictEqual({
      manager: 'npm',
      total: 2,
      documented: 0,
      needsMetadata: 2,
      orphans: 0,
    });
    expect(Object.keys(sidecar.overrides).sort()).toStrictEqual(['bar', 'foo']);
    expect(sidecar.overrides.foo.reason).toBe('TODO');
  });

  it('should preserve existing documented metadata on re-run', async () => {
    await writePackageJson({ overrides: { foo: '1.2.3' } });
    await writeSidecarFixture({ version: 1, overrides: { foo: documentedMeta } });

    const result = await init(tempDir);
    const sidecar = await readSidecarFromDisk();

    expect(result).toStrictEqual({
      manager: 'npm',
      total: 1,
      documented: 1,
      needsMetadata: 0,
      orphans: 0,
    });
    expect(sidecar.overrides.foo).toStrictEqual(documentedMeta);
  });

  it('should add stubs for newly-introduced overrides while preserving existing ones', async () => {
    await writePackageJson({ overrides: { foo: '1.2.3', bar: '4.5.6' } });
    await writeSidecarFixture({ version: 1, overrides: { foo: documentedMeta } });

    const result = await init(tempDir);
    const sidecar = await readSidecarFromDisk();

    expect(result).toStrictEqual({
      manager: 'npm',
      total: 2,
      documented: 1,
      needsMetadata: 1,
      orphans: 0,
    });
    expect(sidecar.overrides.foo).toStrictEqual(documentedMeta);
    expect(sidecar.overrides.bar.reason).toBe('TODO');
  });

  it('should report orphans (sidecar entries no longer in package.json)', async () => {
    await writePackageJson({ overrides: { foo: '1.2.3' } });
    await writeSidecarFixture({
      version: 1,
      overrides: { foo: documentedMeta, bar: documentedMeta },
    });

    const result = await init(tempDir);
    const sidecar = await readSidecarFromDisk();

    expect(result).toStrictEqual({
      manager: 'npm',
      total: 1,
      documented: 1,
      needsMetadata: 0,
      orphans: 1,
    });
    expect(sidecar.overrides.bar).toStrictEqual(documentedMeta);
  });

  it('should detect pnpm and parse pnpm.overrides', async () => {
    await fs.rm(path.join(tempDir, 'package-lock.json'));
    await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), '');
    await writePackageJson({ pnpm: { overrides: { foo: '1.2.3' } } });

    const result = await init(tempDir);
    expect(result.manager).toBe('pnpm');
    expect(result.total).toBe(1);
  });

  it('should report zero counts when there are no overrides', async () => {
    await writePackageJson({ name: 'empty' });

    const result = await init(tempDir);
    expect(result).toStrictEqual({
      manager: 'npm',
      total: 0,
      documented: 0,
      needsMetadata: 0,
      orphans: 0,
    });
  });

  it('should populate ambiguous when multiple lockfiles are present', async () => {
    await fs.writeFile(
      path.join(tempDir, 'yarn.lock'),
      '# yarn lockfile v1\n\n\nsome-package@^1.0.0:\n  version "1.0.0"\n',
    );
    await writePackageJson({ overrides: { foo: '1.2.3' } });

    const result = await init(tempDir);
    expect(result.ambiguous).toEqual(['package-lock.json', 'yarn.lock']);
    expect(result.manager).toBe('npm');
  });
});
