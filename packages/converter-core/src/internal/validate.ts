import { access } from 'fs/promises';
import { isAbsolute, join, relative } from 'path';
import { DISTRIBUTION_GAME_DIRNAME_PATTERN } from './constants';

export const validateGameRoot = async (srcDir: string) => {
  if (!(await fileExists(join(srcDir, 'Game.ini')))) {
    throw new Error(`Game.ini was not found in ${srcDir}`);
  }
};

export const validateOutputDirectory = (srcDir: string, outDir: string) => {
  const relativePath = relative(srcDir, outDir);
  if (!relativePath || (!relativePath.startsWith('..') && !isAbsolute(relativePath))) {
    throw new Error('outDir must be outside srcDir');
  }
};

export const validatePlayerTemplateRoot = async (templateDir: string) => {
  if (!(await fileExists(join(templateDir, 'index.html')))) {
    throw new Error(`player template index.html was not found in ${templateDir}`);
  }
};

export const validateDistributionGameDirName = (gameDirName: string) => {
  if (
    !DISTRIBUTION_GAME_DIRNAME_PATTERN.test(gameDirName) ||
    gameDirName === '.' ||
    gameDirName === '..' ||
    gameDirName.includes('/')
  ) {
    throw new Error(`gameDirName must be a safe single directory name: ${gameDirName}`);
  }
};

const fileExists = async (filename: string) => {
  try {
    await access(filename);
    return true;
  } catch {
    return false;
  }
};
