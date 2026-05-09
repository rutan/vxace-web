import type { PlaygroundFileEntry } from './types';

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

export async function readEntriesFromInput(files: FileList | null): Promise<PlaygroundFileEntry[]> {
  if (!files) return [];

  return [...files].map((file) => ({
    path: getFileRelativePath(file),
    file,
  }));
}

export async function readEntriesFromDataTransfer(dataTransfer: DataTransfer): Promise<PlaygroundFileEntry[]> {
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
}

function getFileRelativePath(file: File) {
  const withWebkitPath = file as File & { webkitRelativePath?: string };
  return withWebkitPath.webkitRelativePath || file.name;
}

async function readWebkitEntry(entry: LocalFileSystemEntry): Promise<PlaygroundFileEntry[]> {
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
}

function readWebkitFile(entry: LocalFileSystemFileEntry) {
  return new Promise<File>((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

function readWebkitDirectoryEntries(entry: LocalFileSystemDirectoryEntry) {
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
}
