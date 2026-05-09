// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { App } from '../../src/renderer/src/App';
import { changeAppLanguage } from '../../src/renderer/src/i18n';
import { appErrorCodes, createInitialDraft, type AppErrorPayload, type Draft } from '../../src/shared';
import type { ConversionSummary, ConverterApi } from '../../src/shared/converterApi';

type ReactActGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

(globalThis as ReactActGlobal).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | undefined;

const flushAsyncEffects = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const renderApp = async () => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<App />);
    await flushAsyncEffects();
  });
};

beforeEach(async () => {
  await changeAppLanguage('ja');
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
  }

  container.remove();
  root = undefined;
  window.vxaceConverter = undefined;
});

describe('App', () => {
  test('renders the converter shell', async () => {
    window.vxaceConverter = createConverterApiStub();
    await renderApp();

    expect(container.textContent).not.toContain('ゲームフォルダを選択してください。');
    expect(container.textContent).toContain('変換するゲームを選択');
    expect(container.textContent).toContain('出力先を選択');
    expect(container.textContent).toContain('変換設定');
    expect(getByTestId('select-game-directory').textContent).toBe('フォルダを選択');
  });

  test('updates renderer language from the app menu event', async () => {
    let languageChanged: ((language: 'en' | 'ja') => void) | undefined;
    window.vxaceConverter = {
      ...createConverterApiStub(),
      onLanguageChanged: (callback) => {
        languageChanged = callback;
        return () => undefined;
      },
    };
    await renderApp();

    expect(container.textContent).toContain('変換するゲームを選択');

    await act(async () => {
      languageChanged?.('en');
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Select a game to convert');
  });

  test('resets input state from the app menu event', async () => {
    let newDraftRequested: (() => void) | undefined;
    window.vxaceConverter = {
      ...createConverterApiStub(),
      selectGameDirectory: async () => ({
        canceled: false,
        path: '/tmp/source',
      }),
      selectOutputDirectory: async () => ({
        canceled: false,
        path: '/tmp/output',
      }),
      onNewDraftRequested: (callback) => {
        newDraftRequested = callback;
        return () => undefined;
      },
    };
    await renderApp();

    await act(async () => {
      clickByTestId('select-game-directory');
    });
    await act(async () => {
      clickByTestId('select-output-directory');
    });
    await act(async () => {
      fillGameId();
    });

    expect(container.textContent).toContain('/tmp/source');
    expect(getByTestId<HTMLButtonElement>('convert-button').disabled).toBe(false);

    await act(async () => {
      newDraftRequested?.();
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('/tmp/source');
    expect(container.textContent).not.toContain('/tmp/output');
    expect(getByTestId<HTMLButtonElement>('convert-button').disabled).toBe(true);
  });

  test('restores the last draft on startup', async () => {
    window.vxaceConverter = {
      ...createConverterApiStub(),
      loadLastDraft: async () => ({
        ok: true,
        value: createDraft({
          srcDir: '/tmp/restored-source',
          outDir: '/tmp/restored-output',
          title: 'Restored Game',
          gameId: 'vxace:restored',
        }),
      }),
    };
    await renderApp();

    expect(container.textContent).toContain('/tmp/restored-source');
    expect(container.textContent).toContain('/tmp/restored-output');
    expect(getByTestId<HTMLInputElement>('game-title-input').value).toBe('Restored Game');
    expect(getByTestId<HTMLButtonElement>('convert-button').disabled).toBe(false);
  });

  test('opens a settings file from the app menu event', async () => {
    let openSettingsFileRequested: (() => void) | undefined;
    window.vxaceConverter = {
      ...createConverterApiStub(),
      openSettingsFile: async () => ({
        ok: true,
        value: createDraft({
          srcDir: '/tmp/file-source',
          outDir: '/tmp/file-output',
          title: 'File Game',
          gameId: 'vxace:file',
        }),
      }),
      onOpenSettingsFileRequested: (callback) => {
        openSettingsFileRequested = callback;
        return () => undefined;
      },
    };
    await renderApp();

    await act(async () => {
      openSettingsFileRequested?.();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('/tmp/file-source');
    expect(container.textContent).toContain('/tmp/file-output');
    expect(getByTestId<HTMLInputElement>('game-title-input').value).toBe('File Game');
  });

  test('saves the current draft from the app menu event', async () => {
    let saveSettingsFileRequested: (() => void) | undefined;
    let savedDraft: Draft | undefined;
    window.vxaceConverter = {
      ...createConverterApiStub(),
      selectGameDirectory: async () => ({
        canceled: false,
        path: '/tmp/save-source',
      }),
      selectOutputDirectory: async () => ({
        canceled: false,
        path: '/tmp/save-output',
      }),
      saveSettingsFile: async (draft) => {
        savedDraft = draft;
        return {
          ok: true,
          value: undefined,
        };
      },
      onSaveSettingsFileRequested: (callback) => {
        saveSettingsFileRequested = callback;
        return () => undefined;
      },
    };
    await renderApp();

    await act(async () => {
      clickByTestId('select-game-directory');
    });
    await act(async () => {
      clickByTestId('select-output-directory');
    });
    await act(async () => {
      fillGameId();
    });

    await act(async () => {
      saveSettingsFileRequested?.();
      await Promise.resolve();
    });

    expect(savedDraft).toMatchObject({
      srcDir: '/tmp/source',
      outDir: '/tmp/save-output',
      gameId: 'vxace:example',
    });
  });

  test('shows game directory analysis errors in the game selection section', async () => {
    window.vxaceConverter = {
      ...createConverterApiStub(),
      selectGameDirectory: async () => ({
        canceled: false,
        path: '/tmp/not-game',
      }),
      analyzeGameDirectory: async () => ({
        ok: false,
        error: createAppError(appErrorCodes.gameRootGameIniMissing),
      }),
    };
    await renderApp();

    await act(async () => {
      clickByTestId('select-game-directory');
    });

    const gameSection = getByTestId('source-step');
    expect(gameSection?.textContent).toContain('ゲームフォルダを確認できませんでした。');
    expect(gameSection?.textContent).toContain('Game.ini が見つかりません。');
    expect(getByTestId<HTMLButtonElement>('convert-button').disabled).toBe(true);
  });

  test('switches to progress and result screens while converting', async () => {
    let resolveConversion: ((summary: ConversionSummary) => void) | undefined;

    window.vxaceConverter = {
      ...createConverterApiStub(),
      selectGameDirectory: async () => ({
        canceled: false,
        path: '/tmp/source',
      }),
      selectOutputDirectory: async () => ({
        canceled: false,
        path: '/tmp/output',
      }),
      convertGame: async () => ({
        ok: true,
        value: await new Promise<ConversionSummary>((resolve) => {
          resolveConversion = resolve;
        }),
      }),
    };
    await renderApp();

    await act(async () => {
      clickByTestId('select-game-directory');
    });
    await act(async () => {
      clickByTestId('select-output-directory');
    });
    await act(async () => {
      fillGameId();
    });
    await act(async () => {
      changeInputValue(getByTestId<HTMLInputElement>('screen-width-input'), '640');
    });

    await act(async () => {
      clickByTestId('convert-button');
    });

    expect(container.textContent).toContain('変換中');

    await act(async () => {
      resolveConversion?.(createConversionSummary());
    });

    expect(container.textContent).toContain('変換が完了しました');
    expect(container.textContent).toContain('出力フォルダを開く');
    expect(container.textContent).toContain('Graphics/Characters/Hero.png');
    expect(container.textContent).toContain('game/Graphics/Characters/Hero.png');
    expect(container.textContent).toContain('変換元ファイル');
    expect(container.textContent).toContain('Save01.rvdata2');
    expect(container.textContent).toContain('未使用アセット');
    expect(container.textContent).toContain('Audio/BGM/Unused.ogg');
  });

  test('starts preview server, opens browser, and returns to result screen', async () => {
    let previewRootDir: string | undefined;
    let openedPreviewUrl: string | undefined;
    let stopPreviewCalled = false;

    window.vxaceConverter = {
      ...createConverterApiStub(),
      selectGameDirectory: async () => ({
        canceled: false,
        path: '/tmp/source',
      }),
      selectOutputDirectory: async () => ({
        canceled: false,
        path: '/tmp/output',
      }),
      convertGame: async () => ({
        ok: true,
        value: createConversionSummary(),
      }),
      startPreviewServer: async (request) => {
        previewRootDir = request.rootDir;
        return {
          ok: true,
          value: {
            url: 'http://127.0.0.1:49152/',
          },
        };
      },
      openPreviewUrl: async (url) => {
        openedPreviewUrl = url;
        return {
          ok: true,
          value: undefined,
        };
      },
      stopPreviewServer: async () => {
        stopPreviewCalled = true;
        return {
          ok: true,
          value: undefined,
        };
      },
    };
    await renderApp();

    await act(async () => {
      clickByTestId('select-game-directory');
    });
    await act(async () => {
      clickByTestId('select-output-directory');
    });
    await act(async () => {
      fillGameId();
    });
    await act(async () => {
      clickByTestId('convert-button');
    });

    await act(async () => {
      clickByTestId('start-preview');
    });

    expect(previewRootDir).toBe('/tmp/output');
    expect(container.textContent).toContain('http://127.0.0.1:49152/');
    expect(container.textContent).toContain('ブラウザを開く');
    expect(container.textContent).toContain('プレビューを終了する');

    await act(async () => {
      clickByTestId('open-preview-browser');
    });

    expect(openedPreviewUrl).toBe('http://127.0.0.1:49152/');

    await act(async () => {
      clickByTestId('stop-preview');
    });

    expect(stopPreviewCalled).toBe(true);
    expect(container.textContent).toContain('変換が完了しました');
    expect(container.textContent).toContain('ブラウザでプレビュー');
  });

  test('keeps advanced conversion settings collapsed by default and sends them when configured', async () => {
    let convertDraft: Draft | null = null;

    window.vxaceConverter = {
      ...createConverterApiStub(),
      selectGameDirectory: async () => ({
        canceled: false,
        path: '/tmp/source',
      }),
      selectOutputDirectory: async () => ({
        canceled: false,
        path: '/tmp/output',
      }),
      selectHtmlInjectionFiles: async () => ({
        canceled: false,
        paths: ['/tmp/inject-selected.html'],
      }),
      convertGame: async (request) => {
        convertDraft = request;
        return {
          ok: true,
          value: createConversionSummary(),
        };
      },
    };
    await renderApp();

    expect(container.textContent).toContain('上級者向け設定');
    expect(container.textContent).not.toContain('アセットをパック化する');

    await act(async () => {
      clickByTestId('select-game-directory');
    });
    await act(async () => {
      clickByTestId('select-output-directory');
    });
    await act(async () => {
      fillGameId();
    });

    await act(async () => {
      clickByTestId('advanced-settings-toggle');
    });

    expect(container.textContent).toContain('アセットをパック化する');
    expect(container.textContent).toContain('変換元ファイルを除外する');
    expect(container.textContent).toContain('未使用アセットを削除する');
    expect(container.textContent).toContain('プレイヤーページに HTML を挿入する');

    await act(async () => {
      clickByTestId('pack-assets-checkbox');
      clickByTestId('exclude-source-files-checkbox');
      clickByTestId('omit-unused-assets-checkbox');
      clickByTestId('inject-html-checkbox');
    });

    await act(async () => {
      changeInputValue(getByTestId<HTMLInputElement>('exclude-source-pattern-input-0'), ' Save*.rvdata2 ');
    });

    await act(async () => {
      clickByTestId('exclude-source-pattern-add');
    });

    await act(async () => {
      changeInputValue(getByTestId<HTMLInputElement>('exclude-source-pattern-input-1'), 'Profile/**');
    });

    await act(async () => {
      changeInputValue(getByTestId<HTMLInputElement>('keep-pattern-input-0'), ' Graphics/Pictures/** ');
    });

    await act(async () => {
      clickByTestId('keep-pattern-add');
    });

    await act(async () => {
      changeInputValue(getByTestId<HTMLInputElement>('keep-pattern-input-1'), 'Audio/SE/Decision');
    });

    await act(async () => {
      clickByTestId('inject-html-file-select');
    });

    expect(getByTestId('inject-html-file-path-0').textContent).toBe('/tmp/inject-selected.html');

    await act(async () => {
      clickByTestId('convert-button');
    });

    expect(convertDraft).toMatchObject({
      screen: {
        width: 640,
        height: 416,
      },
      packAssets: true,
      useExcludeSourceFiles: true,
      excludeSourceFilePatterns: [' Save*.rvdata2 ', 'Profile/**'],
      useOmitUnusedAssets: true,
      keepUnusedAssetsPatterns: [' Graphics/Pictures/** ', 'Audio/SE/Decision'],
      useInjectHtml: true,
      injectHtmlFilePaths: ['/tmp/inject-selected.html'],
    });
  });

  test('shows conversion errors on the result screen', async () => {
    window.vxaceConverter = {
      ...createConverterApiStub(),
      selectGameDirectory: async () => ({
        canceled: false,
        path: '/tmp/source',
      }),
      selectOutputDirectory: async () => ({
        canceled: false,
        path: '/tmp/output',
      }),
      convertGame: async () => ({
        ok: false,
        error: createAppError(appErrorCodes.unknown, '変換処理で例外が発生しました'),
      }),
    };
    await renderApp();

    await act(async () => {
      clickByTestId('select-game-directory');
    });
    await act(async () => {
      clickByTestId('select-output-directory');
    });
    await act(async () => {
      fillGameId();
    });

    await act(async () => {
      clickByTestId('convert-button');
    });

    expect(container.textContent).toContain('変換に失敗しました');
    expect(container.textContent).toContain('エラー内容');
    expect(container.textContent).toContain('変換処理で例外が発生しました');
  });
});

const createConverterApiStub = (): ConverterApi => {
  return {
    selectGameDirectory: async () => ({
      canceled: true,
    }),
    selectOutputDirectory: async () => ({
      canceled: true,
    }),
    selectHtmlInjectionFiles: async () => ({
      canceled: true,
    }),
    analyzeGameDirectory: async () => ({
      ok: true,
      value: {
        srcDir: '/tmp/source',
        title: 'Example Game',
      },
    }),
    convertGame: async () => ({
      ok: false,
      error: createAppError(appErrorCodes.unknown, 'not implemented'),
    }),
    openPath: async () => ({
      ok: true,
      value: undefined,
    }),
    startPreviewServer: async () => ({
      ok: true,
      value: {
        url: 'http://127.0.0.1:49152/',
      },
    }),
    stopPreviewServer: async () => ({
      ok: true,
      value: undefined,
    }),
    openPreviewUrl: async () => ({
      ok: true,
      value: undefined,
    }),
    setLanguage: async () => undefined,
    loadLastDraft: async () => ({
      ok: true,
      value: null,
    }),
    saveLastDraft: async () => ({
      ok: true,
      value: undefined,
    }),
    openSettingsFile: async () => ({
      ok: true,
      value: null,
    }),
    saveSettingsFile: async () => ({
      ok: true,
      value: undefined,
    }),
    onLanguageChanged: () => () => undefined,
    onNewDraftRequested: () => () => undefined,
    onOpenSettingsFileRequested: () => () => undefined,
    onSaveSettingsFileRequested: () => () => undefined,
  };
};

const createAppError = (code: AppErrorPayload['code'], message?: string): AppErrorPayload => {
  return {
    code,
    ...(message ? { message } : {}),
  };
};

const createDraft = (patch: Partial<Draft> = {}): Draft => {
  return {
    ...createInitialDraft(),
    ...patch,
    screen: {
      ...createInitialDraft().screen,
      ...patch.screen,
    },
  };
};

const createConversionSummary = (): ConversionSummary => {
  return {
    source: '/tmp/source',
    output: '/tmp/output',
    title: 'Example Game',
    gameId: 'vxace:example',
    convertedFiles: [
      {
        sourcePath: 'index.html',
        outputPath: 'index.html',
        kind: 'template',
      },
      {
        sourcePath: 'Graphics/Characters/Hero.png',
        outputPath: 'game/Graphics/Characters/Hero.png',
        kind: 'game',
      },
      {
        sourcePath: null,
        outputPath: 'game/manifest.json',
        kind: 'game',
      },
    ],
    omittedFiles: [
      {
        sourcePath: 'Save01.rvdata2',
        reason: 'source-file',
      },
      {
        sourcePath: 'Audio/BGM/Unused.ogg',
        reason: 'unused-asset',
      },
    ],
    warnings: [],
  };
};

const getByTestId = <T extends HTMLElement = HTMLElement>(testId: string): T => {
  const element = container.querySelector<T>(`[data-testid="${testId}"]`);
  if (!element) throw new Error(`Element was not found: ${testId}`);
  return element;
};

const clickByTestId = (testId: string) => {
  getByTestId(testId).click();
};

const changeInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Reflect.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const fillGameId = () => {
  changeInputValue(getByTestId<HTMLInputElement>('game-id-input'), 'vxace:example');
};
