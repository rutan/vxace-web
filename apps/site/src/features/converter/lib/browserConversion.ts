import { convertGameInBrowser, type BrowserInputFile } from '@rutan/rpgmaker-vxace-web-converter-core/browser';
import type { ConverterCopy } from '$i18n';
import type { ConversionSummary, Draft } from '../model/converter';
import { formatBytes, formatVirtualGamepad, sanitizeFilename, splitLines } from './conversion';
import type { ProjectFileEntry } from './projectFiles';
import { loadTemplateFiles } from './template';
import { createZip, type ZipFileEntry } from './zip';

export interface BrowserConversionResult {
  archive: { blob: Blob; filename: string };
  distributionFiles: ZipFileEntry[];
  summary: ConversionSummary;
}

export const convertProjectToZip = async ({
  copy,
  draft,
  files,
  projectName,
}: {
  copy: ConverterCopy;
  draft: Draft;
  files: ProjectFileEntry[];
  projectName?: string;
}): Promise<BrowserConversionResult> => {
  const title = draft.title.trim();
  const gameId = draft.gameId.trim();
  const result = await convertGameInBrowser({
    files: files as BrowserInputFile[],
    gameId,
    metadata: {
      title,
      screen: {
        width: draft.screenWidth,
        height: draft.screenHeight,
      },
      input: {
        virtualGamepad: draft.virtualGamepad,
      },
    },
    packAssets: draft.packAssets,
    ...(draft.excludeSourceFiles
      ? {
          excludeSourceFiles: {
            patterns: splitLines(draft.excludeSourcePatterns),
          },
        }
      : {}),
    ...(draft.omitUnusedAssets
      ? {
          omitUnusedAssets: {
            keepPatterns: splitLines(draft.keepUnusedAssetsPatterns),
          },
        }
      : {}),
  });
  const templateFiles = await loadTemplateFiles(draft.useHtmlInjection ? { injectHtml: draft.htmlInjection } : {});
  const distributionFiles = [
    ...templateFiles,
    ...result.outputFiles.map((file) => ({
      path: `game/${file.path}`,
      content: file.content,
    })),
  ];
  const zipBlob = createZip(distributionFiles);
  const zipFilename = `${sanitizeFilename(title || projectName || 'vxace-game')}.zip`;

  return {
    archive: { blob: zipBlob, filename: zipFilename },
    distributionFiles,
    summary: {
      convertedFiles: result.files.filter((file) => file.outputPath !== null).length,
      gameId,
      omittedFiles: result.files.filter((file) => file.action === 'omitted').length,
      screenSize: `${draft.screenWidth} x ${draft.screenHeight} px`,
      title,
      virtualGamepad: formatVirtualGamepad(draft.virtualGamepad, copy),
      warnings: result.warnings.map((warning) => warning.message),
      zipFilename,
      zipSize: formatBytes(zipBlob.size),
    },
  };
};
