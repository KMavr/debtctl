import chalk from 'chalk';
import { check, CheckEntry, CheckResult } from '../commands/check.js';
import { PackageManager } from '../types.js';

export type OnlyBucket = 'missing' | 'incomplete' | 'dueForReview' | 'orphans';
const ONLY_BUCKETS: OnlyBucket[] = ['missing', 'incomplete', 'dueForReview', 'orphans'];

export interface CheckOptions {
  strict?: boolean;
  json?: boolean;
  only?: string;
}

export interface PreparedEntries {
  filteredEntries: CheckEntry[];
  filteredOrphans: { key: string }[];
  missing: CheckEntry[];
  incomplete: CheckEntry[];
  dueForReview: CheckEntry[];
}

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

export const prepareEntries = (
  checkResult: CheckResult,
  onlyFilter: OnlyBucket | undefined,
): PreparedEntries => {
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

export const renderJson = (input: {
  manager: PackageManager;
  filteredEntries: CheckEntry[];
  filteredOrphans: { key: string }[];
}): string =>
  JSON.stringify(
    {
      manager: input.manager,
      entries: input.filteredEntries,
      orphans: input.filteredOrphans,
    },
    null,
    2,
  );

export const renderHuman = (input: {
  missing: CheckEntry[];
  incomplete: CheckEntry[];
  dueForReview: CheckEntry[];
  filteredOrphans: { key: string }[];
  shouldFail: boolean;
}): string => {
  const { missing, incomplete, dueForReview, filteredOrphans, shouldFail } = input;
  const problemCount = missing.length + incomplete.length + dueForReview.length;
  const orphanCount = filteredOrphans.length;

  if (problemCount === 0 && orphanCount === 0) {
    return chalk.green('✓ All overrides documented and current');
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

  return [...sections.flat(), renderSummary()].join('\n');
};

export const runCheck = async (options: CheckOptions): Promise<void> => {
  const onlyFilter = validateOnly(options.only);
  const checkResult = await check(process.cwd());

  if (!checkResult.sidecarPresent && checkResult.entries.length > 0 && !options.json) {
    console.error(chalk.red('No .debtctl.json found. Run `debtctl init` to scaffold it.'));
    process.exit(2);
  }

  const prepared = prepareEntries(checkResult, onlyFilter);
  const errorCount = prepared.missing.length + prepared.incomplete.length;
  const warningCount = prepared.dueForReview.length;
  const shouldFail = errorCount > 0 || ((options.strict ?? false) && warningCount > 0);

  const output = options.json
    ? renderJson({
        manager: checkResult.manager,
        filteredEntries: prepared.filteredEntries,
        filteredOrphans: prepared.filteredOrphans,
      })
    : renderHuman({ ...prepared, shouldFail });

  console.log(output);
  process.exit(shouldFail ? 1 : 0);
};
