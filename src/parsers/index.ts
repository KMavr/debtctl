import { Override, PackageJson, PackageManager } from '../types.js';
import { npmParse } from './npm.js';
import { pnpmParse } from './pnpm.js';
import { yarnBerryParse } from './yarn-berry.js';
import { yarnClassicParse } from './yarn-classic.js';

export const parseOverrides = async (
  manager: PackageManager,
  packageJson: PackageJson,
  cwd: string,
): Promise<Override[]> => {
  switch (manager) {
    case 'npm':
      return npmParse(packageJson);
    case 'pnpm':
      return await pnpmParse(packageJson, cwd);
    case 'yarn-classic':
      return yarnClassicParse(packageJson);
    case 'yarn-berry':
      return yarnBerryParse(packageJson);
  }
};
