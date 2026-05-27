export type PackageManager = 'npm' | 'pnpm' | 'yarn-classic' | 'yarn-berry';

export type PackageJson = Record<string, unknown>;

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
  declaredRange: string;
}

export interface TriggerPatchHash {
  type: 'patch-hash';
  hash: string;
}

export interface OverrideMeta {
  reason: string;
  owner: string;
  revisitWhen: TriggerDate | TriggerAnchor | TriggerPatchHash;
}

export interface Sidecar {
  version: 2;
  overrides: Record<string, OverrideMeta>;
  patches: Record<string, OverrideMeta>;
}
