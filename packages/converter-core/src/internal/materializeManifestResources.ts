import { ManifestResourceData, ResourceType } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { ConverterWarning } from '../types';
import { SAFE_ASSET_DIRNAME, SAFE_ASSET_HASH_PREFIX_LENGTH } from './constants';
import { ConversionContext } from './context';
import { materializePackedResourceData, shouldPackResource } from './packBuilder';
import { posixExtname, posixParse } from './pathUtils';
import { detectResourceType, FONT_EXTENSIONS } from './resourceType';
import { stripExtension, toPosix } from './utils';

export type MaterializedResource = {
  sourcePath: string;
  logicalPath: string;
  resourceType: ResourceType;
  extension: string;
  data: ManifestResourceData;
};

export const materializeManifestResources = async (
  sourceFiles: string[],
  context: ConversionContext,
): Promise<MaterializedResource[]> => {
  const resources: MaterializedResource[] = [];
  const normalizedSourcePaths = new Map<string, string>();

  for (const relativePath of sourceFiles) {
    if (!isManifestResourcePath(relativePath)) continue;

    warnOnNormalizedSourcePathCollision(context.warnings, normalizedSourcePaths, relativePath);
    resources.push(await materializeManifestResource(relativePath, context));
  }

  return resources;
};

const materializeManifestResource = async (
  relativePath: string,
  context: ConversionContext,
): Promise<MaterializedResource> => {
  const resourceType = detectResourceType(relativePath);
  const parsed = posixParse(relativePath);
  const extension = parsed.ext.slice(1).toLowerCase();
  const logicalPath = `${parsed.dir ? `${parsed.dir}/` : ''}${parsed.name}`;
  let data: ManifestResourceData;

  if (shouldPackResource(context.packAssets, resourceType)) {
    const packed = await materializePackedResourceData(context.packBuilder, {
      source: context.source,
      runtime: context.runtime,
      relativePath,
      resourceType,
      extension,
    });
    context.files.push(packed.fileRecord);
    data = packed.data;
  } else {
    data = {
      kind: 'file',
      path: await materializeResourcePath(context, relativePath, resourceType, extension),
    };
  }

  return {
    sourcePath: relativePath,
    logicalPath,
    resourceType,
    extension,
    data,
  };
};

const isManifestResourcePath = (relativePath: string) => {
  return !isFontsSidecarPath(relativePath);
};

const isFontsSidecarPath = (relativePath: string) => {
  const normalized = toPosix(relativePath);
  if (!normalized.startsWith('Fonts/')) return false;

  return !FONT_EXTENSIONS.has(posixExtname(normalized).toLowerCase());
};

const warnOnNormalizedSourcePathCollision = (
  warnings: ConverterWarning[],
  seen: Map<string, string>,
  relativePath: string,
) => {
  const normalizedPath = relativePath.normalize('NFC').toLowerCase();
  const existingPath = seen.get(normalizedPath);
  if (existingPath && existingPath !== relativePath) {
    warnings.push({
      code: 'normalized-source-path-collision',
      severity: 'warning',
      message: `normalized source path collision: ${existingPath} and ${relativePath}`,
      paths: [existingPath, relativePath],
      suggestion: 'Rename one of these files so their paths are distinct after case and Unicode normalization.',
    });
    return;
  }

  seen.set(normalizedPath, relativePath);
};

const materializeResourcePath = async (
  context: ConversionContext,
  relativePath: string,
  resourceType: ResourceType,
  extension: string,
) => {
  if (relativePath === 'Game.ini') return relativePath;

  const content = await context.source.readFile(relativePath);
  const digest = await context.runtime.sha256Hex([relativePath.normalize('NFC'), '\0', content]);
  const suffix = extension ? `.${extension}` : '';

  for (let length = SAFE_ASSET_HASH_PREFIX_LENGTH; length <= digest.length; length += 4) {
    const safePath = `${SAFE_ASSET_DIRNAME}/${resourceType}/${digest.slice(0, length)}${suffix}`;
    const existingSource = context.safeAssetPaths.get(safePath);
    if (existingSource && existingSource !== relativePath) {
      context.warnings.push({
        code: 'safe-asset-hash-prefix-collision',
        severity: 'warning',
        message: `safe asset hash prefix collision: ${existingSource} and ${relativePath} -> ${safePath}`,
        paths: [existingSource, relativePath],
      });
      continue;
    }

    context.safeAssetPaths.set(safePath, relativePath);
    copySafeAsset(context, safePath, relativePath);
    return safePath;
  }

  for (let index = 1; ; index += 1) {
    const safePath = `${SAFE_ASSET_DIRNAME}/${resourceType}/${digest}-${index}${suffix}`;
    if (context.safeAssetPaths.has(safePath)) continue;

    context.safeAssetPaths.set(safePath, relativePath);
    copySafeAsset(context, safePath, relativePath);
    return safePath;
  }
};

const copySafeAsset = (context: ConversionContext, safePath: string, relativePath: string) => {
  context.files.push({
    sourcePath: relativePath,
    logicalPath: stripExtension(relativePath),
    type: detectResourceType(relativePath),
    action: 'renamed',
    outputPath: safePath,
    reason: 'browser-safe-path',
  });
};
