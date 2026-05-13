import { DefaultRubyVM } from '@ruby/4.0-wasm-wasi/dist/browser';
import { GameManifest, GameManifestJson } from '@rutan/rpgmaker-vxace-web-game-manifest';
import rubyWasm from '../../node_modules/@ruby/4.0-wasm-wasi/dist/ruby+stdlib.wasm?url';
import { App, GameAssetProvider, loadGameManifest, preloadManifestFonts } from './core';
import { rubyCode, rubyRuntimeCode } from './ruby';
import { RubyEvalError, RubyManager } from './RubyManager';
import './style.css';
import * as utils from './utils';

type RuntimeWindow = Window & {
  RPGVXAceWeb?: {
    resolveManifest?: (gameDir: string) => Promise<GameManifestJson>;
    resourceFetchAdapter?: utils.ResourceFetchAdapter;
    saveStorageAdapter?: utils.SaveStorageAdapter;
  };
};

const appElement = document.querySelector<HTMLDivElement>('#app')!;
const bootStatusElement = appElement.querySelector<HTMLElement>('.boot-status');
const bootStatusMessageElement = appElement.querySelector<HTMLElement>('.boot-status__message');
let app: App | null = null;

function resolveGameDir(search: string) {
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(search);
    const gameDir = params.get('game_dir');
    if (gameDir && /^[A-Za-z0-9\-_]+$/.test(gameDir)) {
      return gameDir;
    }
  }
  return 'game';
}

function shouldLoadGuestScripts(search: string) {
  const params = new URLSearchParams(search);
  return params.get('guest') !== '0';
}

const setBootStatusMessage = (message: string) => {
  if (bootStatusMessageElement) {
    bootStatusMessageElement.textContent = message;
  }
};

const showRuntimeError = (error: unknown) => {
  const message = formatRuntimeError(error);
  console.error(error);

  if (app) {
    app.showRuntimeError(message);
    return;
  }

  showBootError(message);
};

const showBootError = (message: string) => {
  if (!bootStatusElement || !bootStatusMessageElement) return;

  bootStatusMessageElement.classList.add('boot-status__message--error');
  bootStatusMessageElement.textContent = message;
};

window.addEventListener('error', (event) => {
  showRuntimeError(event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  showRuntimeError(event.reason);
});

void (async () => {
  try {
    setBootStatusMessage('Loading game manifest...');

    const gameDir = resolveGameDir(window.location.search);
    const gameManifest = (window as RuntimeWindow).RPGVXAceWeb?.resolveManifest
      ? GameManifest.fromJson(gameDir, await (window as RuntimeWindow).RPGVXAceWeb!.resolveManifest!(gameDir))
      : await loadGameManifest(gameDir);

    const assetProvider = new GameAssetProvider(gameManifest);
    utils.configureSaveStorageAssetProvider(assetProvider);

    const customResourceFetchAdapter = (window as RuntimeWindow).RPGVXAceWeb?.resourceFetchAdapter;
    if (customResourceFetchAdapter) {
      utils.configureResourceFetchAdapter(customResourceFetchAdapter);
    }

    const customSaveStorageAdapter = (window as RuntimeWindow).RPGVXAceWeb?.saveStorageAdapter;
    if (customSaveStorageAdapter) {
      utils.configureSaveStorageAdapter(customSaveStorageAdapter);
    }
    if (gameManifest.metadata.title) {
      document.title = gameManifest.metadata.title;
    }

    setBootStatusMessage('Loading fonts...');
    const fontRenderMetrics = await preloadManifestFonts(assetProvider);

    setBootStatusMessage('Loading Ruby runtime...');
    const response = await fetch(rubyWasm);
    if (!response.ok) {
      const statusText = response.statusText ? ` ${response.statusText}` : '';
      throw new Error(`Ruby runtime fetch failed: HTTP ${response.status}${statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const module = await WebAssembly.compile(buffer);

    setBootStatusMessage('Initializing Ruby VM...');
    const { vm } = await DefaultRubyVM(module);
    vm.printVersion();

    const rubyManager = new RubyManager(vm);
    app = new App({
      assetProvider,
      element: appElement,
      bootStatusElement,
      fontRenderMetrics,
    });

    (window as any).rubyBridge = {
      rubyManager,
      app,
      gameDir,
      gameId: gameManifest.id,
      utils,
    };

    setBootStatusMessage('Starting game...');
    const screenBootstrapCode = `Graphics.resize_screen(${gameManifest.screen.width}, ${gameManifest.screen.height})`;
    const runtimeOnlyBootstrapCode = [
      rubyRuntimeCode,
      `RPGVXAceWeb::Internal.game_dir = ${JSON.stringify(gameDir)}`,
      `RPGVXAceWeb::Internal.game_id = ${JSON.stringify(gameManifest.id)}`,
      screenBootstrapCode,
    ].join('\n');
    const bootstrapCode = shouldLoadGuestScripts(window.location.search)
      ? [rubyCode, screenBootstrapCode].join('\n')
      : runtimeOnlyBootstrapCode;

    rubyManager.push(bootstrapCode, 'runtime-bootstrap');

    while (rubyManager.hasCode()) {
      await rubyManager.evalAsyncCode();
    }
  } catch (error) {
    showRuntimeError(error);
  }
})();

function formatRuntimeError(error: unknown) {
  if (error instanceof RubyEvalError) {
    const detail = formatUnknownError(error.cause);
    return `[${error.label}]\n${detail}`;
  }

  return formatUnknownError(error);
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }

  return String(error);
}
