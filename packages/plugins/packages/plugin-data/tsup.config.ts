import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: true,
  dts: {
    compilerOptions: {
      noUnusedLocals: false,
      noUnusedParameters: false,
      strict: false,
      skipLibCheck: true,
    },
  },
  sourceMap: true,
  splitting: false,
  minify: false,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
});
