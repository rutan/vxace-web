import * as v from 'valibot';
import { appErrorCodes } from './appError';

const GAME_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const GAME_DIRECTORY_REQUIRED_MESSAGE = appErrorCodes.draftSrcDirRequired;
const OUTPUT_DIRECTORY_REQUIRED_MESSAGE = appErrorCodes.draftOutDirRequired;
const OUTPUT_SUBDIRECTORY_NAME_MESSAGE = appErrorCodes.draftOutputSubdirectoryNameInvalid;
const TITLE_REQUIRED_MESSAGE = appErrorCodes.draftTitleRequired;
const GAME_ID_MESSAGE = appErrorCodes.draftGameIdInvalid;
const SCREEN_MESSAGE = appErrorCodes.draftScreenInvalid;
const VIRTUAL_GAMEPAD_MESSAGE = appErrorCodes.draftVirtualGamepadInvalid;
const PACK_ASSETS_MESSAGE = appErrorCodes.draftPackAssetsInvalid;
const USE_EXCLUDE_SOURCE_FILES_MESSAGE = appErrorCodes.draftUseExcludeSourceFilesInvalid;
const EXCLUDE_SOURCE_FILE_PATTERNS_MESSAGE = appErrorCodes.draftExcludeSourceFilePatternsInvalid;
const USE_OMIT_UNUSED_ASSETS_MESSAGE = appErrorCodes.draftUseOmitUnusedAssetsInvalid;
const KEEP_UNUSED_ASSETS_PATTERNS_MESSAGE = appErrorCodes.draftKeepUnusedAssetsPatternsInvalid;
const USE_INJECT_HTML_MESSAGE = appErrorCodes.draftUseInjectHtmlInvalid;
const INJECT_HTML_FILE_PATHS_MESSAGE = appErrorCodes.draftInjectHtmlFilePathsInvalid;
const CLEAN_OUT_DIR_MESSAGE = appErrorCodes.draftCleanOutDirInvalid;

const screenDimensionSchema = v.pipe(
  v.number(SCREEN_MESSAGE),
  v.finite(SCREEN_MESSAGE),
  v.integer(SCREEN_MESSAGE),
  v.minValue(1, SCREEN_MESSAGE),
);

const requiredTrimmedStringSchema = (message: string) => v.pipe(v.string(message), v.trim(), v.nonEmpty(message));

export const virtualGamepadModeSchema = v.union([
  v.literal('normal'),
  v.literal('normal-swap'),
  v.literal('simple'),
  v.literal('none'),
]);

export const conversionVirtualGamepadModeSchema = v.union(
  [v.literal('normal'), v.literal('normal-swap'), v.literal('simple'), v.literal('none')],
  VIRTUAL_GAMEPAD_MESSAGE,
);

export const draftSchema = v.object({
  srcDir: v.string(),
  outDir: v.string(),
  outputSubdirectoryName: v.string(OUTPUT_SUBDIRECTORY_NAME_MESSAGE),
  gameId: v.string(),
  title: v.string(),
  screen: v.object({
    width: screenDimensionSchema,
    height: screenDimensionSchema,
  }),
  virtualGamepad: virtualGamepadModeSchema,
  useExcludeSourceFiles: v.boolean(USE_EXCLUDE_SOURCE_FILES_MESSAGE),
  excludeSourceFilePatterns: v.array(
    v.string(EXCLUDE_SOURCE_FILE_PATTERNS_MESSAGE),
    EXCLUDE_SOURCE_FILE_PATTERNS_MESSAGE,
  ),
  useOmitUnusedAssets: v.boolean(USE_OMIT_UNUSED_ASSETS_MESSAGE),
  keepUnusedAssetsPatterns: v.array(v.string(KEEP_UNUSED_ASSETS_PATTERNS_MESSAGE), KEEP_UNUSED_ASSETS_PATTERNS_MESSAGE),
  useInjectHtml: v.boolean(USE_INJECT_HTML_MESSAGE),
  injectHtmlFilePaths: v.array(v.string(INJECT_HTML_FILE_PATHS_MESSAGE), INJECT_HTML_FILE_PATHS_MESSAGE),
  packAssets: v.boolean(PACK_ASSETS_MESSAGE),
  cleanOutDir: v.boolean(CLEAN_OUT_DIR_MESSAGE),
});
export type Draft = v.InferInput<typeof draftSchema>;

export const conversionDraftSchema = v.object({
  srcDir: requiredTrimmedStringSchema(GAME_DIRECTORY_REQUIRED_MESSAGE),
  outDir: requiredTrimmedStringSchema(OUTPUT_DIRECTORY_REQUIRED_MESSAGE),
  outputSubdirectoryName: v.pipe(v.string(OUTPUT_SUBDIRECTORY_NAME_MESSAGE), v.trim()),
  gameId: v.pipe(v.string(GAME_ID_MESSAGE), v.trim(), v.regex(GAME_ID_PATTERN, GAME_ID_MESSAGE)),
  title: requiredTrimmedStringSchema(TITLE_REQUIRED_MESSAGE),
  screen: v.object({
    width: screenDimensionSchema,
    height: screenDimensionSchema,
  }),
  virtualGamepad: conversionVirtualGamepadModeSchema,
  useExcludeSourceFiles: v.boolean(USE_EXCLUDE_SOURCE_FILES_MESSAGE),
  excludeSourceFilePatterns: v.array(
    v.pipe(v.string(EXCLUDE_SOURCE_FILE_PATTERNS_MESSAGE), v.trim()),
    EXCLUDE_SOURCE_FILE_PATTERNS_MESSAGE,
  ),
  useOmitUnusedAssets: v.boolean(USE_OMIT_UNUSED_ASSETS_MESSAGE),
  keepUnusedAssetsPatterns: v.array(
    v.pipe(v.string(KEEP_UNUSED_ASSETS_PATTERNS_MESSAGE), v.trim()),
    KEEP_UNUSED_ASSETS_PATTERNS_MESSAGE,
  ),
  useInjectHtml: v.boolean(USE_INJECT_HTML_MESSAGE),
  injectHtmlFilePaths: v.array(
    v.pipe(v.string(INJECT_HTML_FILE_PATHS_MESSAGE), v.trim()),
    INJECT_HTML_FILE_PATHS_MESSAGE,
  ),
  packAssets: v.boolean(PACK_ASSETS_MESSAGE),
  cleanOutDir: v.boolean(CLEAN_OUT_DIR_MESSAGE),
});
export type ConversionDraft = v.InferOutput<typeof conversionDraftSchema>;

export const createInitialDraft = (): Draft => {
  return {
    srcDir: '',
    outDir: '',
    outputSubdirectoryName: '',
    title: '',
    gameId: '',
    screen: {
      width: 544,
      height: 416,
    },
    virtualGamepad: 'normal',
    useExcludeSourceFiles: false,
    excludeSourceFilePatterns: ['Save*.rvdata2'],
    useOmitUnusedAssets: false,
    keepUnusedAssetsPatterns: [''],
    useInjectHtml: false,
    injectHtmlFilePaths: [],
    packAssets: false,
    cleanOutDir: false,
  };
};

export const createOutputSubdirectoryName = (value: string): string => {
  const normalized = Array.from(value.trim(), (char) => {
    return isReservedOutputNameCharacter(char) ? '-' : char;
  })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();

  if (!normalized || normalized === '.' || normalized === '..') return 'game';

  return normalized.slice(0, 80);
};

const isReservedOutputNameCharacter = (char: string) => {
  return char.charCodeAt(0) <= 31 || '<>:"/\\|?*'.includes(char);
};

export const getDraftOutputDirectory = (draft: Pick<Draft, 'outDir' | 'outputSubdirectoryName'>) => {
  const outDir = draft.outDir.trim();
  if (!outDir) return '';

  const subdirectoryName = draft.outputSubdirectoryName.trim();
  if (!subdirectoryName) return '';

  const separator = outDir.includes('\\') && !outDir.includes('/') ? '\\' : '/';
  return `${outDir.replace(/[\\/]+$/g, '')}${separator}${subdirectoryName.replace(/^[\\/]+/g, '')}`;
};
