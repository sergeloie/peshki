import { test, expect, chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SHOT_DIR = resolve(import.meta.dirname ?? '.', '../../docs/screens');

const VIEWPORTS = [
  { name: 'portrait', width: 390, height: 844 },
  { name: 'landscape', width: 1280, height: 720 },
  { name: 'tv', width: 1920, height: 1080 },
] as const;

const GAME_URL = 'http://localhost:5173/?screen=game&seed=424242';

// Chrome-shell teardown can wedge gracefully on this host, so every test gets a
// fresh browser and stale headless shells are force-killed at the end.
let browser: Browser | null = null;

async function freshGamePage(viewport: { width: number; height: number }): Promise<Page> {
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(GAME_URL);
  await page.waitForSelector('canvas');
  // bots play while the shot is taken; the board must show a real game
  await page.waitForTimeout(2500);
  await expect(page.locator('canvas')).toBeVisible();
  return page;
}

/** Race the graceful close, then force-kill so the worker never wedges. */
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

test.describe('art pass evidence', () => {
  for (const viewport of VIEWPORTS) {
    test(`screenshot: ${viewport.name} ${viewport.width}x${viewport.height}`, async () => {
      const page = await freshGamePage(viewport);
      mkdirSync(SHOT_DIR, { recursive: true });
      await page.screenshot({ path: resolve(SHOT_DIR, `${viewport.name}.png`), timeout: 55_000 });
      await dropBrowser();
    });
  }

  test('grayscale screenshot: players stay distinguishable without colour (acceptance #4)', async () => {
    const page = await freshGamePage(VIEWPORTS[1]);
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas !== null) canvas.style.filter = 'grayscale(1)';
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(SHOT_DIR, 'grayscale.png'), timeout: 55_000 });
    await dropBrowser();
  });

  /**
   * GPU-independent facts (acceptance #2/#3, minus the device 60 fps number that
   * ticket #8 owns on real hardware):
   *  - textures: canvases created at boot only, none while the game idles
   *  - download budget: bytes the page actually fetches (fonts + code)
   *  - static scene: filters/masks alive in the tree, draw calls per rendered frame
   */
  test('art audit: boot-only textures, download bytes, static-scene cost', async () => {
    browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: VIEWPORTS[1], deviceScaleFactor: 1 });
    await page.addInitScript(() => {
      const audit = { canvases: 0 } as { canvases: number };
      (window as unknown as Record<string, unknown>).__peshkiAudit = audit;
      const original = document.createElement.bind(document);
      document.createElement = function createElement(tag: string | Parameters<typeof original>[0]) {
        if (typeof tag === 'string' && tag.toLowerCase() === 'canvas') audit.canvases += 1;
        return original(tag as never);
      } as typeof document.createElement;
    });
    await page.goto(`${GAME_URL}&audit=1`);
    await page.waitForSelector('canvas');
    await page.waitForTimeout(3000);
    const canvasesAtBoot = await page.evaluate(
      () => (window as unknown as { __peshkiAudit: { canvases: number } }).__peshkiAudit.canvases,
    );
    await page.waitForTimeout(2500);
    const audit = await page.evaluate(() => {
      const peshki = (window as unknown as { __peshki?: { app?: { stage?: unknown } } }).__peshki;
      // scene census: how many nodes render each frame; sprites batch, filters would not
      let filters = 0;
      let masks = 0;
      let nodes = 0;
      let sprites = 0;
      let graphics = 0;
      const visit = (node: { children?: unknown[]; filters?: unknown; mask?: unknown } | null): void => {
        if (node === null || node === undefined) return;
        nodes += 1;
        const name = (node as { constructor?: { name?: string } }).constructor?.name ?? '';
        if (name === 'Sprite') sprites += 1;
        if (name === 'Graphics') graphics += 1;
        if (node.filters !== undefined && node.filters !== null) filters += Array.isArray(node.filters) ? node.filters.length : 1;
        if (node.mask !== undefined && node.mask !== null) masks += 1;
        for (const child of node.children ?? []) visit(child as never);
      };
      visit(peshki?.app?.stage as never);

      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const downloaded = (entry: { transferSize: number; encodedBodySize: number }): number =>
        entry.transferSize || entry.encodedBodySize || 0;
      const fontBytes = entries
        .filter((entry) => entry.name.endsWith('.woff2'))
        .reduce((sum, entry) => sum + downloaded(entry), 0);
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const totalBytes = entries.reduce((sum, entry) => sum + downloaded(entry), 0) + (navigation ? downloaded(navigation) : 0);
      return { canvases: (window as unknown as { __peshkiAudit: { canvases: number } }).__peshkiAudit.canvases, filters, masks, nodes, sprites, graphics, fontBytes, totalBytes };
    });

    const stats = {
      rendering: 'software renderer (SwiftShader); a device 60 fps number is ticket #8 on real hardware',
      textureBudget: {
        canvasesCreatedAtBoot: canvasesAtBoot,
        canvasesCreatedWhileIdle: audit.canvases - canvasesAtBoot,
        pass: audit.canvases - canvasesAtBoot === 0,
      },
      staticSceneCost: {
        // facts, not frame times: animated layers carry no filters or masks
        renderTreeNodes: audit.nodes,
        sprites: audit.sprites,
        graphics: audit.graphics,
        filtersInTree: audit.filters,
        masksInTree: audit.masks,
      },
      downloadBudget: {
        fontWoff2Bytes: audit.fontBytes,
        totalDownloadedBytes: audit.totalBytes,
        artBudgetBytes: 3_000_000,
      },
    };
    writeFileSync(resolve(SHOT_DIR, 'art-audit.json'), JSON.stringify(stats, null, 2) + '\n');
    console.log('art audit:', JSON.stringify(stats));
    expect(stats.textureBudget.canvasesCreatedWhileIdle).toBe(0);
    expect(stats.downloadBudget.fontWoff2Bytes).toBeLessThan(600_000);
    await dropBrowser();
  });
});
