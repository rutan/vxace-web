import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { nodeRuntime } from './nodeEnvironment';
import { parseRubyMarshal, type RubyMarshalValue } from './rubyMarshal';
import {
  collectVxAceAssetReferencesWithRuntime,
  type VxAceAssetReferenceResult,
  type VxAceAssetReferenceWarning,
} from './vxaceAssetReferences';

const DATABASE_FILENAMES = [
  'System.rvdata2',
  'Actors.rvdata2',
  'Enemies.rvdata2',
  'Tilesets.rvdata2',
  'Animations.rvdata2',
  'CommonEvents.rvdata2',
  'Troops.rvdata2',
] as const;

const SCRIPTS_FILENAME = 'Scripts.rvdata2';
const MAP_FILENAME_PATTERN = /^Map\d{3}\.rvdata2$/;

export const collectVxAceAssetReferencesFromDataDir = async (dataDir: string): Promise<VxAceAssetReferenceResult> => {
  const warnings: VxAceAssetReferenceWarning[] = [];
  const dataFiles = new Map<string, RubyMarshalValue>();

  for (const filename of DATABASE_FILENAMES) {
    const value = await readDataFile(dataDir, filename, warnings);
    if (value !== undefined) dataFiles.set(filename, value);
  }

  for (const filename of await readMapFilenames(dataDir, warnings)) {
    const value = await readDataFile(dataDir, filename, warnings);
    if (value !== undefined) dataFiles.set(filename, value);
  }

  const scripts = await readOptionalScriptsDataFile(dataDir, warnings);
  if (scripts !== undefined) dataFiles.set(SCRIPTS_FILENAME, scripts);

  const result = await collectVxAceAssetReferencesWithRuntime({
    dataFiles,
    runtime: nodeRuntime,
  });
  return {
    references: result.references,
    warnings: [...warnings, ...result.warnings],
  };
};

const readDataFile = async (
  dataDir: string,
  filename: string,
  warnings: VxAceAssetReferenceWarning[],
): Promise<RubyMarshalValue | undefined> => {
  const absolutePath = join(dataDir, filename);

  try {
    return parseRubyMarshal(await readFile(absolutePath));
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      warnings.push({
        code: 'missing-data-file',
        file: filename,
        message: `VX Ace data file was not found: ${filename}`,
      });
      return undefined;
    }

    warnings.push({
      code: 'invalid-rvdata2',
      file: filename,
      message: `failed to read VX Ace data file ${filename}: ${errorMessage(error)}`,
    });
    return undefined;
  }
};

const readOptionalScriptsDataFile = async (
  dataDir: string,
  warnings: VxAceAssetReferenceWarning[],
): Promise<RubyMarshalValue | undefined> => {
  const absolutePath = join(dataDir, SCRIPTS_FILENAME);

  try {
    return parseRubyMarshal(await readFile(absolutePath), { stringMode: 'bytes' });
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return undefined;

    warnings.push({
      code: 'invalid-rvdata2',
      file: SCRIPTS_FILENAME,
      message: `failed to read VX Ace data file ${SCRIPTS_FILENAME}: ${errorMessage(error)}`,
    });
    return undefined;
  }
};

const readMapFilenames = async (dataDir: string, warnings: VxAceAssetReferenceWarning[]): Promise<string[]> => {
  try {
    return (await readdir(dataDir))
      .filter((filename) => MAP_FILENAME_PATTERN.test(filename))
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    warnings.push({
      code: 'invalid-data-directory',
      message: `failed to read VX Ace data directory ${dataDir}: ${errorMessage(error)}`,
    });
    return [];
  }
};

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => {
  return error instanceof Error && 'code' in error;
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};
