import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ENGINE_DIR = fileURLToPath(new URL('../src/engine', import.meta.url));

const FORBIDDEN = [/^pixi\.js$/, /(?:^|\/)(?:platform|render|ui|audio)(?:\/|$)/];

function specifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function violations(source: string): string[] {
  return specifiers(source).filter((specifier) => FORBIDDEN.some((pattern) => pattern.test(specifier)));
}

function engineFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map((entry) => join(dir, String(entry)))
    .filter((file) => statSync(file).isFile() && file.endsWith('.ts'));
}

describe('engine boundaries', () => {
  it('engine/** imports neither pixi.js nor any of the app layers', () => {
    const offenders = engineFiles(ENGINE_DIR)
      .map((file) => ({ file, found: violations(readFileSync(file, 'utf8')) }))
      .filter(({ found }) => found.length > 0)
      .map(({ file, found }) => `${file}: ${found.join(', ')}`);

    expect(offenders).toEqual([]);
  });

  it('the boundary check rejects forbidden specifiers', () => {
    for (const specifier of [
      'pixi.js',
      '../platform/ysdk',
      '../../render/app',
      '../ui/menu',
      '../audio/bank',
      '@app/platform/lifecycle',
    ]) {
      expect(violations(`import { x } from '${specifier}';`), specifier).toHaveLength(1);
    }
  });

  it('the boundary check allows local engine modules', () => {
    expect(violations("import { Board } from './board';\nimport type { Cell } from './cell';")).toEqual([]);
  });
});
