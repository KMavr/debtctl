import { describe, expect, it } from 'vitest';
import { evaluateTrigger } from '../src/triggers/index.js';
import { OverrideMeta } from '../src/types.js';

const dateMeta = (expires: string): OverrideMeta => ({
  reason: 'foo bar',
  owner: 'John Doe',
  revisitWhen: { type: 'date', expires },
});

const anchorMeta = (packageName: string, declaredRange: string): OverrideMeta => ({
  reason: 'foo bar',
  owner: 'John Doe',
  revisitWhen: { type: 'version-anchor', package: packageName, declaredRange },
});

describe('evaluateTrigger', () => {
  describe('date trigger', () => {
    it('should not fire when expires is in the future', () => {
      const result = evaluateTrigger(dateMeta('2099-01-01'), {}, new Date('2026-05-25'));
      expect(result.fired).toBe(false);
      expect(result.reason).toBe('Expires on 2099-01-01');
    });

    it('should fire when expires is in the past', () => {
      const result = evaluateTrigger(dateMeta('2020-01-01'), {}, new Date('2026-05-25'));
      expect(result.fired).toBe(true);
      expect(result.reason).toBe('Expired on 2020-01-01');
    });

    it('should fire when expires equals today (boundary)', () => {
      const result = evaluateTrigger(dateMeta('2026-05-25'), {}, new Date('2026-05-25'));
      expect(result.fired).toBe(true);
    });
  });

  describe('version-anchor trigger', () => {
    it('should not fire when the declared range still matches dependencies', () => {
      const result = evaluateTrigger(anchorMeta('foo', '^1.2.0'), {
        dependencies: { foo: '^1.2.0' },
      });
      expect(result.fired).toBe(false);
      expect(result.reason).toBe('foo still pinned at ^1.2.0');
    });

    it('should fire when the declared range has changed', () => {
      const result = evaluateTrigger(anchorMeta('foo', '^1.2.0'), {
        dependencies: { foo: '^2.0.0' },
      });
      expect(result.fired).toBe(true);
      expect(result.reason).toBe('foo declared range changed: ^1.2.0 -> ^2.0.0');
    });

    it('should fire when the dependency has been removed entirely', () => {
      const result = evaluateTrigger(anchorMeta('foo', '^1.2.0'), {
        dependencies: { bar: '^1.0.0' },
      });
      expect(result.fired).toBe(true);
      expect(result.reason).toBe('foo is no longer a dependency');
    });

    it('should look up the package in devDependencies', () => {
      const result = evaluateTrigger(anchorMeta('foo', '^1.2.0'), {
        devDependencies: { foo: '^1.2.0' },
      });
      expect(result.fired).toBe(false);
    });

    it('should look up the package in peerDependencies', () => {
      const result = evaluateTrigger(anchorMeta('foo', '^1.2.0'), {
        peerDependencies: { foo: '^1.2.0' },
      });
      expect(result.fired).toBe(false);
    });

    it('should treat semver-equivalent ranges as unchanged', () => {
      const result = evaluateTrigger(anchorMeta('foo', '1.2.0'), {
        dependencies: { foo: '=1.2.0' },
      });
      expect(result.fired).toBe(false);
    });

    it('should ignore whitespace differences in equivalent ranges', () => {
      const result = evaluateTrigger(anchorMeta('foo', '^1.2.0'), {
        dependencies: { foo: '  ^1.2.0  ' },
      });
      expect(result.fired).toBe(false);
    });

    it('should treat unparseable ranges as changed when they differ as strings', () => {
      const result = evaluateTrigger(anchorMeta('foo', 'latest'), {
        dependencies: { foo: '^1.2.0' },
      });
      expect(result.fired).toBe(true);
    });

    it('should treat identical unparseable ranges as unchanged via string fast-path', () => {
      const result = evaluateTrigger(anchorMeta('foo', 'latest'), {
        dependencies: { foo: 'latest' },
      });
      expect(result.fired).toBe(false);
    });

    it('should fire when no dependency sections are present at all', () => {
      const result = evaluateTrigger(anchorMeta('foo', '^1.2.0'), { name: 'empty' });
      expect(result.fired).toBe(true);
      expect(result.reason).toBe('foo is no longer a dependency');
    });
  });
});
