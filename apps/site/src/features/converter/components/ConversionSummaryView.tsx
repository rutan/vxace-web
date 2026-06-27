import { CheckCircle2 } from 'lucide-react';
import type { I18nLang } from '$i18n';
import styles from '../ConverterApp.module.css';
import { cx } from '../lib/cx';
import type { ConversionSummary } from '../model/converter';

export const ConversionSummaryView = ({
  copy,
  lang,
  summary,
}: {
  copy: {
    converted: string;
    gameId: string;
    gameTitle: string;
    omitted: string;
    screenSize: string;
    title: string;
    virtualGamepad: string;
    warnings: string;
    zipFilename: string;
    zipSize: string;
  };
  lang: I18nLang;
  summary: ConversionSummary;
}) => (
  <section className={cx(styles.message, styles.successMessage)}>
    <div className={styles.messageTitle}>
      <CheckCircle2 aria-hidden="true" />
      {copy.title}
    </div>
    <dl className={styles.summaryDetails}>
      <SummaryItem label={copy.zipFilename} value={summary.zipFilename} mono />
      <SummaryItem label={copy.zipSize} value={summary.zipSize} />
      <SummaryItem label={copy.gameTitle} value={summary.title} />
      <SummaryItem label={copy.gameId} value={summary.gameId} mono />
      <SummaryItem label={copy.screenSize} value={summary.screenSize} />
      <SummaryItem label={copy.virtualGamepad} value={summary.virtualGamepad} />
    </dl>
    <div className={styles.summaryMetrics}>
      <SummaryMetric label={copy.converted} value={summary.convertedFiles.toLocaleString(lang)} />
      <SummaryMetric label={copy.omitted} value={summary.omittedFiles.toLocaleString(lang)} />
      <SummaryMetric label={copy.warnings} value={summary.warnings.length.toLocaleString(lang)} />
    </div>
    {summary.warnings.length > 0 ? (
      <ul className={styles.warningList}>
        {summary.warnings.slice(0, 5).map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    ) : null}
  </section>
);

const SummaryMetric = ({ label, value }: { label: string; value: string }) => (
  <div className={styles.summaryMetric}>
    <div className={styles.summaryMetricLabel}>{label}</div>
    <div className={styles.summaryMetricValue}>{value}</div>
  </div>
);

const SummaryItem = ({ label, mono, value }: { label: string; mono?: boolean; value: string }) => (
  <div className={styles.summaryItem}>
    <dt>{label}</dt>
    <dd className={mono ? styles.monoValue : undefined}>{value}</dd>
  </div>
);
