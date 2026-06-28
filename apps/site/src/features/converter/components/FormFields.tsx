import type { ReactNode } from 'react';
import styles from '../ConverterApp.module.css';

export const TextField = ({
  description,
  label,
  onChange,
  value,
  warning,
}: {
  description?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
  warning?: string;
}) => (
  <label className={styles.field}>
    <span className={styles.fieldLabel}>{label}</span>
    {description ? <span className={styles.fieldDescription}>{description}</span> : null}
    <input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    {warning ? <span className={styles.fieldWarning}>{warning}</span> : null}
  </label>
);

export const ScreenSizeField = ({
  copy,
  height,
  onChangeHeight,
  onChangeWidth,
  width,
}: {
  copy: {
    description: string;
    heightLabel: string;
    label: string;
    widthLabel: string;
  };
  height: number;
  onChangeHeight: (value: number) => void;
  onChangeWidth: (value: number) => void;
  width: number;
}) => (
  <div className={styles.field}>
    <span className={styles.fieldLabel}>{copy.label}</span>
    <span className={styles.fieldDescription}>{copy.description}</span>
    <div className={styles.screenSizeInputs}>
      <input
        aria-label={copy.widthLabel}
        min={1}
        type="number"
        value={width}
        onChange={(event) => onChangeWidth(Number(event.currentTarget.value))}
      />
      <span aria-hidden="true">x</span>
      <input
        aria-label={copy.heightLabel}
        min={1}
        type="number"
        value={height}
        onChange={(event) => onChangeHeight(Number(event.currentTarget.value))}
      />
    </div>
  </div>
);

export const AdvancedSetting = ({
  checked,
  children,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  children?: ReactNode;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) => (
  <section className={styles.advancedSetting}>
    <label className={styles.advancedSettingHeader}>
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.currentTarget.checked)} />
      <span className={styles.advancedSettingText}>
        <span className={styles.advancedSettingLabel}>{label}</span>
        <span className={styles.advancedSettingDescription}>{description}</span>
      </span>
    </label>
    {children ? <div className={styles.advancedSettingBody}>{children}</div> : null}
  </section>
);

export const TextArea = ({
  description,
  disabled,
  label,
  minRows = 4,
  onChange,
  value,
}: {
  description?: string;
  disabled?: boolean;
  label: string;
  minRows?: number;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label className={styles.field}>
    <span className={styles.fieldLabel}>{label}</span>
    {description ? <span className={styles.fieldDescription}>{description}</span> : null}
    <textarea
      disabled={disabled}
      rows={minRows}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  </label>
);
