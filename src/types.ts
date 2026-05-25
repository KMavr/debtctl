export type PackageManager = 'npm' | 'pnpm' | 'yarn-classic' | 'yarn-berry';

export interface Override {
  key: string;
  value: string;
}

export interface TriggerDate {
  type: 'date';
  expires: string;
}
export interface TriggerAnchor {
  type: 'version-anchor';
  package: string;
  declaredVersion: string;
}
export interface OverrideMeta {
  reason: string;
  owner: string;
  revisitWhen: TriggerDate | TriggerAnchor;
}
export interface Sidecar {
  version: 1;
  overrides: Record<string, OverrideMeta>;
}
