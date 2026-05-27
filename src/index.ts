#!/usr/bin/env node
import { createRequire } from 'node:module';
import chalk from 'chalk';
import { Command } from 'commander';
import { runCheck } from './cli/check.js';
import { init } from './commands/init.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('debtctl')
  .description('Manage JS dependency overrides as owned, documented technical debt')
  .version(pkg.version);

program
  .command('init')
  .description('Scaffold .debtctl.json with metadata stubs for current overrides')
  .action(async () => {
    const result = await init(process.cwd());
    if (result.ambiguous) {
      console.error(
        chalk.yellow(
          `Warning: multiple lockfiles found (${result.ambiguous.join(', ')}). Using ${result.manager}. Consider removing the unused lockfile.`,
        ),
      );
    }
    console.log(chalk.bold(`Detected: ${result.manager}`));
    console.log(
      `Found ${result.total} override${result.total === 1 ? '' : 's'} (${result.documented} documented, ${result.needsMetadata} ${result.needsMetadata === 1 ? 'needs' : 'need'} metadata) and ${result.patchTotal} patch${result.patchTotal === 1 ? '' : 'es'} (${result.patchDocumented} documented, ${result.patchNeedsMetadata} ${result.patchNeedsMetadata === 1 ? 'needs' : 'need'} metadata).`,
    );
    if (result.orphans > 0) {
      console.log(
        chalk.yellow(
          `${result.orphans} orphaned override sidecar ${result.orphans === 1 ? 'entry' : 'entries'}.`,
        ),
      );
    }
    if (result.patchOrphans > 0) {
      console.log(
        chalk.yellow(
          `${result.patchOrphans} orphaned patch sidecar ${result.patchOrphans === 1 ? 'entry' : 'entries'}.`,
        ),
      );
    }
  });

program
  .command('check')
  .description('Report overrides that are missing metadata, incomplete, or due for review')
  .option('--strict', 'Exit non-zero on dueForReview as well as missing/incomplete')
  .option('--json', 'Emit machine-readable JSON; suppress human output')
  .option(
    '--only <bucket>',
    'Filter to one bucket. Bare: missing|incomplete|dueForReview|orphans (both domains). Prefixed: overrides:<bucket> or patches:<bucket>',
  )
  .action(async (options) => await runCheck(options));

program.parse(process.argv);
