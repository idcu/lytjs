import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', transition: 'src/transition-entry.ts' },
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
    '@lytjs/common-vnode',
    '@lytjs/common-algorithm',
    '@lytjs/common-env',
    '@lytjs/common-string',
    '@lytjs/common-events',
    '@lytjs/common-dom',
    '@lytjs/common-error',
    '@lytjs/common-object',
    '@lytjs/common-constants',
    '@lytjs/common-assertions',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
  ],
});
