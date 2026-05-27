import { loadOverrideState } from '../lib/loadOverrideState.js';
import { isDocumented } from '../sidecar/index.js';
import { evaluateTrigger } from '../triggers/index.js';
import { OverrideMeta, PackageJson, PackageManager } from '../types.js';

export type CheckStatus = 'ok' | 'missing' | 'incomplete' | 'dueForReview';

export interface CheckEntry {
  key: string;
  status: CheckStatus;
  reason?: string;
}

export interface CheckResult {
  manager: PackageManager;
  sidecarPresent: boolean;
  entries: CheckEntry[];
  orphans: { key: string }[];
  ambiguous?: string[];
}

const classifyEntry = (
  key: string,
  meta: OverrideMeta | undefined,
  packageJson: PackageJson,
  now: Date,
): CheckEntry => {
  if (meta === undefined) {
    return {
      key,
      status: 'missing' as const,
    };
  }
  if (!isDocumented(meta)) {
    return {
      key,
      status: 'incomplete' as const,
      reason: 'TODO fields present',
    };
  }
  if (meta.revisitWhen.type === 'date') {
    const parsed = new Date(meta.revisitWhen.expires);
    if (Number.isNaN(parsed.getTime())) {
      return {
        key,
        status: 'incomplete' as const,
        reason: `Invalid expires date: ${meta.revisitWhen.expires}`,
      };
    }
  }

  const { fired, reason } = evaluateTrigger(meta, { packageJson }, now);

  if (fired) {
    return { key, status: 'dueForReview' as const, reason };
  }
  return { key, status: 'ok' as const, reason };
};

export const check = async (cwd: string, now: Date = new Date()): Promise<CheckResult> => {
  const { manager, overrides, packageJson, sidecar, ambiguous } = await loadOverrideState(cwd);

  const sidecarOverrides = sidecar?.overrides ?? {};
  const entries = overrides.map((override) =>
    classifyEntry(override.key, sidecarOverrides[override.key], packageJson, now),
  );

  const overrideKeySet = new Set(overrides.map((override) => override.key));
  const orphans = Object.keys(sidecarOverrides)
    .filter((key) => !overrideKeySet.has(key))
    .map((key) => ({ key }));

  return {
    manager,
    sidecarPresent: sidecar !== null,
    entries,
    orphans,
    ...(ambiguous ? { ambiguous } : {}),
  };
};
