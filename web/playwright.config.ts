import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  retries: 0,
  // art shots run on demand: npm run screens (slow — software rendering, see README)
  outputDir: '.tmp/playwright',
  // a run that misses its own server would pin port 5173 — always own the server lifecycle
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    launchOptions: {
      args: [
        // WebGL2 for PixiJS v8 without a GPU in CI shells (software renderer)
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
