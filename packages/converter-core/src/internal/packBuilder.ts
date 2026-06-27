import type {
  ManifestPackRecord,
  ManifestResourcePackData,
  ResourceType,
} from '@rutan/rpgmaker-vxace-web-game-manifest';
import type { FileConversionRecord, PackEntrySummary } from '../types';
import { PACK_ASSET_DIRNAME, PACK_ASSET_MAX_PACK_BYTES } from './constants';
import { ConversionRuntime, ConversionSource } from './environment';
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
  chunks: Uint8Array[];
  byteLength: number;
  entries: PackEntrySummary[];
}

export interface MaterializePackedResourceInput {
  source: ConversionSource;
  runtime: ConversionRuntime;
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
  const { extension, relativePath, resourceType, runtime, source } = input;
  const content = await source.readFile(relativePath);
  const packFile = getWritablePackFile(builder, content.byteLength);
  const offset = packFile.byteLength;

  packFile.chunks.push(content);
  packFile.byteLength += content.byteLength;
  builder.packedSourcePaths.add(relativePath);
  packFile.entries.push({
    sourcePath: relativePath,
    logicalPath: stripExtension(relativePath),
    type: toPackEntryType(resourceType),
    offset,
    length: content.byteLength,
  });

  return {
    data: {
      kind: 'pack',
      packId: packFile.id,
      offset,
      length: content.byteLength,
      byteLength: content.byteLength,
      sha256: await runtime.sha256Hex([content]),
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
        length: content.byteLength,
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

export const writePackFiles = async (options: {
  builder: PackBuilder;
  output: { writeFile(relativePath: string, content: Uint8Array): Promise<void> };
  runtime: ConversionRuntime;
}) => {
  const { builder, output, runtime } = options;
  for (const packFile of builder.packFiles) {
    await output.writeFile(packFile.path, buildPackFileContent({ packFile, runtime }));
  }
};

export const buildManifestPacks = async (options: {
  builder: PackBuilder;
  runtime: ConversionRuntime;
}): Promise<Record<string, ManifestPackRecord>> => {
  const { builder, runtime } = options;
  return Object.fromEntries(
    await Promise.all(
      builder.packFiles.map(
        async (packFile): Promise<[string, ManifestPackRecord]> => [
          packFile.id,
          {
            path: packFile.path,
            byteLength: packFile.byteLength,
            sha256: await runtime.sha256Hex([buildPackFileContent({ packFile, runtime })]),
          },
        ],
      ),
    ),
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

const buildPackFileContent = (options: { packFile: GeneratedPackFile; runtime: ConversionRuntime }) => {
  const { packFile, runtime } = options;
  return runtime.concatBytes(packFile.chunks, packFile.byteLength);
};

const toFileConversionType = (resourceType: ResourceType): FileConversionRecord['type'] => {
  return resourceType;
};

const toPackEntryType = (resourceType: ResourceType): PackEntrySummary['type'] => {
  if (resourceType === 'image' || resourceType === 'audio' || resourceType === 'data') return resourceType;
  return 'file';
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
