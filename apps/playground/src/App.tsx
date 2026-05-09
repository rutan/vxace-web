import { FolderOpen } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Header, HelpModal } from './components';
import type { Locales } from './i18n/i18n-types';
import { i18nObject } from './i18n/i18n-util';
import { loadAllLocales } from './i18n/i18n-util.sync';
import { detectInitialLocale } from './i18n/locale';
import { buildPlaygroundGame } from './playground/buildPlaygroundGame';
import { isPlaygroundReadyMessage, PLAYER_TEMPLATE_URL, sendGameToIframe } from './playground/iframeBridge';
import { readEntriesFromDataTransfer, readEntriesFromInput } from './playground/readDroppedFiles';
import type { PlaygroundFileEntry, PlaygroundStatus, PreparedPlaygroundGame } from './playground/types';

loadAllLocales();

export const App = () => {
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const playerIframeRef = useRef<HTMLIFrameElement>(null);
  const [locale, setLocale] = useState<Locales>(() => detectInitialLocale());
  const [status, setStatus] = useState<PlaygroundStatus>('idle');
  const [preparedGame, setPreparedGame] = useState<PreparedPlaygroundGame | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const LL = i18nObject(locale);

  useEffect(() => {
    const localeLL = i18nObject(locale);
    document.documentElement.lang = locale;
    document.title = String(localeLL.app.title());
    localStorage.setItem('rpgmaker-vxace-web-playground:locale', locale);
  }, [locale]);

  useEffect(() => {
    directoryInputRef.current?.setAttribute('webkitdirectory', '');
    directoryInputRef.current?.setAttribute('directory', '');
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isPlaygroundReadyMessage(event)) return;
      if (event.source !== playerIframeRef.current?.contentWindow) return;
      if (!preparedGame) return;

      sendGameToIframe(playerIframeRef.current, preparedGame);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [preparedGame]);

  const prepareEntries = useCallback(
    async (entries: PlaygroundFileEntry[]) => {
      setStatus('reading');
      setErrorMessage(null);
      setPreparedGame(null);

      try {
        const game = await buildPlaygroundGame(entries, { LL });
        setPreparedGame(game);
        setStatus('running');
        setFrameKey((value) => value + 1);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus('error');
      }
    },
    [LL],
  );

  const handleInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      await prepareEntries(await readEntriesFromInput(event.currentTarget.files));
      event.currentTarget.value = '';
    },
    [prepareEntries],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      await prepareEntries(await readEntriesFromDataTransfer(event.dataTransfer));
    },
    [prepareEntries],
  );

  const reset = useCallback(() => {
    setPreparedGame(null);
    setErrorMessage(null);
    setStatus('idle');
    setIsDragging(false);
    setFrameKey((value) => value + 1);
  }, []);

  const canReset = status !== 'idle' || preparedGame !== null || errorMessage !== null;

  return (
    <div className="grid h-full w-full min-w-0 grid-rows-[56px_1fr]">
      <Header
        canReset={canReset}
        locale={locale}
        onHelp={() => setIsHelpOpen(true)}
        onLocaleChange={setLocale}
        onReset={reset}
        LL={LL}
      />
      <main className="relative min-h-0 min-w-0 p-3 sm:p-6">
        {status === 'running' && preparedGame ? (
          <iframe
            key={frameKey}
            ref={playerIframeRef}
            className="block h-full min-h-0 w-full rounded-lg border-0 bg-black"
            src={PLAYER_TEMPLATE_URL}
            title={preparedGame.title}
            allow="autoplay; fullscreen"
          />
        ) : (
          <section
            className={`grid h-full min-h-80 w-full content-center gap-[18px] rounded-lg border-2 border-dashed p-[18px] transition sm:p-7 ${
              isDragging ? 'border-emerald-700 bg-emerald-50' : 'border-slate-400 bg-white'
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
              setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <input ref={directoryInputRef} className="hidden" type="file" multiple onChange={handleInputChange} />
            <div className="grid justify-items-center gap-[18px] text-center">
              <FolderOpen className="text-emerald-700" size={44} aria-hidden="true" />
              <div className="grid gap-1.5">
                <h2 className="m-0 text-[22px] leading-tight font-bold">{LL.dropZone.title()}</h2>
                <p className="m-0 text-slate-600">{LL.dropZone.description()}</p>
              </div>
              <Button variant="primary" type="button" onClick={() => directoryInputRef.current?.click()}>
                <FolderOpen size={18} aria-hidden="true" />
                {LL.dropZone.chooseFolder()}
              </Button>
            </div>
            {status === 'reading' ? <p className="m-0 text-center text-slate-600">{LL.dropZone.loading()}</p> : null}
            {status === 'error' && errorMessage ? <p className="m-0 text-center text-red-700">{errorMessage}</p> : null}
          </section>
        )}
      </main>

      {isHelpOpen ? <HelpModal onClose={() => setIsHelpOpen(false)} LL={LL} /> : null}
    </div>
  );
};
