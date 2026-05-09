import type { GameId, ManifestMetadata } from '@rutan/rpgmaker-vxace-web-game-manifest';

export interface ConvertGameOptions {
  /**
   * Path to the game directory.
   * This directory must contain Game.ini of RPG Maker VX Ace.
   */
  srcDir: string;

  /**
   * Output directory for the game.
   */
  outDir: string;

  /**
   * The ID of the game to be used in the generated manifest.
   */
  gameId: GameId;

  /**
   * Metadata to be included in the generated manifest.
   */
  metadata: ManifestMetadata;

  /**
   * If true, the converter will perform a dry run without writing any files to the output directory.
   */
  dryRun?: boolean;

  /**
   * If set, unused image, audio, and movie resources are omitted from the output.
   */
  omitUnusedAssets?: OmitUnusedAssetsOptions;

  /**
   * If set, matching source files are excluded before manifest generation,
   * asset packing, copying, and unused asset analysis.
   */
  excludeSourceFiles?: ExcludeSourceFilesOptions;

  /**
   * If true, image, data, and file resources are written into pack files.
   */
  packAssets?: boolean;
}

export interface OmitUnusedAssetsOptions {
  keepPatterns?: string[];
}

export interface ExcludeSourceFilesOptions {
  patterns?: string[];
}

export type FileConversionType = 'template' | 'manifest' | 'image' | 'audio' | 'movie' | 'font' | 'data' | 'file';

export type FileConversionAction = 'copied' | 'renamed' | 'packed' | 'generated' | 'omitted' | 'ignored';

export type FileConversionReason =
  | 'source-exclude-pattern'
  | 'unused-asset'
  | 'built-in-ignore'
  | 'generated'
  | 'browser-safe-path'
  | 'asset-pack';

export interface FileConversionRecord {
  sourcePath: string | null;
  logicalPath: string | null;
  type: FileConversionType;
  action: FileConversionAction;
  outputPath: string | null;
  pack?: {
    id: string;
    path: string;
    offset: number;
    length: number;
  };
  reason?: FileConversionReason;
}

export type ConverterWarningCode =
  | 'asset-reference-collection-warning'
  | 'ambiguous-resource-candidates'
  | 'invalid-source-file-exclude-pattern'
  | 'invalid-unused-asset-keep-pattern'
  | 'normalized-source-path-collision'
  | 'required-source-file-exclude-ignored'
  | 'safe-asset-hash-prefix-collision';

export interface ConverterWarning {
  code: ConverterWarningCode;
  severity: 'warning';
  message: string;
  paths?: string[];
  suggestion?: string;
}

export interface GameSummary {
  gameId: string;
  title: string;
  screen: {
    width: number;
    height: number;
  };
  input: {
    virtualGamepad: ManifestMetadata['input']['virtualGamepad'];
  };
}

export interface OutputSummary {
  rootDir: string;
  gameDir: string | null;
  entrypoint: string | null;
  manifestPath: string;
  assetDir: string | null;
  packDir: string | null;
}

export interface ConvertToDistributionOptions extends Omit<ConvertGameOptions, 'outDir'> {
  /**
   * Output directory for the complete browser-playable distribution.
   */
  outDir: string;

  /**
   * Directory name where converted game files are written.
   *
   * The runtime defaults to loading the game from "game".
   */
  gameDirName?: string;

  /**
   * Optional player template directory. Defaults to the bundled player template package.
   */
  templateDir?: string;

  /**
   * Optional HTML snippet inserted into the player template index.html.
   *
   * By default, snippets replace the bundled template marker:
   * <!-- USER-SCRIPT -->
   */
  injectHtml?: string | string[] | HtmlInjectionOptions;
}

export interface HtmlInjectionOptions {
  /**
   * HTML snippet or snippets to insert into index.html.
   */
  html: string | string[];

  /**
   * Marker text to replace in index.html. Defaults to <!-- USER-SCRIPT -->.
   */
  marker?: string;

  /**
   * Behavior when the marker is not found. Defaults to error.
   */
  onMissingMarker?: 'error' | 'ignore';
}

export interface PackEntrySummary {
  sourcePath: string;
  logicalPath: string;
  type: 'image' | 'audio' | 'data' | 'file';
  offset: number;
  length: number;
}

export interface PackSummary {
  id: string;
  path: string;
  byteLength: number;
  entries: PackEntrySummary[];
}

export interface ConversionStats {
  inputFiles: number;
  outputFiles: number;
  generatedFiles: number;
  copiedFiles: number;
  renamedFiles: number;
  packedFiles: number;
  omittedFiles: number;
  ignoredFiles: number;
  packs: number;
  warnings: number;
}

export interface ConversionReport {
  status: 'success';
  dryRun: boolean;
  game: GameSummary;
  output: OutputSummary;
  files: FileConversionRecord[];
  packs: PackSummary[];
  warnings: ConverterWarning[];
  stats: ConversionStats;
}

export type ConvertGameResult = ConversionReport;

export type ConvertToDistributionResult = ConversionReport;
