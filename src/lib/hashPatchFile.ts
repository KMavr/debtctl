import crypto from 'node:crypto';
import fs from 'node:fs/promises';

export const hashPatchFile = async (absolutePath: string): Promise<string> => {
  try {
    const fileContent = await fs.readFile(absolutePath, 'utf8');
    const normalized = fileContent.replace(/\r\n/g, '\n');
    const hash = crypto.createHash('sha256');
    hash.update(normalized);
    return `sha256:${hash.digest('hex')}`;
  } catch (error) {
    throw new Error(`Failed to hash patch file ${absolutePath}: ${(error as Error).message}`);
  }
};
