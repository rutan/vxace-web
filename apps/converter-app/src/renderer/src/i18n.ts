import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locales, TranslationFunctions } from '../../shared/i18n/i18n-types.js';
import { i18nObject, isLocale, locales } from '../../shared/i18n/i18n-util.js';
import { loadAllLocales } from '../../shared/i18n/i18n-util.sync.js';

export const supportedLanguages = locales;
export type SupportedLanguage = Locales;

const LANGUAGE_STORAGE_KEY = 'vxace-web-converter-language';

const subscribers = new Set<(language: SupportedLanguage) => void>();

loadAllLocales();

const normalizeLanguage = (language: string | undefined): SupportedLanguage | undefined => {
  const normalized = language?.toLowerCase();
  if (!normalized) return undefined;
  if (isLocale(normalized)) return normalized;
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('en')) return 'en';
  return undefined;
};

const detectLanguage = (): SupportedLanguage => {
  const stored = normalizeLanguage(globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY) ?? undefined);
  if (stored) return stored;

  const browserLanguage = normalizeLanguage(globalThis.navigator?.language);
  if (browserLanguage) return browserLanguage;

  return 'en';
};

let currentLanguage = detectLanguage();

const I18nContext = createContext<{
  LL: TranslationFunctions;
  locale: SupportedLanguage;
}>({
  LL: i18nObject(currentLanguage),
  locale: currentLanguage,
});

export const changeAppLanguage = async (language: SupportedLanguage): Promise<void> => {
  currentLanguage = language;
  globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);

  for (const subscriber of subscribers) {
    subscriber(language);
  }
};

export const getAppLanguage = (): SupportedLanguage => {
  return currentLanguage;
};

const useAppLanguage = (): SupportedLanguage => {
  const [language, setLanguage] = useState(currentLanguage);

  useEffect(() => {
    subscribers.add(setLanguage);
    return () => {
      subscribers.delete(setLanguage);
    };
  }, []);

  return language;
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const language = useAppLanguage();
  const value = useMemo(
    () => ({
      LL: i18nObject(language),
      locale: language,
    }),
    [language],
  );

  return createElement(I18nContext.Provider, { value }, children);
};

export const useI18nContext = () => useContext(I18nContext);
