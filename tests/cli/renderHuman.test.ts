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
  patchMissing: [] as CheckEntry[],
  patchIncomplete: [] as CheckEntry[],
  patchDueForReview: [] as CheckEntry[],
  filteredPatchOrphans: [] as { key: string }[],
  shouldFail: false,
};

describe('renderHuman', () => {
  it('should return a clean success line when nothing to report', () => {
    const output = renderHuman(emptyInput);

    expect(output).toBe('✓ All overrides and patches documented and current');
  });

  it('should render an Overrides header above an override section', () => {
    const output = renderHuman({
      ...emptyInput,
      missing: [{ key: 'foo', status: 'missing' }],
      shouldFail: true,
    });

    expect(output).toContain('Overrides:');
    expect(output).toContain('Missing metadata (1):');
    expect(output).toContain('    - foo');
  });

  it('should render an Incomplete section including the reason', () => {
    const output = renderHuman({
      ...emptyInput,
      incomplete: [{ key: 'bar', status: 'incomplete', reason: 'TODO fields present' }],
      shouldFail: true,
    });

    expect(output).toContain('Incomplete (1):');
    expect(output).toContain('    - bar: TODO fields present');
  });

  it('should render a Due for review section', () => {
    const output = renderHuman({
      ...emptyInput,
      dueForReview: [{ key: 'baz', status: 'dueForReview', reason: 'Expired on 2020-01-01' }],
      shouldFail: false,
    });

    expect(output).toContain('Due for review (1):');
    expect(output).toContain('    - baz: Expired on 2020-01-01');
  });

  it('should render an Orphans section with the override-specific suffix', () => {
    const output = renderHuman({
      ...emptyInput,
      filteredOrphans: [{ key: 'orphaned' }],
    });

    expect(output).toContain('Orphans (1):');
    expect(output).toContain('    - orphaned (no longer in package.json overrides)');
  });

  it('should use a red ✖ override summary when shouldFail is true', () => {
    const output = renderHuman({
      ...emptyInput,
      missing: [{ key: 'foo', status: 'missing' }],
      shouldFail: true,
    });

    expect(output).toContain('✖ 1 override problem: 1 missing');
  });

  it('should use a yellow ⚠ override summary when problems exist but shouldFail is false', () => {
    const output = renderHuman({
      ...emptyInput,
      dueForReview: [{ key: 'foo', status: 'dueForReview', reason: 'Expired on 2020-01-01' }],
      shouldFail: false,
    });

    expect(output).toContain('⚠ 1 override problem: 1 due for review');
  });

  it('should print an override orphans-only summary when only override orphans are present', () => {
    const output = renderHuman({
      ...emptyInput,
      filteredOrphans: [{ key: 'orphaned' }],
    });

    expect(output).toContain('1 override orphan found (no failures)');
  });

  it('should pluralize override problems and orphans correctly', () => {
    const output = renderHuman({
      ...emptyInput,
      missing: [
        { key: 'foo', status: 'missing' },
        { key: 'bar', status: 'missing' },
      ],
      filteredOrphans: [{ key: 'orphan-one' }, { key: 'orphan-two' }],
      shouldFail: true,
    });

    expect(output).toContain('✖ 2 override problems: 2 missing (2 orphans)');
  });

  it('should combine all override categories into a single output with summary', () => {
    const output = renderHuman({
      ...emptyInput,
      missing: [{ key: 'foo', status: 'missing' }],
      incomplete: [{ key: 'bar', status: 'incomplete', reason: 'TODO fields present' }],
      dueForReview: [{ key: 'baz', status: 'dueForReview', reason: 'Expired on 2020-01-01' }],
      filteredOrphans: [{ key: 'orphaned' }],
      shouldFail: true,
    });

    expect(output).toContain('Overrides:');
    expect(output).toContain('Missing metadata (1):');
    expect(output).toContain('Incomplete (1):');
    expect(output).toContain('Due for review (1):');
    expect(output).toContain('Orphans (1):');
    expect(output).toContain(
      '✖ 3 override problems: 1 missing, 1 incomplete, 1 due for review (1 orphan)',
    );
  });

  it('should render a Patches header above a patch section', () => {
    const output = renderHuman({
      ...emptyInput,
      patchMissing: [{ key: 'foo', status: 'missing' }],
      shouldFail: true,
    });

    expect(output).toContain('Patches:');
    expect(output).toContain('Missing metadata (1):');
    expect(output).toContain('    - foo');
  });

  it('should render a patch dueForReview section with the patch-specific reason', () => {
    const output = renderHuman({
      ...emptyInput,
      patchDueForReview: [{ key: 'bar', status: 'dueForReview', reason: 'Patch content changed' }],
    });

    expect(output).toContain('Patches:');
    expect(output).toContain('Due for review (1):');
    expect(output).toContain('    - bar: Patch content changed');
  });

  it('should render patch orphans with the patch-specific suffix', () => {
    const output = renderHuman({
      ...emptyInput,
      filteredPatchOrphans: [{ key: 'orphaned-patch' }],
    });

    expect(output).toContain('Patches:');
    expect(output).toContain('Orphans (1):');
    expect(output).toContain('    - orphaned-patch (no longer detected as a patch)');
  });

  it('should emit a patch summary line alongside the override summary line', () => {
    const output = renderHuman({
      ...emptyInput,
      missing: [{ key: 'foo', status: 'missing' }],
      patchMissing: [{ key: 'bar', status: 'missing' }],
      shouldFail: true,
    });

    expect(output).toContain('✖ 1 override problem: 1 missing');
    expect(output).toContain('✖ 1 patch problem: 1 missing');
  });

  it('should skip the Overrides section entirely when only patches have problems', () => {
    const output = renderHuman({
      ...emptyInput,
      patchMissing: [{ key: 'foo', status: 'missing' }],
      shouldFail: true,
    });

    expect(output).not.toContain('Overrides:');
    expect(output).toContain('Patches:');
  });

  it('should skip the Patches section entirely when only overrides have problems', () => {
    const output = renderHuman({
      ...emptyInput,
      missing: [{ key: 'foo', status: 'missing' }],
      shouldFail: true,
    });

    expect(output).toContain('Overrides:');
    expect(output).not.toContain('Patches:');
  });

  it('should print a patch orphans-only summary when only patch orphans are present', () => {
    const output = renderHuman({
      ...emptyInput,
      filteredPatchOrphans: [{ key: 'orphaned-patch' }],
    });

    expect(output).toContain('1 patch orphan found (no failures)');
  });
});
