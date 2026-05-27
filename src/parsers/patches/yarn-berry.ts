import path from 'node:path';
import { hashPatchFile } from '../../lib/hashPatchFile.js';
import { PackageJson, Patch } from '../../types.js';

const PATCH_PREFIX = 'patch:';
const NPM_MARKERS = ['@npm%3A', '@npm:'] as const;
const PATH_MARKER = '#./';

interface ParsedPatchResolution {
  key: string;
  patchFilePath: string;
}

const isPatchResolution = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.startsWith(PATCH_PREFIX) &&
  NPM_MARKERS.some((marker) => value.includes(marker)) &&
  value.includes(PATH_MARKER);

const parsePatchResolution = (value: string): ParsedPatchResolution => {
  const afterPrefix = value.slice(PATCH_PREFIX.length);
  const npmMarkerIndex = NPM_MARKERS.map((marker) => afterPrefix.indexOf(marker)).find(
    (index) => index !== -1,
  ) as number;
  const pathMarkerIndex = afterPrefix.indexOf(PATH_MARKER);

  return {
    key: afterPrefix.slice(0, npmMarkerIndex),
    patchFilePath: afterPrefix.slice(pathMarkerIndex + PATH_MARKER.length),
  };
};

export const yarnBerryPatchesParse = async (
  packageJson: PackageJson,
  cwd: string,
): Promise<Patch[]> => {
  const resolutions = packageJson.resolutions;
  if (!resolutions || typeof resolutions !== 'object') {
    return [];
  }

  const parsed = Object.entries(resolutions)
    .filter(([, value]) => isPatchResolution(value))
    .map(([, value]) => parsePatchResolution(value as string));

  const patches = await Promise.all(
    parsed.map(async ({ key, patchFilePath }) => ({
      key,
      source: 'yarn-berry' as const,
      patchFilePath,
      contentHash: await hashPatchFile(path.join(cwd, patchFilePath)),
    })),
  );

  return patches.sort((firstPatch, secondPatch) => firstPatch.key.localeCompare(secondPatch.key));
};
