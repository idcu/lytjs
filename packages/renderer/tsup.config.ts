import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    dom: 'src/dom/dom-renderer.ts',
    ssr: 'src/ssr/ssr-renderer.ts',
    'vapor/vapor-app': 'src/vapor/vapor-app.ts',
  },
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: {
      noUnusedLocals: false,
      noUnusedParameters: false,
      skipLibCheck: true,
      strict: false,
      noUnusedLabels: false,
    },
  },
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
    '@lytjs/core',
    '@lytjs/component',
  ],
});
