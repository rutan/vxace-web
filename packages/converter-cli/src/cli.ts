#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { convertGame, convertToDistribution } from '@rutan/rpgmaker-vxace-web-converter-core';
import { CliUsageError, HELP_TEXT, parseArgs } from './args';
import { resolveMetadata } from './metadata';
import { buildSummary, formatHumanSummary } from './output';
import { prepareOutputDirectory } from './safety';

export interface CliIo {
  stdout: Pick<NodeJS.WriteStream, 'write'>;
  stderr: Pick<NodeJS.WriteStream, 'write'>;
}

export const runCli = async (argv: string[], io: CliIo = { stdout: process.stdout, stderr: process.stderr }) => {
  try {
    const parsed = parseArgs(argv);
    if (parsed.kind === 'help') {
      io.stdout.write(HELP_TEXT);
      return 0;
    }

    const { options } = parsed;
    const resolved = await resolveMetadata(options);
    const injectHtml = options.injectHtmlFiles.length > 0 ? await readInjectionHtmlFiles(options.injectHtmlFiles) : [];
    await prepareOutputDirectory(options.srcDir, options.outDir, {
      clean: options.clean,
      dryRun: options.dryRun,
    });

    const result = options.includeTemplate
      ? await convertToDistribution({
          srcDir: options.srcDir,
          outDir: options.outDir,
          gameId: resolved.gameId,
          metadata: resolved.metadata,
          dryRun: options.dryRun,
          packAssets: options.packAssets,
          gameDirName: options.gameDirName,
          ...(options.templateDir ? { templateDir: options.templateDir } : {}),
          ...(injectHtml.length > 0 ? { injectHtml } : {}),
          ...(options.excludeSourceFiles ? { excludeSourceFiles: options.excludeSourceFiles } : {}),
          ...(options.omitUnusedAssets ? { omitUnusedAssets: options.omitUnusedAssets } : {}),
        })
      : await convertGame({
          srcDir: options.srcDir,
          outDir: options.outDir,
          gameId: resolved.gameId,
          metadata: resolved.metadata,
          dryRun: options.dryRun,
          packAssets: options.packAssets,
          ...(options.excludeSourceFiles ? { excludeSourceFiles: options.excludeSourceFiles } : {}),
          ...(options.omitUnusedAssets ? { omitUnusedAssets: options.omitUnusedAssets } : {}),
        });
    const summary = buildSummary(result, {
      source: options.srcDir,
      output: options.outDir,
      dryRun: options.dryRun,
      metadataWarnings: resolved.warnings,
    });
    const report = {
      summary,
      result,
    };

    if (options.json) {
      io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      io.stdout.write(formatHumanSummary(summary));
    }

    return options.failOnWarning && summary.warnings.length + summary.metadataWarnings.length > 0 ? 2 : 0;
  } catch (error) {
    if (error instanceof CliUsageError) {
      io.stderr.write(`Error: ${error.message}\n\n${HELP_TEXT}`);
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`Error: ${message}\n`);
    return 1;
  }
};

const readInjectionHtmlFiles = async (filenames: string[]) => {
  const snippets: string[] = [];
  for (const filename of filenames) {
    snippets.push(await readFile(filename, 'utf8'));
  }
  return snippets;
};
