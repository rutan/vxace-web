import './styles.css';
import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import {
  createOutputSubdirectoryName,
  getDraftOutputDirectory,
  type AppErrorPayload,
  type ConversionSummary,
  type Draft,
} from '../../shared';
import {
  ConversionProgressScreen,
  ConversionResultScreen,
  ConversionSettingsScreen,
  PreviewScreen,
  Screen,
  ScreenItem,
} from './components';
import { useDraft } from './hooks';
import { changeAppLanguage, getAppLanguage, I18nProvider } from './i18n';
import { cx } from './utils';

type AppScreen = 'settings' | 'converting' | 'result' | 'preview';

export function App(): JSX.Element {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

function AppContent(): JSX.Element {
  const converterApi = useMemo(() => window.vxaceConverter, []);
  const { draft, patchDraft, replaceDraft, resetDraft } = useDraft();
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<AppScreen>('settings');
  const [gameDirectoryError, setGameDirectoryError] = useState<AppErrorPayload | undefined>();
  const [settingsFileError, setSettingsFileError] = useState<AppErrorPayload | undefined>();
  const [summary, setSummary] = useState<ConversionSummary | undefined>();
  const [conversionError, setConversionError] = useState<AppErrorPayload | undefined>();
  const [openOutputError, setOpenOutputError] = useState<AppErrorPayload | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [previewError, setPreviewError] = useState<AppErrorPayload | undefined>();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [draftPersistenceReady, setDraftPersistenceReady] = useState(false);

  const actualOutputDirectory = getDraftOutputDirectory(draft);
  const canConvert = Boolean(
    converterApi &&
    draft.srcDir &&
    draft.outDir &&
    draft.outputSubdirectoryName.trim() &&
    draft.title.trim() &&
    draft.gameId.trim() &&
    draft.screen.width > 0 &&
    draft.screen.height > 0 &&
    !gameDirectoryError &&
    !busy,
  );

  const clearTransientState = useCallback(async () => {
    setAdvancedSettingsOpen(false);
    setBusy(false);
    setGameDirectoryError(undefined);
    setSummary(undefined);
    setConversionError(undefined);
    setOpenOutputError(undefined);
    setPreviewUrl(undefined);
    setPreviewError(undefined);
    setPreviewBusy(false);
    setScreen('settings');

    await converterApi?.stopPreviewServer();
  }, [converterApi]);

  const applyDraft = useCallback(
    async (nextDraft: Draft) => {
      replaceDraft(nextDraft);
      setSettingsFileError(undefined);
      await clearTransientState();
    },
    [clearTransientState, replaceDraft],
  );

  const resetApplicationState = useCallback(async () => {
    resetDraft();
    setSettingsFileError(undefined);
    await clearTransientState();
  }, [clearTransientState, resetDraft]);

  const openSettingsFile = useCallback(async () => {
    if (!converterApi) return;

    const opened = await converterApi.openSettingsFile();
    if (!opened.ok) {
      setSettingsFileError(opened.error);
      setScreen('settings');
      return;
    }
    if (!opened.value) return;

    await applyDraft(opened.value);
  }, [applyDraft, converterApi]);

  const saveSettingsFile = useCallback(async () => {
    if (!converterApi) return;

    const saved = await converterApi.saveSettingsFile(draft);
    if (!saved.ok) {
      setSettingsFileError(saved.error);
      setScreen('settings');
      return;
    }

    setSettingsFileError(undefined);
  }, [converterApi, draft]);

  useEffect(() => {
    if (!converterApi) return;

    void converterApi.setLanguage(getAppLanguage());
    const unsubscribeLanguageChanged = converterApi.onLanguageChanged((nextLanguage) => {
      void changeAppLanguage(nextLanguage);
    });
    const unsubscribeNewDraftRequested = converterApi.onNewDraftRequested(() => {
      void resetApplicationState();
    });
    const unsubscribeOpenSettingsFileRequested = converterApi.onOpenSettingsFileRequested(() => {
      void openSettingsFile();
    });
    const unsubscribeSaveSettingsFileRequested = converterApi.onSaveSettingsFileRequested(() => {
      void saveSettingsFile();
    });

    return () => {
      unsubscribeLanguageChanged();
      unsubscribeNewDraftRequested();
      unsubscribeOpenSettingsFileRequested();
      unsubscribeSaveSettingsFileRequested();
    };
  }, [converterApi, openSettingsFile, resetApplicationState, saveSettingsFile]);

  useEffect(() => {
    let canceled = false;

    const loadLastDraft = async () => {
      if (!converterApi) {
        setDraftPersistenceReady(true);
        return;
      }

      const loaded = await converterApi.loadLastDraft();
      if (canceled) return;

      if (loaded.ok) {
        if (loaded.value) {
          replaceDraft(loaded.value);
          await clearTransientState();
        }
      } else {
        console.error('Failed to load last draft:', loaded.error);
      }

      if (!canceled) setDraftPersistenceReady(true);
    };

    void loadLastDraft();
    return () => {
      canceled = true;
    };
  }, [clearTransientState, converterApi, replaceDraft]);

  useEffect(() => {
    if (!converterApi || !draftPersistenceReady) return;

    const timeout = setTimeout(() => {
      void converterApi.saveLastDraft(draft).then((saved) => {
        if (!saved.ok) console.error('Failed to save last draft:', saved.error);
      });
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [converterApi, draft, draftPersistenceReady]);

  const selectGameDirectory = async () => {
    if (!converterApi) return;

    setBusy(true);
    setSummary(undefined);
    setConversionError(undefined);
    setOpenOutputError(undefined);
    setGameDirectoryError(undefined);
    setSettingsFileError(undefined);
    setScreen('settings');

    try {
      const selection = await converterApi.selectGameDirectory();
      if (selection.canceled || !selection.path) return;

      const analyzed = await converterApi.analyzeGameDirectory({
        srcDir: selection.path,
      });
      if (!analyzed.ok) {
        patchDraft({
          srcDir: selection.path,
          title: '',
          gameId: '',
        });
        setGameDirectoryError(analyzed.error);
        return;
      }

      const outputSubdirectoryName = createOutputSubdirectoryName(analyzed.value.title);
      const previousOutputSubdirectoryName = createOutputSubdirectoryName(draft.title);
      const shouldUpdateOutputSubdirectoryName =
        !draft.outputSubdirectoryName.trim() || draft.outputSubdirectoryName === previousOutputSubdirectoryName;

      patchDraft({
        srcDir: analyzed.value.srcDir,
        title: analyzed.value.title,
        ...(shouldUpdateOutputSubdirectoryName ? { outputSubdirectoryName } : {}),
      });
    } finally {
      setBusy(false);
    }
  };

  const selectOutputDirectory = async () => {
    if (!converterApi) return;

    const selection = await converterApi.selectOutputDirectory();
    if (selection.canceled || !selection.path) return;

    patchDraft({ outDir: selection.path });
    setSummary(undefined);
    setConversionError(undefined);
    setOpenOutputError(undefined);
    setSettingsFileError(undefined);
    setScreen('settings');
  };

  const convert = async () => {
    if (!converterApi || !canConvert) return;

    setBusy(true);
    setSummary(undefined);
    setConversionError(undefined);
    setOpenOutputError(undefined);
    setSettingsFileError(undefined);
    await stopPreviewServer();
    setScreen('converting');

    try {
      const converted = await converterApi.convertGame(draft);

      if (!converted.ok) {
        setConversionError(converted.error);
        setScreen('result');
        return;
      }

      setSummary(converted.value);
      setScreen('result');
    } finally {
      setBusy(false);
    }
  };

  const openOutputDirectory = async () => {
    if (!converterApi || !actualOutputDirectory) return;

    setOpenOutputError(undefined);
    const opened = await converterApi.openPath(actualOutputDirectory);
    if (!opened.ok) {
      setOpenOutputError(opened.error);
    }
  };

  const startPreview = async () => {
    if (!converterApi || !actualOutputDirectory) return;

    setPreviewBusy(true);
    setPreviewUrl(undefined);
    setPreviewError(undefined);
    setScreen('preview');

    try {
      const started = await converterApi.startPreviewServer({
        rootDir: actualOutputDirectory,
      });
      if (!started.ok) {
        setPreviewError(started.error);
        return;
      }

      setPreviewUrl(started.value.url);
    } finally {
      setPreviewBusy(false);
    }
  };

  const openPreviewInBrowser = async () => {
    if (!converterApi || !previewUrl) return;

    setPreviewError(undefined);
    const opened = await converterApi.openPreviewUrl(previewUrl);
    if (!opened.ok) {
      setPreviewError(opened.error);
    }
  };

  const stopPreview = async () => {
    setPreviewBusy(false);
    setPreviewUrl(undefined);
    setPreviewError(undefined);
    await stopPreviewServer();
    setScreen('result');
  };

  const stopPreviewServer = async () => {
    if (!converterApi) return;

    const stopped = await converterApi.stopPreviewServer();
    if (!stopped.ok) {
      setPreviewError(stopped.error);
    }
  };

  const backToSettings = () => {
    setOpenOutputError(undefined);
    setScreen('settings');
  };

  const addExcludeSourcePattern = () => {
    patchDraft({
      excludeSourceFilePatterns: [...draft.excludeSourceFilePatterns, ''],
    });
  };

  const changeExcludeSourcePattern = (index: number, value: string) => {
    patchDraft({
      excludeSourceFilePatterns: draft.excludeSourceFilePatterns.map((pattern, patternIndex) =>
        patternIndex === index ? value : pattern,
      ),
    });
  };

  const removeExcludeSourcePattern = (index: number) => {
    patchDraft({
      excludeSourceFilePatterns:
        draft.excludeSourceFilePatterns.length === 1
          ? ['']
          : draft.excludeSourceFilePatterns.filter((_, patternIndex) => patternIndex !== index),
    });
  };

  const addKeepPattern = () => {
    patchDraft({
      keepUnusedAssetsPatterns: [...draft.keepUnusedAssetsPatterns, ''],
    });
  };

  const changeKeepPattern = (index: number, value: string) => {
    patchDraft({
      keepUnusedAssetsPatterns: draft.keepUnusedAssetsPatterns.map((pattern, patternIndex) =>
        patternIndex === index ? value : pattern,
      ),
    });
  };

  const removeKeepPattern = (index: number) => {
    patchDraft({
      keepUnusedAssetsPatterns:
        draft.keepUnusedAssetsPatterns.length === 1
          ? ['']
          : draft.keepUnusedAssetsPatterns.filter((_, patternIndex) => patternIndex !== index),
    });
  };

  const selectInjectHtmlFiles = async () => {
    if (!converterApi) return;

    const selection = await converterApi.selectHtmlInjectionFiles();
    if (selection.canceled || !selection.paths?.length) return;

    const currentPaths = draft.injectHtmlFilePaths.filter(Boolean);
    patchDraft({
      useInjectHtml: true,
      injectHtmlFilePaths: [...currentPaths, ...selection.paths],
    });
  };

  const removeInjectHtmlFilePath = (index: number) => {
    patchDraft({
      injectHtmlFilePaths: draft.injectHtmlFilePaths.filter((_, filePathIndex) => filePathIndex !== index),
    });
  };

  return (
    <div className={cx('App', 'flex min-h-screen flex-col')}>
      <main className="min-h-screen bg-[#eef1f4] p-5 text-[#18202a]">
        <section className="mx-auto grid max-w-200 gap-5">
          <Screen current={screen}>
            <ScreenItem name="settings">
              <ConversionSettingsScreen
                advancedSettingsOpen={advancedSettingsOpen}
                busy={busy}
                canConvert={canConvert}
                converterApiAvailable={Boolean(converterApi)}
                draft={draft}
                gameDirectoryError={gameDirectoryError}
                settingsFileError={settingsFileError}
                onAddExcludeSourcePattern={addExcludeSourcePattern}
                onAddKeepPattern={addKeepPattern}
                onChangeExcludeSourcePattern={changeExcludeSourcePattern}
                onChangeKeepPattern={changeKeepPattern}
                onPatchDraft={patchDraft}
                onConvert={convert}
                onRemoveExcludeSourcePattern={removeExcludeSourcePattern}
                onRemoveInjectHtmlFilePath={removeInjectHtmlFilePath}
                onRemoveKeepPattern={removeKeepPattern}
                onSelectGameDirectory={selectGameDirectory}
                onSelectInjectHtmlFiles={selectInjectHtmlFiles}
                onSelectOutputDirectory={selectOutputDirectory}
                onToggleAdvancedSettings={() => setAdvancedSettingsOpen((open) => !open)}
              />
            </ScreenItem>

            <ScreenItem name="converting">
              <ConversionProgressScreen />
            </ScreenItem>

            <ScreenItem name="result">
              <ConversionResultScreen
                error={conversionError}
                onBackToSettings={backToSettings}
                onOpenOutputDirectory={openOutputDirectory}
                onStartPreview={startPreview}
                openOutputError={openOutputError}
                summary={summary}
              />
            </ScreenItem>

            <ScreenItem name="preview">
              <PreviewScreen
                busy={previewBusy}
                error={previewError}
                onOpenInBrowser={openPreviewInBrowser}
                onStop={stopPreview}
                url={previewUrl}
              />
            </ScreenItem>
          </Screen>
        </section>
      </main>
    </div>
  );
}
