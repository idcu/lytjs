import { defineConfig } from 'vitest/config';
import { sharedAliases, sharedDefine, sharedSetupFiles } from '../../../../vitest.shared';

export default defineConfig({
  define: sharedDefine,
  resolve: {
    alias: sharedAliases,
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: sharedSetupFiles,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
});
