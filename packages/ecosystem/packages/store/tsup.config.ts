import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
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
    // ⚠️ 2026-11-05 修（P1）：**必须 external**，不能打进产物。
    //
    //   本包的 tsup 里有 `define: { __DEV__: 'false' }`，而 `@lytjs/common-error` 的
    //   `getDevMode()` 第一句是 `if (typeof __DEV__ === 'boolean') return __DEV__;`
    //   —— 一旦被本包内联，esbuild 会把 `__DEV__` 折叠成 `false`，整条函数坍缩为
    //   `return false`（实测产物里就是 `const g = globalThis; if (typeof g.__DEV__...)` +
    //   `return false`，后面的 `process.env.NODE_ENV` 分支被当成不可达删掉）。
    //   ⇒ **本包所有 `warn()` 在产物里都是哑的**，而且 `setDevMode(true)` 也管不到
    //   内联副本（它改的是真身模块里的 `runtimeDevMode`）。
    '@lytjs/common-error',
    '@lytjs/common-is',
    '@lytjs/common-object',
    '@lytjs/shared-types',
    '@lytjs/reactivity',
    '@lytjs/core',
  ],
});
