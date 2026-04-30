import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    signal: 'src/signal.ts',
    'signal-component': 'src/signal-component.ts',
  },
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
    '@lytjs/common-scheduler',
    '@lytjs/common-env',
    '@lytjs/common-error',
  ],
});
