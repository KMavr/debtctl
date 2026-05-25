import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mergeSidecar, readSidecar, writeSidecar } from '../src/sidecar/index.js';
import { Sidecar } from '../src/types.js';

const SIDECAR_FILENAME = '.debtctl.json';

const makeSidecar = (overrides: Record<string, Sidecar['overrides'][string]>): Sidecar => ({
  version: 1,
  overrides,
});

const fooMeta = {
  reason: 'patches CVE',
  owner: 'team-security',
  revisitWhen: { type: 'date', expires: '2026-12-01' },
} satisfies Sidecar['overrides'][string];

const barMeta = {
  reason: 'force peer compatibility',
  owner: 'alice',
  revisitWhen: { type: 'version-anchor', package: 'bar', declaredVersion: '^4.0.0' },
} satisfies Sidecar['overrides'][string];

describe('sidecar module', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-sidecar-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('readSidecar', () => {
    it('should return null when .debtctl.json does not exist', async () => {
      expect(await readSidecar(tempDir)).toBeNull();
    });

    it('should parse and return the sidecar when the file exists', async () => {
      const sidecar = makeSidecar({ foo: fooMeta });
      await fs.writeFile(path.join(tempDir, SIDECAR_FILENAME), JSON.stringify(sidecar));
      expect(await readSidecar(tempDir)).toStrictEqual(sidecar);
    });

    it('should throw when the file is malformed JSON', async () => {
      await fs.writeFile(path.join(tempDir, SIDECAR_FILENAME), '{ not valid json');
      await expect(readSidecar(tempDir)).rejects.toThrow();
    });
  });

  describe('writeSidecar', () => {
    it('should write the sidecar to .debtctl.json as readable JSON', async () => {
      const sidecar = makeSidecar({ foo: fooMeta });
      await writeSidecar(tempDir, sidecar);

      const raw = await fs.readFile(path.join(tempDir, SIDECAR_FILENAME), 'utf8');
      expect(JSON.parse(raw)).toStrictEqual(sidecar);
      expect(raw.endsWith('\n')).toBe(true);
    });

    it('should leave no .debtctl.json.tmp behind after a successful write', async () => {
      await writeSidecar(tempDir, makeSidecar({ foo: fooMeta }));
      const entries = await fs.readdir(tempDir);
      expect(entries).toContain(SIDECAR_FILENAME);
      expect(entries).not.toContain(`${SIDECAR_FILENAME}.tmp`);
    });
  });

  describe('mergeSidecar', () => {
    it('should create a fresh sidecar with stubs when existing is null', () => {
      const merged = mergeSidecar(null, ['foo', 'bar']);
      expect(merged).toStrictEqual({
        version: 1,
        overrides: {
          foo: { reason: 'TODO', owner: 'TODO', revisitWhen: { type: 'date', expires: 'TODO' } },
          bar: { reason: 'TODO', owner: 'TODO', revisitWhen: { type: 'date', expires: 'TODO' } },
        },
      });
    });

    it('should preserve existing metadata when keys overlap', () => {
      const existing = makeSidecar({ foo: fooMeta });
      const merged = mergeSidecar(existing, ['foo']);
      expect(merged.overrides.foo).toStrictEqual(fooMeta);
    });

    it('should add stubs for newly-introduced keys while preserving existing ones', () => {
      const existing = makeSidecar({ foo: fooMeta });
      const merged = mergeSidecar(existing, ['foo', 'bar']);
      expect(merged.overrides.foo).toStrictEqual(fooMeta);
      expect(merged.overrides.bar).toStrictEqual({
        reason: 'TODO',
        owner: 'TODO',
        revisitWhen: { type: 'date', expires: 'TODO' },
      });
    });

    it('should keep orphaned entries (key in sidecar but not in current keys)', () => {
      const existing = makeSidecar({ foo: fooMeta, bar: barMeta });
      const merged = mergeSidecar(existing, ['foo']);
      expect(merged.overrides.foo).toStrictEqual(fooMeta);
      expect(merged.overrides.bar).toStrictEqual(barMeta);
    });

    it('should produce fresh stub objects per key (no shared references)', () => {
      const merged = mergeSidecar(null, ['foo', 'bar']);
      expect(merged.overrides.foo).not.toBe(merged.overrides.bar);
      expect(merged.overrides.foo.revisitWhen).not.toBe(merged.overrides.bar.revisitWhen);
    });
  });

  describe('round-trip', () => {
    it('should write a sidecar and read back the same object', async () => {
      const sidecar = makeSidecar({ foo: fooMeta, bar: barMeta });
      await writeSidecar(tempDir, sidecar);
      expect(await readSidecar(tempDir)).toStrictEqual(sidecar);
    });
  });
});
