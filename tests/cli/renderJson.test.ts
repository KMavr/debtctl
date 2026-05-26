import { describe, expect, it } from 'vitest';
import { renderJson } from '../../src/cli/check.js';

describe('renderJson', () => {
  it('should emit manager, entries, and orphans without an ambiguous key by default', () => {
    const output = renderJson({
      manager: 'npm',
      filteredEntries: [{ key: 'foo', status: 'missing' }],
      filteredOrphans: [{ key: 'orphaned' }],
    });

    const parsed = JSON.parse(output);
    expect(parsed).toEqual({
      manager: 'npm',
      entries: [{ key: 'foo', status: 'missing' }],
      orphans: [{ key: 'orphaned' }],
    });
    expect(parsed).not.toHaveProperty('ambiguous');
  });

  it('should include ambiguous when supplied', () => {
    const output = renderJson({
      manager: 'npm',
      filteredEntries: [],
      filteredOrphans: [],
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
      ambiguous: undefined,
    });

    const parsed = JSON.parse(output);
    expect(parsed).not.toHaveProperty('ambiguous');
  });
});
