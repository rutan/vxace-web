import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  ManifestPackRecord,
  ManifestResourcePackData,
  ResourceType,
} from '@rutan/rpgmaker-vxace-web-game-manifest';
import type { FileConversionRecord, PackEntrySummary } from '../types';
import { PACK_ASSET_DIRNAME, PACK_ASSET_MAX_PACK_BYTES } from './constants';
import { stripExtension } from './utils';

const PACK_TARGET_RESOURCE_TYPES: ResourceType[] = ['image', 'data', 'file'];

export interface PackBuilder {
  packFiles: GeneratedPackFile[];
  currentPackFile: GeneratedPackFile | null;
  packedSourcePaths: Set<string>;
}

export interface GeneratedPackFile {
  id: string;
  path: string;
  chunks: Buffer[];
  byteLength: number;
  entries: PackEntrySummary[];
}

export interface MaterializePackedResourceInput {
  srcDir: string;
  relativePath: string;
  resourceType: ResourceType;
  extension: string;
}

export interface MaterializedPackedResource {
  data: ManifestResourcePackData;
  fileRecord: FileConversionRecord;
}

export const createPackBuilder = (): PackBuilder => ({
  packFiles: [],
  currentPackFile: null,
  packedSourcePaths: new Set(),
});

export const shouldPackResource = (packAssets: boolean, resourceType: ResourceType) => {
  return packAssets && PACK_TARGET_RESOURCE_TYPES.includes(resourceType);
};

export const materializePackedResourceData = async (
  builder: PackBuilder,
  input: MaterializePackedResourceInput,
): Promise<MaterializedPackedResource> => {
  const { extension, relativePath, resourceType, srcDir } = input;
  const source = await readFile(join(srcDir, relativePath));
  const packFile = getWritablePackFile(builder, source.byteLength);
  const offset = packFile.byteLength;

  packFile.chunks.push(source);
  packFile.byteLength += source.byteLength;
  builder.packedSourcePaths.add(relativePath);
  packFile.entries.push({
    sourcePath: relativePath,
    logicalPath: stripExtension(relativePath),
    type: toPackEntryType(resourceType),
    offset,
    length: source.byteLength,
  });

  return {
    data: {
      kind: 'pack',
      packId: packFile.id,
      offset,
      length: source.byteLength,
      byteLength: source.byteLength,
      sha256: digestHex(source),
      contentType: inferContentType(resourceType, extension),
    },
    fileRecord: {
      sourcePath: relativePath,
      logicalPath: stripExtension(relativePath),
      type: toFileConversionType(resourceType),
      action: 'packed',
      outputPath: packFile.path,
      pack: {
        id: packFile.id,
        path: packFile.path,
        offset,
        length: source.byteLength,
      },
      reason: 'asset-pack',
    },
  };
};

export const buildGeneratedPackFileRecords = (builder: PackBuilder): FileConversionRecord[] => {
  return builder.packFiles.map((packFile) => ({
    sourcePath: null,
    logicalPath: null,
    type: 'file',
    action: 'generated',
    outputPath: packFile.path,
    reason: 'generated',
  }));
};

export const writePackFiles = async (builder: PackBuilder, outDir: string) => {
  for (const packFile of builder.packFiles) {
    const target = join(outDir, packFile.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, buildPackFileContent(packFile));
  }
};

export const buildManifestPacks = (builder: PackBuilder): Record<string, ManifestPackRecord> => {
  return Object.fromEntries(
    builder.packFiles.map((packFile) => [
      packFile.id,
      {
        path: packFile.path,
        byteLength: packFile.byteLength,
        sha256: digestHex(buildPackFileContent(packFile)),
      },
    ]),
  );
};

const getWritablePackFile = (builder: PackBuilder, nextByteLength: number) => {
  const current = builder.currentPackFile;
  if (current && (current.byteLength === 0 || current.byteLength + nextByteLength <= PACK_ASSET_MAX_PACK_BYTES)) {
    return current;
  }

  const index = builder.packFiles.length;
  const id = `pack-${index.toString().padStart(3, '0')}`;
  const packFile: GeneratedPackFile = {
    id,
    path: `${PACK_ASSET_DIRNAME}/${id}.bin`,
    chunks: [],
    byteLength: 0,
    entries: [],
  };

  builder.packFiles.push(packFile);
  builder.currentPackFile = packFile;
  return packFile;
};

const buildPackFileContent = (packFile: GeneratedPackFile) => {
  return Buffer.concat(packFile.chunks, packFile.byteLength);
};

const toFileConversionType = (resourceType: ResourceType): FileConversionRecord['type'] => {
  return resourceType;
};

const toPackEntryType = (resourceType: ResourceType): PackEntrySummary['type'] => {
  if (resourceType === 'image' || resourceType === 'audio' || resourceType === 'data') return resourceType;
  return 'file';
};

const digestHex = (content: Buffer | Uint8Array) => {
  return createHash('sha256').update(content).digest('hex');
};

const inferContentType = (resourceType: ResourceType, extension: string) => {
  const normalized = extension.toLowerCase();
  if (resourceType === 'image') {
    if (normalized === 'png') return 'image/png';
    if (normalized === 'jpg' || normalized === 'jpeg') return 'image/jpeg';
    if (normalized === 'bmp') return 'image/bmp';
  }
  if (resourceType === 'data') return 'application/octet-stream';

  return undefined;
};
