import fs from 'node:fs/promises';
import path from 'node:path';
import { ManagerConfig, MANAGERS } from '../config/managers.js';
import { readPackageJson } from '../lib/readPackageJson.js';
import { PackageManager } from '../types.js';

export interface DetectResult {
  manager: PackageManager;
  version?: string;
  source: 'packageManager-field' | 'lockfile';
  ambiguous?: string[];
}

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const checkPackageManagerField = async (cwd: string): Promise<DetectResult | null> => {
  const packageJson = await readPackageJson(cwd);

  if (typeof packageJson.packageManager === 'string') {
    const [name, version] = packageJson.packageManager.split('@');
    const match = MANAGERS.find(
      ({ pmField }) =>
        pmField.name === name && (!pmField.matchesVersion || pmField.matchesVersion(version ?? '')),
    );
    if (match) {
      return { manager: match.id, version, source: 'packageManager-field' };
    }
  }
  return null;
};

export const getLockfileMatches = async (rootPath: string): Promise<ManagerConfig[]> => {
  return (
    await Promise.all(
      MANAGERS.map(async (manager) => {
        const lockfilePath = path.join(rootPath, manager.lockfile);
        const exists = await fileExists(lockfilePath);
        if (!exists) {
          return null;
        }

        if (manager.matchesLockContent) {
          const content = await fs.readFile(lockfilePath, 'utf8');
          if (!manager.matchesLockContent(content)) {
            return null;
          }
        }
        return manager;
      }),
    )
  ).filter((manager): manager is (typeof MANAGERS)[number] => manager !== null);
};

export async function detect(cwd: string): Promise<DetectResult> {
  const packageManagerFieldResult = await checkPackageManagerField(cwd);
  if (packageManagerFieldResult) {
    return packageManagerFieldResult;
  }

  const lockfileMatches = await getLockfileMatches(cwd);

  if (lockfileMatches.length === 0) {
    throw new Error(`Could not detect package manager in ${cwd}`);
  }

  return {
    manager: lockfileMatches[0].id,
    source: 'lockfile',
    ...(lockfileMatches.length > 1 && {
      ambiguous: lockfileMatches.map(({ lockfile }) => lockfile),
    }),
  };
}
