import styles from '../ConverterApp.module.css';
import { cx } from '../lib/cx';
import { virtualGamepadModes, type Draft, type VirtualGamepadMode } from '../model/converter';
import { ScreenSizeField, TextField } from './FormFields';

export const GameSettingsSection = ({
  copy,
  draft,
  hasFiles,
  onPatchDraft,
}: {
  copy: {
    gameId: {
      description: string;
      label: string;
      warning: string;
    };
    heading: string;
    screenSize: {
      description: string;
      heightLabel: string;
      label: string;
      widthLabel: string;
    };
    title: {
      description: string;
      label: string;
    };
    virtualGamepad: {
      description: string;
      label: string;
      options: Record<VirtualGamepadMode, string>;
    };
  };
  draft: Draft;
  hasFiles: boolean;
  onPatchDraft: (patch: Partial<Draft>) => void;
}) => (
  <section className={cx(styles.section)} aria-labelledby="game-settings-heading">
    <div className={cx(styles.sectionGrid, styles.shell)}>
      <div className={styles.sectionHeading}>
        <p className={styles.step}>Step 2</p>
        <h2 id="game-settings-heading">{copy.heading}</h2>
      </div>
      <div className={styles.sectionBody}>
        <fieldset className={styles.stepFieldset} disabled={!hasFiles}>
          <div className={styles.formGrid}>
            <TextField
              description={copy.title.description}
              label={copy.title.label}
              value={draft.title}
              onChange={(title) => onPatchDraft({ title })}
            />
            <TextField
              description={copy.gameId.description}
              label={copy.gameId.label}
              value={draft.gameId}
              warning={copy.gameId.warning}
              onChange={(gameId) => onPatchDraft({ gameId })}
            />
            <ScreenSizeField
              copy={copy.screenSize}
              height={draft.screenHeight}
              width={draft.screenWidth}
              onChangeHeight={(screenHeight) => onPatchDraft({ screenHeight })}
              onChangeWidth={(screenWidth) => onPatchDraft({ screenWidth })}
            />
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.virtualGamepad.label}</span>
              <span className={styles.fieldDescription}>{copy.virtualGamepad.description}</span>
              <select
                value={draft.virtualGamepad}
                onChange={(event) => onPatchDraft({ virtualGamepad: event.currentTarget.value as VirtualGamepadMode })}
              >
                {virtualGamepadModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {copy.virtualGamepad.options[mode]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      </div>
    </div>
  </section>
);
