import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

const testFileDirectory = path.dirname(fileURLToPath(import.meta.url));
const cliEntryPath = path.resolve(testFileDirectory, '..', 'src', 'index.ts');

describe('CLI version', () => {
  it('should report the version declared in package.json', () => {
    const output = execFileSync('npx', ['tsx', cliEntryPath, '--version'], {
      encoding: 'utf8',
    }).trim();

    expect(output).toBe(packageJson.version);
  });
});
