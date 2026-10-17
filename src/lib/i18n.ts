// Bengali is the site's language; English is a switch in the header for visitors who don't read Bangla.
//
// How it works (no separate /en pages):
// - Markup is rendered in Bengali. An element carries its English in `data-en` (replaces its
//   innerHTML) and attributes in `data-en-placeholder`, `data-en-aria-label`, `data-en-alt`,
//   `data-en-title`, `data-en-content`, `data-en-value`. An inline script in Layout swaps them in
//   before the page shows, when the visitor chose English.
// - Strings made in browser scripts go through `tr(bn, en)`; numbers through `num()`.
// - Elements with class `en` are English sub-lines under Bengali text; in English mode they're
//   hidden, because the main text already says it.
// - Poster/story artwork drawn on canvas stays Bengali — it's the design, and the text is editable.
import { toBnDigits } from './bangla';

export type Lang = 'bn' | 'en';
export const LANG_KEY = 'parar-pujo:lang';

/** The visitor's language in the browser; always 'bn' while building. */
export function lang(): Lang {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'bn';
}

export const isEn = () => lang() === 'en';

/** Pick the string for the current language. */
export const tr = (bn: string, en: string) => (isEn() ? en : bn);

/** Numbers in UI text: Bengali numerals, or plain digits in English. */
export const num = (n: number | string) => (isEn() ? String(n) : toBnDigits(n));

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-17" → "17 Oct" */
export function enDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_EN[m - 1]}`;
}

/** ["2026-10-17", "2026-10-18"] → "17–18 Oct" */
export function enDateRange(dates: string[]): string {
  if (dates.length < 2) return enDate(dates[0]);
  const [, m1, d1] = dates[0].split('-').map(Number);
  const [, m2, d2] = dates[dates.length - 1].split('-').map(Number);
  return m1 === m2 ? `${d1}–${d2} ${MONTHS_EN[m2 - 1]}` : `${enDate(dates[0])} – ${enDate(dates[dates.length - 1])}`;
}

/** Remember the choice and reload, so every script renders in the new language. */
export function setLang(next: Lang) {
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    // storage blocked — fall back to the URL
  }
  const url = new URL(location.href);
  if (next === 'en') url.searchParams.set('lang', 'en');
  else url.searchParams.delete('lang');
  location.replace(url);
}
