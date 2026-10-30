import { en } from './en';
import { ru } from './ru';
import type { StringKey } from './keys';

export type { StringKey } from './keys';

export type Language = 'ru' | 'en';

/** One plural family; English uses one/other, Russian adds few/many (1 / 2–4 / 5+ / 11–14). */
export interface PluralForms {
  one?: string;
  few?: string;
  many?: string;
  other: string;
}

export type DictionaryEntry = string | PluralForms;

export type Dictionary = Record<StringKey, DictionaryEntry>;

export const LANGUAGES: readonly Language[] = ['ru', 'en'];

/** ru is the fallback language: unknown SDK locales stay Russian. */
export function pickLanguage(raw: string | null | undefined): Language {
  return (raw ?? '').toLowerCase().startsWith('en') ? 'en' : 'ru';
}

const DICTIONARIES: Record<Language, Dictionary> = { ru, en };

let current: Language = 'ru';

export function setLanguage(value: Language): void {
  current = value;
}

export function currentLanguage(): Language {
  return current;
}

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

/** Russian: 1/21/101 → one; 2–4 (not 12–14) → few; the rest → many. English: 1 → one. */
export function pluralForms(language: Language, n: number, forms: PluralForms): string {
  const abs = Math.abs(n);
  if (language === 'ru') {
    const n10 = abs % 10;
    const n100 = abs % 100;
    if (n10 === 1 && n100 !== 11) return forms.one ?? forms.other;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms.few ?? forms.other;
    return forms.many ?? forms.other;
  }
  return abs === 1 ? (forms.one ?? forms.other) : forms.other;
}

/** Translates one key; a plural value picks the form from the `n` parameter. */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const value: DictionaryEntry = DICTIONARIES[current][key];
  if (typeof value === 'string') return params === undefined ? value : format(value, params);
  const n = typeof params?.n === 'number' ? params.n : 0;
  return format(pluralForms(current, n, value), params ?? {});
}

export { ru };
export { en };
