import { defineConfig } from 'tsup';

export default defineConfig({
  // `index` = 含运行时模板编译器；`runtime` = 不含（AOT / SSR / 手写 render 用）
  entry: { index: 'src/index.ts', runtime: 'src/runtime.ts' },
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
    '@lytjs/compiler',
    '@lytjs/renderer',
    // tsup 的包名 external 不保证覆盖子路径（见 keel/pitfalls/build/subpath-external-singleton-blindspot.md）
    '@lytjs/renderer/dom',
    '@lytjs/renderer/signal',
    '@lytjs/renderer/app',
    '@lytjs/component',
    '@lytjs/core-vnode',
    '@lytjs/common-is',
    '@lytjs/common-env',
    '@lytjs/common-error',
    '@lytjs/common-object',
    '@lytjs/common-string',
    '@lytjs/common-scheduler',
    '@lytjs/shared-types',
  ],
});
