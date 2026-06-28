import { FileCode2 } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import styles from '../ConverterApp.module.css';
import { cx } from '../lib/cx';
import type { Draft } from '../model/converter';
import { AdvancedSetting, TextArea } from './FormFields';

export const AdvancedSettingsSection = ({
  copy,
  draft,
  hasFiles,
  htmlInputRef,
  isBusy,
  onLoadHtmlFile,
  onPatchDraft,
}: {
  copy: {
    excludeSourceFiles: {
      description: string;
      label: string;
      patternsDescription: string;
      patternsLabel: string;
    };
    heading: string;
    htmlInjection: {
      contentDescription: string;
      contentLabel: string;
      description: string;
      importButton: string;
      label: string;
    };
    omitUnusedAssets: {
      description: string;
      label: string;
      patternsDescription: string;
      patternsLabel: string;
    };
    packAssets: {
      description: string;
      label: string;
    };
  };
  draft: Draft;
  hasFiles: boolean;
  htmlInputRef: RefObject<HTMLInputElement | null>;
  isBusy: boolean;
  onLoadHtmlFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onPatchDraft: (patch: Partial<Draft>) => void;
}) => (
  <section className={cx(styles.section, styles.sectionBand)} aria-labelledby="advanced-settings-heading">
    <div className={cx(styles.sectionGrid, styles.shell)}>
      <div className={styles.sectionHeading}>
        <p className={styles.step}>Step 3</p>
        <h2 id="advanced-settings-heading">{copy.heading}</h2>
      </div>
      <div className={styles.sectionBody}>
        <fieldset className={styles.stepFieldset} disabled={!hasFiles}>
          <div className={styles.advancedSettingsStack}>
            <AdvancedSetting
              checked={draft.packAssets}
              description={copy.packAssets.description}
              label={copy.packAssets.label}
              onChange={(packAssets) => onPatchDraft({ packAssets })}
            />

            <AdvancedSetting
              checked={draft.excludeSourceFiles}
              description={copy.excludeSourceFiles.description}
              label={copy.excludeSourceFiles.label}
              onChange={(excludeSourceFiles) => onPatchDraft({ excludeSourceFiles })}
            >
              {draft.excludeSourceFiles ? (
                <TextArea
                  description={copy.excludeSourceFiles.patternsDescription}
                  label={copy.excludeSourceFiles.patternsLabel}
                  value={draft.excludeSourcePatterns}
                  onChange={(excludeSourcePatterns) => onPatchDraft({ excludeSourcePatterns })}
                />
              ) : null}
            </AdvancedSetting>

            <AdvancedSetting
              checked={draft.omitUnusedAssets}
              description={copy.omitUnusedAssets.description}
              label={copy.omitUnusedAssets.label}
              onChange={(omitUnusedAssets) => onPatchDraft({ omitUnusedAssets })}
            >
              {draft.omitUnusedAssets ? (
                <TextArea
                  description={copy.omitUnusedAssets.patternsDescription}
                  label={copy.omitUnusedAssets.patternsLabel}
                  value={draft.keepUnusedAssetsPatterns}
                  onChange={(keepUnusedAssetsPatterns) => onPatchDraft({ keepUnusedAssetsPatterns })}
                />
              ) : null}
            </AdvancedSetting>

            <AdvancedSetting
              checked={draft.useHtmlInjection}
              description={copy.htmlInjection.description}
              label={copy.htmlInjection.label}
              onChange={(useHtmlInjection) => onPatchDraft({ useHtmlInjection })}
            >
              {draft.useHtmlInjection ? (
                <>
                  <div className={styles.htmlImportActions}>
                    <button
                      className={cx(styles.button, styles.secondaryButton)}
                      disabled={isBusy}
                      onClick={() => htmlInputRef.current?.click()}
                      type="button"
                    >
                      <FileCode2 aria-hidden="true" />
                      {copy.htmlInjection.importButton}
                    </button>
                  </div>
                  <input
                    accept=".html,.htm,text/html"
                    className={styles.hiddenInput}
                    onChange={onLoadHtmlFile}
                    ref={htmlInputRef}
                    type="file"
                  />
                  <TextArea
                    description={copy.htmlInjection.contentDescription}
                    label={copy.htmlInjection.contentLabel}
                    minRows={7}
                    value={draft.htmlInjection}
                    onChange={(htmlInjection) => onPatchDraft({ htmlInjection })}
                  />
                </>
              ) : null}
            </AdvancedSetting>
          </div>
        </fieldset>
      </div>
    </div>
  </section>
);
