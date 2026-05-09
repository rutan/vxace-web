import { FolderOpen } from 'lucide-react';

export interface DirectoryFieldProps {
  actionLabel: string;
  actionTestId?: string;
  disabled: boolean;
  label?: string;
  onAction: () => void;
  pathValue: string;
  placeholder: string;
}

export const DirectoryField = ({
  actionLabel,
  actionTestId,
  disabled,
  label,
  onAction,
  pathValue,
  placeholder,
}: DirectoryFieldProps) => {
  return (
    <div className="grid gap-1.5">
      {label ? <span className="text-sm font-semibold text-slate-800">{label}</span> : null}
      <div className="grid grid-cols-[1fr_150px] gap-2">
        <div className="flex h-10 items-center rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700">
          <span className={pathValue ? 'truncate' : 'text-slate-400'} title={pathValue || placeholder}>
            {pathValue || placeholder}
          </span>
        </div>
        <button
          className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid={actionTestId}
          disabled={disabled}
          onClick={onAction}
          type="button"
        >
          <FolderOpen aria-hidden="true" className="h-4 w-4" />
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
