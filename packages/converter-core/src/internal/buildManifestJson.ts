import {
  GameId,
  GameManifestJson,
  ManifestFontRecord,
  ManifestMetadata,
  ManifestResourceCandidate,
  ManifestResourceData,
  parseGameManifestJson,
} from '@rutan/rpgmaker-vxace-web-game-manifest';
import { ConverterWarning } from '../types';
import { ConversionRuntime } from './environment';
import { MaterializedResource } from './materializeManifestResources';
import { buildManifestPacks, PackBuilder } from './packBuilder';
import { posixParse } from './pathUtils';
import { EXTENSION_PRIORITY } from './resourceType';
import { clone, toPosix } from './utils';

type BuildManifestJsonOptions = {
  gameId: GameId;
  metadata: ManifestMetadata;
  warnings: ConverterWarning[];
  packBuilder: PackBuilder;
  runtime: ConversionRuntime;
};

type FontManifestRecordWithSortKey = {
  sortKey: string;
  record: ManifestFontRecord;
};

export const buildManifestJson = async (
  materializedResources: MaterializedResource[],
  options: BuildManifestJsonOptions,
): Promise<GameManifestJson> => {
  const resourceBuckets = new Map<string, ManifestResourceCandidate[]>();
  const fonts: FontManifestRecordWithSortKey[] = [];

  for (const resource of materializedResources) {
    const bucket = resourceBuckets.get(normalizeLookupKey(resource.logicalPath)) ?? [];

    bucket.push({
      type: resource.resourceType,
      extension: resource.extension,
      logicalPath: resource.logicalPath,
      data: resource.data,
    });
    resourceBuckets.set(normalizeLookupKey(resource.logicalPath), bucket);

    if (resource.resourceType === 'font') {
      const parsed = posixParse(resource.sourcePath);
      const resourcePath = resource.data.kind === 'file' ? resource.data.path : resource.sourcePath;
      fonts.push({
        sortKey: resource.sourcePath,
        record: {
          data: {
            kind: 'file',
            path: resourcePath,
          },
          extension: resource.extension,
          families: buildFontFamilies(resource.sourcePath),
          style: inferFontStyle(parsed.name),
          weight: inferFontWeight(parsed.name),
        },
      });
    }
  }

  const resources: GameManifestJson['resources'] = {};
  for (const [key, bucket] of [...resourceBuckets.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    warnOnAmbiguousCandidates(options.warnings, key, bucket);
    resources[key] = bucket.sort(compareResourceCandidates);
  }

  const fontRecords = fonts
    .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
    .map(({ record }) => record);
  const packs = await buildManifestPacks({
    builder: options.packBuilder,
    runtime: options.runtime,
  });

  return parseGameManifestJson({
    version: 1,
    id: options.gameId,
    metadata: clone(options.metadata),
    resources,
    packs,
    fonts: fontRecords,
  });
};

const buildFontFamilies = (relativePath: string) => {
  const parsed = posixParse(relativePath);
  const families = new Set<string>();
  const basename = parsed.name;
  const basenameSansStyle = stripFontStyleSuffix(basename);
  const parentDir = parsed.dir.split('/').at(-1) ?? '';

  addFontAliases(families, basename);
  addFontAliases(families, basenameSansStyle);
  if (parentDir && parentDir !== 'Fonts') {
    addFontAliases(families, parentDir);
  }

  return [...families].filter(Boolean).sort((left, right) => left.localeCompare(right));
};

const stripFontStyleSuffix = (value: string) => {
  return value.replace(
    /(?:[-_\s]+)(?:regular|bold|italic|oblique|medium|light|black|heavy|semibold|semi-bold|extrabold|extra-bold)$/i,
    '',
  );
};

const addFontAliases = (target: Set<string>, source: string) => {
  const normalized = source.trim();
  if (!normalized) return;

  target.add(normalized);
  target.add(normalized.replace(/[-_]+/g, ' ').trim());
  target.add(normalized.replace(/[-_\s]+/g, '').trim());
  target.add(splitUppercaseRuns(normalized).replace(/[-_]+/g, ' ').trim());
};

const splitUppercaseRuns = (value: string) => {
  return value.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-z\d])([A-Z])/g, '$1 $2');
};

const inferFontStyle = (value: string) => {
  return /italic|oblique/i.test(value) ? 'italic' : 'normal';
};

const inferFontWeight = (value: string) => {
  if (/black|heavy/i.test(value)) return '900';
  if (/extrabold|extra-bold/i.test(value)) return '800';
  if (/semibold|semi-bold|bold/i.test(value)) return '700';
  if (/medium/i.test(value)) return '500';
  if (/light/i.test(value)) return '300';
  return '400';
};

const normalizeLookupKey = (value: string) => {
  return toPosix(value.normalize('NFC'))
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase();
};

const warnOnAmbiguousCandidates = (
  warnings: ConverterWarning[],
  lookupKey: string,
  candidates: ManifestResourceCandidate[],
) => {
  const seen = new Map<string, ManifestResourceCandidate>();

  for (const candidate of candidates) {
    const candidateKey = `${candidate.type}:${candidate.extension}`;
    const existing = seen.get(candidateKey);
    if (!existing) {
      seen.set(candidateKey, candidate);
      continue;
    }

    warnings.push({
      code: 'ambiguous-resource-candidates',
      severity: 'warning',
      message: `ambiguous resource candidates for ${lookupKey} (${candidateKey}): ${existing.logicalPath} and ${candidate.logicalPath}`,
      paths: [`${existing.logicalPath}.${existing.extension}`, `${candidate.logicalPath}.${candidate.extension}`],
      suggestion: 'Remove or rename one of the duplicate resource candidates.',
    });
  }
};

const compareResourceCandidates = (left: ManifestResourceCandidate, right: ManifestResourceCandidate) => {
  if (left.type !== right.type) return left.type.localeCompare(right.type);

  const priority = EXTENSION_PRIORITY[left.type] ?? [];
  const leftRank = priority.indexOf(left.extension);
  const rightRank = priority.indexOf(right.extension);

  if (leftRank !== rightRank) {
    return normalizeRank(leftRank) - normalizeRank(rightRank);
  }

  return getResourceDataSortKey(left.data).localeCompare(getResourceDataSortKey(right.data));
};

const normalizeRank = (value: number) => {
  return value >= 0 ? value : Number.MAX_SAFE_INTEGER;
};

const getResourceDataSortKey = (data: ManifestResourceData) => {
  switch (data.kind) {
    case 'file':
      return data.path;
    case 'pack':
      return `${data.packId}:${data.offset.toString().padStart(12, '0')}`;
  }
};
