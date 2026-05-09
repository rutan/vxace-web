import { createReadStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import * as path from 'node:path';
import { TextDecoder } from 'node:util';
import { convertToDistribution, type ConvertToDistributionResult } from '@rutan/rpgmaker-vxace-web-converter-core';
import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type MenuItemConstructorOptions } from 'electron';
import * as v from 'valibot';
import {
  appErrorCodes,
  CodedAppError,
  conversionDraftSchema,
  createSettingsFile,
  isAppErrorCode,
  parseSettingsFile,
  toAppErrorPayload,
  type ConversionDraft,
  type Draft,
} from '../shared';
import {
  converterChannels,
  type AnalyzeGameDirectoryRequest,
  type AppLanguage,
  type AppResult,
  type ConversionSummary,
  type DirectorySelection,
  type FileSelection,
  type GameAnalysis,
  type PreviewServerInfo,
  type StartPreviewServerRequest,
} from '../shared/converterApi';
import { i18nObject } from '../shared/i18n/i18n-util.js';
import { loadAllLocales } from '../shared/i18n/i18n-util.sync.js';

loadAllLocales();

app.on('window-all-closed', () => {
  void stopPreviewServer().finally(() => app.exit());
});

async function bootstrap(): Promise<void> {
  await app.whenReady();
  currentLanguage = normalizeLanguage(app.getLocale());

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 480,
    show: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  installApplicationMenu();

  const url = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && url) {
    await mainWindow.loadURL(url);
  } else {
    await mainWindow.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  }

  mainWindow.show();
  mainWindow.focus();
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start converter app:', error);
  app.exit(1);
});

const normalizeLanguage = (language: string | undefined): AppLanguage => {
  const normalized = language?.toLowerCase();
  if (normalized?.startsWith('ja')) return 'ja';
  return 'en';
};

let currentLanguage: AppLanguage = 'en';

const LL = () => i18nObject(currentLanguage);

const LAST_DRAFT_SETTINGS_FILENAME = 'draft-settings.json';

const getLastDraftSettingsFilePath = () => {
  return path.join(app.getPath('userData'), LAST_DRAFT_SETTINGS_FILENAME);
};

const setCurrentLanguage = (language: AppLanguage, options: { notifyRenderer: boolean }) => {
  currentLanguage = normalizeLanguage(language);
  installApplicationMenu();

  if (options.notifyRenderer) {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(converterChannels.languageChanged, currentLanguage);
    }
  }
};

const sendToAllWindows = (channel: string, ...args: unknown[]) => {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, ...args);
  }
};

const installApplicationMenu = () => {
  const ll = LL();
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }],
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: ll.main.fileMenu(),
      submenu: [
        {
          accelerator: 'CmdOrCtrl+N',
          click: () => sendToAllWindows(converterChannels.newDraftRequested),
          label: ll.main.newDraft(),
        },
        { type: 'separator' },
        {
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToAllWindows(converterChannels.openSettingsFileRequested),
          label: ll.main.openSettingsFile(),
        },
        {
          accelerator: 'CmdOrCtrl+S',
          click: () => sendToAllWindows(converterChannels.saveSettingsFileRequested),
          label: ll.main.saveSettingsFile(),
        },
        { type: 'separator' },
        {
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          label: ll.main.quit(),
          role: 'quit',
        },
      ],
    },
    {
      label: ll.main.settingsMenu(),
      submenu: [
        {
          label: ll.app.language(),
          submenu: [
            {
              checked: currentLanguage === 'en',
              click: () => setCurrentLanguage('en', { notifyRenderer: true }),
              label: ll.app.languageEnglish(),
              type: 'radio',
            },
            {
              checked: currentLanguage === 'ja',
              click: () => setCurrentLanguage('ja', { notifyRenderer: true }),
              label: ll.app.languageJapanese(),
              type: 'radio',
            },
          ],
        },
      ],
    },
    {
      label: ll.main.viewMenu(),
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

ipcMain.handle(converterChannels.selectGameDirectory, async (): Promise<DirectorySelection> => {
  const result = await dialog.showOpenDialog({
    title: LL().main.selectGameDirectory(),
    properties: ['openDirectory'],
  });

  return {
    canceled: result.canceled,
    ...(result.filePaths[0] ? { path: result.filePaths[0] } : {}),
  };
});

ipcMain.handle(converterChannels.selectOutputDirectory, async (): Promise<DirectorySelection> => {
  const result = await dialog.showOpenDialog({
    title: LL().main.selectOutputDirectory(),
    properties: ['openDirectory', 'createDirectory'],
  });

  return {
    canceled: result.canceled,
    ...(result.filePaths[0] ? { path: result.filePaths[0] } : {}),
  };
});

ipcMain.handle(converterChannels.selectHtmlInjectionFiles, async (): Promise<FileSelection> => {
  const result = await dialog.showOpenDialog({
    title: LL().main.selectHtmlInjectionFiles(),
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  return {
    canceled: result.canceled,
    ...(result.filePaths.length > 0 ? { paths: result.filePaths } : {}),
  };
});

ipcMain.handle(
  converterChannels.analyzeGameDirectory,
  async (_event, request: AnalyzeGameDirectoryRequest): Promise<AppResult<GameAnalysis>> => {
    return withAppResult(async () => {
      if (!request.srcDir.trim()) throw new CodedAppError(appErrorCodes.draftSrcDirRequired);

      const srcDir = path.resolve(request.srcDir);
      await validateGameRoot(srcDir);

      const title = (await readGameIniTitle(srcDir)) ?? path.basename(srcDir);

      return {
        srcDir,
        title,
      };
    });
  },
);

ipcMain.handle(converterChannels.convertGame, async (_event, input: unknown): Promise<AppResult<ConversionSummary>> => {
  return withAppResult(async () => {
    const draft = parseConversionDraft(input);

    const srcDir = path.resolve(draft.srcDir);
    const outDir = resolveConversionOutputDirectory(draft);
    const excludeSourceFilePatterns = draft.excludeSourceFilePatterns.filter(Boolean);
    const unusedAssetKeepPatterns = draft.keepUnusedAssetsPatterns.filter(Boolean);
    const injectHtmlFilePaths = draft.injectHtmlFilePaths.filter(Boolean);
    const injectHtml = draft.useInjectHtml ? await readInjectionHtmlFiles(injectHtmlFilePaths) : [];

    await validateGameRoot(srcDir);
    await prepareOutputDirectory(srcDir, outDir, { clean: draft.cleanOutDir });

    const result = await convertToDistribution({
      srcDir,
      outDir,
      gameId: draft.gameId,
      metadata: {
        title: draft.title,
        screen: draft.screen,
        input: {
          virtualGamepad: draft.virtualGamepad,
        },
      },
      packAssets: draft.packAssets,
      ...(draft.useExcludeSourceFiles
        ? {
            excludeSourceFiles: {
              patterns: excludeSourceFilePatterns,
            },
          }
        : {}),
      ...(draft.useOmitUnusedAssets
        ? {
            omitUnusedAssets: {
              keepPatterns: unusedAssetKeepPatterns,
            },
          }
        : {}),
      ...(injectHtml.length > 0 ? { injectHtml } : {}),
    });

    return buildSummary(result, {
      source: srcDir,
      output: outDir,
    });
  });
});

const readInjectionHtmlFiles = async (filePaths: string[]): Promise<string[]> => {
  const snippets: string[] = [];
  for (const filePath of filePaths) {
    snippets.push(await fs.readFile(path.resolve(filePath), 'utf8'));
  }
  return snippets;
};

ipcMain.handle(converterChannels.openPath, async (_event, targetPath: string): Promise<AppResult<void>> => {
  return withAppResult(async () => {
    const message = await shell.openPath(targetPath);
    if (message) throw new Error(message);
  });
});

ipcMain.handle(
  converterChannels.startPreviewServer,
  async (_event, request: StartPreviewServerRequest): Promise<AppResult<PreviewServerInfo>> => {
    return withAppResult(async () => {
      if (!request.rootDir.trim()) throw new CodedAppError(appErrorCodes.previewRootRequired);
      return startPreviewServer(path.resolve(request.rootDir));
    });
  },
);

ipcMain.handle(converterChannels.stopPreviewServer, async (): Promise<AppResult<void>> => {
  return withAppResult(async () => {
    await stopPreviewServer();
  });
});

ipcMain.handle(converterChannels.openPreviewUrl, async (_event, url: string): Promise<AppResult<void>> => {
  return withAppResult(async () => {
    if (!previewServer || url !== previewServer.url) throw new CodedAppError(appErrorCodes.previewServerNotRunning);

    await shell.openExternal(url);
  });
});

ipcMain.handle(converterChannels.setLanguage, (_event, language: AppLanguage): void => {
  setCurrentLanguage(language, { notifyRenderer: false });
});

ipcMain.handle(converterChannels.loadLastDraft, async (): Promise<AppResult<Draft | null>> => {
  return withAppResult(async () => {
    const filePath = getLastDraftSettingsFilePath();
    if (!(await fileExists(filePath))) return null;

    return readSettingsFileDraft(filePath);
  });
});

ipcMain.handle(converterChannels.saveLastDraft, async (_event, draft: Draft): Promise<AppResult<void>> => {
  return withAppResult(async () => {
    await writeSettingsFileDraft(getLastDraftSettingsFilePath(), draft);
  });
});

ipcMain.handle(converterChannels.openSettingsFile, async (): Promise<AppResult<Draft | null>> => {
  return withAppResult(async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ extensions: ['json'], name: 'JSON' }],
      properties: ['openFile'],
      title: LL().main.openSettingsFile(),
    });
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) return null;

    return readSettingsFileDraft(filePath);
  });
});

ipcMain.handle(converterChannels.saveSettingsFile, async (_event, draft: Draft): Promise<AppResult<void>> => {
  return withAppResult(async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: 'vxace-web-converter-settings.json',
      filters: [{ extensions: ['json'], name: 'JSON' }],
      title: LL().main.saveSettingsFile(),
    });
    if (result.canceled || !result.filePath) return;

    await writeSettingsFileDraft(result.filePath, draft);
  });
});

const withAppResult = async <T>(operation: () => Promise<T>): Promise<AppResult<T>> => {
  try {
    return {
      ok: true,
      value: await operation(),
    };
  } catch (error) {
    return {
      ok: false,
      error: toAppErrorPayload(error),
    };
  }
};

const parseConversionDraft = (input: unknown): ConversionDraft => {
  const parsed = v.safeParse(conversionDraftSchema, input, {
    abortEarly: true,
    abortPipeEarly: true,
  });
  if (!parsed.success) {
    const message = parsed.issues[0].message;
    throw new CodedAppError(isAppErrorCode(message) ? message : appErrorCodes.unknown, message);
  }

  const draft = parsed.output;
  if (!draft.outputSubdirectoryName) {
    throw new CodedAppError(appErrorCodes.draftOutputSubdirectoryNameRequired);
  }

  return draft;
};

const resolveConversionOutputDirectory = (draft: ConversionDraft) => {
  const outDir = path.resolve(draft.outDir);
  const subdirectoryName = draft.outputSubdirectoryName.trim();
  if (!isSafeOutputSubdirectoryName(subdirectoryName)) {
    throw new CodedAppError(appErrorCodes.draftOutputSubdirectoryNameInvalid);
  }

  return path.resolve(outDir, subdirectoryName);
};

const isSafeOutputSubdirectoryName = (name: string) => {
  return (
    Boolean(name) &&
    name !== '.' &&
    name !== '..' &&
    !path.isAbsolute(name) &&
    !path.win32.isAbsolute(name) &&
    !Array.from(name).some(isReservedOutputNameCharacter)
  );
};

const isReservedOutputNameCharacter = (char: string) => {
  return char.charCodeAt(0) <= 31 || '<>:"/\\|?*'.includes(char);
};

interface PreviewServerState {
  server: Server;
  url: string;
}

let previewServer: PreviewServerState | undefined;

const startPreviewServer = async (rootDir: string): Promise<PreviewServerInfo> => {
  await validatePreviewRoot(rootDir);
  await stopPreviewServer();

  const server = createServer((request, response) => {
    void servePreviewRequest(request, response, rootDir);
  });

  await listenPreviewServer(server);

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new CodedAppError(appErrorCodes.previewStartFailed);
  }

  const url = `http://127.0.0.1:${address.port}/`;
  previewServer = {
    server,
    url,
  };

  return { url };
};

const stopPreviewServer = async () => {
  if (!previewServer) return;

  const { server } = previewServer;
  previewServer = undefined;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
};

const validatePreviewRoot = async (rootDir: string) => {
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(rootDir);
  } catch {
    throw new CodedAppError(appErrorCodes.previewRootMissing);
  }

  if (!stat.isDirectory()) throw new CodedAppError(appErrorCodes.previewRootNotDirectory);
};

const listenPreviewServer = async (server: Server) => {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(0, '127.0.0.1');
  });
};

const servePreviewRequest = async (request: IncomingMessage, response: ServerResponse, rootDir: string) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendPlainResponse(response, 405, 'Method Not Allowed');
    return;
  }

  let targetPath: string;
  try {
    targetPath = resolvePreviewRequestPath(rootDir, request.url ?? '/');
  } catch {
    sendPlainResponse(response, 400, 'Bad Request');
    return;
  }

  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(targetPath);
  } catch {
    sendPlainResponse(response, 404, 'Not Found');
    return;
  }

  if (stat.isDirectory()) {
    targetPath = path.join(targetPath, 'index.html');
    if (!isSameOrInside(rootDir, targetPath)) {
      sendPlainResponse(response, 403, 'Forbidden');
      return;
    }

    try {
      stat = await fs.stat(targetPath);
    } catch {
      sendPlainResponse(response, 404, 'Not Found');
      return;
    }
  }

  if (!stat.isFile()) {
    sendPlainResponse(response, 404, 'Not Found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Length': stat.size,
    'Content-Type': detectContentType(targetPath),
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(targetPath)
    .on('error', () => {
      if (!response.headersSent) sendPlainResponse(response, 500, 'Internal Server Error');
      else response.destroy();
    })
    .pipe(response);
};

const resolvePreviewRequestPath = (rootDir: string, requestUrl: string) => {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  const decodedPathname = decodeURIComponent(url.pathname);
  const relativePath = decodedPathname.replace(/^\/+/, '') || 'index.html';
  const targetPath = path.resolve(rootDir, relativePath);

  if (!isSameOrInside(rootDir, targetPath)) throw new Error('preview path escapes root');
  return targetPath;
};

const isSameOrInside = (parent: string, child: string) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const sendPlainResponse = (response: ServerResponse, statusCode: number, message: string) => {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(`${message}\n`);
};

const detectContentType = (filePath: string) => {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.wasm': 'application/wasm',
    '.bmp': 'image/bmp',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.m4a': 'audio/mp4',
    '.mid': 'audio/midi',
    '.midi': 'audio/midi',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.ogv': 'video/ogg',
    '.webm': 'video/webm',
  };

  return contentTypes[extension] ?? 'application/octet-stream';
};

const validateGameRoot = async (srcDir: string) => {
  if (!(await fileExists(path.join(srcDir, 'Game.ini')))) {
    throw new CodedAppError(appErrorCodes.gameRootGameIniMissing);
  }
};

const prepareOutputDirectory = async (srcDir: string, outDir: string, options: { clean: boolean }) => {
  validateSeparateDirectories(srcDir, outDir);

  const entries = await readDirectoryEntries(outDir);
  if (entries.length === 0) return;

  if (!options.clean) {
    throw new CodedAppError(appErrorCodes.outputExistingFiles);
  }

  await fs.rm(outDir, { recursive: true, force: true });
};

const validateSeparateDirectories = (srcDir: string, outDir: string) => {
  if (srcDir === outDir) {
    throw new CodedAppError(appErrorCodes.outputSameAsSource);
  }
  if (isInside(srcDir, outDir)) {
    throw new CodedAppError(appErrorCodes.outputInsideSource);
  }
  if (isInside(outDir, srcDir)) {
    throw new CodedAppError(appErrorCodes.outputContainsSource);
  }
};

const isInside = (parent: string, child: string) => {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const readDirectoryEntries = async (directory: string) => {
  try {
    return await fs.readdir(directory);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
};

const readSettingsFileDraft = async (filePath: string): Promise<Draft> => {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new CodedAppError(appErrorCodes.settingsFileReadFailed, errorMessage(error));
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new CodedAppError(appErrorCodes.settingsFileInvalid);
  }

  return parseSettingsFile(parsedJson);
};

const writeSettingsFileDraft = async (filePath: string, draft: Draft): Promise<void> => {
  const content = `${JSON.stringify(createSettingsFile(draft), null, 2)}\n`;
  const tempFilePath = `${filePath}.tmp`;

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempFilePath, content, 'utf-8');
    await fs.rename(tempFilePath, filePath);
  } catch (error) {
    await fs.rm(tempFilePath, { force: true }).catch(() => undefined);
    throw new CodedAppError(appErrorCodes.settingsFileWriteFailed, errorMessage(error));
  }
};

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readGameIniTitle = async (srcDir: string): Promise<string | undefined> => {
  let contentBytes: Buffer;
  try {
    contentBytes = await fs.readFile(path.join(srcDir, 'Game.ini'));
  } catch {
    return undefined;
  }

  const content = decodeGameIni(contentBytes);
  let section = '';
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;

    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1].trim().toLowerCase();
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

const decodeGameIni = (content: Uint8Array) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    return new TextDecoder('shift_jis').decode(content);
  }
};

const buildSummary = (
  result: ConvertToDistributionResult,
  context: {
    source: string;
    output: string;
  },
): ConversionSummary => {
  return {
    source: context.source,
    output: context.output,
    title: result.game.title,
    gameId: result.game.gameId,
    convertedFiles: result.files
      .filter((file): file is typeof file & { outputPath: string } => file.outputPath !== null)
      .map((file) => ({
        sourcePath: file.sourcePath,
        outputPath: file.outputPath,
        kind: file.type === 'template' ? ('template' as const) : ('game' as const),
      })),
    omittedFiles: result.files
      .filter(
        (file): file is typeof file & { sourcePath: string } => file.action === 'omitted' && file.sourcePath !== null,
      )
      .map((file) => ({
        sourcePath: file.sourcePath,
        reason: file.reason === 'source-exclude-pattern' ? ('source-file' as const) : ('unused-asset' as const),
      })),
    warnings: result.warnings,
  };
};

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => {
  return error instanceof Error && 'code' in error;
};

const errorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};
