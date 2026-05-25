#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { init } from './commands/init.js';

const program = new Command();

program
  .name('debtctl')
  .description('Manage JS dependency overrides as owned, documented technical debt')
  .version('0.1.0');

program
  .command('init')
  .description('Scaffold .debtctl.json with metadata stubs for current overrides')
  .action(async () => {
    const result = await init(process.cwd());
    console.log(chalk.bold(`Detected: ${result.manager}`));
    console.log(
      `Found ${result.total} override${result.total === 1 ? '' : 's'}. ${result.documented} documented, ${result.needsMetadata} ${result.needsMetadata === 1 ? 'needs' : 'need'} metadata.`,
    );
    if (result.orphans > 0) {
      console.log(
        chalk.yellow(
          `${result.orphans} orphaned sidecar ${result.orphans === 1 ? 'entry' : 'entries'}.`,
        ),
      );
    }
  });

program.parse(process.argv);
