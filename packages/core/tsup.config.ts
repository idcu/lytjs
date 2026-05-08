import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
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
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/renderer',
    '@lytjs/component',
    '@lytjs/common-is',
    '@lytjs/common-env',
    '@lytjs/common-error',
    '@lytjs/common-object',
    '@lytjs/common-string',
    '@lytjs/common-scheduler',
    '@lytjs/shared-types',
  ],
});
