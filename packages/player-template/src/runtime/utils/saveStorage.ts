import type { GameAssetProvider } from '../core/GameAssetProvider';
import { trackBlockingResourceWait } from './blockingResourceWait';

const DB_NAME = 'rpgvxace-web-save';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const MISSING_BINARY_BASE64 = '__RPGVXACE_WEB_MISSING_BINARY_BASE64__';

type SaveRecord = {
  key: string;
  gameId: string;
  filename: string;
  base64: string;
  updatedAt: string;
};

export type SavedDataInfo = {
  filename: string;
  updatedAt: string;
};

export type SaveStorageAdapter = {
  saveBinaryBase64(gameId: string, filename: string, base64: string): Promise<void>;
  loadSavedBinaryBase64(gameId: string, filename: string): Promise<string | null>;
  getSavedDataInfo(gameId: string, filename: string): Promise<SavedDataInfo | null>;
  listSavedData(gameId: string): Promise<SavedDataInfo[]>;
  deleteSavedData(gameId: string, filename: string): Promise<void>;
};

let resourceAssetProvider: GameAssetProvider | null = null;
let saveStorageAdapter: SaveStorageAdapter = createIndexedDbSaveStorageAdapter();

export function configureSaveStorageAssetProvider(assetProvider: GameAssetProvider) {
  resourceAssetProvider = assetProvider;
}

export function configureSaveStorageAdapter(adapter: SaveStorageAdapter) {
  assertSaveStorageAdapter(adapter);
  saveStorageAdapter = adapter;
}

export async function saveBinaryBase64(gameId: string, filename: string, base64: string) {
  const normalizedGameId = normalizeGameId(gameId);
  const normalizedFilename = normalizeFilename(filename);

  await saveStorageAdapter.saveBinaryBase64(normalizedGameId, normalizedFilename, base64);
}

export async function loadSavedBinaryBase64(gameId: string, filename: string) {
  const normalizedGameId = normalizeGameId(gameId);
  const normalizedFilename = normalizeFilename(filename);

  return saveStorageAdapter.loadSavedBinaryBase64(normalizedGameId, normalizedFilename);
}

export async function loadSavedBinaryBase64ForRuby(gameId: string, filename: string) {
  return (await loadSavedBinaryBase64(gameId, filename)) ?? MISSING_BINARY_BASE64;
}

export async function loadVirtualBinaryBase64(gameId: string, filename: string) {
  const normalizedGameId = normalizeGameId(gameId);
  const savedBase64 = await loadSavedBinaryBase64(normalizedGameId, filename);
  if (savedBase64 !== null) return savedBase64;

  const assetProvider = resourceAssetProvider;
  if (assetProvider?.manifest.id === normalizedGameId) {
    const resource = assetProvider.resolveResource(filename);
    if (resource) {
      return trackBlockingResourceWait({ kind: 'data', label: filename }, () =>
        assetProvider.loadBase64(resource, { kind: 'data', label: filename }),
      );
    }
  }

  return MISSING_BINARY_BASE64;
}

export async function virtualFileExists(gameId: string, filename: string) {
  const normalizedGameId = normalizeGameId(gameId);
  const savedBase64 = await loadSavedBinaryBase64(normalizedGameId, filename);
  if (savedBase64 !== null) return true;

  return resourceAssetProvider?.manifest.id === normalizedGameId && resourceAssetProvider.resourceExists(filename);
}

export async function getSavedDataInfo(gameId: string, filename: string) {
  const normalizedGameId = normalizeGameId(gameId);
  const normalizedFilename = normalizeFilename(filename);

  const info = await saveStorageAdapter.getSavedDataInfo(normalizedGameId, normalizedFilename);
  return info ? { filename: normalizedFilename, updatedAt: info.updatedAt } : null;
}

export async function listSavedData(gameId: string) {
  const normalizedGameId = normalizeGameId(gameId);

  return (await saveStorageAdapter.listSavedData(normalizedGameId))
    .map((info) => ({ filename: normalizeFilename(info.filename), updatedAt: info.updatedAt }))
    .sort((left, right) => left.filename.localeCompare(right.filename));
}

export async function deleteSavedData(gameId: string, filename: string) {
  const normalizedGameId = normalizeGameId(gameId);
  const normalizedFilename = normalizeFilename(filename);

  await saveStorageAdapter.deleteSavedData(normalizedGameId, normalizedFilename);
}

function createIndexedDbSaveStorageAdapter(): SaveStorageAdapter {
  return {
    async saveBinaryBase64(gameId, filename, base64) {
      const db = await openSaveDatabase();
      try {
        const record: SaveRecord = {
          key: buildStorageKey(gameId, filename),
          gameId,
          filename,
          base64,
          updatedAt: new Date().toISOString(),
        };

        await runStoreRequest(db, 'readwrite', (store) => store.put(record));
      } finally {
        db.close();
      }
    },

    async loadSavedBinaryBase64(gameId, filename) {
      const db = await openSaveDatabase();
      try {
        const record = await runStoreRequest<SaveRecord | undefined>(db, 'readonly', (store) =>
          store.get(buildStorageKey(gameId, filename)),
        );

        return record?.base64 ?? null;
      } finally {
        db.close();
      }
    },

    async getSavedDataInfo(gameId, filename) {
      const db = await openSaveDatabase();
      try {
        const record = await runStoreRequest<SaveRecord | undefined>(db, 'readonly', (store) =>
          store.get(buildStorageKey(gameId, filename)),
        );

        return record ? toSavedDataInfo(record) : null;
      } finally {
        db.close();
      }
    },

    async listSavedData(gameId) {
      const db = await openSaveDatabase();
      try {
        const records = await runStoreRequest<SaveRecord[]>(db, 'readonly', (store) => store.getAll());

        return records
          .filter((record) => record.gameId === gameId)
          .map(toSavedDataInfo)
          .sort((left, right) => left.filename.localeCompare(right.filename));
      } finally {
        db.close();
      }
    },

    async deleteSavedData(gameId, filename) {
      const db = await openSaveDatabase();
      try {
        await runStoreRequest(db, 'readwrite', (store) => store.delete(buildStorageKey(gameId, filename)));
      } finally {
        db.close();
      }
    },
  };
}

function assertSaveStorageAdapter(value: SaveStorageAdapter) {
  for (const methodName of [
    'saveBinaryBase64',
    'loadSavedBinaryBase64',
    'getSavedDataInfo',
    'listSavedData',
    'deleteSavedData',
  ] as const) {
    if (typeof value[methodName] !== 'function') {
      throw new TypeError(`invalid save storage adapter: missing ${methodName}`);
    }
  }
}

const openSaveDatabase = () => {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available'));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('failed to open save database'));
    request.onblocked = () => reject(new Error('save database open was blocked'));
  });
};

const runStoreRequest = <T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = createRequest(transaction.objectStore(STORE_NAME));
    let result: T;

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error ?? new Error('save storage request failed'));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error('save storage transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('save storage transaction aborted'));
  });
};

const buildStorageKey = (gameId: string, filename: string) => {
  return `v1:${encodeURIComponent(gameId)}:${encodeURIComponent(filename)}`;
};

const toSavedDataInfo = (record: SaveRecord): SavedDataInfo => {
  return {
    filename: record.filename,
    updatedAt: record.updatedAt,
  };
};

const normalizeGameId = (value: string) => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
    throw new Error(`invalid game id: ${value}`);
  }

  return value;
};

const normalizeFilename = (value: string) => {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').includes('..')) {
    throw new Error(`invalid save filename: ${value}`);
  }

  return normalized;
};
