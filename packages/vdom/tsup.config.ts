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
  ],
});
