import { detect } from '../detect/index.js';
import { parseOverrides } from '../parsers/index.js';
import { readSidecar } from '../sidecar/index.js';
import { Override, PackageJson, PackageManager, Sidecar } from '../types.js';
import { readPackageJson } from './readPackageJson.js';

export interface OverrideState {
  manager: PackageManager;
  packageJson: PackageJson;
  overrides: Override[];
  sidecar: Sidecar | null;
  ambiguous?: string[];
}

export const loadOverrideState = async (cwd: string): Promise<OverrideState> => {
  const { manager, ambiguous } = await detect(cwd);
  const packageJson = await readPackageJson(cwd);
  const overrides = await parseOverrides(manager, packageJson, cwd);
  const sidecar = await readSidecar(cwd);
  return { manager, packageJson, overrides, sidecar, ambiguous };
};
