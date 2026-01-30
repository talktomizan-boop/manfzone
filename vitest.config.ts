import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx', 'tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    threads: true,
    reporters: ['default'],
  },
});
