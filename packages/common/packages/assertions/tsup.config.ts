import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  external: [/^@lytjs\/common-/],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
});