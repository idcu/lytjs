import { defineConfig } from 'vitest/config';
import { sharedAliases, sharedDefine, sharedSetupFiles } from '../../../../vitest.shared';

export default defineConfig({
  define: sharedDefine,
  resolve: {
    alias: sharedAliases,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: sharedSetupFiles,
  },
});
