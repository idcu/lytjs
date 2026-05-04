import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    signal: 'src/signal.ts',
    ssr: 'src/ssr.ts',
    sfc: 'src/sfc-entry.ts',
    wasm: 'src/wasm-entry.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  define: {
    __DEV__: 'false',
  },
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
  external: [
    '@lytjs/common-is',
    '@lytjs/common-env',
    '@lytjs/common-error',
    '@lytjs/common-vnode',
    '@lytjs/common-string',
    '@lytjs/shared-types',
  ],
});
