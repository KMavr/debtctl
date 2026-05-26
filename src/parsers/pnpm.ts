import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { fileExists } from '../detect/index.js';
import { Override, PackageJson } from '../types.js';

const PNPM_WORKSPACE_FILENAME = 'pnpm-workspace.yaml';

const readPnpmWorkspaceOverrides = async (cwd: string): Promise<Record<string, string>> => {
  const workspacePath = path.join(cwd, PNPM_WORKSPACE_FILENAME);
  const exists = await fileExists(workspacePath);
  if (!exists) {
    return {};
  }

  const raw = await fs.readFile(workspacePath, 'utf8');
  const parsed = YAML.parse(raw) as { overrides?: Record<string, unknown> } | null;
  const overrides = parsed?.overrides ?? {};

  return Object.fromEntries(
    Object.entries(overrides).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

const readPackageJsonOverrides = (packageJson: PackageJson): Record<string, string> => {
  const pnpm = packageJson.pnpm;
  if (!pnpm || typeof pnpm !== 'object') {
    return {};
  }

  const overrides = (pnpm as Record<string, unknown>).overrides;
  if (!overrides || typeof overrides !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(overrides).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

export const pnpmParse = async (packageJson: PackageJson, cwd: string): Promise<Override[]> => {
  const packageJsonOverrides = readPackageJsonOverrides(packageJson);
  const workspaceOverrides = await readPnpmWorkspaceOverrides(cwd);

  const merged = { ...packageJsonOverrides, ...workspaceOverrides };

  return Object.entries(merged).map(([key, value]) => ({ key, value }));
};
