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
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/common-is',
    '@lytjs/common-env',
    '@lytjs/common-error',
    '@lytjs/common-scheduler',
  ],
});
