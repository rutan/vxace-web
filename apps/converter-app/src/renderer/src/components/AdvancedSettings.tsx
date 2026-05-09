import { ChevronDown, ChevronRight, FilePlus, Plus, Trash2, Wrench } from 'lucide-react';
import { useI18nContext } from '../i18n';

export interface AdvancedSettingsProps {
  excludeSourceFilePatterns: string[];
  injectHtmlFilePaths: string[];
  keepUnusedAssetsPatterns: string[];
  onAddExcludeSourcePattern: () => void;
  onAddKeepPattern: () => void;
  onChangeExcludeSourcePattern: (index: number, value: string) => void;
  onChangeKeepPattern: (index: number, value: string) => void;
  onChangePackAssets: (value: boolean) => void;
  onChangeUseExcludeSourceFiles: (value: boolean) => void;
  onChangeUseInjectHtml: (value: boolean) => void;
  onChangeUseOmitUnusedAssets: (value: boolean) => void;
  onRemoveExcludeSourcePattern: (index: number) => void;
  onRemoveInjectHtmlFilePath: (index: number) => void;
  onRemoveKeepPattern: (index: number) => void;
  onSelectInjectHtmlFiles: () => void;
  onToggleOpen: () => void;
  open: boolean;
  packAssets: boolean;
  useExcludeSourceFiles: boolean;
  useInjectHtml: boolean;
  useOmitUnusedAssets: boolean;
}

export const AdvancedSettings = ({
  excludeSourceFilePatterns,
  injectHtmlFilePaths,
  keepUnusedAssetsPatterns,
  onAddExcludeSourcePattern,
  onAddKeepPattern,
  onChangeExcludeSourcePattern,
  onChangeKeepPattern,
  onChangePackAssets,
  onChangeUseExcludeSourceFiles,
  onChangeUseInjectHtml,
  onChangeUseOmitUnusedAssets,
  onRemoveExcludeSourcePattern,
  onRemoveInjectHtmlFilePath,
  onRemoveKeepPattern,
  onSelectInjectHtmlFiles,
  onToggleOpen,
  open,
  packAssets,
  useExcludeSourceFiles,
  useInjectHtml,
  useOmitUnusedAssets,
}: AdvancedSettingsProps) => {
  const { LL } = useI18nContext();

  return (
    <section className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <button
        aria-expanded={open}
        className="flex h-8 cursor-pointer items-center justify-between text-left text-sm font-bold text-slate-900"
        data-testid="advanced-settings-toggle"
        onClick={onToggleOpen}
        type="button"
      >
        <span className="flex items-center gap-2">
          <Wrench aria-hidden="true" className="h-4 w-4" />
          {LL.advanced.title()}
        </span>
        <span aria-hidden="true" className="flex items-center gap-1 text-slate-500">
          {open ? (
            <>
              {LL.actions.close()}
              <ChevronDown className="h-4 w-4" />
            </>
          ) : (
            <>
              {LL.actions.open()}
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </span>
      </button>

      {open ? (
        <div className="grid gap-3 border-t border-slate-200 pt-3">
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              checked={packAssets}
              data-testid="pack-assets-checkbox"
              onChange={(event) => onChangePackAssets(event.target.checked)}
              type="checkbox"
            />
            <span>{LL.advanced.packAssets()}</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              checked={useExcludeSourceFiles}
              data-testid="exclude-source-files-checkbox"
              onChange={(event) => onChangeUseExcludeSourceFiles(event.target.checked)}
              type="checkbox"
            />
            <span>{LL.advanced.excludeSourceFiles()}</span>
          </label>

          {useExcludeSourceFiles ? (
            <PatternList
              addTestId="exclude-source-pattern-add"
              label={LL.advanced.excludeSourceFilePatterns()}
              onAdd={onAddExcludeSourcePattern}
              onChange={onChangeExcludeSourcePattern}
              onRemove={onRemoveExcludeSourcePattern}
              patterns={excludeSourceFilePatterns}
              placeholder="Save*.rvdata2"
              testIdPrefix="exclude-source-pattern"
            />
          ) : null}

          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              checked={useOmitUnusedAssets}
              data-testid="omit-unused-assets-checkbox"
              onChange={(event) => onChangeUseOmitUnusedAssets(event.target.checked)}
              type="checkbox"
            />
            <span>{LL.advanced.omitUnusedAssets()}</span>
          </label>

          {useOmitUnusedAssets ? (
            <PatternList
              addTestId="keep-pattern-add"
              label={LL.advanced.keepUnusedAssets()}
              onAdd={onAddKeepPattern}
              onChange={onChangeKeepPattern}
              onRemove={onRemoveKeepPattern}
              patterns={keepUnusedAssetsPatterns}
              placeholder="Graphics/Pictures/**"
              testIdPrefix="keep-pattern"
            />
          ) : null}

          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              checked={useInjectHtml}
              data-testid="inject-html-checkbox"
              onChange={(event) => onChangeUseInjectHtml(event.target.checked)}
              type="checkbox"
            />
            <span>{LL.advanced.injectHtml()}</span>
          </label>

          {useInjectHtml ? (
            <HtmlInjectionFileList
              filePaths={injectHtmlFilePaths}
              onRemove={onRemoveInjectHtmlFilePath}
              onSelect={onSelectInjectHtmlFiles}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

const HtmlInjectionFileList = ({
  filePaths,
  onRemove,
  onSelect,
}: {
  filePaths: string[];
  onRemove: (index: number) => void;
  onSelect: () => void;
}) => {
  const { LL } = useI18nContext();

  return (
    <div className="grid gap-2 pl-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{LL.advanced.injectHtmlFiles()}</span>
        <button
          className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          data-testid="inject-html-file-select"
          onClick={onSelect}
          type="button"
        >
          <FilePlus aria-hidden="true" className="h-4 w-4" />
          {LL.actions.browseFile()}
        </button>
      </div>
      {filePaths.length > 0 ? (
        <div className="grid gap-2">
          {filePaths.map((filePath, index) => (
            <div key={`${index}:${filePath}`} className="grid grid-cols-[1fr_80px] gap-2">
              <div
                className="flex h-10 items-center rounded-md border border-slate-300 bg-slate-100 px-3 font-mono text-sm text-slate-700"
                data-testid={`inject-html-file-path-${index}`}
                title={filePath}
              >
                <span className="truncate">{filePath}</span>
              </div>
              <button
                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                data-testid={`inject-html-file-remove-${index}`}
                onClick={() => onRemove(index)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {LL.actions.remove()}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{LL.advanced.noInjectHtmlFiles()}</p>
      )}
    </div>
  );
};

const PatternList = ({
  addTestId,
  label,
  onAdd,
  onChange,
  onRemove,
  patterns,
  placeholder,
  testIdPrefix,
}: {
  addTestId: string;
  label: string;
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  patterns: string[];
  placeholder: string;
  testIdPrefix: string;
}) => {
  const { LL } = useI18nContext();

  return (
    <div className="grid gap-2 pl-6">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div className="grid gap-2">
        {patterns.map((pattern, index) => (
          <div key={index} className="grid grid-cols-[1fr_80px] gap-2">
            <input
              className="h-10 rounded-md border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-[#23527d] focus:ring-2 focus:ring-[#23527d]/20"
              data-testid={`${testIdPrefix}-input-${index}`}
              onChange={(event) => onChange(index, event.target.value)}
              placeholder={placeholder}
              type="text"
              value={pattern}
            />
            <button
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              data-testid={`${testIdPrefix}-remove-${index}`}
              onClick={() => onRemove(index)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {LL.actions.remove()}
            </button>
          </div>
        ))}
      </div>
      <button
        className="flex h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        data-testid={addTestId}
        onClick={onAdd}
        type="button"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        {LL.actions.add()}
      </button>
    </div>
  );
};
