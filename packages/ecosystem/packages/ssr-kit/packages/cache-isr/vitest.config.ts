import { defineConfig } from 'vitest/config';
import { sharedAliases, sharedDefine, sharedSetupFiles } from '../../../../../../vitest.shared';

export default defineConfig({
  define: sharedDefine,
  resolve: {
    alias: sharedAliases,
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: sharedSetupFiles,
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
