import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashPatchFile } from '../../src/lib/hashPatchFile.js';

describe('hashPatchFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debtctl-hash-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return a sha256-prefixed lowercase hex digest', async () => {
    const patchPath = path.join(tempDir, 'foo.patch');
    await fs.writeFile(patchPath, 'foo bar baz');

    const hash = await hashPatchFile(patchPath);

    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('should produce the same hash for identical content in different files', async () => {
    const firstPath = path.join(tempDir, 'foo.patch');
    const secondPath = path.join(tempDir, 'bar.patch');
    await fs.writeFile(firstPath, 'same content');
    await fs.writeFile(secondPath, 'same content');

    expect(await hashPatchFile(firstPath)).toBe(await hashPatchFile(secondPath));
  });

  it('should produce different hashes for different content', async () => {
    const firstPath = path.join(tempDir, 'foo.patch');
    const secondPath = path.join(tempDir, 'bar.patch');
    await fs.writeFile(firstPath, 'content one');
    await fs.writeFile(secondPath, 'content two');

    expect(await hashPatchFile(firstPath)).not.toBe(await hashPatchFile(secondPath));
  });

  it('should produce identical hashes for LF and CRLF versions of the same content', async () => {
    const lfPath = path.join(tempDir, 'foo-lf.patch');
    const crlfPath = path.join(tempDir, 'foo-crlf.patch');
    await fs.writeFile(lfPath, 'line one\nline two\nline three\n');
    await fs.writeFile(crlfPath, 'line one\r\nline two\r\nline three\r\n');

    expect(await hashPatchFile(lfPath)).toBe(await hashPatchFile(crlfPath));
  });

  it('should throw a descriptive error when the patch file does not exist', async () => {
    const missingPath = path.join(tempDir, 'missing.patch');

    await expect(hashPatchFile(missingPath)).rejects.toThrow(
      new RegExp(
        `^Failed to hash patch file ${missingPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`,
      ),
    );
  });
});
