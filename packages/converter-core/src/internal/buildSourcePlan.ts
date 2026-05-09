import { join } from 'node:path';
import { ConverterWarning, ExcludeSourceFilesOptions, OmitUnusedAssetsOptions } from '../types';
import { ConversionContext } from './context';
import { detectResourceType } from './resourceType';
import { stripExtension, toPosix } from './utils';
import { collectVxAceAssetReferencesFromDataDir } from './vxaceAssetReferences';

export interface SourceFileOmissionReport {
  omittedFiles: string[];
  omittedByPattern: string[];
  warnings: ConverterWarning[];
}

export interface UnusedAssetReport {
  referencedLogicalPaths: string[];
  referencedAssets: string[];
  unusedAssets: string[];
  keptByPattern: string[];
  missingReferences: string[];
  warnings: ConverterWarning[];
}

export type SourcePlan = {
  outputSourceFiles: string[];
  sourceFileOmissionReport?: SourceFileOmissionReport;
  unusedAssetReport?: UnusedAssetReport;
};

export const buildSourcePlan = async (
  sourceFiles: string[],
  context: ConversionContext,
  options: {
    excludeSourceFiles: ExcludeSourceFilesOptions | undefined;
    omitUnusedAssets: OmitUnusedAssetsOptions | undefined;
  },
): Promise<SourcePlan> => {
  const sourceFileOmissionReport = buildSourceFileOmissionReport(sourceFiles, options.excludeSourceFiles);
  context.warnings.push(...(sourceFileOmissionReport?.warnings ?? []));
  const includedSourceFiles = buildIncludedSourceFiles(sourceFiles, sourceFileOmissionReport);
  const unusedAssetReport = await buildUnusedAssetReport(includedSourceFiles, context, options.omitUnusedAssets);
  const outputSourceFiles = buildOutputSourceFiles(includedSourceFiles, unusedAssetReport);

  return {
    outputSourceFiles,
    ...(sourceFileOmissionReport ? { sourceFileOmissionReport } : {}),
    ...(unusedAssetReport ? { unusedAssetReport } : {}),
  };
};

const buildSourceFileOmissionReport = (
  sourceFiles: string[],
  options: ExcludeSourceFilesOptions | undefined,
): SourceFileOmissionReport | undefined => {
  if (!options) return undefined;

  const warnings: ConverterWarning[] = [];
  const omittedByPattern: string[] = [];
  const omittedFiles = new Set<string>();
  const patternMatchers = buildSourceFilePatternMatchers(options.patterns ?? [], warnings);

  for (const sourceFile of sourceFiles) {
    const normalizedPath = normalizeSourceFileExclusionLookupKey(sourceFile);
    const matchedByPattern = patternMatchers.some((matcher) => matcher.test(normalizedPath));

    if (!matchedByPattern) continue;

    if (isRequiredSourceFile(sourceFile)) {
      warnings.push({
        code: 'required-source-file-exclude-ignored',
        severity: 'warning',
        message: `required source file cannot be excluded: ${sourceFile}`,
        paths: [sourceFile],
        suggestion: 'Remove this path from excludeSourceFiles; required files are always included.',
      });
      continue;
    }

    omittedFiles.add(sourceFile);
    omittedByPattern.push(sourceFile);
  }

  return {
    omittedFiles: [...omittedFiles].sort((left, right) => left.localeCompare(right)),
    omittedByPattern: uniqueSorted(omittedByPattern),
    warnings,
  };
};

const buildIncludedSourceFiles = (sourceFiles: string[], report: SourceFileOmissionReport | undefined) => {
  if (!report) return sourceFiles;

  const omitted = new Set(report.omittedFiles);
  return sourceFiles.filter((sourceFile) => !omitted.has(sourceFile));
};

const buildUnusedAssetReport = async (
  sourceFiles: string[],
  context: ConversionContext,
  options: OmitUnusedAssetsOptions | undefined,
): Promise<UnusedAssetReport | undefined> => {
  if (!options) return undefined;

  const warnings: ConverterWarning[] = [];
  const keepMatchers = buildKeepPatternMatchers(options.keepPatterns ?? [], warnings);
  const targetAssets = sourceFiles.filter(isUnusedAssetCandidatePath);
  const assetsByLogicalKey = new Map<string, string[]>();

  for (const asset of targetAssets) {
    const key = normalizeUnusedAssetLookupKey(stripExtension(asset));
    const bucket = assetsByLogicalKey.get(key) ?? [];
    bucket.push(asset);
    assetsByLogicalKey.set(key, bucket);
  }

  for (const bucket of assetsByLogicalKey.values()) {
    bucket.sort((left, right) => left.localeCompare(right));
  }

  const collected = await collectVxAceAssetReferencesFromDataDir(join(context.srcDir, 'Data'));
  for (const warning of collected.warnings) {
    warnings.push({
      code: 'asset-reference-collection-warning',
      severity: 'warning',
      message: warning.file ? `${warning.file}: ${warning.message}` : warning.message,
      ...(warning.file ? { paths: [warning.file] } : {}),
      suggestion: 'Review unused asset omission settings and keep patterns for script-loaded assets.',
    });
  }

  const referencedLogicalPaths = collected.references;
  const referencedAssetSet = new Set<string>();
  const missingReferences: string[] = [];

  for (const logicalPath of referencedLogicalPaths) {
    const assets = assetsByLogicalKey.get(normalizeUnusedAssetLookupKey(logicalPath));
    if (!assets) {
      if (isUnusedAssetCandidateLogicalPath(logicalPath)) missingReferences.push(logicalPath);
      continue;
    }

    for (const asset of assets) referencedAssetSet.add(asset);
  }

  const keptByPattern = targetAssets.filter((asset) => {
    const normalizedPath = normalizeUnusedAssetLookupKey(asset);
    const normalizedLogicalPath = normalizeUnusedAssetLookupKey(stripExtension(asset));
    return keepMatchers.some((matcher) => matcher.test(normalizedPath) || matcher.test(normalizedLogicalPath));
  });
  const keptByPatternSet = new Set(keptByPattern);
  const unusedAssets = targetAssets.filter((asset) => !referencedAssetSet.has(asset) && !keptByPatternSet.has(asset));

  return {
    referencedLogicalPaths,
    referencedAssets: [...referencedAssetSet].sort((left, right) => left.localeCompare(right)),
    unusedAssets: unusedAssets.sort((left, right) => left.localeCompare(right)),
    keptByPattern: keptByPattern.sort((left, right) => left.localeCompare(right)),
    missingReferences: uniqueSorted(missingReferences),
    warnings,
  };
};

const buildKeepPatternMatchers = (patterns: string[], warnings: ConverterWarning[]) => {
  const matchers: RegExp[] = [];

  for (const pattern of patterns) {
    const normalized = normalizeUnusedAssetPattern(pattern);
    if (!normalized || normalized.includes('\0')) {
      warnings.push({
        code: 'invalid-unused-asset-keep-pattern',
        severity: 'warning',
        message: `invalid unused asset keep pattern: ${pattern}`,
        suggestion: 'Use a non-empty source-relative glob pattern.',
      });
      continue;
    }

    matchers.push(globPatternToRegExp(normalized));
  }

  return matchers;
};

const buildOutputSourceFiles = (sourceFiles: string[], report: UnusedAssetReport | undefined) => {
  if (!report) return sourceFiles;

  const omitted = new Set(report.unusedAssets);
  return sourceFiles.filter((sourceFile) => !omitted.has(sourceFile));
};

const buildSourceFilePatternMatchers = (patterns: string[], warnings: ConverterWarning[]) => {
  const matchers: RegExp[] = [];

  for (const pattern of patterns) {
    const normalized = normalizeSourceFileExclusionPattern(pattern);
    if (!normalized || normalized.includes('\0')) {
      warnings.push({
        code: 'invalid-source-file-exclude-pattern',
        severity: 'warning',
        message: `invalid source file exclude pattern: ${pattern}`,
        suggestion: 'Use a non-empty source-relative glob pattern.',
      });
      continue;
    }

    matchers.push(globPatternToRegExp(normalized));
  }

  return matchers;
};

const isRequiredSourceFile = (relativePath: string) => {
  return normalizeSourceFileExclusionLookupKey(relativePath) === 'game.ini';
};

const isUnusedAssetCandidatePath = (relativePath: string) => {
  const resourceType = detectResourceType(relativePath);
  return resourceType === 'image' || resourceType === 'audio' || resourceType === 'movie';
};

const isUnusedAssetCandidateLogicalPath = (logicalPath: string) => {
  const normalized = toPosix(logicalPath);
  return normalized.startsWith('Graphics/') || normalized.startsWith('Audio/') || normalized.startsWith('Movies/');
};

// utils ---

const uniqueSorted = (values: string[]) => {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
};

const normalizeSourceFileExclusionLookupKey = (value: string) => {
  return toPosix(value.normalize('NFC')).replace(/^\.\//, '').replace(/^\/+/, '').toLowerCase();
};

const normalizeSourceFileExclusionPattern = (pattern: string) => {
  return toPosix(pattern.normalize('NFC')).replace(/^\.\//, '').replace(/^\/+/, '').toLowerCase();
};

const normalizeUnusedAssetPattern = (pattern: string) => {
  return toPosix(pattern.normalize('NFC')).replace(/^\.\//, '').replace(/^\/+/, '').toLowerCase();
};

const normalizeUnusedAssetLookupKey = (value: string) => {
  return toPosix(value.normalize('NFC')).replace(/^\.\//, '').replace(/^\/+/, '').toLowerCase();
};

const globPatternToRegExp = (pattern: string) => {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];

    if (character === '*') {
      if (pattern[index + 1] === '*') {
        source += '.*';
        index += 1;
      } else {
        source += '[^/]*';
      }
      continue;
    }

    if (character === '?') {
      source += '[^/]';
      continue;
    }

    source += escapeRegExp(character);
  }

  return new RegExp(`${source}$`);
};

const escapeRegExp = (value: string) => {
  return value.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
};
