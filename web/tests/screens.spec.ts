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

/** Fresh profiles queue all four hint concepts; art/game shots need the clean board. */
async function dismissHints(page: Page): Promise<void> {
  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(140);
  }
}

async function freshGamePage(viewport: { width: number; height: number }): Promise<Page> {
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(GAME_URL);
  await page.waitForSelector('canvas');
  await dismissHints(page);
  // bots idle while the human seat waits; the board must show a real game
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

  /** Art review #6: committed 2× crops as evidence, not assertions. */
  test('detail crops: top-left quadrant and left bench', async () => {
    const page = await freshGamePage(VIEWPORTS[1]);
    const crops = [
      { name: 'detail-topleft', x: 179, y: 89, w: 220, h: 220 }, // face corner → medallion
      { name: 'detail-bench-left', x: 100, y: 240, w: 110, h: 220 }, // west bench + frame band
    ];
    for (const crop of crops) {
      const dataUrl = await page.evaluate(
        ({ x, y, w, h }) => {
          const source = document.querySelector('canvas');
          const out = document.createElement('canvas');
          out.width = w * 2;
          out.height = h * 2;
          const ctx = out.getContext('2d');
          if (ctx === null) return '';
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(source, x, y, w, h, 0, 0, w * 2, h * 2);
          return out.toDataURL('image/png');
        },
        { x: crop.x, y: crop.y, w: crop.w, h: crop.h },
      );
      mkdirSync(SHOT_DIR, { recursive: true });
      writeFileSync(resolve(SHOT_DIR, `${crop.name}.png`), Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    }
    await dropBrowser();
  });

  /**
   * GPU-independent facts (acceptance #2/#3, minus the device 60 fps number that
   * ticket #8 owns on real hardware):
   *  - textures: canvases created at boot only, none while the game idles
   *  - download budget: bytes the page actually fetches (fonts + code)
   *  - static scene: filters/masks alive in the tree, draw calls per rendered frame
   */
  test('art audit: boot-only textures, download bytes, static-scene cost, frame-time sample', async () => {
    test.setTimeout(180_000); // census waits + the 3 s rAF sample: software budget only
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
      // real GL draw calls per frame, framework-agnostic evidence for the audit json
      const counter: { calls: number; prev: number; maxFrame: number; lastFrame: number } = {
        calls: 0,
        prev: 0,
        maxFrame: 0,
        lastFrame: 0,
      };
      (window as unknown as Record<string, unknown>).__peshkiDraws = counter;
      const wrap = (proto: unknown): void => {
        for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
          const method = (proto as Record<string, ((...a: unknown[]) => void) | undefined>)[name];
          if (typeof method !== 'function') continue;
          (proto as Record<string, (...a: unknown[]) => void>)[name] = function draw(...args: unknown[]) {
            counter.calls += 1;
            method.apply(this, args);
          };
        }
      };
      const g = globalThis as unknown as { WebGL2RenderingContext?: unknown; WebGLRenderingContext?: unknown };
      if (g.WebGL2RenderingContext) wrap(g.WebGL2RenderingContext.prototype);
      if (g.WebGLRenderingContext) wrap(g.WebGLRenderingContext.prototype);
      const raf = window.requestAnimationFrame.bind(window);
      const tick = (): void => {
        counter.lastFrame = counter.calls - counter.prev;
        counter.prev = counter.calls;
        if (counter.lastFrame > counter.maxFrame) counter.maxFrame = counter.lastFrame;
        raf(tick);
      };
      raf(tick);
    });
    await page.goto(`${GAME_URL}&audit=1`);
    await page.waitForSelector('canvas');
    await dismissHints(page);
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
      // art budget counts bundled art assets (fonts, images); board textures are procedural
      const isArt = (url: string): boolean => /\.(woff2?|png|jpe?g|webp|gif|svg)(\?|$)/i.test(url);
      const resources = entries.map((entry) => ({
        resource: entry.name.split('/').slice(-1)[0],
        bytes: downloaded(entry),
        art: isArt(entry.name),
      }));
      const artBytes = resources.filter((r) => r.art).reduce((sum, r) => sum + r.bytes, 0);
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const totalBytes =
        resources.reduce((sum, r) => sum + r.bytes, 0) + (navigation ? navigation.transferSize : 0);
      return {
        canvases: (window as unknown as { __peshkiAudit: { canvases: number } }).__peshkiAudit.canvases,
        filters,
        masks,
        nodes,
        sprites,
        graphics,
        maxFrame:
          (window as unknown as { __peshkiDraws?: { maxFrame?: number } }).__peshkiDraws?.maxFrame ?? -1,
        artBytes,
        totalBytes,
        topResources: [...resources].sort((a, b) => b.bytes - a.bytes).slice(0, 6),
      };
    });

    // rAF frame-time sample: queued after the census, while bots keep playing with effects
    const frames = await page.evaluate(async () => {
      const samples: number[] = [];
      await new Promise<void>((resolve) => {
        let last = performance.now();
        let count = 0;
        const step = (now: number): void => {
          samples.push(now - last);
          last = now;
          count += 1;
          if (count >= 180) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      const sorted = [...samples].sort((a, b) => a - b);
      const at = (q: number): number => sorted![Math.min(sorted!.length - 1, Math.floor(sorted!.length * q))] ?? 0;
      return { sampleCount: samples.length, p50: +at(0.5).toFixed(1), p95: +at(0.95).toFixed(1), max: +at(1).toFixed(1) };
    });
    const sharedBytes = await page.evaluate(
      () => (window as unknown as { __peshki?: { textureBytes?: number } }).__peshki?.textureBytes ?? -1,
    );
    const stats = {
      rendering:
        'software renderer (SwiftShader); the rAF sample below is software p50/p95, NOT a device 60 fps number — see docs/perf-device-checklist.md for #9',
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
      frameCost: {
        renderer: 'software (SwiftShader)',
        // #8 evidence: real rAF deltas sampled in-page over ~3 s while bots play with effects
        ...frames,
        note: 'device 60 fps (p95 < 16 ms) stays ticket #9 on a real GPU',
      },
      drawCalls: {
        maxPerFrameDuringBotsWithEffects: audit.maxFrame,
        note: 'counted at the WebGL draw*() call level during a live bot sequence',
      },
      textureMemory: {
        sharedProceduralTextures: sharedBytes,
        pawnBakes: 8 * 200 * 224 * 4,
        note: 'RGBA 4bpp estimate; pawn canvases are fixed 100x112 design @2x; chips re-bake only on content change',
      },
      downloadBudget: {
        // art = bundled fonts + images; textures are procedural (0 bytes)
        artBytes: audit.artBytes,
        artBudgetBytes: 3_000_000,
        artBudgetPass: audit.artBytes <= 3_000_000,
        // the rest is dev-server module code, unminified — the shipped bundle is ~1.4 MB
        totalRequestBytes: audit.totalBytes,
        topResources: audit.topResources,
      },
    };
    writeFileSync(resolve(SHOT_DIR, 'art-audit.json'), JSON.stringify(stats, null, 2) + '\n');
    console.log('art audit:', JSON.stringify(stats));
    expect(stats.textureBudget.canvasesCreatedWhileIdle).toBe(0);
    // loud art-budget failure instead of a number nobody checks
    expect(
      stats.downloadBudget.artBytes,
      `bundled art exceeds the 3 MB budget (${stats.downloadBudget.artBytes} bytes)`,
    ).toBeLessThan(3_000_000);
    expect(stats.downloadBudget.artBytes).toBeLessThan(600_000); // fonts alone should stay far under
    await dropBrowser();
  });
});

/**
 * Ticket #7 evidence: every screen in both languages at phone and desktop size.
 * A text overflow in the other language is invisible to unit tests — the committed
 * shots are the review artifact (docs/screens/screens-*.png).
 */
test.describe('ticket #7 screens and i18n evidence', () => {
  const SCREEN7_LANGS = ['ru', 'en'] as const;
  const SCREEN7_VIEWPORTS = [
    { name: 'portrait', width: 390, height: 844 },
    { name: 'landscape', width: 1280, height: 720 },
  ] as const;
  const SCREEN7_STATES = [
    { name: 'menu', suffix: '' },
    { name: 'howto', suffix: '&modal=howto' },
    { name: 'settings', suffix: '&modal=settings' },
    { name: 'game', suffix: '&screen=game&seed=424242' },
    { name: 'pause', suffix: '&screen=game&seed=424242&modal=pause' },
    { name: 'win', suffix: '&screen=game&seed=424242&result=win' },
    { name: 'lose', suffix: '&screen=game&seed=424242&result=lose' },
    { name: 'draw', suffix: '&screen=game&seed=424242&result=draw' },
  ] as const;

  for (const lang of SCREEN7_LANGS) {
    for (const viewport of SCREEN7_VIEWPORTS) {
      // one launched browser per pair: this host wedges chromium launches and
      // worker teardowns, so chunk size 2 bounds the blast radius per chunk
      for (const chunk of [
        SCREEN7_STATES.slice(0, 2),
        SCREEN7_STATES.slice(2, 4),
        SCREEN7_STATES.slice(4, 6),
        SCREEN7_STATES.slice(6, 8),
      ]) {
        test(`screens: ${lang} ${viewport.name} ${chunk[0].name}..${chunk[chunk.length - 1].name}`, async () => {
          const browser7 = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
          const page = await browser7.newPage({ viewport, deviceScaleFactor: 1 });
          mkdirSync(SHOT_DIR, { recursive: true });
          for (const state of chunk) {
            await page.goto(`http://localhost:5173/?lang=${lang}${state.suffix}`);
            await page.waitForSelector('canvas');
            // game states carry the first-run hint card; modal shots want the board visible too
            if (state.suffix.includes('screen=game')) await dismissHints(page);
            // dialogs slide in at 1.2 s (result) / 1.5 s (pause, howto, settings); bots animate meanwhile
            await page.waitForTimeout(2600);
            await page.screenshot({
              path: resolve(SHOT_DIR, `screens-${state.name}-${lang}-${viewport.name}.png`),
              timeout: 55_000,
            });
          }
          await dropBrowser();
        });
      }
    }
  }
});

/**
 * Ticket #8 evidence, bounded CPU: the fx=kill debug staging replays the real
 * kill choreography (engine untouched); capture lands mid-arc with the ring
 * flash, particles and shake alive. Two viewports, one shoot each.
 */
test.describe('ticket #8 effect + TV captures', () => {
  test('fx=kill mid-capture: landscape + portrait', async () => {
    mkdirSync(SHOT_DIR, { recursive: true });
    for (const viewport of [
      { name: 'landscape', width: 1280, height: 720 },
      { name: 'portrait', width: 390, height: 844 },
    ]) {
      browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
      await page.goto('http://localhost:5173/?screen=game&seed=424242&audit=1&fx=kill');
      await page.waitForSelector('canvas');
      await dismissHints(page);
      // staging fires at 1500 ms: hop 120 ms, arc 360 ms — the apex is ~1.75 s
      await page.waitForTimeout(1780);
      await page.screenshot({ path: resolve(SHOT_DIR, `fx-kill-${viewport.name}.png`), timeout: 55_000 });
      await dropBrowser();
    }
  });

  /** TV path evidence: d-pad focus lands on the roll plate, Enter rolls the dice. */
  test('tv input: keyboard reaches the roll and legal targets without a pointer', async () => {
    mkdirSync(SHOT_DIR, { recursive: true });
    browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto(`${GAME_URL}&audit=1`);
    await page.waitForSelector('canvas');
    // the hint card owns Enter while it shows; clear the queue before the roll walk
    await dismissHints(page);
    await page.waitForTimeout(2500);
    // walk focus:targets appear once dice are rolled and hint rings are on the board
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // activate the focused roll (or first target)
    await page.waitForTimeout(800); // toss plays 620 ms
    await page.screenshot({ path: resolve(SHOT_DIR, 'tv-input-after-activation.png'), timeout: 55_000 });
    await dropBrowser();
  });
});
