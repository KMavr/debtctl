import fs from 'node:fs/promises';
import path from 'node:path';
import { fileExists } from '../../detect/index.js';
import { hashPatchFile } from '../../lib/hashPatchFile.js';
import { Patch } from '../../types.js';

const PATCHES_DIR = 'patches';

const parseKeyFromFilename = (filename: string): string => {
  const parts = filename.replace('.patch', '').split('+');
  if (parts[0].startsWith('@')) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
};

export const patchPackageParse = async (cwd: string): Promise<Patch[]> => {
  const patchesPath = path.join(cwd, PATCHES_DIR);
  const exists = await fileExists(patchesPath);
  if (!exists) {
    return [];
  }

  const patchFiles = (await fs.readdir(patchesPath)).filter((file) => file.endsWith('.patch'));
  const parsedPatchFiles = patchFiles.map((filename) => ({
    filename,
    key: parseKeyFromFilename(filename),
  }));

  const patches = await Promise.all(
    parsedPatchFiles.map(async ({ filename, key }) => ({
      key,
      source: 'patch-package' as const,
      patchFilePath: path.join(PATCHES_DIR, filename),
      contentHash: await hashPatchFile(path.join(patchesPath, filename)),
    })),
  );

  return patches.sort((firstPatch, secondPatch) => firstPatch.key.localeCompare(secondPatch.key));
};
