import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    dom: 'src/dom/dom-renderer.ts',
    ssr: 'src/ssr/ssr-renderer.ts',
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
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/common-is',
    '@lytjs/common-env',
    '@lytjs/common-scheduler',
    '@lytjs/common-error',
    '@lytjs/common-string',
    '@lytjs/common-events',
    '@lytjs/common-dom',
    '@lytjs/dom-runtime',
    '@lytjs/compiler',
    '@lytjs/host-contract',
    '@lytjs/adapter-web',
  ],
});
