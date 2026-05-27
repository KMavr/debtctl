import { detect } from '../detect/index.js';
import { parseOverrides } from '../parsers/index.js';
import { parsePatches } from '../parsers/patches/index.js';
import { readSidecar } from '../sidecar/index.js';
import { Override, PackageJson, PackageManager, Sidecar, Patch } from '../types.js';
import { readPackageJson } from './readPackageJson.js';

export interface DebtState {
  manager: PackageManager;
  packageJson: PackageJson;
  overrides: Override[];
  patches: Patch[];
  sidecar: Sidecar | null;
  ambiguous?: string[];
}

export const loadDebtState = async (cwd: string): Promise<DebtState> => {
  const { manager, ambiguous } = await detect(cwd);
  const packageJson = await readPackageJson(cwd);
  const overrides = await parseOverrides(manager, packageJson, cwd);
  const patches = await parsePatches(manager, packageJson, cwd);
  const sidecar = await readSidecar(cwd);
  return { manager, packageJson, overrides, patches, sidecar, ambiguous };
};
