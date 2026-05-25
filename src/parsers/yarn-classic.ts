import { Override } from '../types.js';

export const yarnClassicParse = (packageJson: Record<string, unknown>): Override[] => {
  const resolutions = packageJson.resolutions;
  if (!resolutions || typeof resolutions !== 'object') {
    return [];
  }

  return Object.entries(resolutions)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => ({ key, value: value as string }));
};
