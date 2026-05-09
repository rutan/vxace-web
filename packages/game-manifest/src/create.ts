import { createDefaultMetadata } from './defaults';
import { normalizeGameDir } from './normalize';
import type { GameManifestJson, ManifestMetadata } from './types';

type CreateEmptyGameManifestJsonOptions = {
  id?: string;
  metadata?: ManifestMetadata;
};

export const createEmptyGameManifestJson = (
  gameDir: string,
  options: CreateEmptyGameManifestJsonOptions = {},
): GameManifestJson => {
  const normalizedGameDir = normalizeGameDir(gameDir);

  return {
    version: 1,
    id: options.id ?? `local:${normalizedGameDir}`,
    metadata: options.metadata ? cloneManifestMetadata(options.metadata) : createDefaultMetadata(),
    resources: {},
    packs: {},
    fonts: [],
  };
};

export const cloneGameManifestJson = (manifest: GameManifestJson): GameManifestJson => {
  return {
    version: manifest.version,
    id: manifest.id,
    metadata: cloneManifestMetadata(manifest.metadata),
    resources: Object.fromEntries(
      Object.entries(manifest.resources).map(([key, candidates]) => [
        key,
        candidates.map((candidate) => ({
          type: candidate.type,
          extension: candidate.extension,
          logicalPath: candidate.logicalPath,
          data: cloneManifestResourceData(candidate.data),
        })),
      ]),
    ),
    packs: Object.fromEntries(
      Object.entries(manifest.packs).map(([key, pack]) => [
        key,
        {
          path: pack.path,
          ...(pack.byteLength !== undefined ? { byteLength: pack.byteLength } : {}),
          ...(pack.sha256 ? { sha256: pack.sha256 } : {}),
        },
      ]),
    ),
    fonts: manifest.fonts.map((font) => ({
      data: cloneManifestResourceData(font.data),
      extension: font.extension,
      families: [...font.families],
      style: font.style,
      weight: font.weight,
    })),
  };
};

const cloneManifestResourceData = <T extends GameManifestJson['resources'][string][number]['data']>(data: T): T => {
  if (data.kind === 'pack') {
    return {
      kind: data.kind,
      packId: data.packId,
      offset: data.offset,
      length: data.length,
      ...(data.contentType ? { contentType: data.contentType } : {}),
      ...(data.byteLength !== undefined ? { byteLength: data.byteLength } : {}),
      ...(data.sha256 ? { sha256: data.sha256 } : {}),
    } as T;
  }

  return {
    kind: data.kind,
    path: data.path,
    ...(data.contentType ? { contentType: data.contentType } : {}),
    ...(data.byteLength !== undefined ? { byteLength: data.byteLength } : {}),
    ...(data.sha256 ? { sha256: data.sha256 } : {}),
  } as T;
};

const cloneManifestMetadata = (metadata: ManifestMetadata): ManifestMetadata => {
  return {
    title: metadata.title,
    screen: {
      ...metadata.screen,
    },
    input: {
      ...metadata.input,
    },
  };
};
