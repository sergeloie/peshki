import { describe, expect, it } from 'vitest';
import { KEYS } from '../src/i18n/keys';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { format, pickLanguage, setLanguage, t } from '../src/i18n';
import type { DictionaryEntry } from '../src/i18n';

describe('i18n dictionaries', () => {
  it('carries exactly the same key set in both languages (a missing key fails here)', () => {
    const ruKeys = Object.keys(ru).sort();
    const enKeys = Object.keys(en).sort();
    const surface = [...KEYS].sort();
    expect(ruKeys).toEqual(surface);
    expect(enKeys).toEqual(ruKeys);
  });

  it('keeps every plural entry translated in its base forms', () => {
    for (const [language, dictionary] of [['ru', ru], ['en', en]] as const) {
      for (const [key, entry] of Object.entries(dictionary)) {
        const value = entry as DictionaryEntry;
        if (typeof value === 'string') {
          expect(value.trim().length, `${language}:${key}`).toBeGreaterThan(0);
        } else {
          expect(value.other.trim().length, `${language}:${key}.other`).toBeGreaterThan(0);
          if (language === 'ru') {
            expect(value.one, `ru:${key}.one`).toBeTruthy();
            expect(value.few, `ru:${key}.few`).toBeTruthy();
            expect(value.many, `ru:${key}.many`).toBeTruthy();
          }
        }
      }
    }
  });

  it('interpolates {sum} = {a} + {b} and rejects unknown keys at compile time through StringKey', () => {
    expect(format(t('game.sumHint'), { sum: 7, a: 3, b: 4 })).toBe('7 = 3 + 4');
  });

  it('declines the Russian turn-count plural (1 / 2-4 / 5+ / 11-14)', () => {
    setLanguage('ru');
    const phrase = (n: number): string => t('victory.subtitle', { n });
    expect(phrase(1).endsWith('за 1 ход')).toBe(true);
    expect(phrase(2).endsWith('за 2 хода')).toBe(true);
    expect(phrase(4).endsWith('за 4 хода')).toBe(true);
    expect(phrase(5).endsWith('за 5 ходов')).toBe(true);
    expect(phrase(10).endsWith('за 10 ходов')).toBe(true);
    expect(phrase(11).endsWith('за 11 ходов')).toBe(true);
    expect(phrase(14).endsWith('за 14 ходов')).toBe(true);
    expect(phrase(21).endsWith('за 21 ход')).toBe(true);
    expect(phrase(22).endsWith('за 22 хода')).toBe(true);
    expect(phrase(25).endsWith('за 25 ходов')).toBe(true);
    expect(phrase(101).endsWith('за 101 ход')).toBe(true);
    expect(phrase(112).endsWith('за 112 ходов')).toBe(true);
  });

  it('falls back to ru for unknown locales and keeps en on en*', () => {
    expect(pickLanguage('ru')).toBe('ru');
    expect(pickLanguage('ru-RU')).toBe('ru');
    expect(pickLanguage('en')).toBe('en');
    expect(pickLanguage('en-GB')).toBe('en');
    expect(pickLanguage('de')).toBe('ru'); // ru fallback
    expect(pickLanguage(null)).toBe('ru');
  });

  it('switches languages by id: plural and single constants resolve', () => {
    setLanguage('en');
    expect(t('app.title')).toBe('Peshki');
    expect(t('victory.subtitle', { n: 1 }).endsWith('1 turn')).toBe(true);
    expect(t('victory.subtitle', { n: 7 }).endsWith('7 turns')).toBe(true);
    setLanguage('ru');
    expect(t('app.title')).toBe('Пешки');
  });

  it('picks the Russian defeat plural for the winner line as well', () => {
    setLanguage('ru');
    expect(t('defeat.subtitle', { name: 'Нина', n: 1 })).toBe('Победил Нина. Партия за 1 ход');
    expect(t('defeat.subtitle', { name: 'Нина', n: 3 })).toBe('Победил Нина. Партия за 3 хода');
    expect(t('defeat.subtitle', { name: 'Нина', n: 7 })).toBe('Победил Нина. Партия за 7 ходов');
    expect(t('defeat.subtitle', { name: 'Нина', n: 13 })).toBe('Победил Нина. Партия за 13 ходов');
  });
});
