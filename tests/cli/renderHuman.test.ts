import chalk from 'chalk';
import { beforeAll, describe, expect, it } from 'vitest';
import { renderHuman } from '../../src/cli/check.js';
import { CheckEntry } from '../../src/commands/check.js';

beforeAll(() => {
  chalk.level = 0;
});

const emptyInput = {
  missing: [] as CheckEntry[],
  incomplete: [] as CheckEntry[],
  dueForReview: [] as CheckEntry[],
  filteredOrphans: [] as { key: string }[],
  shouldFail: false,
};

describe('renderHuman', () => {
  it('should return a clean success line when nothing to report', () => {
    const output = renderHuman(emptyInput);

    expect(output).toBe('✓ All overrides documented and current');
  });

  it('should render a missing section with bullets', () => {
    const output = renderHuman({
      ...emptyInput,
      missing: [{ key: 'foo', status: 'missing' }],
      shouldFail: true,
    });

    expect(output).toContain('Missing metadata (1):');
    expect(output).toContain('  - foo');
  });

  it('should render an incomplete section including the reason', () => {
    const output = renderHuman({
      ...emptyInput,
      incomplete: [{ key: 'bar', status: 'incomplete', reason: 'TODO fields present' }],
      shouldFail: true,
    });

    expect(output).toContain('Incomplete (1):');
    expect(output).toContain('  - bar: TODO fields present');
  });

  it('should render a due for review section', () => {
    const output = renderHuman({
      ...emptyInput,
      dueForReview: [{ key: 'baz', status: 'dueForReview', reason: 'Expired on 2020-01-01' }],
      shouldFail: false,
    });

    expect(output).toContain('Due for review (1):');
    expect(output).toContain('  - baz: Expired on 2020-01-01');
  });

  it('should render an orphans section with the "no longer in package.json overrides" suffix', () => {
    const output = renderHuman({
      ...emptyInput,
      filteredOrphans: [{ key: 'orphaned' }],
    });

    expect(output).toContain('Orphans (1):');
    expect(output).toContain('  - orphaned (no longer in package.json overrides)');
  });

  it('should use a red ✖ summary when shouldFail is true', () => {
    const output = renderHuman({
      ...emptyInput,
      missing: [{ key: 'foo', status: 'missing' }],
      shouldFail: true,
    });

    expect(output).toContain('✖ 1 problem: 1 missing');
  });

  it('should use a yellow ⚠ summary when problems exist but shouldFail is false', () => {
    const output = renderHuman({
      ...emptyInput,
      dueForReview: [{ key: 'foo', status: 'dueForReview', reason: 'Expired on 2020-01-01' }],
      shouldFail: false,
    });

    expect(output).toContain('⚠ 1 problem: 1 due for review');
  });

  it('should print an orphans-only summary when only orphans are present', () => {
    const output = renderHuman({
      ...emptyInput,
      filteredOrphans: [{ key: 'orphaned' }],
    });

    expect(output).toContain('1 orphan found (no failures)');
  });

  it('should pluralize problems and orphans correctly', () => {
    const output = renderHuman({
      ...emptyInput,
      missing: [
        { key: 'foo', status: 'missing' },
        { key: 'bar', status: 'missing' },
      ],
      filteredOrphans: [{ key: 'orphan-one' }, { key: 'orphan-two' }],
      shouldFail: true,
    });

    expect(output).toContain('✖ 2 problems: 2 missing (2 orphans)');
  });

  it('should combine all categories into a single output with summary', () => {
    const output = renderHuman({
      missing: [{ key: 'foo', status: 'missing' }],
      incomplete: [{ key: 'bar', status: 'incomplete', reason: 'TODO fields present' }],
      dueForReview: [{ key: 'baz', status: 'dueForReview', reason: 'Expired on 2020-01-01' }],
      filteredOrphans: [{ key: 'orphaned' }],
      shouldFail: true,
    });

    expect(output).toContain('Missing metadata (1):');
    expect(output).toContain('Incomplete (1):');
    expect(output).toContain('Due for review (1):');
    expect(output).toContain('Orphans (1):');
    expect(output).toContain('✖ 3 problems: 1 missing, 1 incomplete, 1 due for review (1 orphan)');
  });
});
