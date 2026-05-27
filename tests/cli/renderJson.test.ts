import { describe, expect, it } from 'vitest';
import { renderJson } from '../../src/cli/check.js';

describe('renderJson', () => {
  it('should emit manager, entries, orphans, patchEntries, and patchOrphans by default', () => {
    const output = renderJson({
      manager: 'npm',
      filteredEntries: [{ key: 'foo', status: 'missing' }],
      filteredOrphans: [{ key: 'orphaned' }],
      filteredPatchEntries: [{ key: 'bar', status: 'missing' }],
      filteredPatchOrphans: [{ key: 'orphaned-patch' }],
    });

    const parsed = JSON.parse(output);
    expect(parsed).toEqual({
      manager: 'npm',
      entries: [{ key: 'foo', status: 'missing' }],
      orphans: [{ key: 'orphaned' }],
      patchEntries: [{ key: 'bar', status: 'missing' }],
      patchOrphans: [{ key: 'orphaned-patch' }],
    });
    expect(parsed).not.toHaveProperty('ambiguous');
  });

  it('should include ambiguous when supplied', () => {
    const output = renderJson({
      manager: 'npm',
      filteredEntries: [],
      filteredOrphans: [],
      filteredPatchEntries: [],
      filteredPatchOrphans: [],
      ambiguous: ['package-lock.json', 'yarn.lock'],
    });

    const parsed = JSON.parse(output);
    expect(parsed.ambiguous).toEqual(['package-lock.json', 'yarn.lock']);
  });

  it('should omit ambiguous when explicitly undefined', () => {
    const output = renderJson({
      manager: 'pnpm',
      filteredEntries: [],
      filteredOrphans: [],
      filteredPatchEntries: [],
      filteredPatchOrphans: [],
      ambiguous: undefined,
    });

    const parsed = JSON.parse(output);
    expect(parsed).not.toHaveProperty('ambiguous');
  });

  it('should emit empty arrays for patches when no patches are present', () => {
    const output = renderJson({
      manager: 'npm',
      filteredEntries: [{ key: 'foo', status: 'missing' }],
      filteredOrphans: [],
      filteredPatchEntries: [],
      filteredPatchOrphans: [],
    });

    const parsed = JSON.parse(output);
    expect(parsed.patchEntries).toEqual([]);
    expect(parsed.patchOrphans).toEqual([]);
  });
});
