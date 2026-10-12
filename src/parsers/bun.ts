import { Override, PackageJson } from '../types.js';
import { npmParse } from './npm.js';
import { yarnClassicParse } from './yarn-classic.js';

export const bunParse = (packageJson: PackageJson): Override[] => {
  const npmOverrides = npmParse(packageJson).map(({ key, value }) => [key, value] as const);
  const yarnOverrides = yarnClassicParse(packageJson).map(
    ({ key, value }) => [key, value] as const,
  );

  const merged = Object.fromEntries([...yarnOverrides, ...npmOverrides]);

  return Object.entries(merged).map(([key, value]) => ({ key, value }));
};
