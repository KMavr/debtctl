import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readPackageJson } from '../../src/lib/readPackageJson.js';

describe('readPackageJson', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-readpkg-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return the parsed package.json contents', async () => {
    const packageJson = { name: 'foo', version: '1.2.3' };
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));
    await expect(readPackageJson(tempDir)).resolves.toStrictEqual(packageJson);
  });

  it('should throw a descriptive error when package.json is malformed', async () => {
    const packageJsonPath = path.join(tempDir, 'package.json');
    await fs.writeFile(packageJsonPath, '{ not valid json');
    await expect(readPackageJson(tempDir)).rejects.toThrow(
      new RegExp(`^Failed to parse ${packageJsonPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`),
    );
  });
});
