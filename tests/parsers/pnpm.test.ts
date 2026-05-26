import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pnpmParse } from '../../src/parsers/pnpm.js';

describe('pnpm Parser', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-pnpm-parser-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const writeWorkspaceYaml = async (contents: string): Promise<void> => {
    await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), contents);
  };

  it('should return [] when the pnpm field is missing and no workspace yaml', async () => {
    expect(await pnpmParse({ name: 'test-project', version: '1.0.0' }, tempDir)).toStrictEqual([]);
  });

  it('should return [] when pnpm.overrides is missing', async () => {
    expect(await pnpmParse({ pnpm: {} }, tempDir)).toStrictEqual([]);
  });

  it('should return [] when pnpm.overrides is {}', async () => {
    expect(await pnpmParse({ pnpm: { overrides: {} } }, tempDir)).toStrictEqual([]);
  });

  it('should return one override per entry in pnpm.overrides', async () => {
    expect(await pnpmParse({ pnpm: { overrides: { foo: '1.2.3' } } }, tempDir)).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should preserve keys and values for multiple entries in pnpm.overrides', async () => {
    expect(
      await pnpmParse({ pnpm: { overrides: { foo: '1.2.3', bar: '4.5.6' } } }, tempDir),
    ).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
      { key: 'bar', value: '4.5.6' },
    ]);
  });

  it("should skip pnpm.overrides entries whose value isn't a string", async () => {
    expect(
      await pnpmParse({ pnpm: { overrides: { foo: '1.2.3', bar: 4 } } }, tempDir),
    ).toStrictEqual([{ key: 'foo', value: '1.2.3' }]);
  });

  it('should read overrides from pnpm-workspace.yaml when only the yaml is present', async () => {
    await writeWorkspaceYaml('overrides:\n  foo: 1.2.3\n  bar: 4.5.6\n');

    expect(await pnpmParse({ name: 'yaml-only' }, tempDir)).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
      { key: 'bar', value: '4.5.6' },
    ]);
  });

  it('should union disjoint overrides from package.json and pnpm-workspace.yaml', async () => {
    await writeWorkspaceYaml('overrides:\n  baz: 7.8.9\n');

    expect(await pnpmParse({ pnpm: { overrides: { foo: '1.2.3' } } }, tempDir)).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
      { key: 'baz', value: '7.8.9' },
    ]);
  });

  it('should let pnpm-workspace.yaml win when keys overlap with pnpm.overrides', async () => {
    await writeWorkspaceYaml('overrides:\n  foo: 9.9.9\n');

    expect(await pnpmParse({ pnpm: { overrides: { foo: '1.2.3' } } }, tempDir)).toStrictEqual([
      { key: 'foo', value: '9.9.9' },
    ]);
  });

  it('should ignore pnpm-workspace.yaml when it has no overrides key', async () => {
    await writeWorkspaceYaml('packages:\n  - "packages/*"\n');

    expect(await pnpmParse({ pnpm: { overrides: { foo: '1.2.3' } } }, tempDir)).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });

  it('should skip non-string values inside pnpm-workspace.yaml overrides', async () => {
    await writeWorkspaceYaml('overrides:\n  foo: 1.2.3\n  bar: 4\n');

    expect(await pnpmParse({ name: 'yaml-only' }, tempDir)).toStrictEqual([
      { key: 'foo', value: '1.2.3' },
    ]);
  });
});
