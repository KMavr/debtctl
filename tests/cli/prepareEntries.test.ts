import { describe, expect, it } from 'vitest';
import { prepareEntries } from '../../src/cli/check.js';
import { CheckEntry, CheckResult } from '../../src/commands/check.js';

const buildResult = (input: {
  entries?: CheckEntry[];
  orphans?: { key: string }[];
  patchEntries?: CheckEntry[];
  patchOrphans?: { key: string }[];
}): CheckResult => ({
  manager: 'npm',
  sidecarPresent: true,
  entries: input.entries ?? [],
  orphans: input.orphans ?? [],
  patchEntries: input.patchEntries ?? [],
  patchOrphans: input.patchOrphans ?? [],
});

describe('prepareEntries', () => {
  it('should exclude ok entries when onlyFilter is undefined', () => {
    const result = buildResult({
      entries: [
        { key: 'foo', status: 'ok' },
        { key: 'bar', status: 'missing' },
        { key: 'baz', status: 'incomplete', reason: 'TODO fields present' },
      ],
    });

    const prepared = prepareEntries(result, undefined);

    expect(prepared.filteredEntries.map((entry) => entry.key)).toEqual(['bar', 'baz']);
  });

  it('should keep only the requested status when onlyFilter is set', () => {
    const result = buildResult({
      entries: [
        { key: 'foo', status: 'ok' },
        { key: 'bar', status: 'missing' },
        { key: 'baz', status: 'incomplete', reason: 'TODO fields present' },
        { key: 'qux', status: 'dueForReview', reason: 'Expired on 2020-01-01' },
      ],
    });

    const prepared = prepareEntries(result, { bucket: 'incomplete', domain: 'all' });

    expect(prepared.filteredEntries).toEqual([
      { key: 'baz', status: 'incomplete', reason: 'TODO fields present' },
    ]);
  });

  it('should empty orphans when onlyFilter is a non-orphans bucket', () => {
    const result = buildResult({
      entries: [{ key: 'foo', status: 'missing' }],
      orphans: [{ key: 'orphaned' }],
    });

    const prepared = prepareEntries(result, { bucket: 'missing', domain: 'all' });

    expect(prepared.filteredOrphans).toEqual([]);
  });

  it('should keep orphans and empty entries when onlyFilter is orphans', () => {
    const result = buildResult({
      entries: [
        { key: 'foo', status: 'missing' },
        { key: 'bar', status: 'incomplete', reason: 'TODO fields present' },
      ],
      orphans: [{ key: 'orphaned' }],
    });

    const prepared = prepareEntries(result, { bucket: 'orphans', domain: 'all' });

    expect(prepared.filteredEntries).toEqual([]);
    expect(prepared.filteredOrphans).toEqual([{ key: 'orphaned' }]);
  });

  it('should group missing, incomplete, and dueForReview into separate buckets', () => {
    const result = buildResult({
      entries: [
        { key: 'foo', status: 'missing' },
        { key: 'bar', status: 'incomplete', reason: 'TODO fields present' },
        { key: 'baz', status: 'dueForReview', reason: 'Expired on 2020-01-01' },
        { key: 'qux', status: 'ok' },
      ],
    });

    const prepared = prepareEntries(result, undefined);

    expect(prepared.missing.map((entry) => entry.key)).toEqual(['foo']);
    expect(prepared.incomplete.map((entry) => entry.key)).toEqual(['bar']);
    expect(prepared.dueForReview.map((entry) => entry.key)).toEqual(['baz']);
  });

  it('should keep orphans untouched when onlyFilter is undefined', () => {
    const result = buildResult({
      entries: [{ key: 'foo', status: 'missing' }],
      orphans: [{ key: 'orphan-one' }, { key: 'orphan-two' }],
    });

    const prepared = prepareEntries(result, undefined);

    expect(prepared.filteredOrphans).toEqual([{ key: 'orphan-one' }, { key: 'orphan-two' }]);
  });

  it('should return empty arrays when the check result has no entries or orphans', () => {
    const result = buildResult({});

    const prepared = prepareEntries(result, undefined);

    expect(prepared.filteredEntries).toEqual([]);
    expect(prepared.filteredOrphans).toEqual([]);
    expect(prepared.missing).toEqual([]);
    expect(prepared.incomplete).toEqual([]);
    expect(prepared.dueForReview).toEqual([]);
    expect(prepared.filteredPatchEntries).toEqual([]);
    expect(prepared.filteredPatchOrphans).toEqual([]);
    expect(prepared.patchMissing).toEqual([]);
    expect(prepared.patchIncomplete).toEqual([]);
    expect(prepared.patchDueForReview).toEqual([]);
  });

  it('should exclude ok patch entries when onlyFilter is undefined', () => {
    const result = buildResult({
      patchEntries: [
        { key: 'foo', status: 'ok' },
        { key: 'bar', status: 'missing' },
      ],
    });

    const prepared = prepareEntries(result, undefined);

    expect(prepared.filteredPatchEntries.map((entry) => entry.key)).toEqual(['bar']);
  });

  it('should group patch entries into separate buckets', () => {
    const result = buildResult({
      patchEntries: [
        { key: 'foo', status: 'missing' },
        { key: 'bar', status: 'incomplete', reason: 'TODO fields present' },
        { key: 'baz', status: 'dueForReview', reason: 'Patch content changed' },
      ],
    });

    const prepared = prepareEntries(result, undefined);

    expect(prepared.patchMissing.map((entry) => entry.key)).toEqual(['foo']);
    expect(prepared.patchIncomplete.map((entry) => entry.key)).toEqual(['bar']);
    expect(prepared.patchDueForReview.map((entry) => entry.key)).toEqual(['baz']);
  });

  it('should apply onlyFilter to patches across both domains', () => {
    const result = buildResult({
      entries: [{ key: 'foo', status: 'missing' }],
      patchEntries: [
        { key: 'bar', status: 'missing' },
        { key: 'baz', status: 'incomplete', reason: 'TODO fields present' },
      ],
    });

    const prepared = prepareEntries(result, { bucket: 'missing', domain: 'all' });

    expect(prepared.filteredEntries.map((entry) => entry.key)).toEqual(['foo']);
    expect(prepared.filteredPatchEntries.map((entry) => entry.key)).toEqual(['bar']);
  });

  it('should empty patch orphans when onlyFilter is a non-orphans bucket', () => {
    const result = buildResult({
      patchEntries: [{ key: 'foo', status: 'missing' }],
      patchOrphans: [{ key: 'orphaned-patch' }],
    });

    const prepared = prepareEntries(result, { bucket: 'missing', domain: 'all' });

    expect(prepared.filteredPatchOrphans).toEqual([]);
  });

  it('should keep patch orphans when onlyFilter is orphans', () => {
    const result = buildResult({
      patchOrphans: [{ key: 'orphaned-patch' }],
    });

    const prepared = prepareEntries(result, { bucket: 'orphans', domain: 'all' });

    expect(prepared.filteredPatchOrphans).toEqual([{ key: 'orphaned-patch' }]);
  });

  describe('domain scoping', () => {
    it('should include only override entries when domain is overrides', () => {
      const result = buildResult({
        entries: [{ key: 'foo', status: 'missing' }],
        patchEntries: [{ key: 'bar', status: 'missing' }],
      });

      const prepared = prepareEntries(result, { bucket: 'missing', domain: 'overrides' });

      expect(prepared.filteredEntries.map((entry) => entry.key)).toEqual(['foo']);
      expect(prepared.filteredPatchEntries).toEqual([]);
      expect(prepared.patchMissing).toEqual([]);
    });

    it('should include only patch entries when domain is patches', () => {
      const result = buildResult({
        entries: [{ key: 'foo', status: 'missing' }],
        patchEntries: [{ key: 'bar', status: 'missing' }],
      });

      const prepared = prepareEntries(result, { bucket: 'missing', domain: 'patches' });

      expect(prepared.filteredEntries).toEqual([]);
      expect(prepared.missing).toEqual([]);
      expect(prepared.filteredPatchEntries.map((entry) => entry.key)).toEqual(['bar']);
    });

    it('should empty override orphans when domain is patches', () => {
      const result = buildResult({
        orphans: [{ key: 'override-orphan' }],
        patchOrphans: [{ key: 'patch-orphan' }],
      });

      const prepared = prepareEntries(result, { bucket: 'orphans', domain: 'patches' });

      expect(prepared.filteredOrphans).toEqual([]);
      expect(prepared.filteredPatchOrphans).toEqual([{ key: 'patch-orphan' }]);
    });

    it('should empty patch orphans when domain is overrides', () => {
      const result = buildResult({
        orphans: [{ key: 'override-orphan' }],
        patchOrphans: [{ key: 'patch-orphan' }],
      });

      const prepared = prepareEntries(result, { bucket: 'orphans', domain: 'overrides' });

      expect(prepared.filteredOrphans).toEqual([{ key: 'override-orphan' }]);
      expect(prepared.filteredPatchOrphans).toEqual([]);
    });

    it('should keep both domains when domain is all (regression check for bare bucket filter)', () => {
      const result = buildResult({
        entries: [{ key: 'foo', status: 'missing' }],
        patchEntries: [{ key: 'bar', status: 'missing' }],
      });

      const prepared = prepareEntries(result, { bucket: 'missing', domain: 'all' });

      expect(prepared.filteredEntries.map((entry) => entry.key)).toEqual(['foo']);
      expect(prepared.filteredPatchEntries.map((entry) => entry.key)).toEqual(['bar']);
    });
  });
});
