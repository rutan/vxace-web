import { CircleAlert, CircleCheck, ExternalLink, FolderOpen, RotateCcw } from 'lucide-react';
import type { AppErrorPayload, ConversionSummary } from '../../../shared';
import { translateAppError } from '../appError';
import { useI18nContext } from '../i18n';
import { cx } from '../utils';
import { Panel } from './Panel';

export interface ConversionResultScreenProps {
  error?: AppErrorPayload;
  onBackToSettings: () => void;
  onOpenOutputDirectory: () => void;
  onStartPreview: () => void;
  openOutputError?: AppErrorPayload;
  summary?: ConversionSummary;
}

export const ConversionResultScreen = ({
  error,
  onBackToSettings,
  onOpenOutputDirectory,
  onStartPreview,
  openOutputError,
  summary,
}: ConversionResultScreenProps) => {
  const { LL } = useI18nContext();

  return (
    <div className={cx('ConversionResultScreen')}>
      <ConversionResultHeader ok={!error} />
      {error ? (
        <ConversionErrorView error={error} />
      ) : (
        <ConversionSuccessView
          openOutputError={openOutputError}
          summary={summary}
          onOpenOutputDirectory={onOpenOutputDirectory}
          onStartPreview={onStartPreview}
        />
      )}
      <div className="flex items-center justify-center">
        <button
          className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          data-testid="back-to-settings"
          onClick={onBackToSettings}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          {LL.actions.backToSettings()}
        </button>
      </div>
    </div>
  );
};

const ConversionResultHeader = ({ ok }: { ok: boolean }) => {
  const { LL } = useI18nContext();

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div
        className={cx(
          'flex items-center justify-center w-24 h-24 rounded-full',
          'text-white',
          ok ? 'bg-emerald-700' : 'bg-red-700',
        )}
      >
        {ok ? (
          <CircleCheck aria-hidden="true" className="h-12 w-12" />
        ) : (
          <CircleAlert aria-hidden="true" className="h-12 w-12" />
        )}
      </div>
      <h2 className="text-xl font-bold text-slate-900">{ok ? LL.result.successTitle() : LL.result.errorTitle()}</h2>
    </div>
  );
};

const ConversionSuccessView = ({
  openOutputError,
  summary,
  onOpenOutputDirectory,
  onStartPreview,
}: {
  openOutputError?: AppErrorPayload;
  summary?: ConversionSummary;
  onOpenOutputDirectory: () => void;
  onStartPreview: () => void;
}) => {
  const { LL } = useI18nContext();

  return (
    <div>
      <div className="grid justify-items-center gap-3">
        <div className="flex items-center justify-center gap-4">
          <button
            className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-emerald-700 bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
            data-testid="open-output-directory"
            onClick={onOpenOutputDirectory}
            type="button"
          >
            <FolderOpen aria-hidden="true" className="h-4 w-4" />
            {LL.actions.openOutputFolder()}
          </button>
          <button
            className="ml-4 flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            data-testid="start-preview"
            onClick={onStartPreview}
            type="button"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            {LL.actions.previewInBrowser()}
          </button>
        </div>
        {openOutputError ? (
          <p className="max-w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
            {LL.errors.output.openFailed({ message: translateAppError(LL, openOutputError) })}
          </p>
        ) : null}
      </div>
      <Panel className="my-8">
        {summary ? (
          <ConversionResult summary={summary} />
        ) : (
          <p className="text-center text-sm text-slate-500">{LL.result.noSummary()}</p>
        )}
      </Panel>
    </div>
  );
};

const ConversionErrorView = ({ error }: { error: AppErrorPayload }) => {
  const { LL } = useI18nContext();

  return (
    <div>
      <Panel className="my-8">
        <div className="grid gap-2">
          <h3 className="text-sm font-bold text-slate-900">{LL.errors.title()}</h3>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-950">
            {translateAppError(LL, error)}
          </pre>
        </div>
      </Panel>
    </div>
  );
};

const ConversionResult = ({ summary }: { summary: ConversionSummary }) => {
  const { LL } = useI18nContext();

  return (
    <div className="grid gap-4">
      {summary.warnings.length > 0 ? (
        <section className="grid gap-2">
          <ul className="grid max-h-44 gap-2 overflow-auto text-sm">
            {summary.warnings.map((warning, index) => (
              <li
                key={`${warning.code}-${index}`}
                className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950"
              >
                <p className="font-mono text-xs">{warning.code}</p>
                <p className="mt-1">{warning.message}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <dl className="grid gap-3 text-sm">
        <SummaryItem label={LL.settings.title.label()} value={summary.title} />
        <SummaryItem label={LL.settings.gameId.label()} value={summary.gameId} mono />
        <SummaryItem label={LL.result.source()} value={summary.source} />
        <SummaryItem label={LL.result.output()} value={summary.output} />
      </dl>

      <ConvertedFileList files={summary.convertedFiles} />
      <OmittedFileList files={summary.omittedFiles} />
    </div>
  );
};

const ConvertedFileList = ({ files }: { files: ConversionSummary['convertedFiles'] }) => {
  const { LL } = useI18nContext();

  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-bold text-slate-900">{LL.result.convertedFiles()}</h3>
      {files.length > 0 ? (
        <ul className="grid max-h-72 gap-2 overflow-auto text-sm">
          {files.map((file, index) => (
            <li
              key={`${file.outputPath}-${index}`}
              className="grid gap-1 rounded-md border border-slate-200 bg-slate-50 p-3"
            >
              <p className="font-mono text-xs break-all text-slate-500">
                {file.sourcePath ?? LL.result.generatedFile()}
              </p>
              <p className="font-mono text-sm break-all text-slate-950">{file.outputPath}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          {LL.result.noConvertedFiles()}
        </p>
      )}
    </section>
  );
};

const OmittedFileList = ({ files }: { files: ConversionSummary['omittedFiles'] }) => {
  const { LL } = useI18nContext();

  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-bold text-slate-900">{LL.result.omittedFiles()}</h3>
      {files.length > 0 ? (
        <ul className="grid max-h-44 gap-2 overflow-auto text-sm">
          {files.map((file) => (
            <li key={file.sourcePath} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 inline-flex rounded-sm bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {formatOmittedReason(LL, file.reason)}
              </span>
              <p className="font-mono text-sm break-all text-slate-950">{file.sourcePath}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          {LL.result.noOmittedFiles()}
        </p>
      )}
    </section>
  );
};

const formatOmittedReason = (
  LL: ReturnType<typeof useI18nContext>['LL'],
  reason: ConversionSummary['omittedFiles'][number]['reason'],
) => {
  switch (reason) {
    case 'source-file':
      return LL.result.omittedReasonSourceFile();
    case 'unused-asset':
      return LL.result.omittedReasonUnusedAsset();
  }
};

const SummaryItem = ({ label, mono, value }: { label: string; mono?: boolean; value: string }) => {
  return (
    <div className="grid gap-1 border-b border-slate-100 pb-2">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={`break-all text-slate-950 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
};
