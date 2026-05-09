import type { ConvertToDistributionResult, FileConversionType } from '@rutan/rpgmaker-vxace-web-converter-core';

export interface ConvertedFileSummary {
  sourcePath: string | null;
  outputPath: string;
  type: FileConversionType;
  action: string;
}

export interface OmittedFileSummary {
  sourcePath: string;
  reason: 'source-file' | 'unused-asset';
}

export interface ConversionSummary {
  source: string;
  output: string;
  gameId: string;
  title: string;
  dryRun: boolean;
  convertedFiles: ConvertedFileSummary[];
  omittedFiles: OmittedFileSummary[];
  warnings: {
    code: string;
    message: string;
  }[];
  metadataWarnings: string[];
}

export const buildSummary = (
  result: ConvertToDistributionResult,
  context: {
    source: string;
    output: string;
    dryRun: boolean;
    metadataWarnings: string[];
  },
): ConversionSummary => {
  return {
    source: context.source,
    output: context.output,
    gameId: result.game.gameId,
    title: result.game.title,
    dryRun: context.dryRun,
    convertedFiles: result.files
      .filter((file): file is typeof file & { outputPath: string } => file.outputPath !== null)
      .map((file) => ({
        sourcePath: file.sourcePath,
        outputPath: file.outputPath,
        type: file.type,
        action: file.action,
      })),
    omittedFiles: result.files
      .filter(
        (file): file is typeof file & { sourcePath: string } => file.action === 'omitted' && file.sourcePath !== null,
      )
      .map((file) => ({
        sourcePath: file.sourcePath,
        reason: file.reason === 'source-exclude-pattern' ? ('source-file' as const) : ('unused-asset' as const),
      })),
    warnings: result.warnings,
    metadataWarnings: context.metadataWarnings,
  };
};

export const formatHumanSummary = (summary: ConversionSummary) => {
  const lines = [
    `${summary.dryRun ? 'Dry run' : 'Converted'}: ${summary.source} -> ${summary.output}`,
    `Game ID: ${summary.gameId}`,
    `Title: ${summary.title}`,
    'Output files:',
  ];

  if (summary.convertedFiles.length === 0) {
    lines.push('  none');
  } else {
    for (const file of summary.convertedFiles) {
      lines.push(`  ${file.sourcePath ?? '(generated)'} -> ${file.outputPath}`);
    }
  }

  lines.push('Omitted files:');
  if (summary.omittedFiles.length === 0) {
    lines.push('  none');
  } else {
    for (const file of summary.omittedFiles) {
      lines.push(`  ${file.sourcePath} (${formatOmittedReason(file.reason)})`);
    }
  }

  for (const warning of summary.metadataWarnings) {
    lines.push(`warning metadata: ${warning}`);
  }
  for (const warning of summary.warnings) {
    lines.push(`warning ${warning.code}: ${warning.message}`);
  }

  return `${lines.join('\n')}\n`;
};

const formatOmittedReason = (reason: OmittedFileSummary['reason']) => {
  switch (reason) {
    case 'source-file':
      return 'excluded source file';
    case 'unused-asset':
      return 'unused asset';
  }
};
