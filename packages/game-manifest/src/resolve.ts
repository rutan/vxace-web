import { extractExtension, normalizeFontFamilyKey, normalizeLookupKey, normalizeRequestedPath } from './normalize';
import type { AssetType, GameManifestJson, ManifestFontRecord, ManifestResourceCandidate } from './types';

type ResolveCandidateOptions = {
  expectedType?: AssetType;
  fallbackOnExtensionMismatch: boolean;
};

export const toPublicUrl = (gameDir: string, relativePath: string) => {
  const normalizedPath = normalizeRequestedPath(relativePath, gameDir, false);
  return encodeURI(`${gameDir}/${normalizedPath}`);
};

export const resolveAsset = (
  manifest: GameManifestJson,
  gameDir: string,
  requestedPath: string,
  expectedType?: AssetType,
) => {
  return resolveCandidate(manifest, gameDir, requestedPath, { expectedType, fallbackOnExtensionMismatch: true });
};

export const resolveResource = (manifest: GameManifestJson, gameDir: string, requestedPath: string) => {
  return resolveCandidate(manifest, gameDir, requestedPath, { fallbackOnExtensionMismatch: false });
};

export const fontExists = (fonts: ManifestFontRecord[], name: string) => {
  return buildFontFamilyLookup(fonts).has(normalizeFontFamilyKey(name));
};

export const resolveFontFamilies = (fonts: ManifestFontRecord[], names: string[]) => {
  const lookup = buildFontFamilyLookup(fonts);
  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const family = lookup.get(normalizeFontFamilyKey(name));
    if (!family || seen.has(family)) continue;

    resolved.push(family);
    seen.add(family);
  }

  if (resolved.length > 0) return resolved;

  const fallback = fonts[0]?.families.find((family) => family.trim());
  return fallback ? [fallback] : [];
};

export const buildFontFamilyLookup = (fonts: ManifestFontRecord[]) => {
  const lookup = new Map<string, string>();

  for (const font of fonts) {
    for (const family of font.families) {
      const normalizedFamily = family.trim();
      if (!normalizedFamily) continue;

      const key = normalizeFontFamilyKey(normalizedFamily);
      if (!lookup.has(key)) {
        lookup.set(key, normalizedFamily);
      }
    }
  }

  return lookup;
};

const resolveCandidate = (
  manifest: GameManifestJson,
  gameDir: string,
  requestedPath: string,
  options: ResolveCandidateOptions,
): ManifestResourceCandidate | null => {
  const normalizedInput = normalizeRequestedPath(requestedPath, gameDir, false);
  const requestedExtension = extractExtension(normalizedInput);
  const lookupKey = normalizeLookupKey(normalizedInput);
  const candidates = manifest.resources[lookupKey] ?? [];
  const filtered = options.expectedType
    ? candidates.filter((candidate) => candidate.type === options.expectedType)
    : candidates;
  if (filtered.length === 0) return null;

  if (requestedExtension) {
    const exactMatch = filtered.find((candidate) => candidate.extension === requestedExtension);
    if (exactMatch) return cloneResourceCandidate(exactMatch);
    if (!options.fallbackOnExtensionMismatch) return null;
  }

  return cloneResourceCandidate(filtered[0]);
};

const cloneResourceCandidate = (candidate: ManifestResourceCandidate): ManifestResourceCandidate => ({
  type: candidate.type,
  extension: candidate.extension,
  logicalPath: candidate.logicalPath,
  data: { ...candidate.data },
});
