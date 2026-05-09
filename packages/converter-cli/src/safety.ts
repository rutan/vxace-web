import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export const prepareOutputDirectory = async (
  srcDir: string,
  outDir: string,
  options: { clean: boolean; dryRun: boolean },
) => {
  const resolvedSrcDir = path.resolve(srcDir);
  const resolvedOutDir = path.resolve(outDir);
  validateSeparateDirectories(resolvedSrcDir, resolvedOutDir);

  if (options.dryRun) return;

  const entries = await readDirectoryEntries(resolvedOutDir);
  if (entries.length === 0) return;

  if (!options.clean) {
    throw new Error(`Output directory is not empty: ${resolvedOutDir}. Use --clean to replace it.`);
  }

  await fs.rm(resolvedOutDir, { recursive: true, force: true });
};

const validateSeparateDirectories = (srcDir: string, outDir: string) => {
  if (srcDir === outDir) {
    throw new Error('Output directory must be separate from the source directory');
  }
  if (isInside(srcDir, outDir)) {
    throw new Error('Output directory must not be inside the source directory');
  }
  if (isInside(outDir, srcDir)) {
    throw new Error('Output directory must not contain the source directory');
  }
};

const isInside = (parent: string, child: string) => {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const readDirectoryEntries = async (directory: string) => {
  try {
    return await fs.readdir(directory);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
};

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => {
  return error instanceof Error && 'code' in error;
};
