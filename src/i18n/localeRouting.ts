import seoTranslations from '../data/seoTranslations.json';
import categorySeoConfig from '../data/categorySeo.json';
import type { Language } from './translations';

export const SUPPORTED_LANGUAGES: readonly Language[] = [
  'en',
  'ar',
  'es',
  'pt',
  'fr',
  'de',
  'tr',
  'id',
  'ru',
  'it',
  'pl',
] as const;

export const LOCALIZED_URL_PREFIXES: readonly Exclude<Language, 'en'>[] = [
  'ar',
  'es',
  'pt',
  'fr',
  'de',
  'tr',
  'id',
  'ru',
  'it',
  'pl',
];

const LOCALIZED_PREFIX_SET = new Set<string>(LOCALIZED_URL_PREFIXES);

export interface ExtractedRouteLang {
  langFromUrl: Language | null;
  basePath: string;
}

/**
 * Extracts an optional /:lang prefix from a pathname (e.g. /es/category/racing -> langFromUrl='es', basePath='/category/racing').
 */
export function extractLangFromPathname(pathname: string): ExtractedRouteLang {
  const clean = pathname || '/';
  const match = clean.match(/^\/([a-z]{2})(\/|$)(.*)$/i);
  if (match) {
    const candidate = match[1].toLowerCase();
    if (LOCALIZED_PREFIX_SET.has(candidate)) {
      const rest = match[3] ? `/${match[3]}` : '/';
      return {
        langFromUrl: candidate as Language,
        basePath: rest === '' ? '/' : rest,
      };
    }
  }
  return {
    langFromUrl: null,
    basePath: clean.startsWith('/') ? clean : `/${clean}`,
  };
}

/**
 * Checks whether a normalized base path has dedicated multilingual SEO routes.
 */
export function isLocalizableSeoPath(basePath: string): boolean {
  if (
    basePath === '/' ||
    basePath === '/categories' ||
    basePath === '/trending' ||
    basePath === '/popular' ||
    basePath === '/about'
  ) {
    return true;
  }
  return basePath.startsWith('/category/') || basePath.startsWith('/game/');
}

/**
 * Builds a clean localized path (English stays unprefixed at root; non-EN prefixes /<lang>/...).
 */
export function localizePath(targetPath: string, lang: Language): string {
  const { basePath } = extractLangFromPathname(targetPath);
  if (lang === 'en' || !isLocalizableSeoPath(basePath)) {
    return basePath;
  }
  if (basePath === '/') {
    return `/${lang}`;
  }
  return `/${lang}${basePath}`;
}

export interface HreflangEntry {
  hrefLang: string;
  href: string;
}

/**
 * Generates bidirectional hreflang alternates + x-default for a given path.
 */
export function getHreflangLinks(currentPath: string, origin = 'https://kyraxo.com'): HreflangEntry[] {
  const { basePath } = extractLangFromPathname(currentPath);
  const cleanOrigin = origin.replace(/\/+$/, '');
  const normalizedBase = basePath === '/' ? '' : basePath;

  const entries: HreflangEntry[] = SUPPORTED_LANGUAGES.map((code) => ({
    hrefLang: code,
    href:
      code === 'en'
        ? `${cleanOrigin}${basePath === '/' ? '/' : normalizedBase}`
        : `${cleanOrigin}/${code}${normalizedBase}`,
  }));

  entries.push({
    hrefLang: 'x-default',
    href: `${cleanOrigin}${basePath === '/' ? '/' : normalizedBase}`,
  });

  return entries;
}

type LocaleRecord = typeof seoTranslations.locales;

/**
 * Returns SEO strings for the active language, safely falling back to English.
 */
export function getLocaleSeo(lang: string): LocaleRecord['en'] {
  const locales = seoTranslations.locales as Record<string, LocaleRecord['en']>;
  return locales[lang] || locales.en;
}

export function getLanguageMeta(lang: string) {
  return (
    seoTranslations.languages.find((l) => l.code === lang) ||
    seoTranslations.languages[0]
  );
}

/**
 * Looks up localized Category SEO metadata (name, title, desc, h1, intro, keywords) with English fallback.
 */
export function getLocalizedCategorySeo(
  slug: string,
  lang: string
): {
  name: string;
  title: string;
  desc: string;
  h1: string;
  intro: string;
  keywords: string;
} | null {
  const map = categorySeoConfig as Record<string, Record<string, string>>;
  const entry = map[slug.toLowerCase()];
  if (!entry) return null;

  const suffix = lang && lang.length >= 2 ? lang[0].toUpperCase() + lang[1].toLowerCase() : 'En';
  return {
    name: entry[`name${suffix}`] || entry.nameEn || slug,
    title: entry[`title${suffix}`] || entry.titleEn,
    desc: entry[`desc${suffix}`] || entry.descEn,
    h1: entry[`h1${suffix}`] || entry.h1En,
    intro: entry[`intro${suffix}`] || entry.introEn,
    keywords: entry[`keywords${suffix}`] || entry.keywordsEn,
  };
}
