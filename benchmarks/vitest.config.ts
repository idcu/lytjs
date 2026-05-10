import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['src/**/*.bench.ts'],
    benchmark: {
      include: ['src/**/*.bench.ts'],
      outputFile: './bench-report.json',
      reporters: ['default', 'json'],
      compare: './bench-report.json',
    },
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@lytjs/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
      '@lytjs/reactivity': path.resolve(__dirname, '../packages/reactivity/src/index.ts'),
    },
  },
});
