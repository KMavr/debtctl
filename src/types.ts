export type PackageManager = 'npm' | 'pnpm' | 'yarn-classic' | 'yarn-berry';

export interface Override {
  key: string;
  value: string;
}
