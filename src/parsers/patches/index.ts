import { PackageJson, PackageManager, Patch } from '../../types.js';
import { patchPackageParse } from './patch-package.js';
import { pnpmPatchesParse } from './pnpm.js';
import { yarnBerryPatchesParse } from './yarn-berry.js';

export const parsePatches = async (
  manager: PackageManager,
  packageJson: PackageJson,
  cwd: string,
): Promise<Patch[]> => {
  switch (manager) {
    case 'npm':
    case 'yarn-classic':
      return patchPackageParse(cwd);
    case 'pnpm':
      return pnpmPatchesParse(packageJson, cwd);
    case 'yarn-berry':
      return yarnBerryPatchesParse(packageJson, cwd);
  }
};
