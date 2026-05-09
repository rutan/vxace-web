import { VirtualGamepadMode } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { Rocket } from 'lucide-react';
import { AppErrorPayload, Draft, createOutputSubdirectoryName, getDraftOutputDirectory } from '../../../shared';
import type { TranslationFunctions } from '../../../shared/i18n/i18n-types.js';
import { translateAppError } from '../appError';
import type { DraftPatch } from '../hooks';
import { useI18nContext } from '../i18n';
import { AdvancedSettings } from './AdvancedSettings';
import { DirectoryField } from './DirectoryField';
import { InlineError } from './InlineError';
import { StepSection } from './StepSection';

const virtualGamepadOptions: {
  value: VirtualGamepadMode;
  label: (LL: TranslationFunctions) => string;
}[] = [
  {
    value: 'normal',
    label: (LL) => LL.settings.virtualGamepad.options.normal(),
  },
  {
    value: 'normal-swap',
    label: (LL) => LL.settings.virtualGamepad.options.normalSwap(),
  },
  {
    value: 'simple',
    label: (LL) => LL.settings.virtualGamepad.options.simple(),
  },
  {
    value: 'none',
    label: (LL) => LL.settings.virtualGamepad.options.none(),
  },
];

const readDimensionInput = (value: number): number => {
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;
};

export interface ConversionSettingsScreenProps {
  advancedSettingsOpen: boolean;
  busy: boolean;
  canConvert: boolean;
  converterApiAvailable: boolean;
  draft: Draft;
  gameDirectoryError?: AppErrorPayload;
  settingsFileError?: AppErrorPayload;
  onAddExcludeSourcePattern: () => void;
  onAddKeepPattern: () => void;
  onChangeExcludeSourcePattern: (index: number, value: string) => void;
  onChangeKeepPattern: (index: number, value: string) => void;
  onPatchDraft: (patch: DraftPatch) => void;
  onConvert: () => void;
  onRemoveExcludeSourcePattern: (index: number) => void;
  onRemoveInjectHtmlFilePath: (index: number) => void;
  onRemoveKeepPattern: (index: number) => void;
  onSelectGameDirectory: () => void;
  onSelectInjectHtmlFiles: () => void;
  onSelectOutputDirectory: () => void;
  onToggleAdvancedSettings: () => void;
}

export const ConversionSettingsScreen = ({
  advancedSettingsOpen,
  busy,
  canConvert,
  converterApiAvailable,
  draft,
  gameDirectoryError,
  settingsFileError,
  onAddExcludeSourcePattern,
  onAddKeepPattern,
  onChangeExcludeSourcePattern,
  onChangeKeepPattern,
  onPatchDraft,
  onConvert,
  onRemoveExcludeSourcePattern,
  onRemoveInjectHtmlFilePath,
  onRemoveKeepPattern,
  onSelectGameDirectory,
  onSelectInjectHtmlFiles,
  onSelectOutputDirectory,
  onToggleAdvancedSettings,
}: ConversionSettingsScreenProps) => {
  const { LL } = useI18nContext();
  const hasOutputDestination = Boolean(draft.outDir && draft.outputSubdirectoryName.trim());
  const actualOutputDirectory = getDraftOutputDirectory(draft);
  const changeTitle = (title: string) => {
    const currentDefaultOutputSubdirectoryName = createOutputSubdirectoryName(draft.title);
    const shouldUpdateOutputSubdirectoryName =
      !draft.outputSubdirectoryName.trim() || draft.outputSubdirectoryName === currentDefaultOutputSubdirectoryName;

    onPatchDraft({
      title,
      ...(shouldUpdateOutputSubdirectoryName ? { outputSubdirectoryName: createOutputSubdirectoryName(title) } : {}),
    });
  };

  return (
    <>
      {!converterApiAvailable ? (
        <InlineError title={LL.errors.app.apiUnavailableTitle()} message={LL.errors.app.apiUnavailableMessage()} />
      ) : null}
      {settingsFileError ? (
        <InlineError
          title={LL.errors.settingsFile.operationFailedTitle()}
          message={translateAppError(LL, settingsFileError)}
        />
      ) : null}

      <div className="grid gap-4">
        <StepSection
          description={LL.settings.source.description()}
          step="1"
          testId="source-step"
          title={LL.settings.source.title()}
          status={gameDirectoryError ? 'error' : draft.srcDir ? 'complete' : 'active'}
        >
          <DirectoryField
            actionLabel={LL.actions.browseFolder()}
            actionTestId="select-game-directory"
            onAction={onSelectGameDirectory}
            pathValue={draft.srcDir}
            placeholder={LL.settings.placeholder.noSelection()}
            disabled={busy || !converterApiAvailable}
          />
          {gameDirectoryError ? (
            <InlineError
              title={LL.errors.gameDirectory.analysisFailedTitle()}
              message={translateAppError(LL, gameDirectoryError)}
            />
          ) : null}
        </StepSection>

        <StepSection
          description={LL.settings.output.description()}
          step="2"
          testId="output-step"
          title={LL.settings.output.title()}
          status={hasOutputDestination ? 'complete' : draft.srcDir && !gameDirectoryError ? 'active' : 'pending'}
        >
          <DirectoryField
            actionLabel={LL.actions.browseFolder()}
            actionTestId="select-output-directory"
            label={LL.settings.output.parentDirectoryLabel()}
            onAction={onSelectOutputDirectory}
            pathValue={draft.outDir}
            placeholder={LL.settings.placeholder.noSelection()}
            disabled={busy || !converterApiAvailable}
          />
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">{LL.settings.output.subdirectoryNameLabel()}</span>
            <input
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#23527d] focus:ring-2 focus:ring-[#23527d]/20"
              data-testid="output-subdirectory-name-input"
              disabled={busy || !converterApiAvailable}
              onChange={(event) => onPatchDraft({ outputSubdirectoryName: event.target.value })}
              placeholder={LL.settings.output.subdirectoryNamePlaceholder()}
              type="text"
              value={draft.outputSubdirectoryName}
            />
          </label>
          {actualOutputDirectory ? (
            <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold">{LL.settings.output.actualDirectoryLabel()}</span>{' '}
              <span className="break-all font-mono">{actualOutputDirectory}</span>
            </p>
          ) : null}
          <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <input
              checked={draft.cleanOutDir}
              className="mt-1"
              onChange={(event) => onPatchDraft({ cleanOutDir: event.target.checked })}
              type="checkbox"
            />
            <span>{LL.settings.cleanOutput()}</span>
          </label>
        </StepSection>

        <StepSection
          description={LL.settings.title.description()}
          step="3"
          testId="conversion-settings-step"
          title={LL.settings.title.title()}
          status={
            draft.title.trim() && draft.gameId.trim()
              ? 'complete'
              : draft.srcDir && !gameDirectoryError
                ? 'active'
                : 'pending'
          }
        >
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">{LL.settings.title.label()}</span>
            <input
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#23527d] focus:ring-2 focus:ring-[#23527d]/20"
              data-testid="game-title-input"
              onChange={(event) => changeTitle(event.target.value)}
              placeholder={LL.settings.placeholder.title()}
              type="text"
              value={draft.title}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">{LL.settings.gameId.label()}</span>
            <input
              className="h-10 rounded-md border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-[#23527d] focus:ring-2 focus:ring-[#23527d]/20"
              data-testid="game-id-input"
              onChange={(event) => onPatchDraft({ gameId: event.target.value })}
              placeholder="vxace:game"
              type="text"
              value={draft.gameId}
            />
            <span className="text-xs">
              {LL.settings.gameId.description()}
              <br />
              {LL.settings.gameId.example()}
              <br />
            </span>
            <span className="text-xs text-amber-700">{LL.settings.gameId.warning()}</span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">{LL.settings.virtualGamepad.label()}</span>
            <select
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#23527d] focus:ring-2 focus:ring-[#23527d]/20"
              onChange={(event) => onPatchDraft({ virtualGamepad: event.target.value as VirtualGamepadMode })}
              value={draft.virtualGamepad}
            >
              {virtualGamepadOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label(LL)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">{LL.settings.screen.label()}</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">{LL.settings.screen.width()}</span>
                <input
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#23527d] focus:ring-2 focus:ring-[#23527d]/20"
                  data-testid="screen-width-input"
                  min={1}
                  onChange={(event) =>
                    onPatchDraft({ screen: { width: readDimensionInput(event.target.valueAsNumber) } })
                  }
                  step={1}
                  type="number"
                  value={draft.screen.width}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">{LL.settings.screen.height()}</span>
                <input
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#23527d] focus:ring-2 focus:ring-[#23527d]/20"
                  data-testid="screen-height-input"
                  min={1}
                  onChange={(event) =>
                    onPatchDraft({ screen: { height: readDimensionInput(event.target.valueAsNumber) } })
                  }
                  step={1}
                  type="number"
                  value={draft.screen.height}
                />
              </label>
            </div>
          </div>

          <AdvancedSettings
            excludeSourceFilePatterns={draft.excludeSourceFilePatterns}
            injectHtmlFilePaths={draft.injectHtmlFilePaths}
            keepUnusedAssetsPatterns={draft.keepUnusedAssetsPatterns}
            onAddExcludeSourcePattern={onAddExcludeSourcePattern}
            onAddKeepPattern={onAddKeepPattern}
            onChangeExcludeSourcePattern={onChangeExcludeSourcePattern}
            onChangeKeepPattern={onChangeKeepPattern}
            onChangeUseInjectHtml={(value) => onPatchDraft({ useInjectHtml: value })}
            onChangePackAssets={(value) => onPatchDraft({ packAssets: value })}
            onChangeUseExcludeSourceFiles={(value) => onPatchDraft({ useExcludeSourceFiles: value })}
            onChangeUseOmitUnusedAssets={(value) => onPatchDraft({ useOmitUnusedAssets: value })}
            onRemoveExcludeSourcePattern={onRemoveExcludeSourcePattern}
            onRemoveInjectHtmlFilePath={onRemoveInjectHtmlFilePath}
            onRemoveKeepPattern={onRemoveKeepPattern}
            onSelectInjectHtmlFiles={onSelectInjectHtmlFiles}
            onToggleOpen={onToggleAdvancedSettings}
            open={advancedSettingsOpen}
            packAssets={draft.packAssets}
            useExcludeSourceFiles={draft.useExcludeSourceFiles}
            useInjectHtml={draft.useInjectHtml}
            useOmitUnusedAssets={draft.useOmitUnusedAssets}
          />
        </StepSection>

        <div className="my-4">
          <button
            className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[#23527d] bg-[#23527d] px-5 font-semibold text-white hover:bg-[#1b4368] disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="convert-button"
            disabled={!canConvert}
            onClick={onConvert}
            type="button"
          >
            <Rocket aria-hidden="true" className="h-5 w-5" />
            {LL.actions.convert()}
          </button>
        </div>
      </div>
    </>
  );
};
