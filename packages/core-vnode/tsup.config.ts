import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  treeshake: true,
  splitting: false,
  minify: false,
  clean: true,
  external: [
    '@lytjs/component',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/renderer',
    '@lytjs/adapter-web',
    '@lytjs/common-is',
    '@lytjs/common-string',
    '@lytjs/common-scheduler',
    '@lytjs/common-error',
    '@lytjs/shared-types',
  ],
  define: {
    __DEV__: 'false',
  },
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
});
