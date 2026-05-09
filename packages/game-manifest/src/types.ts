export const assetType = ['image', 'audio', 'movie', 'font'] as const;
export type AssetType = (typeof assetType)[number];

export const resourceType = [...assetType, 'data', 'file'] as const;
export type ResourceType = (typeof resourceType)[number];

export const virtualGamepadMode = ['normal', 'normal-swap', 'simple', 'none'] as const;
export type VirtualGamepadMode = (typeof virtualGamepadMode)[number];

export interface ManifestScreen {
  width: number;
  height: number;
}

export interface ManifestInput {
  virtualGamepad: VirtualGamepadMode;
}

export interface ManifestMetadata {
  title: string;
  screen: ManifestScreen;
  input: ManifestInput;
}

export interface ManifestResourceCandidate {
  type: ResourceType;
  extension: string;
  logicalPath: string;
  data: ManifestResourceData;
}

export type ManifestResourceData = ManifestResourceFileData | ManifestResourcePackData;

export interface ManifestResourceFileData {
  kind: 'file';
  path: string;
  contentType?: string;
  byteLength?: number;
  sha256?: string;
}

export interface ManifestResourcePackData {
  kind: 'pack';
  packId: string;
  offset: number;
  length: number;
  contentType?: string;
  byteLength?: number;
  sha256?: string;
}

export interface ManifestPackRecord {
  path: string;
  byteLength?: number;
  sha256?: string;
}

export interface ManifestFontRecord {
  data: ManifestResourceData;
  extension: string;
  families: string[];
  style: string;
  weight: string;
}

export type ManifestResources = Record<string, ManifestResourceCandidate[]>;
export type ManifestFonts = ManifestFontRecord[];
export type ManifestPacks = Record<string, ManifestPackRecord>;

export type GameId = string;

export interface GameManifestJson {
  version: 1;
  id: GameId;
  metadata: ManifestMetadata;
  resources: ManifestResources;
  packs: ManifestPacks;
  fonts: ManifestFonts;
}
