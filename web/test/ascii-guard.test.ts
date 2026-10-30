import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const I18N = join(SRC, 'i18n');

/** Every user-visible literal must live in web/src/i18n/ (ticket #7 accepted non-ASCII only there). */
function srcFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true })
    .map((entry) => join(dir, String(entry)))
    .filter((file) => statSync(file).isFile() && file.endsWith('.ts'));
}

function relativeFor(file: string): string {
  return file.slice(file.indexOf('src') + 'src'.length + 1).replace(/\\/g, '/');
}

function nonAsciiLiterals(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\S\s]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const literals = withoutComments.match(/(['"`])(?:\\.|(?!\1)[\S\s])*?\1/g) ?? [];
  return literals.filter((literal) => /[^\u0000-\u007f]/.test(literal));
}

/** Design glyphs that are not UI copy, allowed as exact literals only:
 ** the engraved medallion monogram (art §4) and the engine's difficulty labels
 ** (engine master data, currently unrendered; engine was out of scope for #7). */
const ALLOWED: ReadonlyArray<{ file: string; literal: RegExp }> = [
  { file: 'render/textures.ts', literal: /^'П'$/ },
  { file: 'engine/bot.ts', literal: /^'(Новичок|Обычный|Сложный)'$/ },
];

function allowed(relative: string, found: string[]): boolean {
  const rule = ALLOWED.find(({ file }) => file === relative);
  return rule === undefined ? false : found.every((literal) => rule.literal.test(literal));
}

describe('ascii guard for on-screen text', () => {
  it('the scanner flags non-ASCII string literals and passes comments/template code', () => {
    expect(nonAsciiLiterals(`const title = 'Пешки';`)).toEqual(["'Пешки'"]);
    expect(nonAsciiLiterals(`const title = 'Peshki';`)).toEqual([]);
    // a Cyrillic comment is allowed: only literals carry user-visible text
    expect(nonAsciiLiterals(`// руны в комментарии\nconst ok = 'fine';`)).toEqual([]);
  });

  it('src/** carries no non-ASCII literal outside web/src/i18n/', () => {
    const offenders = srcFiles(SRC)
      .filter((file) => !file.startsWith(I18N))
      .map((file) => ({ file, found: nonAsciiLiterals(readFileSync(file, 'utf8')) }))
      .filter(({ found, file }) => found.length > 0 && !allowed(relativeFor(file), found));

    expect(
      offenders.map(({ file, found }) => `${file}: ${found.join(' ')}`),
      'move the strings into web/src/i18n/{ru,en}.ts',
    ).toEqual([]);
  });
});
