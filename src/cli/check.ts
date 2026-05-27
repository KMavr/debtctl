import chalk from 'chalk';
import { check, CheckEntry, CheckResult } from '../commands/check.js';
import { PackageManager } from '../types.js';

export type OnlyBucket = 'missing' | 'incomplete' | 'dueForReview' | 'orphans';
export type OnlyDomain = 'overrides' | 'patches';

const ONLY_BUCKETS: OnlyBucket[] = ['missing', 'incomplete', 'dueForReview', 'orphans'];
const ONLY_DOMAINS: OnlyDomain[] = ['overrides', 'patches'];

export interface CheckOptions {
  strict?: boolean;
  json?: boolean;
  only?: string;
}

export interface OnlyFilter {
  bucket: OnlyBucket;
  domain: OnlyDomain | 'all';
}

export interface PreparedEntries {
  filteredEntries: CheckEntry[];
  filteredOrphans: { key: string }[];
  missing: CheckEntry[];
  incomplete: CheckEntry[];
  dueForReview: CheckEntry[];
  filteredPatchEntries: CheckEntry[];
  filteredPatchOrphans: { key: string }[];
  patchMissing: CheckEntry[];
  patchIncomplete: CheckEntry[];
  patchDueForReview: CheckEntry[];
}

const validateOnly = (value: string | undefined): OnlyFilter | undefined => {
  if (value === undefined) return undefined;

  const [domainOrBucket, bucketAfterColon] = value.split(':');
  const hasDomainPrefix = bucketAfterColon !== undefined;

  if (hasDomainPrefix) {
    if (!(ONLY_DOMAINS as string[]).includes(domainOrBucket)) {
      console.error(
        chalk.red(
          `Invalid --only domain: ${domainOrBucket}. Expected one of: ${ONLY_DOMAINS.join(', ')}.`,
        ),
      );
      process.exit(2);
    }
    if (!(ONLY_BUCKETS as string[]).includes(bucketAfterColon)) {
      console.error(
        chalk.red(
          `Invalid --only bucket: ${bucketAfterColon}. Expected one of: ${ONLY_BUCKETS.join(', ')}.`,
        ),
      );
      process.exit(2);
    }
    return {
      bucket: bucketAfterColon as OnlyBucket,
      domain: domainOrBucket as OnlyDomain,
    };
  }

  if (!(ONLY_BUCKETS as string[]).includes(value)) {
    console.error(
      chalk.red(`Invalid --only value: ${value}. Expected one of: ${ONLY_BUCKETS.join(', ')}.`),
    );
    process.exit(2);
  }
  return { bucket: value as OnlyBucket, domain: 'all' };
};

const filterEntries = (entries: CheckEntry[], onlyFilter: OnlyBucket | undefined): CheckEntry[] =>
  onlyFilter
    ? entries.filter((entry) => entry.status === onlyFilter)
    : entries.filter((entry) => entry.status !== 'ok');

const filterOrphans = (
  orphans: { key: string }[],
  onlyFilter: OnlyBucket | undefined,
): { key: string }[] => (onlyFilter && onlyFilter !== 'orphans' ? [] : orphans);

export const prepareEntries = (
  checkResult: CheckResult,
  onlyFilter: OnlyFilter | undefined,
): PreparedEntries => {
  const bucket = onlyFilter?.bucket;
  const domain = onlyFilter?.domain ?? 'all';

  const includeOverrides = domain === 'all' || domain === 'overrides';
  const includePatches = domain === 'all' || domain === 'patches';

  const filteredEntries = includeOverrides ? filterEntries(checkResult.entries, bucket) : [];
  const filteredOrphans = includeOverrides ? filterOrphans(checkResult.orphans, bucket) : [];
  const filteredPatchEntries = includePatches
    ? filterEntries(checkResult.patchEntries, bucket)
    : [];
  const filteredPatchOrphans = includePatches
    ? filterOrphans(checkResult.patchOrphans, bucket)
    : [];

  return {
    filteredEntries,
    filteredOrphans,
    missing: filteredEntries.filter((entry) => entry.status === 'missing'),
    incomplete: filteredEntries.filter((entry) => entry.status === 'incomplete'),
    dueForReview: filteredEntries.filter((entry) => entry.status === 'dueForReview'),
    filteredPatchEntries,
    filteredPatchOrphans,
    patchMissing: filteredPatchEntries.filter((entry) => entry.status === 'missing'),
    patchIncomplete: filteredPatchEntries.filter((entry) => entry.status === 'incomplete'),
    patchDueForReview: filteredPatchEntries.filter((entry) => entry.status === 'dueForReview'),
  };
};

export const renderJson = (input: {
  manager: PackageManager;
  filteredEntries: CheckEntry[];
  filteredOrphans: { key: string }[];
  filteredPatchEntries: CheckEntry[];
  filteredPatchOrphans: { key: string }[];
  ambiguous?: string[];
}): string =>
  JSON.stringify(
    {
      manager: input.manager,
      ...(input.ambiguous ? { ambiguous: input.ambiguous } : {}),
      entries: input.filteredEntries,
      orphans: input.filteredOrphans,
      patchEntries: input.filteredPatchEntries,
      patchOrphans: input.filteredPatchOrphans,
    },
    null,
    2,
  );

const renderBullet = (entry: { key: string; reason?: string }, indent: string): string =>
  entry.reason ? `${indent}- ${entry.key}: ${entry.reason}` : `${indent}- ${entry.key}`;

const renderDomainSections = (input: {
  missing: CheckEntry[];
  incomplete: CheckEntry[];
  dueForReview: CheckEntry[];
  orphans: { key: string }[];
  orphanDescription: string;
}): string[] => {
  const { missing, incomplete, dueForReview, orphans, orphanDescription } = input;
  const bulletIndent = '    ';
  const headerIndent = '  ';
  const lines: string[] = [];

  if (missing.length > 0) {
    lines.push(chalk.red(`${headerIndent}Missing metadata (${missing.length}):`));
    lines.push(...missing.map((entry) => renderBullet(entry, bulletIndent)));
    lines.push('');
  }
  if (incomplete.length > 0) {
    lines.push(chalk.red(`${headerIndent}Incomplete (${incomplete.length}):`));
    lines.push(...incomplete.map((entry) => renderBullet(entry, bulletIndent)));
    lines.push('');
  }
  if (dueForReview.length > 0) {
    lines.push(chalk.yellow(`${headerIndent}Due for review (${dueForReview.length}):`));
    lines.push(...dueForReview.map((entry) => renderBullet(entry, bulletIndent)));
    lines.push('');
  }
  if (orphans.length > 0) {
    lines.push(chalk.dim(`${headerIndent}Orphans (${orphans.length}):`));
    lines.push(
      ...orphans.map(({ key }) => chalk.dim(`${bulletIndent}- ${key} (${orphanDescription})`)),
    );
    lines.push('');
  }

  return lines;
};

const renderDomainSummaryParts = (input: {
  missing: CheckEntry[];
  incomplete: CheckEntry[];
  dueForReview: CheckEntry[];
}): string[] => {
  const { missing, incomplete, dueForReview } = input;
  return [
    missing.length > 0 ? `${missing.length} missing` : null,
    incomplete.length > 0 ? `${incomplete.length} incomplete` : null,
    dueForReview.length > 0 ? `${dueForReview.length} due for review` : null,
  ].filter((part): part is string => part !== null);
};

const formatDomainSummary = (input: {
  domainLabel: string;
  problemCount: number;
  orphanCount: number;
  summaryParts: string[];
  shouldFail: boolean;
}): string | null => {
  const { domainLabel, problemCount, orphanCount, summaryParts, shouldFail } = input;

  if (problemCount === 0 && orphanCount === 0) {
    return null;
  }

  if (problemCount === 0) {
    const orphanWord = orphanCount === 1 ? 'orphan' : 'orphans';
    return chalk.bold(`${orphanCount} ${domainLabel} ${orphanWord} found (no failures)`);
  }

  const orphanSuffix =
    orphanCount > 0 ? ` (${orphanCount} orphan${orphanCount === 1 ? '' : 's'})` : '';
  const partsJoined = summaryParts.length > 0 ? `: ${summaryParts.join(', ')}` : '';
  const problemWord = problemCount === 1 ? 'problem' : 'problems';
  const line = `${problemCount} ${domainLabel} ${problemWord}${partsJoined}${orphanSuffix}`;

  return shouldFail ? chalk.bold.red(`✖ ${line}`) : chalk.bold.yellow(`⚠ ${line}`);
};

export const renderHuman = (input: {
  missing: CheckEntry[];
  incomplete: CheckEntry[];
  dueForReview: CheckEntry[];
  filteredOrphans: { key: string }[];
  patchMissing: CheckEntry[];
  patchIncomplete: CheckEntry[];
  patchDueForReview: CheckEntry[];
  filteredPatchOrphans: { key: string }[];
  shouldFail: boolean;
}): string => {
  const {
    missing,
    incomplete,
    dueForReview,
    filteredOrphans,
    patchMissing,
    patchIncomplete,
    patchDueForReview,
    filteredPatchOrphans,
    shouldFail,
  } = input;

  const overrideProblemCount = missing.length + incomplete.length + dueForReview.length;
  const patchProblemCount = patchMissing.length + patchIncomplete.length + patchDueForReview.length;
  const overrideOrphanCount = filteredOrphans.length;
  const patchOrphanCount = filteredPatchOrphans.length;

  const totalProblems = overrideProblemCount + patchProblemCount;
  const totalOrphans = overrideOrphanCount + patchOrphanCount;

  if (totalProblems === 0 && totalOrphans === 0) {
    return chalk.green('✓ All overrides and patches documented and current');
  }

  const sections: string[] = [];

  const overrideHasAnything = overrideProblemCount > 0 || overrideOrphanCount > 0;
  if (overrideHasAnything) {
    sections.push(chalk.bold('Overrides:'));
    sections.push(
      ...renderDomainSections({
        missing,
        incomplete,
        dueForReview,
        orphans: filteredOrphans,
        orphanDescription: 'no longer in package.json overrides',
      }),
    );
  }

  const patchHasAnything = patchProblemCount > 0 || patchOrphanCount > 0;
  if (patchHasAnything) {
    sections.push(chalk.bold('Patches:'));
    sections.push(
      ...renderDomainSections({
        missing: patchMissing,
        incomplete: patchIncomplete,
        dueForReview: patchDueForReview,
        orphans: filteredPatchOrphans,
        orphanDescription: 'no longer detected as a patch',
      }),
    );
  }

  const overrideSummary = formatDomainSummary({
    domainLabel: 'override',
    problemCount: overrideProblemCount,
    orphanCount: overrideOrphanCount,
    summaryParts: renderDomainSummaryParts({ missing, incomplete, dueForReview }),
    shouldFail,
  });
  const patchSummary = formatDomainSummary({
    domainLabel: 'patch',
    problemCount: patchProblemCount,
    orphanCount: patchOrphanCount,
    summaryParts: renderDomainSummaryParts({
      missing: patchMissing,
      incomplete: patchIncomplete,
      dueForReview: patchDueForReview,
    }),
    shouldFail,
  });

  const summaryLines = [overrideSummary, patchSummary].filter(
    (line): line is string => line !== null,
  );

  return [...sections, ...summaryLines].join('\n');
};

export const runCheck = async (options: CheckOptions): Promise<void> => {
  const onlyFilter = validateOnly(options.only);
  const checkResult = await check(process.cwd());

  if (checkResult.ambiguous && !options.json) {
    console.error(
      chalk.yellow(
        `Warning: multiple lockfiles found (${checkResult.ambiguous.join(', ')}). Using ${checkResult.manager}. Consider removing the unused lockfile.`,
      ),
    );
  }

  const anythingDetected = checkResult.entries.length > 0 || checkResult.patchEntries.length > 0;
  if (!checkResult.sidecarPresent && anythingDetected && !options.json) {
    console.error(chalk.red('No .debtctl.json found. Run `debtctl init` to scaffold it.'));
    process.exit(2);
  }

  const prepared = prepareEntries(checkResult, onlyFilter);
  const errorCount =
    prepared.missing.length +
    prepared.incomplete.length +
    prepared.patchMissing.length +
    prepared.patchIncomplete.length;
  const warningCount = prepared.dueForReview.length + prepared.patchDueForReview.length;
  const shouldFail = errorCount > 0 || ((options.strict ?? false) && warningCount > 0);

  const output = options.json
    ? renderJson({
        manager: checkResult.manager,
        filteredEntries: prepared.filteredEntries,
        filteredOrphans: prepared.filteredOrphans,
        filteredPatchEntries: prepared.filteredPatchEntries,
        filteredPatchOrphans: prepared.filteredPatchOrphans,
        ambiguous: checkResult.ambiguous,
      })
    : renderHuman({ ...prepared, shouldFail });

  console.log(output);
  process.exit(shouldFail ? 1 : 0);
};
