import { Override, PackageJson } from '../types.js';

const childParse = (node: Record<string, unknown>, pathToChild: string): Override[] => {
  return Object.entries(node).flatMap(([key, value]) => {
    if (key === '.') {
      return pathToChild && typeof value === 'string' ? [{ key: pathToChild, value }] : [];
    }

    const newPath = pathToChild ? `${pathToChild}>${key}` : key;

    if (typeof value === 'string') {
      return [{ key: newPath, value }];
    }
    if (value && typeof value === 'object') {
      return childParse(value as Record<string, unknown>, newPath);
    }
    return [];
  });
};

export const npmParse = (packageJson: PackageJson): Override[] => {
  const overrides = packageJson.overrides;
  if (!overrides || typeof overrides !== 'object') {
    return [];
  }
  return childParse(overrides as Record<string, unknown>, '');
};
