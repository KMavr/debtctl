import semver from 'semver';
import {
  OverrideMeta,
  PackageJson,
  TriggerAnchor,
  TriggerDate,
  TriggerPatchHash,
} from '../types.js';

export interface TriggerResult {
  fired: boolean;
  reason: string;
}

export interface TriggerContext {
  packageJson: PackageJson;
  patchContentHash?: string;
}

const isRangeEquivalent = (a: string, b: string): boolean => {
  if (a === b) return true;
  try {
    return semver.subset(a, b) && semver.subset(b, a);
  } catch {
    return false;
  }
};

const evaluateDate = (trigger: TriggerDate, now: Date): TriggerResult => {
  const fired = now >= new Date(trigger.expires);
  return {
    fired,
    reason: fired ? `Expired on ${trigger.expires}` : `Expires on ${trigger.expires}`,
  };
};

const evaluateAnchor = (trigger: TriggerAnchor, packageJson: PackageJson): TriggerResult => {
  const { package: packageName, declaredRange } = trigger;

  const allDeps: Record<string, string> = {
    ...(packageJson.dependencies as Record<string, string> | undefined),
    ...(packageJson.devDependencies as Record<string, string> | undefined),
    ...(packageJson.peerDependencies as Record<string, string> | undefined),
  };

  const currentRange = allDeps[packageName];

  if (currentRange === undefined) {
    return { fired: true, reason: `${packageName} is no longer a dependency` };
  }
  if (!isRangeEquivalent(currentRange, declaredRange)) {
    return {
      fired: true,
      reason: `${packageName} declared range changed: ${declaredRange} -> ${currentRange}`,
    };
  }
  return { fired: false, reason: `${packageName} still pinned at ${declaredRange}` };
};

const evaluatePatchHash = (
  trigger: TriggerPatchHash,
  patchContentHash: string | undefined,
): TriggerResult => {
  if (patchContentHash === undefined) {
    return { fired: true, reason: 'Patch file no longer present' };
  }
  if (patchContentHash !== trigger.hash) {
    return { fired: true, reason: 'Patch content changed since metadata was recorded' };
  }
  return { fired: false, reason: 'Patch content matches recorded hash' };
};

export const evaluateTrigger = (
  meta: OverrideMeta,
  context: TriggerContext,
  now: Date = new Date(),
): TriggerResult => {
  switch (meta.revisitWhen.type) {
    case 'date':
      return evaluateDate(meta.revisitWhen, now);
    case 'version-anchor':
      return evaluateAnchor(meta.revisitWhen, context.packageJson);
    case 'patch-hash':
      return evaluatePatchHash(meta.revisitWhen, context.patchContentHash);
  }
};
