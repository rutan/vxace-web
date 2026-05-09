import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { join as posixJoin } from 'node:path/posix';
import { PLAYER_TEMPLATE_DIR } from '@rutan/rpgmaker-vxace-web-player-template';
import { DEFAULT_GAME_DIRNAME, MANIFEST_FILENAME } from './internal/constants';
import { convertGameCore } from './internal/convertGameCore';
import { walkTemplateFiles } from './internal/fileWalker';
import { buildConversionReport } from './internal/report';
import { toPosix } from './internal/utils';
import {
  validateDistributionGameDirName,
  validateGameRoot,
  validateOutputDirectory,
  validatePlayerTemplateRoot,
} from './internal/validate';
import {
  ConvertToDistributionOptions,
  ConvertToDistributionResult,
  FileConversionRecord,
  HtmlInjectionOptions,
  OutputSummary,
} from './types';

const DEFAULT_HTML_INJECTION_MARKER = '<!-- USER-SCRIPT -->';

type NormalizedHtmlInjectionOptions = Required<HtmlInjectionOptions>;

export const convertToDistribution = async (
  options: ConvertToDistributionOptions,
): Promise<ConvertToDistributionResult> => {
  const srcDir = resolve(options.srcDir);
  const outDir = resolve(options.outDir);
  const templateDir = resolve(options.templateDir ?? PLAYER_TEMPLATE_DIR);
  const gameDirName = options.gameDirName ?? DEFAULT_GAME_DIRNAME;
  validateDistributionGameDirName(gameDirName);

  const gameOutDir = join(outDir, gameDirName);
  validateOutputDirectory(srcDir, gameOutDir);
  await validateGameRoot(srcDir);
  await validatePlayerTemplateRoot(templateDir);

  const templateFiles = await walkTemplateFiles(templateDir, gameDirName);
  const htmlInjection = normalizeHtmlInjectionOptions(options.injectHtml);
  const files: FileConversionRecord[] = templateFiles.map((templateFile) => ({
    sourcePath: templateFile,
    logicalPath: null,
    type: 'template',
    action: 'copied',
    outputPath: templateFile,
  }));

  if (options.dryRun !== true) {
    await mkdir(outDir, { recursive: true });
    await copyTemplateFiles(templateDir, outDir, templateFiles, htmlInjection);
  } else if (htmlInjection) {
    await validateTemplateHtmlInjection(templateDir, htmlInjection);
  }

  const game = await convertGameCore({
    ...options,
    srcDir,
    outDir: gameOutDir,
  });

  const prefixedGameFiles = game.report.files.map(
    (file): FileConversionRecord => ({
      ...file,
      outputPath: file.outputPath ? toPosix(posixJoin(gameDirName, file.outputPath)) : null,
      ...(file.pack
        ? {
            pack: {
              ...file.pack,
              path: toPosix(posixJoin(gameDirName, file.pack.path)),
            },
          }
        : {}),
    }),
  );
  const output: OutputSummary = {
    rootDir: outDir,
    gameDir: gameDirName,
    entrypoint: templateFiles.includes('index.html') ? 'index.html' : null,
    manifestPath: toPosix(posixJoin(gameDirName, MANIFEST_FILENAME)),
    assetDir: game.report.output.assetDir ? toPosix(posixJoin(gameDirName, game.report.output.assetDir)) : null,
    packDir: game.report.output.packDir ? toPosix(posixJoin(gameDirName, game.report.output.packDir)) : null,
  };
  const mergedFiles = [...files, ...prefixedGameFiles];

  return buildConversionReport(
    {
      dryRun: options.dryRun === true,
      files: mergedFiles,
      warnings: game.report.warnings,
      packFiles: game.report.packs,
      inputFileCount: game.report.stats.inputFiles + templateFiles.length,
    },
    game.manifest,
    output,
  );
};

const copyTemplateFiles = async (
  templateDir: string,
  outDir: string,
  templateFiles: string[],
  htmlInjection: NormalizedHtmlInjectionOptions | undefined,
) => {
  for (const relativePath of templateFiles) {
    const source = join(templateDir, relativePath);
    const target = join(outDir, relativePath);

    await mkdir(dirname(target), { recursive: true });

    if (relativePath === 'index.html' && htmlInjection) {
      const html = await readFile(source, 'utf8');
      await writeFile(target, injectHtml(html, htmlInjection), 'utf8');
      continue;
    }

    await copyFile(source, target);
  }
};

const validateTemplateHtmlInjection = async (templateDir: string, htmlInjection: NormalizedHtmlInjectionOptions) => {
  const html = await readFile(join(templateDir, 'index.html'), 'utf8');
  injectHtml(html, htmlInjection);
};

const normalizeHtmlInjectionOptions = (
  options: ConvertToDistributionOptions['injectHtml'],
): NormalizedHtmlInjectionOptions | undefined => {
  if (options === undefined) return undefined;
  const normalized =
    typeof options === 'string' || Array.isArray(options)
      ? {
          html: options,
          marker: DEFAULT_HTML_INJECTION_MARKER,
          onMissingMarker: 'error' as const,
        }
      : {
          html: options.html,
          marker: options.marker ?? DEFAULT_HTML_INJECTION_MARKER,
          onMissingMarker: options.onMissingMarker ?? 'error',
        };

  if (normalized.marker.length === 0) {
    throw new Error('injectHtml marker must not be empty');
  }

  return {
    html: normalized.html,
    marker: normalized.marker,
    onMissingMarker: normalized.onMissingMarker,
  };
};

const injectHtml = (html: string, options: NormalizedHtmlInjectionOptions) => {
  if (!html.includes(options.marker)) {
    if (options.onMissingMarker === 'ignore') return html;
    throw new Error(`injectHtml marker was not found in player template index.html: ${options.marker}`);
  }

  const snippets = Array.isArray(options.html) ? options.html : [options.html];
  return html.replace(options.marker, snippets.join('\n'));
};
