import { defineConfig } from 'tsup';

export default defineConfig({
  // 2026-11-07（S07 回归修复）：除主 barrel 外，为 `@lytjs/core` 的转发提供**细粒度**子入口。
  // 只导 `h` / `withDirectives` / `useSlots` 等单个符号时走子入口，避免顺带把整份
  // barrel（含 `compile` 与 web-component 等）拉进首屏静态闭包。
  entry: {
    index: 'src/index.ts',
    h: 'src/h.ts',
    directives: 'src/directives.ts',
    composition: 'src/composition.ts',
    lifecycle: 'src/lifecycle.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  treeshake: true,
  splitting: false,
  minify: false,
  clean: true,
  external: [
    '@lytjs/component',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/renderer',
    '@lytjs/adapter-web',
    '@lytjs/common-is',
    '@lytjs/common-string',
    '@lytjs/common-scheduler',
    '@lytjs/common-error',
    '@lytjs/shared-types',
  ],
  define: {
    __DEV__: 'false',
  },
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
});
