export const i18nLocales = ['en', 'ja'] as const;
export type I18nLang = (typeof i18nLocales)[number];

export const defaultLocale: I18nLang = 'en';
