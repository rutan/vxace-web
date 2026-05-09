import { Archive, Check, FolderOpen, MousePointer2, PackageCheck, UploadCloud } from 'lucide-react';
import type { TranslationFunctions } from '../i18n/i18n-types';
import { cx } from '../utils';
import { Button } from './Button';

export interface HelpModalProps {
  LL: TranslationFunctions;
  onClose: () => void;
}

export const HelpModal = ({ LL, onClose }: HelpModalProps) => {
  return (
    <div
      className={cx('HelpModal', 'fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-3 sm:p-5')}
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="grid max-h-[min(800px,calc(100dvh-24px))] w-full max-w-[760px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="help-title" className="m-0 text-lg leading-tight font-bold text-slate-950">
            {LL.app.title()}
          </h2>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-5">
            <HelpSection title={String(LL.help.overview.title())}>
              <HelpParagraph>{LL.help.overview.paragraph1()}</HelpParagraph>
              <HelpParagraph>{LL.help.overview.paragraph2()}</HelpParagraph>
              <HelpParagraph>
                <span className="text-red-700">{LL.help.overview.paragraph3()}</span>
              </HelpParagraph>
            </HelpSection>
            <HelpSection title={String(LL.help.usage.title())}>
              <div className="grid gap-3 sm:grid-cols-2">
                <UsageStep
                  step={1}
                  title={String(LL.help.usage.steps.export.title())}
                  description={String(LL.help.usage.steps.export.description())}
                  visual="export"
                />
                <UsageStep
                  step={2}
                  title={String(LL.help.usage.steps.extract.title())}
                  description={String(LL.help.usage.steps.extract.description())}
                  visual="extract"
                />
                <UsageStep
                  step={3}
                  title={String(LL.help.usage.steps.confirm.title())}
                  description={String(LL.help.usage.steps.confirm.description())}
                  visual="confirm"
                />
                <UsageStep
                  step={4}
                  title={String(LL.help.usage.steps.drop.title())}
                  description={String(LL.help.usage.steps.drop.description())}
                  visual="drop"
                />
              </div>
            </HelpSection>
            <HelpSection title={String(LL.help.limitations.title())}>
              <HelpParagraph>{LL.help.limitations.intro()}</HelpParagraph>
              <ul className="m-0 grid list-outside list-disc gap-1.5 pl-5 text-slate-600 marker:text-slate-400">
                <li>{LL.help.limitations.rtp()}</li>
                <li>{LL.help.limitations.encryptedData()}</li>
                <li>{LL.help.limitations.media()}</li>
                <li>{LL.help.limitations.scripts()}</li>
                <li>{LL.help.limitations.other()}</li>
              </ul>
              <HelpParagraph>{LL.help.limitations.desktop()}</HelpParagraph>
            </HelpSection>
            <HelpSection title={String(LL.help.author.title())}>
              <div className="grid gap-1">
                <HelpLink href="https://x.com/ru_shalm">{LL.help.author.name()}</HelpLink>
                <HelpLink href="https://github.com/rutan/vxace-web">{LL.help.author.repository()}</HelpLink>
              </div>
            </HelpSection>
            <HelpSection title={String(LL.help.licenses.title())}>
              <HelpLink href="/license.md">{LL.help.licenses.playground()}</HelpLink>
              <HelpLink href="/template/license.md">{LL.help.licenses.runtime()}</HelpLink>
            </HelpSection>
            <div className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
              <p className="m-0">
                {LL.help.legal.trademark()}
                <br />
                {LL.help.legal.copyright()}
              </p>
            </div>
          </div>
        </div>

        <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
          <Button variant="normal" type="button" onClick={onClose}>
            {LL.help.close()}
          </Button>
        </footer>
      </div>
    </div>
  );
};

const HelpSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <section className="grid gap-2">
      <h3 className="m-0 text-sm leading-tight font-bold text-slate-950">{title}</h3>
      {children}
    </section>
  );
};

const HelpParagraph = ({ children }: { children?: React.ReactNode }) => {
  return <p className="m-0 leading-relaxed text-slate-600">{children}</p>;
};

type UsageStepVisual = 'export' | 'extract' | 'confirm' | 'drop';

const UsageStep = ({
  step,
  title,
  description,
  visual,
}: {
  step: number;
  title: string;
  description: string;
  visual: UsageStepVisual;
}) => {
  return (
    <article className="grid grid-rows-[auto_1fr] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <UsageVisual visual={visual} />
      <div className="grid gap-1.5 border-t border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs leading-none font-bold text-white">
            {step}
          </span>
          <h4 className="m-0 text-sm leading-tight font-bold text-slate-950">{title}</h4>
        </div>
        <p className="m-0 text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
    </article>
  );
};

const UsageVisual = ({ visual }: { visual: UsageStepVisual }) => {
  return (
    <div
      className="relative grid aspect-[16/9] min-h-0 place-items-center overflow-hidden bg-slate-100 p-4"
      aria-hidden="true"
    >
      {visual === 'export' ? <ExportVisual /> : null}
      {visual === 'extract' ? <ExtractVisual /> : null}
      {visual === 'confirm' ? <ConfirmVisual /> : null}
      {visual === 'drop' ? <DropVisual /> : null}
    </div>
  );
};

const ExportVisual = () => {
  return (
    <div className="w-full max-w-[220px] rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="flex h-7 items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2">
        <span className="size-2 rounded-full bg-red-400" />
        <span className="size-2 rounded-full bg-amber-400" />
        <span className="size-2 rounded-full bg-emerald-400" />
      </div>
      <div className="grid gap-2.5 p-3">
        <div className="h-2.5 w-24 rounded-full bg-slate-300" />
        <div className="grid gap-1.5">
          <div className="h-2 rounded-full bg-slate-200" />
          <div className="h-2 w-4/5 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5">
          <span className="grid size-4 place-items-center rounded border border-emerald-500 bg-emerald-600 text-white">
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="h-2 w-24 rounded-full bg-emerald-300" />
        </div>
      </div>
    </div>
  );
};

const ExtractVisual = () => {
  return (
    <div className="flex w-full max-w-[230px] items-center justify-center gap-5">
      <div className="grid place-items-center gap-2">
        <div className="grid size-16 place-items-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm">
          <Archive size={30} />
        </div>
        <div className="h-2 w-14 rounded-full bg-slate-300" />
      </div>
      <div className="h-0.5 w-10 rounded-full bg-emerald-500" />
      <div className="grid place-items-center gap-2">
        <div className="grid size-16 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm">
          <FolderOpen size={32} />
        </div>
        <div className="h-2 w-16 rounded-full bg-emerald-300" />
      </div>
    </div>
  );
};

const ConfirmVisual = () => {
  return (
    <div className="w-full max-w-[220px] rounded-md border border-slate-300 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <FolderOpen size={18} className="text-emerald-700" />
        <span className="h-2.5 w-24 rounded-full bg-slate-300" />
      </div>
      <div className="grid gap-1.5 border-l border-slate-200 pl-4">
        <FileRow label="Game.ini" active />
        <FileRow label="Data" />
        <FileRow label="Graphics" />
        <FileRow label="Audio" />
      </div>
    </div>
  );
};

const DropVisual = () => {
  return (
    <div className="relative grid h-full w-full max-w-[230px] place-items-center rounded-lg border-2 border-dashed border-emerald-400 bg-white/75">
      <div className="grid place-items-center gap-2 text-emerald-700">
        <UploadCloud size={34} />
        <div className="h-2 w-24 rounded-full bg-emerald-300" />
        <div className="h-2 w-16 rounded-full bg-slate-300" />
      </div>
      <MousePointer2 className="absolute right-6 bottom-5 text-slate-700 drop-shadow-sm" size={24} />
    </div>
  );
};

const FileRow = ({ label, active = false }: { label: string; active?: boolean }) => {
  return (
    <div className="flex items-center gap-2">
      {active ? (
        <PackageCheck size={15} className="text-emerald-700" />
      ) : (
        <span className="size-[15px] rounded-sm bg-slate-200" />
      )}
      <span
        className={cx('font-mono text-[11px] leading-none', active ? 'font-bold text-emerald-800' : 'text-slate-500')}
      >
        {label}
      </span>
    </div>
  );
};

const HelpLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  return (
    <a
      className="inline-flex w-fit text-sm font-medium text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-800"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
};
