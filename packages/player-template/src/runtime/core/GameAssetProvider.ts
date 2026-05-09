import {
  GameManifest,
  toPublicUrl,
  type AssetType,
  type ManifestFontRecord,
  type ManifestResourceCandidate,
  type ManifestResourceData,
} from '@rutan/rpgmaker-vxace-web-game-manifest';
import { fetchArrayBuffer, fetchBinaryBase64, fetchBlob } from '../utils/fetch';
import { loadImageFromBlob } from './utils';
import type { WebAudioSource } from './WebAudioTrack';

type AssetProviderLoadContext = {
  kind?: 'data' | 'image';
  label?: string;
};

export type GameAssetSource = ManifestResourceCandidate | ManifestFontRecord;

export class GameAssetProvider {
  private readonly _manifest: GameManifest;
  private readonly _packCache = new Map<string, Promise<ArrayBuffer>>();

  constructor(manifest: GameManifest) {
    this._manifest = manifest;
  }

  get manifest() {
    return this._manifest;
  }

  resolveAsset(requestedPath: string, expectedType?: AssetType) {
    return this._manifest.resolveAsset(requestedPath, expectedType);
  }

  resolveResource(requestedPath: string) {
    return this._manifest.resolveResource(requestedPath);
  }

  resourceExists(requestedPath: string) {
    return this.resolveResource(requestedPath) !== null;
  }

  createCacheKey(source: GameAssetSource) {
    return this._createDataCacheKey(source.data);
  }

  createAudioSource(source: GameAssetSource, context: AssetProviderLoadContext = {}): WebAudioSource {
    return {
      key: this.createCacheKey(source),
      label: context.label ?? this._formatSourceLabel(source),
      loadBytes: () => this.loadBytes(source, context),
    };
  }

  async loadBytes(source: GameAssetSource, context: AssetProviderLoadContext = {}) {
    const data = source.data;
    switch (data.kind) {
      case 'file':
        return fetchArrayBuffer(this._toPublicUrl(data.path), undefined, {
          kind: context.kind ?? 'data',
          label: context.label ?? this._formatSourceLabel(source),
        });
      case 'pack': {
        const pack = await this._loadPack(data.packId);
        return pack.slice(data.offset, data.offset + data.length);
      }
    }
  }

  async loadBlob(source: GameAssetSource, context: AssetProviderLoadContext = {}) {
    const data = source.data;
    switch (data.kind) {
      case 'file':
        return fetchBlob(this._toPublicUrl(data.path), undefined, {
          kind: context.kind ?? 'data',
          label: context.label ?? this._formatSourceLabel(source),
        });
      case 'pack': {
        const bytes = await this.loadBytes(source, context);
        return new Blob([bytes], {
          type: data.contentType ?? '',
        });
      }
    }
  }

  async loadBase64(source: GameAssetSource, context: AssetProviderLoadContext = {}) {
    const data = source.data;
    switch (data.kind) {
      case 'file':
        return fetchBinaryBase64(this._toPublicUrl(data.path), undefined, {
          kind: context.kind ?? 'data',
          label: context.label ?? this._formatSourceLabel(source),
        });
      case 'pack': {
        const bytes = await this.loadBytes(source, context);
        return arrayBufferToBase64(bytes);
      }
    }
  }

  async loadImage(source: GameAssetSource, context: AssetProviderLoadContext = {}) {
    const blob = await this.loadBlob(source, {
      ...context,
      kind: context.kind ?? 'image',
    });
    return loadImageFromBlob(blob, context.label ?? this._formatSourceLabel(source));
  }

  async createObjectUrl(source: GameAssetSource, context: AssetProviderLoadContext = {}) {
    const blob = await this.loadBlob(source, context);
    return URL.createObjectURL(blob);
  }

  private _toPublicUrl(relativePath: string) {
    return toPublicUrl(this._manifest.gameDir, relativePath);
  }

  private _createDataCacheKey(data: ManifestResourceData) {
    switch (data.kind) {
      case 'file':
        return `file:${this._toPublicUrl(data.path)}`;
      case 'pack':
        return `pack:${data.packId}:${data.offset}:${data.length}:${data.sha256 ?? ''}`;
    }
  }

  private _loadPack(packId: string) {
    const cached = this._packCache.get(packId);
    if (cached) return cached;

    const pack = this._manifest.getPack(packId);
    if (!pack) throw new Error(`pack not found in manifest: ${packId}`);

    const promise = fetchArrayBuffer(this._toPublicUrl(pack.path), undefined, {
      kind: 'data',
      label: pack.path,
    });
    this._packCache.set(packId, promise);
    promise.catch(() => this._packCache.delete(packId));
    return promise;
  }

  private _formatSourceLabel(source: GameAssetSource) {
    if ('logicalPath' in source) {
      return source.extension ? `${source.logicalPath}.${source.extension}` : source.logicalPath;
    }

    const family = source.families.find((value) => value.trim());
    return family ?? this.createCacheKey(source);
  }
}

const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer) => {
  const buffer: string[] = [];
  const bytes = new Uint8Array(arrayBuffer);
  for (let index = 0; index < bytes.byteLength; index += 1) {
    buffer.push(String.fromCharCode(bytes[index]));
  }
  return btoa(buffer.join(''));
};
