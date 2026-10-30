import { test, chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BOARD_LAYERS } from '../src/render/board-view';

const OUT_DIR = resolve(import.meta.dirname ?? '.', '../../.tmp/layers');
const LOG_PATH = resolve(OUT_DIR, 'measure.json');
const URL_BASE = 'http://localhost:5173/?screen=game&seed=424242&audit=1';

/** Art review #6 diagnosis: one screenshot per isolated board layer. */
let browser: Browser | null = null;

test.setTimeout(300_000);

async function dropBrowser(): Promise<void> {
  const current = browser;
  browser = null;
  if (current === null) return;
  await Promise.race([current.close().catch(() => undefined), new Promise((r) => setTimeout(r, 5000))]);
  const killer = spawn('taskkill', ['/F', '/IM', 'chrome-headless-shell.exe'], { detached: true, stdio: 'ignore' });
  killer.unref();
  await new Promise((r) => setTimeout(r, 500));
}

test.afterAll(async () => {
  await dropBrowser();
});

test('layer isolation shots + measured frame/bench geometry', async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const measurements: Record<string, unknown> = {};

  // every layer alone
  for (const layer of BOARD_LAYERS) {
    browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(`${URL_BASE}&layers=${layer}`);
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: resolve(OUT_DIR, `${layer}.png`) });
    if (measurements.board === undefined) {
      measurements.board = await page.evaluate(
        () => (window as unknown as { __peshkiMeasure?: () => unknown }).__peshkiMeasure?.() ?? null,
      );
    }
    await dropBrowser();
  }

  // pawn layer alone keeps its own shots; bench zone measured through pawns
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/?screen=game&seed=424242&audit=1');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2500);
  measurements.full = await page.evaluate(
    () => (window as unknown as { __peshkiMeasure?: () => unknown }).__peshkiMeasure?.() ?? null,
  );
  writeFileSync(LOG_PATH, JSON.stringify(measurements, null, 2) + '\n');
  console.log('measured:', JSON.stringify(measurements));
  await dropBrowser();
});
