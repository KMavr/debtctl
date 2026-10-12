import { PackageJson, Patch } from '../../types.js';
import { parsePatchedDependencies } from './patchedDependencies.js';

export const pnpmPatchesParse = async (packageJson: PackageJson, cwd: string): Promise<Patch[]> => {
  const pnpm = packageJson.pnpm;
  if (!pnpm || typeof pnpm !== 'object') {
    return [];
  }

  return parsePatchedDependencies(
    (pnpm as Record<string, unknown>).patchedDependencies,
    'pnpm',
    cwd,
  );
};
