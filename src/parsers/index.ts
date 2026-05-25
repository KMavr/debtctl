import { PackageManager, Override } from '../types.js';
import { npmParse } from './npm.js';
import { pnpmParse } from './pnpm.js';
import { yarnBerryParse } from './yarn-berry.js';
import { yarnClassicParse } from './yarn-classic.js';

export const parseOverrides = (
  manager: PackageManager,
  packageJson: Record<string, unknown>,
): Override[] => {
  switch (manager) {
    case 'npm':
      return npmParse(packageJson);
    case 'pnpm':
      return pnpmParse(packageJson);
    case 'yarn-classic':
      return yarnClassicParse(packageJson);
    case 'yarn-berry':
      return yarnBerryParse(packageJson);
  }
};
