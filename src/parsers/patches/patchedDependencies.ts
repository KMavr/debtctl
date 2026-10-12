import path from 'node:path';
import { hashPatchFile } from '../../lib/hashPatchFile.js';
import { Patch } from '../../types.js';

export const parsePatchedDependencies = async (
  patchedDependencies: unknown,
  source: Patch['source'],
  cwd: string,
): Promise<Patch[]> => {
  if (!patchedDependencies || typeof patchedDependencies !== 'object') {
    return [];
  }

  const entries = Object.entries(patchedDependencies as Record<string, string>);

  const patches = await Promise.all(
    entries.map(async ([key, value]) => ({
      key: key.slice(0, key.lastIndexOf('@')),
      source,
      patchFilePath: value,
      contentHash: await hashPatchFile(path.join(cwd, value)),
    })),
  );

  return patches.sort((firstPatch, secondPatch) => firstPatch.key.localeCompare(secondPatch.key));
};
