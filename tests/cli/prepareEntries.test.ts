import { describe, expect, it } from 'vitest';
import { prepareEntries } from '../../src/cli/check.js';
import { CheckEntry, CheckResult } from '../../src/commands/check.js';

const buildResult = (entries: CheckEntry[], orphans: { key: string }[] = []): CheckResult => ({
  manager: 'npm',
  sidecarPresent: true,
  entries,
  orphans,
});

describe('prepareEntries', () => {
  it('should exclude ok entries when onlyFilter is undefined', () => {
    const result = buildResult([
      { key: 'foo', status: 'ok' },
      { key: 'bar', status: 'missing' },
      { key: 'baz', status: 'incomplete', reason: 'TODO fields present' },
    ]);

    const prepared = prepareEntries(result, undefined);

    expect(prepared.filteredEntries.map((entry) => entry.key)).toEqual(['bar', 'baz']);
  });

  it('should keep only the requested status when onlyFilter is set', () => {
    const result = buildResult([
      { key: 'foo', status: 'ok' },
      { key: 'bar', status: 'missing' },
      { key: 'baz', status: 'incomplete', reason: 'TODO fields present' },
      { key: 'qux', status: 'dueForReview', reason: 'Expired on 2020-01-01' },
    ]);

    const prepared = prepareEntries(result, 'incomplete');

    expect(prepared.filteredEntries).toEqual([
      { key: 'baz', status: 'incomplete', reason: 'TODO fields present' },
    ]);
  });

  it('should empty orphans when onlyFilter is a non-orphans bucket', () => {
    const result = buildResult([{ key: 'foo', status: 'missing' }], [{ key: 'orphaned' }]);

    const prepared = prepareEntries(result, 'missing');

    expect(prepared.filteredOrphans).toEqual([]);
  });

  it('should keep orphans and empty entries when onlyFilter is orphans', () => {
    const result = buildResult(
      [
        { key: 'foo', status: 'missing' },
        { key: 'bar', status: 'incomplete', reason: 'TODO fields present' },
      ],
      [{ key: 'orphaned' }],
    );

    const prepared = prepareEntries(result, 'orphans');

    expect(prepared.filteredEntries).toEqual([]);
    expect(prepared.filteredOrphans).toEqual([{ key: 'orphaned' }]);
  });

  it('should group missing, incomplete, and dueForReview into separate buckets', () => {
    const result = buildResult([
      { key: 'foo', status: 'missing' },
      { key: 'bar', status: 'incomplete', reason: 'TODO fields present' },
      { key: 'baz', status: 'dueForReview', reason: 'Expired on 2020-01-01' },
      { key: 'qux', status: 'ok' },
    ]);

    const prepared = prepareEntries(result, undefined);

    expect(prepared.missing.map((entry) => entry.key)).toEqual(['foo']);
    expect(prepared.incomplete.map((entry) => entry.key)).toEqual(['bar']);
    expect(prepared.dueForReview.map((entry) => entry.key)).toEqual(['baz']);
  });

  it('should keep orphans untouched when onlyFilter is undefined', () => {
    const result = buildResult(
      [{ key: 'foo', status: 'missing' }],
      [{ key: 'orphan-one' }, { key: 'orphan-two' }],
    );

    const prepared = prepareEntries(result, undefined);

    expect(prepared.filteredOrphans).toEqual([{ key: 'orphan-one' }, { key: 'orphan-two' }]);
  });

  it('should return empty arrays when the check result has no entries or orphans', () => {
    const result = buildResult([], []);

    const prepared = prepareEntries(result, undefined);

    expect(prepared.filteredEntries).toEqual([]);
    expect(prepared.filteredOrphans).toEqual([]);
    expect(prepared.missing).toEqual([]);
    expect(prepared.incomplete).toEqual([]);
    expect(prepared.dueForReview).toEqual([]);
  });
});
