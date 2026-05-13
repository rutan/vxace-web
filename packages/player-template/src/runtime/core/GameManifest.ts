import { GameManifest, normalizeGameDir, type ManifestFontRecord } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { FontRenderMetricsRegistry, parseFontRenderMetrics } from './FontRenderMetrics';
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
  const metricsRegistry = new FontRenderMetricsRegistry();
  if (typeof FontFace === 'undefined' || !('fonts' in document)) return metricsRegistry;

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

      pendingLoads.push(loadFontFace(assetProvider, font, normalizedFamily, metricsRegistry));
    }
  }

  await Promise.all(pendingLoads);
  return metricsRegistry;
};

const loadFontFace = async (
  assetProvider: GameAssetProvider,
  font: ManifestFontRecord,
  family: string,
  metricsRegistry: FontRenderMetricsRegistry,
) => {
  let sourceUrl: string | null = null;
  try {
    const bytes = await assetProvider.loadBytes(font, { kind: 'data', label: family });
    const metrics = parseFontRenderMetrics(bytes);
    if (metrics) metricsRegistry.register(font, metrics);

    sourceUrl = URL.createObjectURL(new Blob([bytes], { type: fontContentType(font.extension) }));
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

const fontContentType = (extension: string) => {
  switch (extension.toLowerCase()) {
    case 'otf':
      return 'font/otf';
    case 'ttc':
      return 'font/collection';
    case 'ttf':
      return 'font/ttf';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
};
