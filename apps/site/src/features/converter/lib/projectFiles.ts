import type { BrowserInputFile } from '@rutan/rpgmaker-vxace-web-converter-core/browser';

export interface ProjectFileEntry extends BrowserInputFile {
  file: File;
}

type LocalFileSystemEntry = {
  fullPath: string;
  name: string;
  isFile: boolean;
  isDirectory: boolean;
};

type LocalFileSystemFileEntry = LocalFileSystemEntry & {
  file: (success: (file: File) => void, error?: (error: DOMException) => void) => void;
};

type LocalFileSystemDirectoryEntry = LocalFileSystemEntry & {
  createReader: () => {
    readEntries: (success: (entries: LocalFileSystemEntry[]) => void, error?: (error: DOMException) => void) => void;
  };
};

type WebkitDataTransferItem = DataTransferItem & {
  webkitGetAsEntry?: () => LocalFileSystemEntry | null;
};

export const readEntriesFromInput = (files: FileList | null): ProjectFileEntry[] => {
  if (!files) return [];

  return [...files].map((file) => ({
    path: getFileRelativePath(file),
    file,
  }));
};

export const readEntriesFromDataTransfer = async (dataTransfer: DataTransfer): Promise<ProjectFileEntry[]> => {
  const itemEntries = [...dataTransfer.items]
    .map((item) => (item as WebkitDataTransferItem).webkitGetAsEntry?.() as LocalFileSystemEntry | null | undefined)
    .filter((entry): entry is LocalFileSystemEntry => entry !== null && entry !== undefined);

  if (itemEntries.length > 0) {
    const groups = await Promise.all(itemEntries.map((entry) => readWebkitEntry(entry)));
    return groups.flat();
  }

  return [...dataTransfer.files].map((file) => ({
    path: getFileRelativePath(file),
    file,
  }));
};

export const normalizeProjectFiles = (files: ProjectFileEntry[]) => {
  const normalized = files
    .map((entry) => ({
      path: normalizePath(entry.path),
      file: entry.file,
    }))
    .filter((entry) => entry.path.length > 0)
    .sort((left, right) => left.path.localeCompare(right.path));
  const gameIni = normalized
    .filter((entry) => isGameIniPath(entry.path))
    .sort((left, right) => left.path.length - right.path.length || left.path.localeCompare(right.path))[0];

  if (!gameIni) return normalized;

  const rootPrefix = dirname(gameIni.path);
  if (!rootPrefix) {
    return normalized.map((entry) => ({
      ...entry,
      path: normalizeGameIniPath(entry.path),
    }));
  }

  const prefix = `${rootPrefix}/`;
  return normalized
    .filter((entry) => entry.path.startsWith(prefix))
    .map((entry) => ({
      path: normalizeGameIniPath(entry.path.slice(prefix.length)),
      file: entry.file,
    }))
    .filter((entry) => entry.path.length > 0);
};

export const detectProjectName = (files: ProjectFileEntry[]) => {
  const gameIni = files
    .map((entry) => normalizePath(entry.path))
    .filter(isGameIniPath)
    .sort((left, right) => left.length - right.length || left.localeCompare(right))[0];
  if (!gameIni) return 'VX Ace Project';

  const parent = gameIni.split('/').slice(0, -1).at(-1);
  return parent || 'VX Ace Project';
};

export const readGameIniTitle = async (files: ProjectFileEntry[]): Promise<string | undefined> => {
  const gameIni = files
    .filter((entry) => {
      return isGameIniPath(normalizePath(entry.path));
    })
    .sort((left, right) => left.path.length - right.path.length || left.path.localeCompare(right.path))[0];
  if (!gameIni) return undefined;

  const content = decodeGameIni(new Uint8Array(await gameIni.file.arrayBuffer()));
  let section = '';
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;

    const sectionMatch = /^\[([^\]]+)]$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1]?.trim().toLowerCase() ?? '';
      continue;
    }

    if (section !== 'game') continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    if (key !== 'title') continue;
    const value = line.slice(separatorIndex + 1).trim();
    return value || undefined;
  }

  return undefined;
};

const getFileRelativePath = (file: File) => {
  const withWebkitPath = file as File & { webkitRelativePath?: string };
  return withWebkitPath.webkitRelativePath || file.name;
};

const readWebkitEntry = async (entry: LocalFileSystemEntry): Promise<ProjectFileEntry[]> => {
  if (entry.isFile) {
    const file = await readWebkitFile(entry as LocalFileSystemFileEntry);
    return [
      {
        path: entry.fullPath,
        file,
      },
    ];
  }

  if (entry.isDirectory) {
    const childEntries = await readWebkitDirectoryEntries(entry as LocalFileSystemDirectoryEntry);
    const childGroups = await Promise.all(childEntries.map((childEntry) => readWebkitEntry(childEntry)));
    return childGroups.flat();
  }

  return [];
};

const readWebkitFile = (entry: LocalFileSystemFileEntry) => {
  return new Promise<File>((resolve, reject) => {
    entry.file(resolve, reject);
  });
};

const readWebkitDirectoryEntries = (entry: LocalFileSystemDirectoryEntry) => {
  const reader = entry.createReader();
  const entries: LocalFileSystemEntry[] = [];

  return new Promise<LocalFileSystemEntry[]>((resolve, reject) => {
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries);
          return;
        }

        entries.push(...batch);
        readBatch();
      }, reject);
    };

    readBatch();
  });
};

const decodeGameIni = (content: Uint8Array) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    return new TextDecoder('shift_jis').decode(content);
  }
};

const normalizePath = (value: string) => {
  return value.replace(/\\/g, '/').replace(/^\/+/, '');
};

const normalizeGameIniPath = (path: string) => {
  return path.toLowerCase() === 'game.ini' ? 'Game.ini' : path;
};

const isGameIniPath = (path: string) => {
  const normalized = normalizePath(path).toLowerCase();
  return normalized === 'game.ini' || normalized.endsWith('/game.ini');
};

const dirname = (path: string) => {
  const index = path.lastIndexOf('/');
  return index >= 0 ? path.slice(0, index) : '';
};
