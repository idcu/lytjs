import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  define: {
    __DEV__: 'true',
  },
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
  external: [
    '@lytjs/common-is',
    '@lytjs/common-env',
    '@lytjs/common-dom',
    '@lytjs/common-object',
    '@lytjs/reactivity',
    '@lytjs/component',
    '@lytjs/vdom',
    '@lytjs/router',
    '@lytjs/store',
  ],
});
