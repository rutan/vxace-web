import { converterAssetUrl } from './template';
import type { ZipFileEntry } from './zip';

export interface PreviewSession {
  id: string;
  srcDoc: string;
  dispose: () => void;
}

type SaveRecord = {
  base64: string;
  updatedAt: string;
};

type PreviewHostSession = {
  files: Map<string, Uint8Array>;
  saves: Map<string, SaveRecord>;
};

type PreviewHost = {
  contentType: (path: string) => string;
  deleteSavedData: (sessionId: string, gameId: string, filename: string) => void;
  dispose: (sessionId: string) => void;
  getSavedDataInfo: (
    sessionId: string,
    gameId: string,
    filename: string,
  ) => { filename: string; updatedAt: string } | null;
  listSavedData: (sessionId: string, gameId: string) => { filename: string; updatedAt: string }[];
  loadSavedBinaryBase64: (sessionId: string, gameId: string, filename: string) => string | null;
  readFile: (sessionId: string, path: string) => ArrayBuffer | null;
  saveBinaryBase64: (sessionId: string, gameId: string, filename: string, base64: string) => void;
};

type PreviewWindow = Window &
  typeof globalThis & {
    __vxaceWebConverterPreviewHost?: PreviewHost;
  };

const sessions = new Map<string, PreviewHostSession>();

export const createPreviewSession = (entries: ZipFileEntry[]): PreviewSession => {
  const id = createSessionId();
  const files = new Map<string, Uint8Array>();

  for (const entry of entries) {
    const path = normalizePreviewPath(entry.path);
    if (path) files.set(path, entry.content);
  }

  const indexHtml = decodeTextFile(files.get('index.html'), 'index.html');
  sessions.set(id, { files, saves: new Map() });
  installPreviewHost();

  return {
    id,
    srcDoc: buildPreviewSrcDoc(indexHtml, id),
    dispose: () => disposePreviewSession(id),
  };
};

const installPreviewHost = () => {
  const previewWindow = window as PreviewWindow;
  if (previewWindow.__vxaceWebConverterPreviewHost) return;

  previewWindow.__vxaceWebConverterPreviewHost = {
    contentType: detectContentType,
    deleteSavedData(sessionId, gameId, filename) {
      getSession(sessionId).saves.delete(saveKey(gameId, filename));
    },
    dispose: disposePreviewSession,
    getSavedDataInfo(sessionId, gameId, filename) {
      const record = getSession(sessionId).saves.get(saveKey(gameId, filename));
      return record ? { filename, updatedAt: record.updatedAt } : null;
    },
    listSavedData(sessionId, gameId) {
      const prefix = `${gameId}\n`;
      return Array.from(getSession(sessionId).saves.entries())
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, record]) => ({ filename: key.slice(prefix.length), updatedAt: record.updatedAt }))
        .sort((left, right) => left.filename.localeCompare(right.filename));
    },
    loadSavedBinaryBase64(sessionId, gameId, filename) {
      return getSession(sessionId).saves.get(saveKey(gameId, filename))?.base64 ?? null;
    },
    readFile(sessionId, path) {
      const bytes = getSession(sessionId).files.get(normalizePreviewPath(path));
      if (!bytes) return null;

      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    },
    saveBinaryBase64(sessionId, gameId, filename, base64) {
      getSession(sessionId).saves.set(saveKey(gameId, filename), {
        base64,
        updatedAt: new Date().toISOString(),
      });
    },
  };
};

const disposePreviewSession = (id: string) => {
  sessions.delete(id);
};

const getSession = (id: string) => {
  const session = sessions.get(id);
  if (!session) throw new Error('preview session is no longer available');
  return session;
};

const buildPreviewSrcDoc = (html: string, sessionId: string) => {
  const withBase = injectIntoHead(
    html,
    `<base href="${escapeAttribute(new URL(converterAssetUrl('template/'), window.location.href).href)}">`,
  );
  return injectBeforeRuntimeModule(withBase, createPreviewBridgeScript(sessionId));
};

const injectIntoHead = (html: string, injection: string) => {
  return html.replace(/<head([^>]*)>/i, (match) => `${match}\n    ${injection}`);
};

const injectBeforeRuntimeModule = (html: string, injection: string) => {
  const moduleScriptPattern = /<script\s+type=["']module["'][^>]*>/i;
  if (moduleScriptPattern.test(html)) return html.replace(moduleScriptPattern, `${injection}\n    $&`);
  return html.replace(/<\/head>/i, `${injection}\n  </head>`);
};

const createPreviewBridgeScript = (sessionId: string) => {
  return `<script>
(() => {
  const sessionId = ${JSON.stringify(sessionId)};
  const host = window.parent.__vxaceWebConverterPreviewHost;
  const decoder = new TextDecoder();

  const normalizePath = (value) => {
    const raw = String(value ?? '').replace(/\\\\/g, '/').replace(/^\\.\\//, '');
    const parsed = (() => {
      try {
        return new URL(raw, document.baseURI);
      } catch {
        return null;
      }
    })();
    const pathname = parsed ? decodeURIComponent(parsed.pathname) : raw;
    const normalized = pathname.replace(/^\\/+/, '');
    const gameIndex = normalized.indexOf('/game/');
    if (gameIndex >= 0) return normalized.slice(gameIndex + 1);
    return normalized.replace(/^.*?converter-assets\\/template\\//, '').replace(/^\\/+/, '');
  };

  const fetchPath = async (path) => {
    const normalizedPath = normalizePath(path);
    const buffer = host.readFile(sessionId, normalizedPath);
    if (!buffer) throw new Error('preview file not found: ' + normalizedPath);
    return { buffer, path: normalizedPath };
  };

  const responseForPath = async (path) => {
    const file = await fetchPath(path);
    return new Response(file.buffer, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': host.contentType(file.path),
      },
    });
  };

  const previousConfig = window.RPGVXAceWeb ?? {};
  window.RPGVXAceWeb = {
    ...previousConfig,
    resolveManifest: async (gameDir) => {
      const file = await fetchPath(String(gameDir).replace(/\\/+$/, '') + '/manifest.json');
      return JSON.parse(decoder.decode(file.buffer));
    },
    resourceFetchAdapter: {
      fetch: async (input) => responseForPath(typeof input === 'string' ? input : input?.url),
    },
    saveStorageAdapter: {
      saveBinaryBase64: async (gameId, filename, base64) => {
        host.saveBinaryBase64(sessionId, gameId, filename, base64);
      },
      loadSavedBinaryBase64: async (gameId, filename) => host.loadSavedBinaryBase64(sessionId, gameId, filename),
      getSavedDataInfo: async (gameId, filename) => host.getSavedDataInfo(sessionId, gameId, filename),
      listSavedData: async (gameId) => host.listSavedData(sessionId, gameId),
      deleteSavedData: async (gameId, filename) => {
        host.deleteSavedData(sessionId, gameId, filename);
      },
    },
  };
})();
</script>`;
};

const decodeTextFile = (bytes: Uint8Array | undefined, path: string) => {
  if (!bytes) throw new Error(`preview file not found: ${path}`);
  return new TextDecoder().decode(bytes);
};

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `preview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const normalizePreviewPath = (path: string) => {
  return path.normalize('NFC').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+/g, '/');
};

const saveKey = (gameId: string, filename: string) => {
  return `${gameId}\n${filename}`;
};

const escapeAttribute = (value: string) => {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
};

const detectContentType = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    bmp: 'image/bmp',
    css: 'text/css; charset=utf-8',
    gif: 'image/gif',
    html: 'text/html; charset=utf-8',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    js: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    m4a: 'audio/mp4',
    mid: 'audio/midi',
    midi: 'audio/midi',
    mjs: 'text/javascript; charset=utf-8',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    png: 'image/png',
    svg: 'image/svg+xml',
    wasm: 'application/wasm',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };

  return extension ? (contentTypes[extension] ?? 'application/octet-stream') : 'application/octet-stream';
};
