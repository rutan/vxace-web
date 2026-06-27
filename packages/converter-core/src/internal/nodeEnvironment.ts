import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { ConversionOutput, ConversionRuntime, ConversionSource } from './environment';
import { walkGameFiles } from './fileWalker';

export const nodeRuntime: ConversionRuntime = {
  async sha256Hex(parts) {
    const hash = createHash('sha256');
    for (const part of parts) hash.update(part);
    return hash.digest('hex');
  },
  async inflate(bytes) {
    return inflateSync(bytes);
  },
  concatBytes(chunks, byteLength) {
    return Buffer.concat(chunks, byteLength);
  },
};

export const createNodeSource = (rootDir: string): ConversionSource => ({
  listFiles: () => walkGameFiles(rootDir),
  readFile: (relativePath) => readFile(join(rootDir, relativePath)),
  async fileExists(relativePath) {
    try {
      return (await stat(join(rootDir, relativePath))).isFile();
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') return false;
      throw error;
    }
  },
});

export const createNodeOutput = (rootDir: string): ConversionOutput => ({
  async writeFile(relativePath, content) {
    const target = join(rootDir, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  },
  async removeDirectory(relativePath) {
    await rm(join(rootDir, relativePath), { recursive: true, force: true });
  },
});

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => {
  return error instanceof Error && 'code' in error;
};
