import { ExternalLink, SquareArrowRightExit } from 'lucide-react';
import type { AppErrorPayload } from '../../../shared';
import { translateAppError } from '../appError';
import { useI18nContext } from '../i18n';
import { Panel } from './Panel';

export interface PreviewScreenProps {
  busy: boolean;
  error?: AppErrorPayload;
  onOpenInBrowser: () => void;
  onStop: () => void;
  url?: string;
}

export const PreviewScreen = ({ busy, error, onOpenInBrowser, onStop, url }: PreviewScreenProps) => {
  const { LL } = useI18nContext();

  return (
    <Panel className="grid gap-5">
      <div className="grid gap-2">
        <h2 className="text-xl font-bold text-slate-900">{LL.preview.title()}</h2>
        {busy ? <p className="text-sm text-slate-600">{LL.preview.starting()}</p> : null}
        {url ? <p className="font-mono text-sm break-all text-slate-600">{url}</p> : null}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-950">
            {translateAppError(LL, error)}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-3">
        {url ? (
          <button
            className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#23527d] bg-[#23527d] px-4 text-sm font-semibold text-white hover:bg-[#1b4368]"
            data-testid="open-preview-browser"
            onClick={onOpenInBrowser}
            type="button"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            {LL.actions.openBrowser()}
          </button>
        ) : null}
        <button
          className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          data-testid="stop-preview"
          onClick={onStop}
          type="button"
        >
          <SquareArrowRightExit aria-hidden="true" className="h-4 w-4" />
          {LL.actions.stopPreview()}
        </button>
      </div>
    </Panel>
  );
};
