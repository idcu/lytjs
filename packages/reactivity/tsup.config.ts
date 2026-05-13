import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    signal: 'src/signal.ts',
    'signal-component': 'src/signal-component.ts',
    scope: 'src/scope.ts',
    async: 'src/async.ts',
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
    '@lytjs/common-scheduler',
    '@lytjs/common-env',
    '@lytjs/common-error',
    '@lytjs/common-constants',
    '@lytjs/shared-types',
    '@lytjs/common-assertions',
  ],
});
