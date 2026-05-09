import { HelpCircle, RotateCcw } from 'lucide-react';
import type { Locales, TranslationFunctions } from '../i18n/i18n-types';
import { Button } from './Button';

export interface HeaderProps {
  className?: string;
  locale: Locales;
  LL: TranslationFunctions;
  onHelp: () => void;
  onLocaleChange: (locale: Locales) => void;
  onReset: () => void;
  canReset: boolean;
}

export const Header = ({ className, locale, LL, onHelp, onLocaleChange, onReset, canReset }: HeaderProps) => {
  return (
    <header
      className={`flex min-w-0 items-center justify-between gap-4 border-b border-slate-300 bg-white px-[18px] ${className ?? ''}`}
    >
      <h1 className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-base leading-tight font-bold">
        {LL.app.title()}
      </h1>
      <div className="flex shrink-0 items-center gap-2">
        <label className="sr-only" htmlFor="playground-locale">
          {LL.header.language()}
        </label>
        <select
          id="playground-locale"
          className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2 text-slate-800"
          value={locale}
          onChange={(event) => onLocaleChange(event.currentTarget.value as Locales)}
          title={String(LL.header.language())}
          aria-label={String(LL.header.language())}
        >
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
        <Button
          variant="normal"
          type="button"
          onClick={onHelp}
          title={String(LL.header.help())}
          aria-label={String(LL.header.help())}
        >
          <HelpCircle size={20} aria-hidden="true" />
          {LL.header.help()}
        </Button>
        <Button
          variant="normal"
          type="button"
          onClick={onReset}
          title={String(LL.header.reset())}
          aria-label={String(LL.header.reset())}
          disabled={!canReset}
        >
          <RotateCcw size={20} aria-hidden="true" />
          {LL.header.reset()}
        </Button>
      </div>
    </header>
  );
};
