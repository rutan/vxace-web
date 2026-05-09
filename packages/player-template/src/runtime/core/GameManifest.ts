import { GameManifest, normalizeGameDir, type ManifestFontRecord } from '@rutan/rpgmaker-vxace-web-game-manifest';
import type { GameAssetProvider } from './GameAssetProvider';

export const loadGameManifest = async (gameDir: string) => {
  const normalizedGameDir = normalizeGameDir(gameDir);
  const manifestUrl = encodeURI(`${normalizedGameDir}/manifest.json`);
  const response = await fetch(manifestUrl);

  if (response.ok) {
    const json = await response.json();
    return GameManifest.fromJson(normalizedGameDir, json);
  }

  const statusText = response.statusText ? ` ${response.statusText}` : '';
  throw new Error(`manifest fetch failed for ${manifestUrl}: HTTP ${response.status}${statusText}`);
};

export const preloadManifestFonts = async (assetProvider: GameAssetProvider) => {
  if (typeof FontFace === 'undefined' || !('fonts' in document)) return;

  const pendingLoads: Promise<void>[] = [];
  const seen = new Set<string>();

  const { manifest } = assetProvider;
  for (const font of manifest.fonts) {
    for (const family of font.families) {
      const normalizedFamily = family.trim();
      if (!normalizedFamily) continue;

      const key = `${normalizedFamily}|${assetProvider.createCacheKey(font)}|${font.style}|${font.weight}`;
      if (seen.has(key)) continue;
      seen.add(key);

      pendingLoads.push(loadFontFace(assetProvider, font, normalizedFamily));
    }
  }

  await Promise.all(pendingLoads);
};

const loadFontFace = async (assetProvider: GameAssetProvider, font: ManifestFontRecord, family: string) => {
  let sourceUrl: string | null = null;
  try {
    sourceUrl = await assetProvider.createObjectUrl(font, { kind: 'data', label: family });
    const face = new FontFace(family, `url(${JSON.stringify(sourceUrl)})`, {
      style: font.style,
      weight: font.weight,
    });
    const loadedFace = await face.load();
    document.fonts.add(loadedFace);
  } catch (error) {
    console.warn(`font preload failed for ${family} (${assetProvider.createCacheKey(font)})`, error);
  } finally {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }
};
