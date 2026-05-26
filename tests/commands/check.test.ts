import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { check } from '../../src/commands/check.js';
import { OverrideMeta, PackageJson, Sidecar } from '../../src/types.js';

const SIDECAR_FILENAME = '.debtctl.json';

const documentedDateMeta: OverrideMeta = {
  reason: 'Foo bar',
  owner: 'John Doe',
  revisitWhen: { type: 'date', expires: '2099-01-01' },
};

const documentedAnchorMeta = (packageName: string, declaredRange: string): OverrideMeta => ({
  reason: 'Pin until upstream catches up',
  owner: 'John Doe',
  revisitWhen: { type: 'version-anchor', package: packageName, declaredRange },
});

const stubMeta: OverrideMeta = {
  reason: 'TODO',
  owner: 'TODO',
  revisitWhen: { type: 'date', expires: 'TODO' },
};

describe('check command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-check-'));
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

  it('should classify an override with no sidecar entry as missing', async () => {
    await writePackageJson({ overrides: { foo: '1.2.3', bar: '4.5.6' } });
    await writeSidecarFixture({ version: 1, overrides: { foo: documentedDateMeta } });

    const result = await check(tempDir);

    expect(result.sidecarPresent).toBe(true);
    expect(result.entries).toContainEqual({ key: 'bar', status: 'missing' });
  });

  it('should classify a stubbed entry as incomplete', async () => {
    await writePackageJson({ overrides: { foo: '1.2.3' } });
    await writeSidecarFixture({ version: 1, overrides: { foo: stubMeta } });

    const result = await check(tempDir);

    expect(result.entries).toEqual([
      { key: 'foo', status: 'incomplete', reason: 'TODO fields present' },
    ]);
  });

  it('should classify a documented future-date entry as ok', async () => {
    await writePackageJson({ overrides: { foo: '1.2.3' } });
    await writeSidecarFixture({ version: 1, overrides: { foo: documentedDateMeta } });

    const result = await check(tempDir, new Date('2026-05-26'));

    expect(result.entries[0].status).toBe('ok');
    expect(result.entries[0].key).toBe('foo');
  });

  it('should classify a documented past-date entry as dueForReview', async () => {
    const expiredMeta: OverrideMeta = {
      ...documentedDateMeta,
      revisitWhen: { type: 'date', expires: '2020-01-01' },
    };
    await writePackageJson({ overrides: { foo: '1.2.3' } });
    await writeSidecarFixture({ version: 1, overrides: { foo: expiredMeta } });

    const result = await check(tempDir, new Date('2026-05-26'));

    expect(result.entries[0].status).toBe('dueForReview');
    expect(result.entries[0].reason).toMatch(/Expired on 2020-01-01/);
  });

  it('should classify a documented entry with malformed expires as incomplete', async () => {
    const malformedMeta: OverrideMeta = {
      ...documentedDateMeta,
      revisitWhen: { type: 'date', expires: 'not-a-date' },
    };
    await writePackageJson({ overrides: { foo: '1.2.3' } });
    await writeSidecarFixture({ version: 1, overrides: { foo: malformedMeta } });

    const result = await check(tempDir);

    expect(result.entries[0].status).toBe('incomplete');
    expect(result.entries[0].reason).toMatch(/Invalid expires date/);
  });

  it('should classify a documented version-anchor entry as ok when range matches', async () => {
    await writePackageJson({
      overrides: { foo: '1.2.3' },
      dependencies: { foo: '^1.0.0' },
    });
    await writeSidecarFixture({
      version: 1,
      overrides: { foo: documentedAnchorMeta('foo', '^1.0.0') },
    });

    const result = await check(tempDir);

    expect(result.entries[0].status).toBe('ok');
  });

  it('should classify a documented version-anchor entry as dueForReview when range changes', async () => {
    await writePackageJson({
      overrides: { foo: '1.2.3' },
      dependencies: { foo: '^2.0.0' },
    });
    await writeSidecarFixture({
      version: 1,
      overrides: { foo: documentedAnchorMeta('foo', '^1.0.0') },
    });

    const result = await check(tempDir);

    expect(result.entries[0].status).toBe('dueForReview');
    expect(result.entries[0].reason).toMatch(/foo declared range changed/);
  });

  it('should classify a documented version-anchor entry as dueForReview when dep is removed', async () => {
    await writePackageJson({
      overrides: { foo: '1.2.3' },
      dependencies: { bar: '^1.0.0' },
    });
    await writeSidecarFixture({
      version: 1,
      overrides: { foo: documentedAnchorMeta('foo', '^1.0.0') },
    });

    const result = await check(tempDir);

    expect(result.entries[0].status).toBe('dueForReview');
    expect(result.entries[0].reason).toMatch(/foo is no longer a dependency/);
  });

  it('should report orphans for sidecar keys not in package.json overrides', async () => {
    await writePackageJson({ overrides: { foo: '1.2.3' } });
    await writeSidecarFixture({
      version: 1,
      overrides: { foo: documentedDateMeta, baz: documentedDateMeta },
    });

    const result = await check(tempDir);

    expect(result.orphans).toEqual([{ key: 'baz' }]);
    expect(result.entries.map((entry) => entry.key)).toEqual(['foo']);
  });

  it('should set sidecarPresent to false when no sidecar file exists', async () => {
    await writePackageJson({ overrides: { foo: '1.2.3' } });

    const result = await check(tempDir);

    expect(result.sidecarPresent).toBe(false);
    expect(result.entries).toEqual([{ key: 'foo', status: 'missing' }]);
    expect(result.orphans).toEqual([]);
  });

  it('should return zero entries and zero orphans when no overrides exist', async () => {
    await writePackageJson({ name: 'empty' });

    const result = await check(tempDir);

    expect(result.entries).toEqual([]);
    expect(result.orphans).toEqual([]);
    expect(result.manager).toBe('npm');
  });

  it('should classify a mix of buckets correctly in a single run', async () => {
    await writePackageJson({
      overrides: { foo: '1.2.3', bar: '4.5.6', baz: '7.8.9', qux: '0.0.1' },
      dependencies: { bar: '^2.0.0' },
    });
    await writeSidecarFixture({
      version: 1,
      overrides: {
        foo: documentedDateMeta,
        bar: documentedAnchorMeta('bar', '^1.0.0'),
        baz: stubMeta,
        orphaned: documentedDateMeta,
      },
    });

    const result = await check(tempDir, new Date('2026-05-26'));

    const byKey = Object.fromEntries(result.entries.map((entry) => [entry.key, entry.status]));
    expect(byKey).toEqual({
      foo: 'ok',
      bar: 'dueForReview',
      baz: 'incomplete',
      qux: 'missing',
    });
    expect(result.orphans).toEqual([{ key: 'orphaned' }]);
  });
});
