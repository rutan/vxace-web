import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { basename as posixBasename, extname as posixExtname } from 'node:path/posix';
import { MANIFEST_FILENAME, PACK_ASSET_DIRNAME, SAFE_ASSET_DIRNAME } from './constants';
import { toPosix } from './utils';

const EXCLUDED_SOURCE_FILENAMES = new Set(['.ds_store', 'desktop.ini', 'thumbs.db']);
const EXCLUDED_SOURCE_DIRNAMES = new Set(['.git', '.hg', '.svn']);

export interface WalkGameFilesResult {
  files: string[];
  ignoredFiles: string[];
}

export const walkGameFiles = async (directory: string, root = directory): Promise<WalkGameFilesResult> => {
  const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const files: string[] = [];
  const ignoredFiles: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const relativePath = toPosix(relative(root, absolutePath));

    if (entry.isDirectory()) {
      if (
        entry.name === SAFE_ASSET_DIRNAME ||
        entry.name === PACK_ASSET_DIRNAME ||
        isExcludedSourceDirectory(entry.name)
      ) {
        ignoredFiles.push(`${relativePath}/`);
        continue;
      }

      const child = await walkGameFiles(absolutePath, root);
      files.push(...child.files);
      ignoredFiles.push(...child.ignoredFiles);
      continue;
    }

    if (!entry.isFile()) continue;

    if (
      relativePath === MANIFEST_FILENAME ||
      isExcludedSourceFilename(posixBasename(relativePath)) ||
      isExcludedSourceExtension(posixExtname(relativePath))
    ) {
      ignoredFiles.push(relativePath);
      continue;
    }

    files.push(relativePath);
  }

  return { files, ignoredFiles };
};

export const walkTemplateFiles = async (
  directory: string,
  gameDirName: string,
  root = directory,
): Promise<string[]> => {
  const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const files: string[] = [];

  for (const entry of entries) {
    if (directory === root && entry.name === gameDirName) continue;

    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkTemplateFiles(absolutePath, gameDirName, root)));
      continue;
    }

    if (!entry.isFile()) continue;

    files.push(toPosix(relative(root, absolutePath)));
  }

  return files;
};

const isExcludedSourceExtension = (extension: string) => {
  const normalized = extension.toLowerCase();
  return normalized === '.dll' || normalized === '.exe' || normalized === '.rgss3a' || normalized === '.rvproj2';
};

const isExcludedSourceFilename = (filename: string) => {
  return EXCLUDED_SOURCE_FILENAMES.has(filename.toLowerCase());
};

const isExcludedSourceDirectory = (dirname: string) => {
  return EXCLUDED_SOURCE_DIRNAMES.has(dirname.toLowerCase());
};
