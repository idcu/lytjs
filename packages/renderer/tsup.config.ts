import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    dom: 'src/dom/dom-renderer.ts',
    ssr: 'src/ssr/ssr-renderer.ts',
    'vapor/vapor-app': 'src/vapor/vapor-app.ts',
    // ★ 2026-10-21：编译器生成的 Server Component 代码按子路径 import
    //   （`@lytjs/renderer/server` / `@lytjs/renderer/client`），必须有对应入口。
    'server/index': 'src/server/server-components.ts',
    'client/index': 'src/client/server-components-client.ts',
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
