import { PackageManager } from '../types.js';

export interface ManagerConfig {
  id: PackageManager;
  pmField: {
    name: 'npm' | 'yarn' | 'pnpm';
    matchesVersion?: (version: string) => boolean;
  };
  lockfile: 'package-lock.json' | 'yarn.lock' | 'pnpm-lock.yaml';
  matchesLockContent?: (content: string) => boolean;
}

export const MANAGERS: ManagerConfig[] = [
  {
    id: 'npm',
    pmField: { name: 'npm' },
    lockfile: 'package-lock.json',
  },
  {
    id: 'pnpm',
    pmField: { name: 'pnpm' },
    lockfile: 'pnpm-lock.yaml',
  },
  {
    id: 'yarn-classic',
    pmField: { name: 'yarn', matchesVersion: (version) => version.startsWith('1.') },
    lockfile: 'yarn.lock',
    matchesLockContent: (content) => !content.includes('__metadata:'),
  },
  {
    id: 'yarn-berry',
    pmField: { name: 'yarn', matchesVersion: (version) => !version.startsWith('1.') },
    lockfile: 'yarn.lock',
    matchesLockContent: (content) => content.includes('__metadata:'),
  },
];
