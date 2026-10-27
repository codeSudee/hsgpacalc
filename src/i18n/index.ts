import { en, type Dict } from './en';
import { es } from './es';
import { de } from './de';

export type Lang = 'en' | 'es' | 'de';
/** Languages the whole site is translated into (hreflang alternates, language switcher). German only has the Abi-Rechner. */
export const LANGS: Lang[] = ['en', 'es'];
export const DEFAULT_LANG: Lang = 'en';
/** hreflang codes for each locale. */
export const HREFLANG: Record<Lang, string> = { en: 'en-US', es: 'es', de: 'de-DE' };

const dicts: Record<Lang, Dict> = { en, es, de };

export function getLang(locale: string | undefined): Lang {
  return locale === 'es' || locale === 'de' ? locale : 'en';
}
export const useT = (locale: string | undefined): Dict => dicts[getLang(locale)];

/** '/about/' -> '/es/about/' for Spanish; unchanged for English and German (German pages link to English site pages). */
export function localePath(lang: Lang, path: string): string {
  if (!LANGS.includes(lang) || lang === DEFAULT_LANG) return path;
  return path === '/' ? `/${lang}/` : `/${lang}${path}`;
}
/** '/es/about/' -> '/about/' */
export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/es(?=\/|$)/, '') || '/';
}

/** Replace {key} placeholders. */
export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
