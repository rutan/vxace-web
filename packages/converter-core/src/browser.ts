import { MANIFEST_FILENAME, PACK_ASSET_DIRNAME, SAFE_ASSET_DIRNAME } from './internal/constants';
import { convertGameEngine, type ConvertGameEngineOptions } from './internal/convertGameEngine';
import { ConversionOutput, ConversionRuntime, ConversionSource, SourceFileList } from './internal/environment';
import { normalizeRelativePath, posixBasename, posixDirname, posixExtname } from './internal/pathUtils';
import { ConvertGameResult } from './types';

export interface BrowserInputFile {
  path: string;
  file: Blob;
}

export interface BrowserOutputFile {
  path: string;
  content: Uint8Array;
}

export type ConvertGameInBrowserOptions = Omit<ConvertGameEngineOptions, 'source' | 'output' | 'runtime'> & {
  files: Iterable<BrowserInputFile>;
};

export type ConvertGameInBrowserResult = ConvertGameResult & {
  outputFiles: BrowserOutputFile[];
};

const EXCLUDED_SOURCE_FILENAMES = new Set(['.ds_store', 'desktop.ini', 'thumbs.db']);
const EXCLUDED_SOURCE_DIRNAMES = new Set(['.git', '.hg', '.svn']);
const textEncoder = new TextEncoder();

export const convertGameInBrowser = async (
  options: ConvertGameInBrowserOptions,
): Promise<ConvertGameInBrowserResult> => {
  const source = createBrowserFileSource(options.files);
  const output = createMemoryOutput();
  const result = await convertGameEngine({
    ...options,
    source,
    output,
    outputRoot: options.outputRoot ?? '',
    runtime: browserRuntime,
  });

  return {
    ...result.report,
    outputFiles: output.files,
  };
};

export const createBrowserFileSource = (files: Iterable<BrowserInputFile>): ConversionSource => {
  const normalizedFiles = normalizeInputFiles(files);
  const filesByPath = new Map(normalizedFiles.map((file) => [file.path, file.file]));

  return {
    async listFiles() {
      return buildSourceFileList(normalizedFiles.map((file) => file.path));
    },
    async readFile(relativePath) {
      const file = filesByPath.get(normalizeRelativePath(relativePath));
      if (!file) throw new Error(`source file was not found: ${relativePath}`);
      return new Uint8Array(await file.arrayBuffer());
    },
    async fileExists(relativePath) {
      return filesByPath.has(normalizeRelativePath(relativePath));
    },
  };
};

export const createMemoryOutput = (): ConversionOutput & { files: BrowserOutputFile[] } => {
  const files: BrowserOutputFile[] = [];

  return {
    files,
    async writeFile(relativePath, content) {
      const normalizedPath = normalizeRelativePath(relativePath);
      const bytes = typeof content === 'string' ? textEncoder.encode(content) : content;
      const existingIndex = files.findIndex((file) => file.path === normalizedPath);
      const outputFile = {
        path: normalizedPath,
        content: bytes.slice(),
      };

      if (existingIndex >= 0) {
        files[existingIndex] = outputFile;
      } else {
        files.push(outputFile);
      }
    },
    async removeDirectory(relativePath) {
      const prefix = `${normalizeRelativePath(relativePath).replace(/\/+$/g, '')}/`;
      for (let index = files.length - 1; index >= 0; index -= 1) {
        if (files[index]?.path.startsWith(prefix)) files.splice(index, 1);
      }
    },
  };
};

export const browserRuntime: ConversionRuntime = {
  async sha256Hex(parts) {
    const chunks = parts.map((part) => (typeof part === 'string' ? textEncoder.encode(part) : part));
    const digest = await crypto.subtle.digest('SHA-256', concatBytes(chunks, chunksByteLength(chunks)));
    return toHex(new Uint8Array(digest));
  },
  async inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream is not available in this browser');
    }

    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  },
  concatBytes,
};

const normalizeInputFiles = (files: Iterable<BrowserInputFile>) => {
  const normalized = [...files]
    .map((entry) => ({
      path: normalizeRelativePath(entry.path),
      file: entry.file,
    }))
    .filter((entry) => entry.path.length > 0)
    .sort((left, right) => left.path.localeCompare(right.path));
  const gameIni = normalized
    .filter((entry) => {
      const lookupPath = entry.path.toLowerCase();
      return lookupPath === 'game.ini' || lookupPath.endsWith('/game.ini');
    })
    .sort((left, right) => left.path.length - right.path.length || left.path.localeCompare(right.path))[0];

  if (!gameIni) return normalized;

  const rootPrefix = posixDirname(gameIni.path);
  if (!rootPrefix) return normalized;

  const prefix = `${rootPrefix}/`;
  return normalized
    .filter((entry) => entry.path.startsWith(prefix))
    .map((entry) => ({
      path: entry.path.slice(prefix.length),
      file: entry.file,
    }))
    .filter((entry) => entry.path.length > 0);
};

const buildSourceFileList = (paths: string[]): SourceFileList => {
  const files: string[] = [];
  const ignoredFiles = new Set<string>();

  for (const path of paths) {
    const segments = path.split('/');
    const ignoredDirectoryIndex = segments.findIndex((segment) => isExcludedSourceDirectory(segment));
    if (ignoredDirectoryIndex >= 0) {
      ignoredFiles.add(`${segments.slice(0, ignoredDirectoryIndex + 1).join('/')}/`);
      continue;
    }

    if (
      path === MANIFEST_FILENAME ||
      isExcludedSourceFilename(posixBasename(path)) ||
      isExcludedSourceExtension(posixExtname(path))
    ) {
      ignoredFiles.add(path);
      continue;
    }

    files.push(path);
  }

  return {
    files: files.sort((left, right) => left.localeCompare(right)),
    ignoredFiles: [...ignoredFiles].sort((left, right) => left.localeCompare(right)),
  };
};

const isExcludedSourceExtension = (extension: string) => {
  const normalized = extension.toLowerCase();
  return normalized === '.dll' || normalized === '.exe' || normalized === '.rgss3a' || normalized === '.rvproj2';
};

const isExcludedSourceFilename = (filename: string) => {
  return EXCLUDED_SOURCE_FILENAMES.has(filename.toLowerCase());
};

const isExcludedSourceDirectory = (dirname: string) => {
  return (
    dirname === SAFE_ASSET_DIRNAME ||
    dirname === PACK_ASSET_DIRNAME ||
    EXCLUDED_SOURCE_DIRNAMES.has(dirname.toLowerCase())
  );
};

function concatBytes(chunks: readonly Uint8Array[], byteLength: number) {
  const result = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

const chunksByteLength = (chunks: readonly Uint8Array[]) => {
  return chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
};

const toHex = (bytes: Uint8Array) => {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
