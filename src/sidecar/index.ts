import fs from 'node:fs/promises';
import path from 'node:path';
import { fileExists } from '../detect/index.js';
import { OverrideMeta, Sidecar } from '../types.js';

const SIDECAR_FILENAME = '.debtctl.json';
const SIDECAR_TMP_FILENAME = '.debtctl.json.tmp';

const makeStubMeta = (): OverrideMeta => ({
  reason: 'TODO',
  owner: 'TODO',
  revisitWhen: { type: 'date', expires: 'TODO' },
});

export const readSidecar = async (cwd: string): Promise<Sidecar | null> => {
  const sidecarPath = path.join(cwd, SIDECAR_FILENAME);

  const exists = await fileExists(sidecarPath);
  if (!exists) {
    return null;
  }

  const sidecarRaw = await fs.readFile(sidecarPath, 'utf8');
  return JSON.parse(sidecarRaw);
};

export const writeSidecar = async (cwd: string, sidecar: Sidecar): Promise<void> => {
  const sidecarPath = path.join(cwd, SIDECAR_FILENAME);
  const tmpPath = path.join(cwd, SIDECAR_TMP_FILENAME);

  const serialized = `${JSON.stringify(sidecar, null, 2)}\n`;

  await fs.writeFile(tmpPath, serialized, 'utf8');
  await fs.rename(tmpPath, sidecarPath);
};

export const mergeSidecar = (existing: Sidecar | null, currentOverrideKeys: string[]): Sidecar => {
  const existingOverrides = existing?.overrides ?? {};

  const updated = Object.fromEntries(
    currentOverrideKeys.map((overrideKey) => [
      overrideKey,
      existingOverrides[overrideKey] ?? makeStubMeta(),
    ]),
  );

  return { version: 1, overrides: { ...existingOverrides, ...updated } };
};
