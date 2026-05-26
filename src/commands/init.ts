import { loadOverrideState } from '../lib/loadOverrideState.js';
import { mergeSidecar, writeSidecar, isDocumented } from '../sidecar/index.js';
import { PackageManager } from '../types.js';

interface InitResult {
  manager: PackageManager;
  total: number;
  documented: number;
  needsMetadata: number;
  orphans: number;
  ambiguous?: string[];
}

export const init = async (cwd: string): Promise<InitResult> => {
  const { manager, overrides, sidecar, ambiguous } = await loadOverrideState(cwd);

  const overrideKeys = overrides.map((override) => override.key);
  const mergedSidecar = mergeSidecar(sidecar, overrideKeys);

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
    ...(ambiguous ? { ambiguous } : {}),
  };
};
