import type { Locales } from './i18n-types';
import { baseLocale, isLocale } from './i18n-util';

const LOCALE_STORAGE_KEY = 'rpgmaker-vxace-web-playground:locale';

export const detectInitialLocale = (): Locales => {
  const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (savedLocale && isLocale(savedLocale)) return savedLocale;

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const candidate of candidates) {
    const locale = candidate.split('-')[0];
    if (isLocale(locale)) return locale;
  }

  return baseLocale;
};
