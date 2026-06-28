import { AlertCircle, Download, MonitorPlay, Package, Play, X } from 'lucide-react';
import { useEffect } from 'react';
import type { I18nLang } from '$i18n';
import styles from '../ConverterApp.module.css';
import { cx } from '../lib/cx';
import type { PreviewSession } from '../lib/preview';
import type { ConversionState, ConversionSummary } from '../model/converter';
import { ConversionSummaryView } from './ConversionSummaryView';

export const ConversionSection = ({
  copy,
  error,
  hasFiles,
  isBusy,
  lang,
  onConvertGame,
  onDownloadConvertedZip,
  onStartPreview,
  onStopPreview,
  previewSession,
  state,
  summary,
  zipReady,
}: {
  copy: {
    close: string;
    convert: string;
    converting: string;
    download: string;
    heading: string;
    preview: string;
    previewDialogLabel: string;
    previewTitle: string;
    summary: Parameters<typeof ConversionSummaryView>[0]['copy'];
  };
  error?: string;
  hasFiles: boolean;
  isBusy: boolean;
  lang: I18nLang;
  onConvertGame: () => void;
  onDownloadConvertedZip: () => void;
  onStartPreview: () => void;
  onStopPreview: () => void;
  previewSession?: PreviewSession;
  state: ConversionState;
  summary?: ConversionSummary;
  zipReady: boolean;
}) => {
  useEffect(() => {
    if (!previewSession) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onStopPreview();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onStopPreview, previewSession]);

  return (
    <section className={cx(styles.section)} aria-labelledby="conversion-heading">
      <div className={cx(styles.sectionGrid, styles.shell)}>
        <div className={styles.sectionHeading}>
          <p className={styles.step}>Step 4</p>
          <h2 id="conversion-heading">{copy.heading}</h2>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.conversionStack}>
            {error ? (
              <div className={cx(styles.message, styles.errorMessage)}>
                <AlertCircle aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            {summary ? <ConversionSummaryView copy={copy.summary} lang={lang} summary={summary} /> : null}

            <div className={styles.conversionActionBar}>
              {state === 'done' && zipReady ? (
                <div className={styles.conversionActions}>
                  <button
                    className={cx(styles.button, styles.conversionActionButton)}
                    onClick={onDownloadConvertedZip}
                    type="button"
                  >
                    <Download aria-hidden="true" />
                    {copy.download}
                  </button>
                  <button className={cx(styles.button, styles.secondaryButton)} onClick={onStartPreview} type="button">
                    <MonitorPlay aria-hidden="true" />
                    {copy.preview}
                  </button>
                </div>
              ) : (
                <button
                  className={cx(styles.button, styles.conversionActionButton)}
                  disabled={!hasFiles || isBusy}
                  onClick={onConvertGame}
                  type="button"
                >
                  {state === 'converting' ? (
                    <Package aria-hidden="true" className={styles.iconPulse} />
                  ) : (
                    <Play aria-hidden="true" />
                  )}
                  {state === 'converting' ? copy.converting : copy.convert}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {previewSession ? (
        <div aria-label={copy.previewDialogLabel} aria-modal="true" className={styles.previewOverlay} role="dialog">
          <div className={styles.previewToolbar}>
            <h3>{copy.previewTitle}</h3>
            <button className={cx(styles.button, styles.secondaryButton)} onClick={onStopPreview} type="button">
              <X aria-hidden="true" />
              {copy.close}
            </button>
          </div>
          <div className={styles.previewViewport}>
            <iframe
              allow="autoplay; fullscreen; gamepad"
              className={styles.previewFrame}
              srcDoc={previewSession.srcDoc}
              title={copy.previewDialogLabel}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
};
