import { defineConfig } from 'vitest/config';

declare const process: { env: Record<string, string | undefined> };

// The deploy workflow sets VITE_BASE from the repo name (e.g. "/quiplash-clone/").
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: { outDir: 'dist' },
  test: { include: ['src/**/*.test.ts'] },
});
