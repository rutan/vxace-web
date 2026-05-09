import { cloneGameManifestJson, createEmptyGameManifestJson } from './create';
import { normalizeFontFamilyKey, normalizeGameDir } from './normalize';
import { parseGameManifestJson } from './parse';
import { buildFontFamilyLookup, resolveAsset, resolveFontFamilies, resolveResource } from './resolve';
import type { AssetType, GameManifestJson } from './types';

export class GameManifest {
  static fromJson(gameDir: string, json: unknown) {
    return new GameManifest(gameDir, parseGameManifestJson(json));
  }

  static fromManifestJson(gameDir: string, manifest: GameManifestJson) {
    return new GameManifest(gameDir, manifest);
  }

  static empty(gameDir: string) {
    return new GameManifest(gameDir, createEmptyGameManifestJson(gameDir));
  }

  private readonly _json: GameManifestJson;
  private readonly _gameDir: string;
  private readonly _fontFamiliesByLookupKey: Map<string, string>;

  private constructor(gameDir: string, json: GameManifestJson) {
    this._gameDir = normalizeGameDir(gameDir);
    this._json = cloneGameManifestJson(json);
    this._fontFamiliesByLookupKey = buildFontFamilyLookup(json.fonts);
  }

  get gameDir() {
    return this._gameDir;
  }

  get id() {
    return this._json.id;
  }

  get fonts() {
    return this._json.fonts;
  }

  get packs() {
    return { ...this._json.packs };
  }

  get metadata() {
    return this._json.metadata;
  }

  get screen() {
    return this._json.metadata.screen;
  }

  toJson() {
    return cloneGameManifestJson(this._json);
  }

  fontExists(name: string) {
    return this._fontFamiliesByLookupKey.has(normalizeFontFamilyKey(name));
  }

  resolveFontFamilies(names: string[]) {
    return resolveFontFamilies(this._json.fonts, names);
  }

  resolveAsset(requestedPath: string, expectedType?: AssetType) {
    return resolveAsset(this._json, this._gameDir, requestedPath, expectedType);
  }

  resolveResource(requestedPath: string) {
    return resolveResource(this._json, this._gameDir, requestedPath);
  }

  getPack(packId: string) {
    const pack = this._json.packs[packId];
    if (!pack) return null;

    return { ...pack };
  }
}
