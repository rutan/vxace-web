import type { I18nLang } from './locales';

export const pageIds = ['home', 'converter'] as const;
export type PageId = (typeof pageIds)[number];

export const localizedPagePaths = {
  en: {
    home: '/',
    converter: '/converter/',
  },
  ja: {
    home: '/ja/',
    converter: '/ja/converter/',
  },
} as const satisfies Record<I18nLang, Record<PageId, string>>;

export const normalizePath = (path: string) => {
  if (path === '') return '/';
  return path.endsWith('/') ? path : `${path}/`;
};

const basePath = normalizePath(import.meta.env.BASE_URL ?? '/');

export const getLocalizedRoutePath = (lang: I18nLang, page: PageId) => localizedPagePaths[lang][page];

export const withBasePath = (path: string) => {
  const normalizedPath = normalizePath(path).replace(/^\/+/, '');
  return basePath === '/' ? `/${normalizedPath}` : `${basePath}${normalizedPath}`;
};

export const getLocalizedPath = (lang: I18nLang, page: PageId) => withBasePath(getLocalizedRoutePath(lang, page));

export const getAlternatePaths = (page: PageId) => ({
  en: withBasePath(localizedPagePaths.en[page]),
  ja: withBasePath(localizedPagePaths.ja[page]),
  xDefault: withBasePath(localizedPagePaths.en[page]),
});

export const removeBasePath = (path: string) => {
  const normalizedPath = normalizePath(path);
  if (basePath === '/') return normalizedPath;
  if (normalizedPath === basePath) return '/';
  return normalizedPath.startsWith(basePath) ? `/${normalizedPath.slice(basePath.length)}` : normalizedPath;
};
