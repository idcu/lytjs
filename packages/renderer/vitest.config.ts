import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sharedAliases, sharedDefine, sharedSetupFiles } from '../../vitest.shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: sharedDefine,
  resolve: {
    alias: sharedAliases,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [...sharedSetupFiles, resolve(__dirname, '../reactivity/tests/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
