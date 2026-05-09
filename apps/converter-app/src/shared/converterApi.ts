import type { AppErrorPayload } from './appError';
import { Draft } from './draft';

export const converterChannels = {
  selectGameDirectory: 'converter:select-game-directory',
  selectOutputDirectory: 'converter:select-output-directory',
  selectHtmlInjectionFiles: 'converter:select-html-injection-files',
  analyzeGameDirectory: 'converter:analyze-game-directory',
  convertGame: 'converter:convert-game',
  openPath: 'converter:open-path',
  startPreviewServer: 'converter:start-preview-server',
  stopPreviewServer: 'converter:stop-preview-server',
  openPreviewUrl: 'converter:open-preview-url',
  setLanguage: 'converter:set-language',
  languageChanged: 'converter:language-changed',
  newDraftRequested: 'converter:new-draft-requested',
  openSettingsFile: 'converter:open-settings-file',
  openSettingsFileRequested: 'converter:open-settings-file-requested',
  saveLastDraft: 'converter:save-last-draft',
  saveSettingsFile: 'converter:save-settings-file',
  saveSettingsFileRequested: 'converter:save-settings-file-requested',
  loadLastDraft: 'converter:load-last-draft',
} as const;

export type AppLanguage = 'en' | 'ja';

export type AppResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: AppErrorPayload;
    };

export interface DirectorySelection {
  canceled: boolean;
  path?: string;
}

export interface FileSelection {
  canceled: boolean;
  paths?: string[];
}

export interface AnalyzeGameDirectoryRequest {
  srcDir: string;
}

export interface GameAnalysis {
  srcDir: string;
  title: string;
}

export interface GameScreen {
  width: number;
  height: number;
}

export interface ConvertedFileSummary {
  sourcePath: string | null;
  outputPath: string;
  kind: 'game' | 'template';
}

export interface OmittedFileSummary {
  sourcePath: string;
  reason: 'source-file' | 'unused-asset';
}

export interface ConversionSummary {
  source: string;
  output: string;
  title: string;
  gameId: string;
  convertedFiles: ConvertedFileSummary[];
  omittedFiles: OmittedFileSummary[];
  warnings: {
    code: string;
    message: string;
  }[];
}

export interface StartPreviewServerRequest {
  rootDir: string;
}

export interface PreviewServerInfo {
  url: string;
}

export interface ConverterApi {
  selectGameDirectory: () => Promise<DirectorySelection>;
  selectOutputDirectory: () => Promise<DirectorySelection>;
  selectHtmlInjectionFiles: () => Promise<FileSelection>;
  analyzeGameDirectory: (request: AnalyzeGameDirectoryRequest) => Promise<AppResult<GameAnalysis>>;
  convertGame: (draft: Draft) => Promise<AppResult<ConversionSummary>>;
  openPath: (path: string) => Promise<AppResult<void>>;
  startPreviewServer: (request: StartPreviewServerRequest) => Promise<AppResult<PreviewServerInfo>>;
  stopPreviewServer: () => Promise<AppResult<void>>;
  openPreviewUrl: (url: string) => Promise<AppResult<void>>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  loadLastDraft: () => Promise<AppResult<Draft | null>>;
  saveLastDraft: (draft: Draft) => Promise<AppResult<void>>;
  openSettingsFile: () => Promise<AppResult<Draft | null>>;
  saveSettingsFile: (draft: Draft) => Promise<AppResult<void>>;
  onLanguageChanged: (callback: (language: AppLanguage) => void) => () => void;
  onNewDraftRequested: (callback: () => void) => () => void;
  onOpenSettingsFileRequested: (callback: () => void) => () => void;
  onSaveSettingsFileRequested: (callback: () => void) => () => void;
}
