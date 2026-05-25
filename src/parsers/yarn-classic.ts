import { Override, PackageJson } from '../types.js';

export const yarnClassicParse = (packageJson: PackageJson): Override[] => {
  const resolutions = packageJson.resolutions;
  if (!resolutions || typeof resolutions !== 'object') {
    return [];
  }

  return Object.entries(resolutions)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => ({ key, value: value as string }));
};
