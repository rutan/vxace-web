import type { GameManifestJson } from '@rutan/rpgmaker-vxace-web-game-manifest';
import type {
  ConversionReport,
  ConversionStats,
  ConverterWarning,
  FileConversionRecord,
  GameSummary,
  OutputSummary,
  PackEntrySummary,
  PackSummary,
} from '../types';

export interface ConversionReportContext {
  dryRun: boolean;
  files: FileConversionRecord[];
  warnings: ConverterWarning[];
  packFiles: ReportPackFile[];
  inputFileCount: number;
}

export interface ReportPackFile {
  id: string;
  path: string;
  byteLength: number;
  entries: PackEntrySummary[];
}

export const buildConversionReport = (
  context: ConversionReportContext,
  manifest: GameManifestJson,
  output: OutputSummary,
): ConversionReport => {
  const packs = context.packFiles.map(
    (packFile): PackSummary => ({
      id: packFile.id,
      path: packFile.path,
      byteLength: packFile.byteLength,
      entries: packFile.entries,
    }),
  );

  return {
    status: 'success',
    dryRun: context.dryRun,
    game: buildGameSummary(manifest),
    output,
    files: context.files,
    packs,
    warnings: context.warnings,
    stats: buildConversionStats(
      context.files,
      packs,
      context.warnings,
      context.inputFileCount,
      output.rootDir,
      context.dryRun,
    ),
  };
};

export const buildConversionStats = (
  files: FileConversionRecord[],
  packs: PackSummary[],
  warnings: ConverterWarning[],
  inputFiles: number,
  _rootDir: string,
  _dryRun: boolean,
): ConversionStats => {
  return {
    inputFiles,
    outputFiles: files.filter((file) => file.outputPath !== null).length,
    generatedFiles: files.filter((file) => file.action === 'generated').length,
    copiedFiles: files.filter((file) => file.action === 'copied').length,
    renamedFiles: files.filter((file) => file.action === 'renamed').length,
    packedFiles: files.filter((file) => file.action === 'packed').length,
    omittedFiles: files.filter((file) => file.action === 'omitted').length,
    ignoredFiles: files.filter((file) => file.action === 'ignored').length,
    packs: packs.length,
    warnings: warnings.length,
  };
};

const buildGameSummary = (manifest: GameManifestJson): GameSummary => {
  return {
    gameId: manifest.id,
    title: manifest.metadata.title,
    screen: {
      width: manifest.metadata.screen.width,
      height: manifest.metadata.screen.height,
    },
    input: {
      virtualGamepad: manifest.metadata.input.virtualGamepad,
    },
  };
};
