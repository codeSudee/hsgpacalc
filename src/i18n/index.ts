import { en, type Dict } from './en';
import { es } from './es';

export type Lang = 'en' | 'es';
export const LANGS: Lang[] = ['en', 'es'];
export const DEFAULT_LANG: Lang = 'en';
/** hreflang codes for each locale. */
export const HREFLANG: Record<Lang, string> = { en: 'en-US', es: 'es' };

const dicts: Record<Lang, Dict> = { en, es };

export function getLang(locale: string | undefined): Lang {
  return locale === 'es' ? 'es' : 'en';
}
export const useT = (locale: string | undefined): Dict => dicts[getLang(locale)];

/** '/about/' -> '/es/about/' for Spanish; unchanged for English. */
export function localePath(lang: Lang, path: string): string {
  if (lang === DEFAULT_LANG) return path;
  return path === '/' ? `/${lang}/` : `/${lang}${path}`;
}
/** '/es/about/' -> '/about/' */
export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/es(?=\/|$)/, '') || '/';
}

/** Replace {key} placeholders. */
export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
