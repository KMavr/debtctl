import { Override, PackageJson } from '../types.js';

export const pnpmParse = (packageJson: PackageJson): Override[] => {
  const pnpm = packageJson.pnpm;
  if (!pnpm || typeof pnpm !== 'object') {
    return [];
  }

  const overrides = (pnpm as Record<string, unknown>).overrides;
  if (!overrides || typeof overrides !== 'object') {
    return [];
  }

  return Object.entries(overrides)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => ({ key, value: value as string }));
};
