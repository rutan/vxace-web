import {
  resourceType,
  virtualGamepadMode,
  type GameManifestJson,
  type ManifestResourceData,
  type ResourceType,
} from './types';

export type ParseGameManifestJsonResult = ParseGameManifestJsonSuccess | ParseGameManifestJsonError;

export interface ParseGameManifestJsonSuccess {
  ok: true;
  manifest: GameManifestJson;
}

export interface ParseGameManifestJsonError {
  ok: false;
  error: ParseGameManifestJsonIssue[];
}

export interface ParseGameManifestJsonIssue {
  path: string;
  message: string;
}

export interface GameManifestJsonParseError extends Error {
  issues: ParseGameManifestJsonIssue[];
}

type ParseContext = {
  issues: ParseGameManifestJsonIssue[];
};

const gameIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const formatPath = (path: string, key: string | number) => (path ? `${path}.${String(key)}` : String(key));

const addIssue = (context: ParseContext, path: string, message: string) => {
  context.issues.push({
    path,
    message: path ? `${path}: ${message}` : message,
  });
};

const createParseError = (issues: ParseGameManifestJsonIssue[]): GameManifestJsonParseError =>
  Object.assign(new Error(issues[0]?.message ?? 'Invalid game manifest JSON'), {
    name: 'GameManifestJsonParseError',
    issues,
  });

const readManifest = (context: ParseContext, value: unknown, path: string): GameManifestJson => {
  const manifest = readRecord(context, value, path);

  return {
    version: readLiteralOne(context, manifest.version, formatPath(path, 'version')),
    id: readGameId(context, manifest.id, formatPath(path, 'id')),
    metadata: readMetadata(context, manifest.metadata, formatPath(path, 'metadata')),
    resources: readResources(context, manifest.resources, formatPath(path, 'resources')),
    packs: readPacks(context, manifest.packs, formatPath(path, 'packs')),
    fonts: readFonts(context, manifest.fonts, formatPath(path, 'fonts')),
  };
};

const readMetadata = (context: ParseContext, value: unknown, path: string): GameManifestJson['metadata'] => {
  const metadata = readRecord(context, value, path);

  return {
    title: readString(context, metadata.title, formatPath(path, 'title')),
    screen: readScreen(context, metadata.screen, formatPath(path, 'screen')),
    input: readInput(context, metadata.input, formatPath(path, 'input')),
  };
};

const readScreen = (context: ParseContext, value: unknown, path: string): GameManifestJson['metadata']['screen'] => {
  const screen = readRecord(context, value, path);

  return {
    width: readPositiveInteger(context, screen.width, formatPath(path, 'width')),
    height: readPositiveInteger(context, screen.height, formatPath(path, 'height')),
  };
};

const readInput = (context: ParseContext, value: unknown, path: string): GameManifestJson['metadata']['input'] => {
  const input = readRecord(context, value, path);

  return {
    virtualGamepad: readPicklist(context, input.virtualGamepad, virtualGamepadMode, formatPath(path, 'virtualGamepad')),
  };
};

const readResources = (context: ParseContext, value: unknown, path: string): GameManifestJson['resources'] => {
  if (typeof value !== 'object' || value === null) {
    addIssue(context, path, 'Expected an object');
    return {};
  }

  const resources: GameManifestJson['resources'] = {};
  for (const [key, candidates] of Object.entries(value)) {
    resources[key] = readResourceCandidates(context, candidates, formatPath(path, key));
  }
  return resources;
};

const readResourceCandidates = (
  context: ParseContext,
  value: unknown,
  path: string,
): GameManifestJson['resources'][string] => {
  if (!Array.isArray(value)) {
    addIssue(context, path, 'Expected an array');
    return [];
  }

  return value.map((candidate, index) => readResourceCandidate(context, candidate, formatPath(path, index)));
};

const readResourceCandidate = (
  context: ParseContext,
  value: unknown,
  path: string,
): GameManifestJson['resources'][string][number] => {
  const candidate = readRecord(context, value, path);
  return {
    type: readResourceType(context, candidate.type, formatPath(path, 'type')),
    extension: readString(context, candidate.extension, formatPath(path, 'extension')),
    logicalPath: readString(context, candidate.logicalPath, formatPath(path, 'logicalPath')),
    data: readResourceData(context, candidate, path),
  };
};

const readResourceData = (
  context: ParseContext,
  candidate: Record<string, unknown>,
  path: string,
): ManifestResourceData => {
  const data = readRecord(context, candidate.data, formatPath(path, 'data'));
  const kind = readResourceDataKind(context, data.kind, formatPath(path, 'data.kind'));
  const result: ManifestResourceData =
    kind === 'pack'
      ? {
          kind,
          packId: readString(context, data.packId, formatPath(path, 'data.packId')),
          offset: readNonNegativeInteger(context, data.offset, formatPath(path, 'data.offset')),
          length: readNonNegativeInteger(context, data.length, formatPath(path, 'data.length')),
        }
      : {
          kind,
          path: readString(context, data.path, formatPath(path, 'data.path')),
        };

  if (hasOwn(data, 'contentType')) {
    result.contentType = readOptionalString(context, data.contentType, formatPath(path, 'data.contentType'));
  }
  if (hasOwn(data, 'byteLength')) {
    result.byteLength = readOptionalNonNegativeInteger(context, data.byteLength, formatPath(path, 'data.byteLength'));
  }
  if (hasOwn(data, 'sha256')) {
    result.sha256 = readOptionalString(context, data.sha256, formatPath(path, 'data.sha256'));
  }

  return result;
};

const readPacks = (context: ParseContext, value: unknown, path: string): GameManifestJson['packs'] => {
  if (typeof value !== 'object' || value === null) {
    addIssue(context, path, 'Expected an object');
    return {};
  }

  const packs: GameManifestJson['packs'] = {};
  for (const [key, pack] of Object.entries(value)) {
    packs[key] = readPack(context, pack, formatPath(path, key));
  }
  return packs;
};

const readPack = (context: ParseContext, value: unknown, path: string): GameManifestJson['packs'][string] => {
  const pack = readRecord(context, value, path);
  const result: GameManifestJson['packs'][string] = {
    path: readString(context, pack.path, formatPath(path, 'path')),
  };

  if (hasOwn(pack, 'byteLength')) {
    result.byteLength = readOptionalNonNegativeInteger(context, pack.byteLength, formatPath(path, 'byteLength'));
  }
  if (hasOwn(pack, 'sha256')) {
    result.sha256 = readOptionalString(context, pack.sha256, formatPath(path, 'sha256'));
  }

  return result;
};

const readFonts = (context: ParseContext, value: unknown, path: string): GameManifestJson['fonts'] => {
  if (!Array.isArray(value)) {
    addIssue(context, path, 'Expected an array');
    return [];
  }

  return value.map((font, index) => readFont(context, font, formatPath(path, index)));
};

const readFont = (context: ParseContext, value: unknown, path: string): GameManifestJson['fonts'][number] => {
  const font = readRecord(context, value, path);

  return {
    data: readResourceData(context, font, path),
    extension: readString(context, font.extension, formatPath(path, 'extension')),
    families: readStringArray(context, font.families, formatPath(path, 'families')),
    style: readString(context, font.style, formatPath(path, 'style')),
    weight: readString(context, font.weight, formatPath(path, 'weight')),
  };
};

const readRecord = (context: ParseContext, value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    addIssue(context, path, 'Expected an object');
    return {};
  }
  return value;
};

const readLiteralOne = (context: ParseContext, value: unknown, path: string): 1 => {
  if (value !== 1) {
    addIssue(context, path, 'Expected 1');
  }
  return 1;
};

const readResourceDataKind = (context: ParseContext, value: unknown, path: string): ManifestResourceData['kind'] => {
  if (value === 'file' || value === 'pack') {
    return value;
  }

  addIssue(context, path, 'Expected one of: file, pack');
  return 'file';
};

const readGameId = (context: ParseContext, value: unknown, path: string): string => {
  if (typeof value !== 'string') {
    addIssue(context, path, 'Expected a string');
    return '';
  }
  if (!gameIdPattern.test(value)) {
    addIssue(context, path, 'Expected a valid game id');
  }
  return value;
};

const readString = (context: ParseContext, value: unknown, path: string): string => {
  if (typeof value !== 'string') {
    addIssue(context, path, 'Expected a string');
    return '';
  }
  return value;
};

const readOptionalString = (context: ParseContext, value: unknown, path: string): string | undefined => {
  if (value === undefined) return undefined;
  return readString(context, value, path);
};

const readStringArray = (context: ParseContext, value: unknown, path: string): string[] => {
  if (!Array.isArray(value)) {
    addIssue(context, path, 'Expected an array');
    return [];
  }

  return value.map((item, index) => readString(context, item, formatPath(path, index)));
};

const readPositiveInteger = (context: ParseContext, value: unknown, path: string): number => {
  if (typeof value !== 'number') {
    addIssue(context, path, 'Expected a number');
    return 1;
  }
  if (!Number.isInteger(value)) {
    addIssue(context, path, 'Expected an integer');
  }
  if (value < 1) {
    addIssue(context, path, 'Expected a number greater than or equal to 1');
  }
  return value;
};

const readNonNegativeInteger = (context: ParseContext, value: unknown, path: string): number => {
  if (typeof value !== 'number') {
    addIssue(context, path, 'Expected a number');
    return 0;
  }
  if (!Number.isInteger(value)) {
    addIssue(context, path, 'Expected an integer');
  }
  if (value < 0) {
    addIssue(context, path, 'Expected a number greater than or equal to 0');
  }
  return value;
};

const readOptionalNonNegativeInteger = (context: ParseContext, value: unknown, path: string): number | undefined => {
  if (value === undefined) return undefined;
  return readNonNegativeInteger(context, value, path);
};

const readResourceType = (context: ParseContext, value: unknown, path: string): ResourceType =>
  readPicklist(context, value, resourceType, path);

const readPicklist = <const T extends readonly string[]>(
  context: ParseContext,
  value: unknown,
  values: T,
  path: string,
): T[number] => {
  if (typeof value === 'string' && (values as readonly string[]).includes(value)) {
    return value;
  }

  addIssue(context, path, `Expected one of: ${values.join(', ')}`);
  return values[0];
};

export function parseGameManifestJson(json: unknown): GameManifestJson {
  const result = safeParseGameManifestJson(json);
  if (result.ok) {
    return result.manifest;
  }
  throw createParseError(result.error);
}

export const parseGameManifestJsonSafe = parseGameManifestJson;

export function safeParseGameManifestJson(json: unknown): ParseGameManifestJsonResult {
  const context: ParseContext = {
    issues: [],
  };
  const manifest = readManifest(context, json, '');

  if (context.issues.length > 0) {
    return {
      ok: false,
      error: context.issues,
    };
  }

  return {
    ok: true,
    manifest,
  };
}
