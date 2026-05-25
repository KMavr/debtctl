import fs from 'node:fs/promises';
import path from 'node:path';
import { detect } from '../detect/index.js';
import { parseOverrides } from '../parsers/index.js';
import { mergeSidecar, readSidecar, writeSidecar } from '../sidecar/index.js';
import { OverrideMeta, PackageManager } from '../types.js';

interface InitResult {
  manager: PackageManager;
  total: number;
  documented: number;
  needsMetadata: number;
  orphans: number;
}

const isDocumented = (meta: OverrideMeta) =>
  meta.reason !== 'TODO' &&
  meta.owner !== 'TODO' &&
  (meta.revisitWhen.type !== 'date' || meta.revisitWhen.expires !== 'TODO');

export const init = async (cwd: string): Promise<InitResult> => {
  const { manager } = await detect(cwd);

  const packageJsonPath = path.join(cwd, 'package.json');
  const rawPackageJson = await fs.readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(rawPackageJson);

  const overrides = parseOverrides(manager, packageJson);
  const overrideKeys = overrides.map((override) => override.key);

  const currentSidecar = await readSidecar(cwd);
  const mergedSidecar = mergeSidecar(currentSidecar, overrideKeys);
  await writeSidecar(cwd, mergedSidecar);

  const documented = overrideKeys.filter((key) =>
    isDocumented(mergedSidecar.overrides[key]),
  ).length;

  const sidecarKeys = Object.keys(mergedSidecar.overrides);
  const orphans = sidecarKeys.filter((key) => !overrideKeys.includes(key)).length;

  return {
    manager,
    total: overrideKeys.length,
    documented,
    needsMetadata: overrideKeys.length - documented,
    orphans,
  };
};
