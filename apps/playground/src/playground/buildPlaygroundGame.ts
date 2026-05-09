import {
  parseGameManifestJson,
  type GameManifestJson,
  type ResourceType,
} from '@rutan/rpgmaker-vxace-web-game-manifest';
import type { TranslationFunctions } from '../i18n/i18n-types';
import type { PlaygroundFileEntry, PreparedPlaygroundGame } from './types';

const IGNORED_SOURCE_FILENAMES = new Set(['.ds_store', 'desktop.ini', 'thumbs.db']);
const IGNORED_SOURCE_DIRNAMES = new Set(['.git', '.hg', '.svn']);
const IMAGE_EXTENSIONS = new Set(['png', 'bmp', 'jpg', 'jpeg']);
const AUDIO_EXTENSIONS = new Set(['ogg', 'mp3', 'wav', 'm4a', 'wma', 'mid', 'midi']);
const MOVIE_EXTENSIONS = new Set(['mp4', 'webm', 'ogv', 'avi']);
const FONT_EXTENSIONS = new Set(['ttf', 'otf', 'woff', 'woff2']);

export async function buildPlaygroundGame(
  entries: PlaygroundFileEntry[],
  options: { LL: TranslationFunctions },
): Promise<PreparedPlaygroundGame> {
  const normalizedEntries = normalizeProjectEntries(entries);
  const warnings: string[] = [];

  const gameIni = normalizedEntries.find((entry) => normalizeLookupPath(entry.path) === 'game.ini');
  if (!gameIni) {
    throw new Error(String(options.LL.errors.missingGameIni()));
  }

  const scripts = normalizedEntries.find((entry) => normalizeLookupPath(entry.path) === 'data/scripts.rvdata2');
  if (!scripts) {
    throw new Error(String(options.LL.errors.missingScripts()));
  }

  const gameIniText = await readGameIniText(gameIni.file);
  const gameTitle = readIniValue(gameIniText, 'Game', 'Title') ?? String(options.LL.game.defaultTitle());
  const gameId = `playground:${await hashGameTitle(gameTitle)}`;
  const resources: GameManifestJson['resources'] = {};
  const fonts: GameManifestJson['fonts'] = [];

  for (const entry of normalizedEntries) {
    if (shouldIgnorePath(entry.path)) continue;

    const extension = getExtension(entry.path);
    const resourceType = detectResourceType(entry.path, extension);
    const logicalPath = stripExtension(entry.path);
    const lookupKey = normalizeLookupPath(logicalPath);

    const bucket = resources[lookupKey] ?? [];
    bucket.push({
      type: resourceType,
      extension,
      logicalPath,
      data: {
        kind: 'file',
        path: entry.path,
        contentType: entry.file.type || inferContentType(extension),
        byteLength: entry.file.size,
      },
    });
    resources[lookupKey] = bucket;

    if (resourceType === 'font') {
      fonts.push({
        data: {
          kind: 'file',
          path: entry.path,
          contentType: entry.file.type || inferContentType(extension),
          byteLength: entry.file.size,
        },
        extension,
        families: buildFontFamilies(entry.path),
        style: inferFontStyle(entry.path),
        weight: inferFontWeight(entry.path),
      });
    }
  }

  for (const [key, bucket] of Object.entries(resources)) {
    const seen = new Set<string>();
    for (const candidate of bucket) {
      const candidateKey = `${candidate.type}:${candidate.extension}`;
      if (seen.has(candidateKey)) {
        warnings.push(String(options.LL.warnings.duplicateResourceCandidate({ key, candidateKey })));
      }
      seen.add(candidateKey);
    }
    bucket.sort(compareResourceCandidates);
  }

  const manifest = parseGameManifestJson({
    version: 1,
    id: gameId,
    metadata: {
      title: gameTitle,
      screen: {
        width: 544,
        height: 416,
      },
      input: {
        virtualGamepad: 'normal',
      },
    },
    resources: Object.fromEntries(Object.entries(resources).sort(([left], [right]) => left.localeCompare(right))),
    packs: {},
    fonts: fonts.sort((left, right) => getResourceDataPath(left.data).localeCompare(getResourceDataPath(right.data))),
  });

  return {
    id: gameId,
    title: gameTitle,
    manifest,
    files: normalizedEntries,
    warnings,
  };
}

function normalizeProjectEntries(entries: PlaygroundFileEntry[]) {
  const sorted = entries
    .map((entry) => ({
      path: normalizePath(entry.path),
      file: entry.file,
    }))
    .filter((entry) => entry.path)
    .sort((left, right) => left.path.localeCompare(right.path));

  const gameIni = sorted
    .filter(
      (entry) =>
        normalizeLookupPath(entry.path).endsWith('/game.ini') || normalizeLookupPath(entry.path) === 'game.ini',
    )
    .sort((left, right) => left.path.length - right.path.length || left.path.localeCompare(right.path))[0];

  if (!gameIni) return sorted;

  const rootPrefix = dirname(gameIni.path);
  if (!rootPrefix) return sorted;

  const prefix = `${rootPrefix}/`;
  return sorted
    .filter((entry) => entry.path === rootPrefix || entry.path.startsWith(prefix))
    .map((entry) => ({
      path: entry.path.slice(prefix.length),
      file: entry.file,
    }))
    .filter((entry) => entry.path);
}

function shouldIgnorePath(path: string) {
  const segments = path.split('/');
  if (segments.some((segment) => IGNORED_SOURCE_DIRNAMES.has(segment.toLowerCase()))) return true;

  const filename = segments.at(-1)?.toLowerCase() ?? '';
  if (IGNORED_SOURCE_FILENAMES.has(filename)) return true;

  const extension = getExtension(path);
  return extension === 'dll' || extension === 'exe' || extension === 'rgss3a' || extension === 'rvproj2';
}

function detectResourceType(path: string, extension: string): ResourceType {
  if (path.startsWith('Graphics/') && IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (path.startsWith('Audio/') && AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (path.startsWith('Movies/') && MOVIE_EXTENSIONS.has(extension)) return 'movie';
  if (path.startsWith('Fonts/') && FONT_EXTENSIONS.has(extension)) return 'font';
  if (path.startsWith('Data/') && extension === 'rvdata2') return 'data';

  return 'file';
}

function compareResourceCandidates(
  left: GameManifestJson['resources'][string][number],
  right: GameManifestJson['resources'][string][number],
) {
  if (left.type !== right.type) return left.type.localeCompare(right.type);

  const priority = getExtensionPriority(left.type);
  const leftRank = normalizeRank(priority.indexOf(left.extension));
  const rightRank = normalizeRank(priority.indexOf(right.extension));
  if (leftRank !== rightRank) return leftRank - rightRank;

  return getResourceDataPath(left.data).localeCompare(getResourceDataPath(right.data));
}

function getExtensionPriority(type: ResourceType) {
  switch (type) {
    case 'image':
      return ['png', 'bmp', 'jpg', 'jpeg'];
    case 'audio':
      return ['ogg', 'm4a', 'mp3', 'wav', 'wma', 'mid', 'midi'];
    case 'movie':
      return ['mp4', 'webm', 'ogv', 'avi'];
    case 'font':
      return ['ttf', 'otf', 'woff2', 'woff'];
    default:
      return [];
  }
}

function normalizeRank(value: number) {
  return value >= 0 ? value : Number.MAX_SAFE_INTEGER;
}

function getResourceDataPath(data: GameManifestJson['resources'][string][number]['data']) {
  switch (data.kind) {
    case 'file':
      return data.path;
    case 'pack':
      return `${data.packId}:${data.offset}`;
  }
}

function readIniValue(source: string, sectionName: string, keyName: string) {
  let currentSection = '';

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) continue;

    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim().toLowerCase();
      continue;
    }

    if (currentSection !== sectionName.toLowerCase()) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (key.toLowerCase() !== keyName.toLowerCase()) continue;

    return line.slice(separatorIndex + 1).trim();
  }

  return null;
}

async function readGameIniText(file: File) {
  const bytes = await file.arrayBuffer();

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('shift-jis').decode(bytes);
  }
}

async function hashGameTitle(title: string) {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(title.normalize('NFC')));
  return toHex(digest).slice(0, 32);
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildFontFamilies(path: string) {
  const filename = basename(stripExtension(path));
  const parent = dirname(path).split('/').at(-1) ?? '';
  const families = new Set<string>();

  addFontAliases(families, filename);
  addFontAliases(families, stripFontStyleSuffix(filename));
  if (parent && parent !== 'Fonts') addFontAliases(families, parent);

  return [...families].filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function addFontAliases(target: Set<string>, source: string) {
  const normalized = source.trim();
  if (!normalized) return;

  target.add(normalized);
  target.add(normalized.replace(/[-_]+/g, ' ').trim());
  target.add(normalized.replace(/[-_\s]+/g, '').trim());
  target.add(normalized.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-z\d])([A-Z])/g, '$1 $2'));
}

function stripFontStyleSuffix(value: string) {
  return value.replace(
    /(?:[-_\s]+)(?:regular|bold|italic|oblique|medium|light|black|heavy|semibold|semi-bold|extrabold|extra-bold)$/i,
    '',
  );
}

function inferFontStyle(value: string) {
  return /italic|oblique/i.test(value) ? 'italic' : 'normal';
}

function inferFontWeight(value: string) {
  if (/black|heavy/i.test(value)) return '900';
  if (/extrabold|extra-bold/i.test(value)) return '800';
  if (/semibold|semi-bold|bold/i.test(value)) return '700';
  if (/medium/i.test(value)) return '500';
  if (/light/i.test(value)) return '300';
  return '400';
}

function inferContentType(extension: string) {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'bmp':
      return 'image/bmp';
    case 'ogg':
      return 'audio/ogg';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

function normalizePath(path: string) {
  return path.normalize('NFC').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function normalizeLookupPath(path: string) {
  return normalizePath(path).toLowerCase();
}

function getExtension(path: string) {
  const match = path.match(/\.([^./]+)$/);
  return match ? match[1].toLowerCase() : '';
}

function stripExtension(path: string) {
  return path.replace(/\.[^/.]+$/, '');
}

function basename(path: string) {
  return path.split('/').at(-1) ?? path;
}

function dirname(path: string) {
  const index = path.lastIndexOf('/');
  return index >= 0 ? path.slice(0, index) : '';
}
