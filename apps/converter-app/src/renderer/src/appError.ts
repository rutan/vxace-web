import { appErrorCodes, type AppErrorCode, type AppErrorPayload } from '../../shared';
import type { TranslationFunctions } from '../../shared/i18n/i18n-types.js';

type ErrorTranslator = (LL: TranslationFunctions, error: AppErrorPayload) => string;

const errorMessage = (error: AppErrorPayload): string => {
  const value = error.values?.['message'] ?? error.message;
  return value === null || value === undefined ? '' : String(value);
};

const errorTranslators: Record<AppErrorCode, ErrorTranslator> = {
  [appErrorCodes.draftCleanOutDirInvalid]: (LL) => LL.errors.draft.cleanOutDir.invalid(),
  [appErrorCodes.draftExcludeSourceFilePatternsInvalid]: (LL) => LL.errors.draft.excludeSourceFilePatterns.invalid(),
  [appErrorCodes.draftGameIdInvalid]: (LL) => LL.errors.draft.gameId.invalid(),
  [appErrorCodes.draftKeepUnusedAssetsPatternsInvalid]: (LL) => LL.errors.draft.keepUnusedAssetsPatterns.invalid(),
  [appErrorCodes.draftInjectHtmlFilePathsInvalid]: (LL) => LL.errors.draft.injectHtmlFilePaths.invalid(),
  [appErrorCodes.draftOutDirRequired]: (LL) => LL.errors.draft.outDir.required(),
  [appErrorCodes.draftOutputSubdirectoryNameInvalid]: (LL) => LL.errors.draft.outputSubdirectoryName.invalid(),
  [appErrorCodes.draftOutputSubdirectoryNameRequired]: (LL) => LL.errors.draft.outputSubdirectoryName.required(),
  [appErrorCodes.draftPackAssetsInvalid]: (LL) => LL.errors.draft.packAssets.invalid(),
  [appErrorCodes.draftScreenInvalid]: (LL) => LL.errors.draft.screen.invalid(),
  [appErrorCodes.draftSrcDirRequired]: (LL) => LL.errors.draft.srcDir.required(),
  [appErrorCodes.draftTitleRequired]: (LL) => LL.errors.draft.title.required(),
  [appErrorCodes.draftUseExcludeSourceFilesInvalid]: (LL) => LL.errors.draft.useExcludeSourceFiles.invalid(),
  [appErrorCodes.draftUseInjectHtmlInvalid]: (LL) => LL.errors.draft.useInjectHtml.invalid(),
  [appErrorCodes.draftUseOmitUnusedAssetsInvalid]: (LL) => LL.errors.draft.useOmitUnusedAssets.invalid(),
  [appErrorCodes.draftVirtualGamepadInvalid]: (LL) => LL.errors.draft.virtualGamepad.invalid(),
  [appErrorCodes.gameRootGameIniMissing]: (LL) => LL.errors.gameRoot.gameIniMissing(),
  [appErrorCodes.outputContainsSource]: (LL) => LL.errors.output.containsSource(),
  [appErrorCodes.outputExistingFiles]: (LL) => LL.errors.output.existingFiles(),
  [appErrorCodes.outputInsideSource]: (LL) => LL.errors.output.insideSource(),
  [appErrorCodes.outputSameAsSource]: (LL) => LL.errors.output.sameAsSource(),
  [appErrorCodes.previewRootMissing]: (LL) => LL.errors.preview.rootMissing(),
  [appErrorCodes.previewRootNotDirectory]: (LL) => LL.errors.preview.rootNotDirectory(),
  [appErrorCodes.previewRootRequired]: (LL) => LL.errors.preview.root.required(),
  [appErrorCodes.previewServerNotRunning]: (LL) => LL.errors.preview.serverNotRunning(),
  [appErrorCodes.previewStartFailed]: (LL) => LL.errors.preview.startFailed(),
  [appErrorCodes.settingsFileInvalid]: (LL) => LL.errors.settingsFile.invalid(),
  [appErrorCodes.settingsFileReadFailed]: (LL, error) =>
    LL.errors.settingsFile.readFailed({ message: errorMessage(error) }),
  [appErrorCodes.settingsFileUnsupportedVersion]: (LL) => LL.errors.settingsFile.unsupportedVersion(),
  [appErrorCodes.settingsFileWriteFailed]: (LL, error) =>
    LL.errors.settingsFile.writeFailed({ message: errorMessage(error) }),
  [appErrorCodes.unknown]: (LL, error) => error.message || LL.errors.unknown(),
};

export const translateAppError = (LL: TranslationFunctions, error: AppErrorPayload): string => {
  return errorTranslators[error.code](LL, error);
};
