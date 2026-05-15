import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'create': 'src/create.ts',
    'lyt': 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'node18',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    '@lytjs/common-is',
    '@lytjs/common-env',
  ],
});
