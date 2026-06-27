import { GameManifestJson } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { ConvertGameOptions, ConversionReport } from '../types';
import { buildManifestJson } from './buildManifestJson';
import {
  buildSourcePlan,
  type SourceFileOmissionReport,
  type SourcePlan,
  type UnusedAssetReport,
} from './buildSourcePlan';
import { MANIFEST_FILENAME, PACK_ASSET_DIRNAME, SAFE_ASSET_DIRNAME } from './constants';
import { type ConversionContext } from './context';
import { ConversionOutput, ConversionRuntime, ConversionSource } from './environment';
import { materializeManifestResources } from './materializeManifestResources';
import { buildGeneratedPackFileRecords, createPackBuilder, writePackFiles } from './packBuilder';
import { buildConversionReport } from './report';
import { detectResourceType } from './resourceType';
import { clone, stripExtension } from './utils';

export type ConvertGameEngineOptions = Omit<ConvertGameOptions, 'srcDir' | 'outDir'> & {
  source: ConversionSource;
  output?: ConversionOutput;
  outputRoot?: string;
  runtime: ConversionRuntime;
};

export type ConvertGameCoreResult = {
  report: ConversionReport;
  manifest: GameManifestJson;
  sourceFileOmissionReport?: SourceFileOmissionReport;
  unusedAssetReport?: UnusedAssetReport;
};

export const convertGameEngine = async (options: ConvertGameEngineOptions): Promise<ConvertGameCoreResult> => {
  const dryRun = options.dryRun === true;
  const walkedSourceFiles = await options.source.listFiles();
  const context: ConversionContext = {
    source: options.source,
    output: options.output,
    runtime: options.runtime,
    outputRoot: options.outputRoot ?? '',
    dryRun,
    files: [],
    warnings: [],
    safeAssetPaths: new Map(),
    packBuilder: createPackBuilder(),
    packAssets: options.packAssets === true,
    inputFileCount: walkedSourceFiles.files.length,
  };

  if (!(await options.source.fileExists('Game.ini'))) {
    throw new Error('Game.ini was not found');
  }

  recordIgnoredFiles(context, walkedSourceFiles.ignoredFiles);
  const sourcePlan = await buildSourcePlan(walkedSourceFiles.files, context, {
    excludeSourceFiles: options.excludeSourceFiles,
    omitUnusedAssets: options.omitUnusedAssets,
  });

  const materializedResources = await materializeManifestResources(sourcePlan.outputSourceFiles, context);
  const manifest = await buildManifestJson(materializedResources, {
    gameId: options.gameId,
    metadata: clone(options.metadata),
    warnings: context.warnings,
    packBuilder: context.packBuilder,
    runtime: context.runtime,
  });

  const copySourceFilePaths = buildCopySourceFiles(sourcePlan.outputSourceFiles, context);
  recordCopiedFiles(context, copySourceFilePaths);
  recordOmittedFiles(context, sourcePlan);
  recordGeneratedFiles(context);

  if (!dryRun) {
    if (!context.output) throw new Error('output is required when dryRun is false');
    await writeGameOutput(context, copySourceFilePaths, manifest);
  }

  const reports = {
    ...(sourcePlan.sourceFileOmissionReport ? { sourceFileOmissionReport: sourcePlan.sourceFileOmissionReport } : {}),
    ...(sourcePlan.unusedAssetReport ? { unusedAssetReport: sourcePlan.unusedAssetReport } : {}),
  };

  return {
    report: buildConversionReport(
      {
        dryRun: context.dryRun,
        files: context.files,
        warnings: context.warnings,
        packFiles: context.packBuilder.packFiles,
        inputFileCount: context.inputFileCount,
      },
      manifest,
      {
        rootDir: context.outputRoot,
        gameDir: null,
        entrypoint: null,
        manifestPath: MANIFEST_FILENAME,
        assetDir: context.files.some((file) => file.outputPath?.startsWith(`${SAFE_ASSET_DIRNAME}/`))
          ? SAFE_ASSET_DIRNAME
          : null,
        packDir: context.packBuilder.packFiles.length > 0 ? PACK_ASSET_DIRNAME : null,
      },
    ),
    manifest,
    ...reports,
  };
};

const recordIgnoredFiles = (context: ConversionContext, ignoredFiles: string[]) => {
  for (const ignoredFile of ignoredFiles) {
    context.files.push({
      sourcePath: ignoredFile,
      logicalPath: null,
      type: 'file',
      action: 'ignored',
      outputPath: null,
      reason: 'built-in-ignore',
    });
  }
};

const buildCopySourceFiles = (sourceFiles: string[], context: ConversionContext) => {
  const safeAssetSourceFiles = new Set(context.safeAssetPaths.values());
  return sourceFiles.filter(
    (sourceFile) => !safeAssetSourceFiles.has(sourceFile) && !context.packBuilder.packedSourcePaths.has(sourceFile),
  );
};

const recordCopiedFiles = (context: ConversionContext, sourceFiles: string[]) => {
  for (const sourceFile of sourceFiles) {
    context.files.push({
      sourcePath: sourceFile,
      logicalPath: stripExtension(sourceFile),
      type: detectResourceType(sourceFile),
      action: 'copied',
      outputPath: sourceFile,
    });
  }
};

const recordOmittedFiles = (context: ConversionContext, plan: SourcePlan) => {
  if (plan.unusedAssetReport) {
    for (const sourceFile of plan.unusedAssetReport.unusedAssets) {
      context.files.push({
        sourcePath: sourceFile,
        logicalPath: stripExtension(sourceFile),
        type: detectResourceType(sourceFile),
        action: 'omitted',
        outputPath: null,
        reason: 'unused-asset',
      });
    }
  }

  if (plan.sourceFileOmissionReport) {
    for (const sourceFile of plan.sourceFileOmissionReport.omittedFiles) {
      context.files.push({
        sourcePath: sourceFile,
        logicalPath: stripExtension(sourceFile),
        type: detectResourceType(sourceFile),
        action: 'omitted',
        outputPath: null,
        reason: 'source-exclude-pattern',
      });
    }
  }
};

const recordGeneratedFiles = (context: ConversionContext) => {
  context.files.push({
    sourcePath: null,
    logicalPath: null,
    type: 'manifest',
    action: 'generated',
    outputPath: MANIFEST_FILENAME,
    reason: 'generated',
  });
  context.files.push(...buildGeneratedPackFileRecords(context.packBuilder));
};

const writeGameOutput = async (
  context: ConversionContext,
  copySourceFilePaths: string[],
  manifest: GameManifestJson,
) => {
  if (!context.output) throw new Error('output is required');
  await context.output.removeDirectory(SAFE_ASSET_DIRNAME);
  await context.output.removeDirectory(PACK_ASSET_DIRNAME);
  await copySourceFiles(context, copySourceFilePaths);
  await copySafeAssetFiles(context);
  await writePackFiles({
    builder: context.packBuilder,
    output: context.output,
    runtime: context.runtime,
  });
  await context.output.writeFile(MANIFEST_FILENAME, `${JSON.stringify(manifest, null, 2)}\n`);
};

const copySourceFiles = async (context: ConversionContext, sourceFiles: string[]) => {
  if (!context.output) throw new Error('output is required');
  for (const relativePath of sourceFiles) {
    await context.output.writeFile(relativePath, await context.source.readFile(relativePath));
  }
};

const copySafeAssetFiles = async (context: ConversionContext) => {
  if (!context.output) throw new Error('output is required');
  for (const convertedFile of context.files) {
    if (
      convertedFile.action !== 'renamed' ||
      convertedFile.reason !== 'browser-safe-path' ||
      convertedFile.sourcePath === null ||
      convertedFile.outputPath === null
    ) {
      continue;
    }

    await context.output.writeFile(convertedFile.outputPath, await context.source.readFile(convertedFile.sourcePath));
  }
};
