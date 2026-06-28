import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import styles from './ThemeButton.module.css';

type Theme = 'system' | 'light' | 'dark';

const themeOrder: Theme[] = ['system', 'light', 'dark'];
const themeStorageKey = 'theme';

const labels = {
  en: {
    dark: 'Dark theme',
    light: 'Light theme',
    next: 'Switch color theme',
    system: 'System theme',
  },
  ja: {
    dark: 'ダークテーマ',
    light: 'ライトテーマ',
    next: 'カラーテーマを切り替え',
    system: 'システム設定のテーマ',
  },
} as const;

export const ThemeButton = () => {
  const [theme, setTheme] = useState<Theme>('system');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setTheme(readCurrentTheme());
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }

    applyTheme(theme);
  }, [hasMounted, theme]);

  const copy = useMemo(() => readLabels(), []);
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const currentLabel = copy[theme];

  const handleClick = () => {
    setTheme((currentTheme) => {
      const currentIndex = themeOrder.indexOf(currentTheme);
      return themeOrder[(currentIndex + 1) % themeOrder.length] ?? 'system';
    });
  };

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={`${copy.next}: ${currentLabel}`}
      title={currentLabel}
      onClick={handleClick}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
    </button>
  );
};

const readCurrentTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const value = localStorage.getItem(themeStorageKey);
  if (value === 'light' || value === 'dark') {
    return value;
  }
  return 'system';
};

const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (theme === 'system') {
    localStorage.removeItem(themeStorageKey);
    document.documentElement.removeAttribute('data-theme');
    return;
  }

  localStorage.setItem(themeStorageKey, theme);
  document.documentElement.setAttribute('data-theme', theme);
};

const readLabels = () => {
  if (typeof document === 'undefined') {
    return labels.en;
  }

  return document.documentElement.lang.startsWith('ja') ? labels.ja : labels.en;
};
