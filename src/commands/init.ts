import { loadDebtState } from '../lib/loadDebtState.js';
import { mergeSidecar, writeSidecar, isDocumented } from '../sidecar/index.js';
import { PackageManager } from '../types.js';

interface InitResult {
  manager: PackageManager;
  total: number;
  documented: number;
  needsMetadata: number;
  orphans: number;
  patchTotal: number;
  patchDocumented: number;
  patchNeedsMetadata: number;
  patchOrphans: number;
  ambiguous?: string[];
}

export const init = async (cwd: string): Promise<InitResult> => {
  const { manager, overrides, patches, sidecar, ambiguous } = await loadDebtState(cwd);

  const overrideKeys = overrides.map((override) => override.key);
  const patchesForMerge = patches.map((patch) => ({
    key: patch.key,
    hash: patch.contentHash,
  }));

  const mergedSidecar = mergeSidecar(sidecar, overrideKeys, patchesForMerge);

  await writeSidecar(cwd, mergedSidecar);

  const documented = overrideKeys.filter((key) =>
    isDocumented(mergedSidecar.overrides[key]),
  ).length;
  const overrideSidecarKeys = Object.keys(mergedSidecar.overrides);
  const orphans = overrideSidecarKeys.filter((key) => !overrideKeys.includes(key)).length;

  const patchKeys = patches.map((patch) => patch.key);
  const patchDocumented = patchKeys.filter((key) =>
    isDocumented(mergedSidecar.patches[key]),
  ).length;
  const patchSidecarKeys = Object.keys(mergedSidecar.patches);
  const patchOrphans = patchSidecarKeys.filter((key) => !patchKeys.includes(key)).length;

  return {
    manager,
    total: overrideKeys.length,
    documented,
    needsMetadata: overrideKeys.length - documented,
    orphans,
    patchTotal: patchKeys.length,
    patchDocumented,
    patchNeedsMetadata: patchKeys.length - patchDocumented,
    patchOrphans,
    ...(ambiguous ? { ambiguous } : {}),
  };
};
