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
    include: ['tests/**/*.test.ts'],
    globals: true,
    setupFiles: [...sharedSetupFiles, resolve(__dirname, 'tests/setup.ts')],
  },
});
