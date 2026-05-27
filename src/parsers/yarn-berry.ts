import { Override, PackageJson } from '../types.js';

export const yarnBerryParse = (packageJson: PackageJson): Override[] => {
  const resolutions = packageJson.resolutions;
  if (!resolutions || typeof resolutions !== 'object') {
    return [];
  }

  return Object.entries(resolutions)
    .filter(([, value]) => typeof value === 'string' && !value.startsWith('patch:'))
    .map(([key, value]) => ({ key, value: value as string }));
};
