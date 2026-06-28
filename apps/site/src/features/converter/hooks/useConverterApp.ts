import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react';
import type { ConverterCopy } from '$i18n';
import { convertProjectToZip } from '../lib/browserConversion';
import { createGameId, errorMessage, validateDraft } from '../lib/conversion';
import { downloadBlob } from '../lib/download';
import { createPreviewSession, type PreviewSession } from '../lib/preview';
import {
  detectProjectName,
  normalizeProjectFiles,
  readEntriesFromDataTransfer,
  readEntriesFromInput,
  readGameIniTitle,
  type ProjectFileEntry,
} from '../lib/projectFiles';
import type { ZipFileEntry } from '../lib/zip';
import { initialDraft, type ConversionState, type ConversionSummary, type Draft } from '../model/converter';

export const useConverterApp = ({ copy }: { copy: ConverterCopy }) => {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [files, setFiles] = useState<ProjectFileEntry[]>([]);
  const [projectError, setProjectError] = useState<string | undefined>();
  const [projectName, setProjectName] = useState<string | undefined>();
  const [previewSession, setPreviewSession] = useState<PreviewSession>();
  const [state, setState] = useState<ConversionState>('idle');
  const [summary, setSummary] = useState<ConversionSummary>();
  const [distributionFiles, setDistributionFiles] = useState<ZipFileEntry[]>([]);
  const [zipArchive, setZipArchive] = useState<{ blob: Blob; filename: string }>();
  const directoryInputRef = useRef<HTMLInputElement | null>(null);
  const htmlInputRef = useRef<HTMLInputElement | null>(null);
  const previewSessionRef = useRef<PreviewSession | undefined>(undefined);

  useEffect(() => {
    return () => {
      previewSessionRef.current?.dispose();
      previewSessionRef.current = undefined;
    };
  }, []);

  const replacePreviewSession = (nextSession?: PreviewSession) => {
    previewSessionRef.current?.dispose();
    previewSessionRef.current = nextSession;
    setPreviewSession(nextSession);
  };

  const clearConversionResult = () => {
    setSummary(undefined);
    setDistributionFiles([]);
    setZipArchive(undefined);
    replacePreviewSession(undefined);
    setState((current) => (current === 'done' ? 'idle' : current));
  };

  const patchDraft = (patch: Partial<Draft>) => {
    clearConversionResult();
    setDraft((current) => ({ ...current, ...patch }));
  };

  const applyProjectFiles = async (entries: ProjectFileEntry[]) => {
    setState('reading');
    setError(undefined);
    setProjectError(undefined);
    setSummary(undefined);
    setDistributionFiles([]);
    setZipArchive(undefined);
    replacePreviewSession(undefined);

    const normalizedEntries = normalizeProjectFiles(entries);
    if (normalizedEntries.length === 0) {
      throw new Error(copy.projectSelection.errors.noFiles);
    }
    if (!normalizedEntries.some((entry) => entry.path === 'Game.ini')) {
      throw new Error(copy.projectSelection.errors.invalidProject);
    }

    const title = await readGameIniTitle(normalizedEntries);
    const name = detectProjectName(normalizedEntries);
    setFiles(normalizedEntries);
    setProjectName(name);
    setProjectError(undefined);
    setDraft((current) => ({
      ...current,
      title: title ?? current.title,
      gameId: current.gameId || createGameId(title ?? name),
    }));
    setState('idle');
  };

  const openDirectoryInput = () => {
    const input = directoryInputRef.current;
    if (!input) return;
    input.value = '';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.click();
  };

  const handleDirectoryInput = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      await applyProjectFiles(readEntriesFromInput(event.currentTarget.files));
    } catch (caught) {
      handleProjectFilesError(caught);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragActive(false);

    try {
      await applyProjectFiles(await readEntriesFromDataTransfer(event.dataTransfer));
    } catch (caught) {
      handleProjectFilesError(caught);
    }
  };

  const handleProjectFilesError = (caught: unknown) => {
    setFiles([]);
    setProjectName(undefined);
    setError(undefined);
    setProjectError(errorMessage(caught));
    setSummary(undefined);
    setDistributionFiles([]);
    setZipArchive(undefined);
    replacePreviewSession(undefined);
    setState('error');
  };

  const resetProjectFiles = () => {
    setFiles([]);
    setProjectName(undefined);
    setError(undefined);
    setProjectError(undefined);
    setSummary(undefined);
    setDistributionFiles([]);
    setZipArchive(undefined);
    replacePreviewSession(undefined);
    if (state !== 'converting') setState('idle');
  };

  const loadHtmlFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    patchDraft({
      htmlInjection: await file.text(),
      useHtmlInjection: true,
    });
  };

  const convertGame = async () => {
    setError(undefined);
    setProjectError(undefined);
    setSummary(undefined);
    setDistributionFiles([]);
    setZipArchive(undefined);
    replacePreviewSession(undefined);

    try {
      validateDraft(draft, files, copy);
      setState('converting');

      const result = await convertProjectToZip({ copy, draft, files, projectName });
      setDistributionFiles(result.distributionFiles);
      setZipArchive(result.archive);
      setSummary(result.summary);
      setState('done');
    } catch (caught) {
      setState('error');
      setError(errorMessage(caught));
    }
  };

  const downloadConvertedZip = () => {
    if (!zipArchive) return;
    downloadBlob(zipArchive.blob, zipArchive.filename);
  };

  const startPreview = () => {
    if (distributionFiles.length === 0) return;
    replacePreviewSession(createPreviewSession(distributionFiles));
  };

  const stopPreview = () => {
    replacePreviewSession(undefined);
  };

  const isBusy = state === 'reading' || state === 'converting';
  const hasFiles = files.length > 0;

  return {
    conversionProps: {
      error,
      hasFiles,
      isBusy,
      onConvertGame: convertGame,
      onDownloadConvertedZip: downloadConvertedZip,
      onStartPreview: startPreview,
      onStopPreview: stopPreview,
      previewSession,
      state,
      summary,
      zipReady: zipArchive !== undefined,
    },
    dragHandlers: {
      onDragEnter: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        setDragActive(true);
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        if (event.currentTarget === event.target) setDragActive(false);
      },
      onDragOver: (event: DragEvent<HTMLElement>) => event.preventDefault(),
      onDrop: handleDrop,
    },
    gameSettingsProps: {
      draft,
      hasFiles,
      onPatchDraft: patchDraft,
    },
    advancedSettingsProps: {
      draft,
      hasFiles,
      htmlInputRef,
      isBusy,
      onLoadHtmlFile: loadHtmlFile,
      onPatchDraft: patchDraft,
    },
    projectSelectionProps: {
      directoryInputRef,
      dragActive,
      fileCount: files.length,
      isBusy,
      onDirectoryInput: handleDirectoryInput,
      onOpenDirectoryInput: openDirectoryInput,
      onResetProjectFiles: resetProjectFiles,
      projectError,
      state,
    },
  };
};
