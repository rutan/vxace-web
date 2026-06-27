import { AlertCircle, CheckCircle2, FolderOpen, RotateCcw } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import type { I18nLang } from '$i18n';
import styles from '../ConverterApp.module.css';
import { cx } from '../lib/cx';
import { WbrText, type WbrTextValue } from './WbrText';

export const ProjectSelectionSection = ({
  copy,
  directoryInputRef,
  dragActive,
  fileCount,
  isBusy,
  lang,
  onDirectoryInput,
  onOpenDirectoryInput,
  onResetProjectFiles,
  projectError,
  state,
}: {
  copy: {
    body: string;
    dropHeading: string;
    heading: WbrTextValue;
    loadedBody: string;
    loadedHeading: string;
    readingHeading: string;
    reset: string;
    selectFolder: string;
  };
  directoryInputRef: RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  fileCount: number;
  isBusy: boolean;
  lang: I18nLang;
  onDirectoryInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenDirectoryInput: () => void;
  onResetProjectFiles: () => void;
  projectError?: string;
  state: 'idle' | 'reading' | 'converting' | 'done' | 'error';
}) => {
  const hasFiles = fileCount > 0;
  const loadedBody = copy.loadedBody.replace('{fileCount}', fileCount.toLocaleString(lang));

  return (
    <section className={cx(styles.section, styles.sectionBand)} aria-labelledby="project-selection-heading">
      <div className={cx(styles.sectionGrid, styles.shell)}>
        <div className={styles.sectionHeading}>
          <p className={styles.step}>Step 1</p>
          <h2 id="project-selection-heading">
            <WbrText value={copy.heading} />
          </h2>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.projectSelectionStack}>
            <div className={cx(styles.dropzone, dragActive && styles.dragActive)}>
              <div className={styles.dropzoneContent}>
                <div className={cx(styles.dropzoneIcon, hasFiles && styles.successIcon)}>
                  {hasFiles ? <CheckCircle2 aria-hidden="true" /> : <FolderOpen aria-hidden="true" />}
                </div>
                {hasFiles ? (
                  <>
                    <div className={styles.dropzoneText}>
                      <h3>{copy.loadedHeading}</h3>
                      <p>{loadedBody}</p>
                    </div>
                    <button
                      className={cx(styles.button, styles.secondaryButton)}
                      disabled={isBusy}
                      onClick={onResetProjectFiles}
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" />
                      {copy.reset}
                    </button>
                  </>
                ) : (
                  <>
                    <div className={styles.dropzoneText}>
                      <h3>{state === 'reading' ? copy.readingHeading : copy.dropHeading}</h3>
                      <p>{copy.body}</p>
                    </div>
                    <button
                      className={cx(styles.button, styles.primaryButton)}
                      disabled={isBusy}
                      onClick={onOpenDirectoryInput}
                      type="button"
                    >
                      <FolderOpen aria-hidden="true" />
                      {copy.selectFolder}
                    </button>
                  </>
                )}
              </div>
              <input
                className={styles.hiddenInput}
                multiple
                onChange={onDirectoryInput}
                ref={directoryInputRef}
                type="file"
              />
            </div>
            {projectError ? (
              <div className={cx(styles.message, styles.errorMessage)}>
                <AlertCircle aria-hidden="true" />
                <span>{projectError}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};
