import fs from 'node:fs/promises';
import path from 'node:path';
import { PackageJson } from '../types.js';

export const readPackageJson = async (cwd: string): Promise<PackageJson> => {
  const packageJsonPath = path.join(cwd, 'package.json');
  const rawPackageJson = await fs.readFile(packageJsonPath, 'utf8');
  return JSON.parse(rawPackageJson);
};
