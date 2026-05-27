import path from 'node:path';
import { hashPatchFile } from '../../lib/hashPatchFile.js';
import { PackageJson, Patch } from '../../types.js';

export const pnpmPatchesParse = async (packageJson: PackageJson, cwd: string): Promise<Patch[]> => {
  const pnpm = packageJson.pnpm;
  if (!pnpm || typeof pnpm !== 'object') {
    return [];
  }

  const patchedDependencies = (pnpm as Record<string, unknown>).patchedDependencies;
  if (!patchedDependencies || typeof patchedDependencies !== 'object') {
    return [];
  }

  const entries = Object.entries(patchedDependencies as Record<string, string>);

  const patches = await Promise.all(
    entries.map(async ([key, value]) => ({
      key: key.slice(0, key.lastIndexOf('@')),
      source: 'pnpm' as const,
      patchFilePath: value,
      contentHash: await hashPatchFile(path.join(cwd, value)),
    })),
  );

  return patches.sort((firstPatch, secondPatch) => firstPatch.key.localeCompare(secondPatch.key));
};
