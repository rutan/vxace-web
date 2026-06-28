export const virtualGamepadModes = ['normal', 'normal-swap', 'simple', 'none'] as const;
export type VirtualGamepadMode = (typeof virtualGamepadModes)[number];
export type ConversionState = 'idle' | 'reading' | 'converting' | 'done' | 'error';

export interface Draft {
  excludeSourceFiles: boolean;
  excludeSourcePatterns: string;
  gameId: string;
  htmlInjection: string;
  keepUnusedAssetsPatterns: string;
  omitUnusedAssets: boolean;
  packAssets: boolean;
  screenHeight: number;
  screenWidth: number;
  title: string;
  useHtmlInjection: boolean;
  virtualGamepad: VirtualGamepadMode;
}

export interface ConversionSummary {
  convertedFiles: number;
  gameId: string;
  omittedFiles: number;
  screenSize: string;
  title: string;
  virtualGamepad: string;
  warnings: string[];
  zipFilename: string;
  zipSize: string;
}

export const initialDraft: Draft = {
  excludeSourceFiles: false,
  excludeSourcePatterns: '',
  gameId: '',
  htmlInjection: '',
  keepUnusedAssetsPatterns: '',
  omitUnusedAssets: false,
  packAssets: false,
  screenHeight: 416,
  screenWidth: 544,
  title: '',
  useHtmlInjection: false,
  virtualGamepad: 'normal',
};
