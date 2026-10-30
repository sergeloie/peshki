import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs keep the build working from any hosting path.
  base: './',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
