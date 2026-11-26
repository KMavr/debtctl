import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCheck } from '../../src/cli/check.js';
import { check, CheckResult } from '../../src/commands/check.js';

vi.mock('../../src/commands/check.js', () => ({ check: vi.fn() }));

class ExitError extends Error {
  constructor(public code: number) {
    super(`process.exit(${code})`);
  }
}

const buildResult = (overrides: Partial<CheckResult> = {}): CheckResult => ({
  manager: 'npm',
  sidecarPresent: true,
  entries: [],
  patchEntries: [],
  orphans: [],
  patchOrphans: [],
  ...overrides,
});

describe('runCheck', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ExitError(code ?? 0);
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(check).mockReset();
  });

  it('should exit 0 and print the success message when everything is documented', async () => {
    vi.mocked(check).mockResolvedValue(buildResult({ entries: [{ key: 'foo', status: 'ok' }] }));

    await expect(runCheck({})).rejects.toThrow(ExitError);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('All overrides and patches'));
  });

  it('should exit 1 when an override is missing metadata', async () => {
    vi.mocked(check).mockResolvedValue(
      buildResult({ entries: [{ key: 'foo', status: 'missing' }] }),
    );

    await expect(runCheck({})).rejects.toThrow(ExitError);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should exit 1 when a patch is incomplete', async () => {
    vi.mocked(check).mockResolvedValue(
      buildResult({ patchEntries: [{ key: 'foo', status: 'incomplete' }] }),
    );

    await expect(runCheck({})).rejects.toThrow(ExitError);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should exit 0 on due-for-review entries without --strict', async () => {
    vi.mocked(check).mockResolvedValue(
      buildResult({ entries: [{ key: 'foo', status: 'dueForReview' }] }),
    );

    await expect(runCheck({})).rejects.toThrow(ExitError);

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should exit 1 on due-for-review entries with --strict', async () => {
    vi.mocked(check).mockResolvedValue(
      buildResult({ patchEntries: [{ key: 'foo', status: 'dueForReview' }] }),
    );

    await expect(runCheck({ strict: true })).rejects.toThrow(ExitError);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should print JSON instead of the human report with --json', async () => {
    vi.mocked(check).mockResolvedValue(
      buildResult({ entries: [{ key: 'foo', status: 'missing' }] }),
    );

    await expect(runCheck({ json: true })).rejects.toThrow(ExitError);

    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.entries).toEqual([{ key: 'foo', status: 'missing' }]);
  });

  it('should warn on stderr about ambiguous lockfiles in human mode', async () => {
    vi.mocked(check).mockResolvedValue(
      buildResult({ ambiguous: ['package-lock.json', 'yarn.lock'] }),
    );

    await expect(runCheck({})).rejects.toThrow(ExitError);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('multiple lockfiles found'));
  });

  it('should not warn about ambiguous lockfiles in json mode', async () => {
    vi.mocked(check).mockResolvedValue(
      buildResult({ ambiguous: ['package-lock.json', 'yarn.lock'] }),
    );

    await expect(runCheck({ json: true })).rejects.toThrow(ExitError);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should exit 2 when entries exist but .debtctl.json is missing', async () => {
    vi.mocked(check).mockResolvedValue(
      buildResult({ sidecarPresent: false, entries: [{ key: 'foo', status: 'missing' }] }),
    );

    await expect(runCheck({})).rejects.toThrow(new ExitError(2));

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No .debtctl.json found'));
  });

  it('should not require .debtctl.json when nothing is detected', async () => {
    vi.mocked(check).mockResolvedValue(buildResult({ sidecarPresent: false }));

    await expect(runCheck({})).rejects.toThrow(new ExitError(0));
  });

  it('should not require .debtctl.json in json mode', async () => {
    vi.mocked(check).mockResolvedValue(
      buildResult({ sidecarPresent: false, entries: [{ key: 'foo', status: 'missing' }] }),
    );

    await expect(runCheck({ json: true })).rejects.toThrow(new ExitError(1));
  });

  describe('--only', () => {
    it('should limit the report to the given bucket', async () => {
      vi.mocked(check).mockResolvedValue(
        buildResult({
          entries: [
            { key: 'foo', status: 'missing' },
            { key: 'bar', status: 'dueForReview' },
          ],
        }),
      );

      await expect(runCheck({ only: 'dueForReview', json: true })).rejects.toThrow(
        new ExitError(0),
      );

      const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(parsed.entries).toEqual([{ key: 'bar', status: 'dueForReview' }]);
    });

    it('should accept a domain:bucket value', async () => {
      vi.mocked(check).mockResolvedValue(
        buildResult({
          entries: [{ key: 'foo', status: 'missing' }],
          patchEntries: [{ key: 'bar', status: 'missing' }],
        }),
      );

      await expect(runCheck({ only: 'patches:missing', json: true })).rejects.toThrow(
        new ExitError(1),
      );

      const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(parsed.entries).toEqual([]);
      expect(parsed.patchEntries).toEqual([{ key: 'bar', status: 'missing' }]);
    });

    it('should exit 2 on an invalid bucket', async () => {
      await expect(runCheck({ only: 'foo' })).rejects.toThrow(new ExitError(2));

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid --only value: foo'));
      expect(check).not.toHaveBeenCalled();
    });

    it('should exit 2 on an invalid domain', async () => {
      await expect(runCheck({ only: 'foo:missing' })).rejects.toThrow(new ExitError(2));

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid --only domain: foo'));
    });

    it('should exit 2 on an invalid bucket after a valid domain', async () => {
      await expect(runCheck({ only: 'overrides:foo' })).rejects.toThrow(new ExitError(2));

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid --only bucket: foo'));
    });
  });
});
