import { test, expect, chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';
import { spawn } from 'node:child_process';

/**
 * Platform requirements that a unit test cannot see because they live in the
 * browser: 1.10.2 (no page scroll, no swipe-to-refresh), 1.6.1.8 / 1.6.2.7
 * (no text selection or context menu inside the field), 1.14 / 6.4 (no page
 * errors during a session). Run with `npx playwright test acceptance`.
 */
let browser: Browser | null = null;

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

for (const viewport of [
  { name: 'phone portrait', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 720 },
]) {
  test(`browser surface: no scroll, no selection, no page errors — ${viewport.name}`, async () => {
    browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      // local mode has no SDK: the documented /sdk.js probe 404s and is expected
      if (message.type() !== 'error') return;
      if (message.location().url.includes('sdk.js')) return;
      consoleErrors.push(message.text());
    });

    await page.goto('http://localhost:5173/?screen=game&seed=424242');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000);

    // 1.10.2: nothing to scroll at any zoom, and a wheel/swipe must not move the page
    const before = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(before.scrollHeight).toBeLessThanOrEqual(before.clientHeight + 1);
    expect(before.scrollWidth).toBeLessThanOrEqual(before.clientWidth + 1);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // 1.6.1.8 / 1.6.2.7: a long press selects nothing and the context menu is refused
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? 'x')).toBe('');
    expect(
      await page.evaluate(() => {
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        return document.dispatchEvent(event) === false;
      }),
    ).toBe(true);

    // 1.14 / 6.4: the session stays quiet
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    await dropBrowser();
  });
}
