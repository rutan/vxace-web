export const appErrorCodes = {
  draftSrcDirRequired: 'draft.srcDir.required',
  draftOutDirRequired: 'draft.outDir.required',
  draftTitleRequired: 'draft.title.required',
  draftGameIdInvalid: 'draft.gameId.invalid',
  draftScreenInvalid: 'draft.screen.invalid',
  draftVirtualGamepadInvalid: 'draft.virtualGamepad.invalid',
  draftPackAssetsInvalid: 'draft.packAssets.invalid',
  draftUseExcludeSourceFilesInvalid: 'draft.useExcludeSourceFiles.invalid',
  draftExcludeSourceFilePatternsInvalid: 'draft.excludeSourceFilePatterns.invalid',
  draftUseOmitUnusedAssetsInvalid: 'draft.useOmitUnusedAssets.invalid',
  draftKeepUnusedAssetsPatternsInvalid: 'draft.keepUnusedAssetsPatterns.invalid',
  draftUseInjectHtmlInvalid: 'draft.useInjectHtml.invalid',
  draftInjectHtmlFilePathsInvalid: 'draft.injectHtmlFilePaths.invalid',
  draftCleanOutDirInvalid: 'draft.cleanOutDir.invalid',
  gameRootGameIniMissing: 'gameRoot.gameIniMissing',
  outputExistingFiles: 'output.existingFiles',
  outputSameAsSource: 'output.sameAsSource',
  outputInsideSource: 'output.insideSource',
  outputContainsSource: 'output.containsSource',
  previewRootRequired: 'preview.root.required',
  previewStartFailed: 'preview.startFailed',
  previewRootMissing: 'preview.rootMissing',
  previewRootNotDirectory: 'preview.rootNotDirectory',
  previewServerNotRunning: 'preview.serverNotRunning',
  settingsFileInvalid: 'settingsFile.invalid',
  settingsFileReadFailed: 'settingsFile.readFailed',
  settingsFileUnsupportedVersion: 'settingsFile.unsupportedVersion',
  settingsFileWriteFailed: 'settingsFile.writeFailed',
  unknown: 'unknown',
} as const;

export type AppErrorCode = (typeof appErrorCodes)[keyof typeof appErrorCodes];

export type AppErrorValues = Record<string, boolean | number | string | null | undefined>;

export interface AppErrorPayload {
  code: AppErrorCode;
  message?: string;
  values?: AppErrorValues;
}

export class CodedAppError extends Error {
  readonly code: AppErrorCode;
  readonly values?: AppErrorValues;

  constructor(code: AppErrorCode, message?: string, values?: AppErrorValues) {
    super(message ?? code);
    this.name = 'CodedAppError';
    this.code = code;
    this.values = values;
  }

  toPayload(): AppErrorPayload {
    return {
      code: this.code,
      ...(this.message && this.message !== this.code ? { message: this.message } : {}),
      ...(this.values ? { values: this.values } : {}),
    };
  }
}

export const isAppErrorCode = (value: string): value is AppErrorCode => {
  return Object.values(appErrorCodes).includes(value as AppErrorCode);
};

export const toAppErrorPayload = (error: unknown): AppErrorPayload => {
  if (error instanceof CodedAppError) return error.toPayload();

  if (error instanceof Error) {
    return {
      code: isAppErrorCode(error.message) ? error.message : appErrorCodes.unknown,
      ...(isAppErrorCode(error.message) ? {} : { message: error.message }),
    };
  }

  return {
    code: appErrorCodes.unknown,
    message: String(error),
  };
};
