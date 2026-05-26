import chalk from 'chalk';
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
}

type OnlyBucket = 'missing' | 'incomplete' | 'dueForReview' | 'orphans';
const ONLY_BUCKETS: OnlyBucket[] = ['missing', 'incomplete', 'dueForReview', 'orphans'];

interface CheckOptions {
  strict?: boolean;
  json?: boolean;
  only?: string;
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

  const { fired, reason } = evaluateTrigger(meta, packageJson, now);

  if (fired) {
    return { key, status: 'dueForReview' as const, reason };
  }
  return { key, status: 'ok' as const, reason };
};

export const check = async (cwd: string, now: Date = new Date()): Promise<CheckResult> => {
  const { manager, overrides, packageJson, sidecar } = await loadOverrideState(cwd);

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
  };
};

const validateOnly = (value: string | undefined): OnlyBucket | undefined => {
  if (value === undefined) return undefined;

  if ((ONLY_BUCKETS as string[]).includes(value)) {
    return value as OnlyBucket;
  }
  console.error(
    chalk.red(`Invalid --only value: ${value}. Expected one of: ${ONLY_BUCKETS.join(', ')}.`),
  );
  process.exit(2);
};

const prepareEntries = (checkResult: CheckResult, onlyFilter: OnlyBucket | undefined) => {
  const filteredEntries = onlyFilter
    ? checkResult.entries.filter((entry) => entry.status === onlyFilter)
    : checkResult.entries.filter((entry) => entry.status !== 'ok');

  const filteredOrphans = onlyFilter && onlyFilter !== 'orphans' ? [] : checkResult.orphans;

  const missing = filteredEntries.filter((entry) => entry.status === 'missing');
  const incomplete = filteredEntries.filter((entry) => entry.status === 'incomplete');
  const dueForReview = filteredEntries.filter((entry) => entry.status === 'dueForReview');

  return {
    filteredEntries,
    filteredOrphans,
    missing,
    incomplete,
    dueForReview,
  };
};

const renderJson = ({
  manager,
  filteredEntries,
  filteredOrphans,
  shouldFail,
}: {
  manager: PackageManager;
  filteredEntries: CheckEntry[];
  filteredOrphans: { key: string }[];
  shouldFail: boolean;
}): never => {
  console.log(
    JSON.stringify(
      {
        manager,
        entries: filteredEntries,
        orphans: filteredOrphans,
      },
      null,
      2,
    ),
  );
  process.exit(shouldFail ? 1 : 0);
};

const renderHuman = ({
  missing,
  incomplete,
  dueForReview,
  filteredOrphans,
  shouldFail,
}: {
  missing: CheckEntry[];
  incomplete: CheckEntry[];
  dueForReview: CheckEntry[];
  filteredOrphans: { key: string }[];
  shouldFail: boolean;
}): never => {
  const problemCount = missing.length + incomplete.length + dueForReview.length;
  const orphanCount = filteredOrphans.length;

  if (problemCount === 0 && orphanCount === 0) {
    console.log(chalk.green('✓ All overrides documented and current'));
    process.exit(0);
  }

  const renderBullet = (entry: { key: string; reason?: string }): string =>
    entry.reason ? `  - ${entry.key}: ${entry.reason}` : `  - ${entry.key}`;

  const sections: string[][] = [
    missing.length > 0
      ? [chalk.red(`Missing metadata (${missing.length}):`), ...missing.map(renderBullet), '']
      : [],
    incomplete.length > 0
      ? [chalk.red(`Incomplete (${incomplete.length}):`), ...incomplete.map(renderBullet), '']
      : [],
    dueForReview.length > 0
      ? [
          chalk.yellow(`Due for review (${dueForReview.length}):`),
          ...dueForReview.map(renderBullet),
          '',
        ]
      : [],
    orphanCount > 0
      ? [
          chalk.dim(`Orphans (${orphanCount}):`),
          ...filteredOrphans.map(({ key }) =>
            chalk.dim(`  - ${key} (no longer in package.json overrides)`),
          ),
          '',
        ]
      : [],
  ];

  const summaryParts = [
    missing.length > 0 ? `${missing.length} missing` : null,
    incomplete.length > 0 ? `${incomplete.length} incomplete` : null,
    dueForReview.length > 0 ? `${dueForReview.length} due for review` : null,
  ].filter((part): part is string => part !== null);

  const orphanSuffix =
    orphanCount > 0 ? ` (${orphanCount} orphan${orphanCount === 1 ? '' : 's'})` : '';

  const summaryLine = `${problemCount} problem${problemCount === 1 ? '' : 's'}: ${summaryParts.join(', ')}${orphanSuffix}`;

  const renderSummary = (): string => {
    if (problemCount === 0) {
      return chalk.bold(`${orphanCount} orphan${orphanCount === 1 ? '' : 's'} found (no failures)`);
    }
    if (shouldFail) {
      return chalk.bold.red(`✖ ${summaryLine}`);
    }
    return chalk.bold.yellow(`⚠ ${summaryLine}`);
  };

  const summary = renderSummary();

  console.log([...sections.flat(), summary].join('\n'));
  process.exit(shouldFail ? 1 : 0);
};

export const runCheck = async (options: CheckOptions) => {
  const onlyFilter = validateOnly(options.only);
  const checkResult = await check(process.cwd());

  if (!checkResult.sidecarPresent && checkResult.entries.length > 0 && !options.json) {
    console.error(chalk.red('No .debtctl.json found. Run `debtctl init` to scaffold it.'));
    process.exit(2);
  }

  const { filteredEntries, filteredOrphans, missing, incomplete, dueForReview } = prepareEntries(
    checkResult,
    onlyFilter,
  );

  const errorCount = missing.length + incomplete.length;
  const warningCount = dueForReview.length;
  const shouldFail = errorCount > 0 || ((options.strict ?? false) && warningCount > 0);

  if (options.json) {
    renderJson({ manager: checkResult.manager, filteredEntries, filteredOrphans, shouldFail });
  } else {
    renderHuman({ missing, incomplete, dueForReview, filteredOrphans, shouldFail });
  }
};
