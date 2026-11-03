import { defineConfig } from 'tsup';

export default defineConfig({
  // ⚠️ 2026-11-04：**不要**在这里把 `__DEV__` 替换成常量。
  //
  // 本包就是「开发模式判定」本身 —— 一旦把 `__DEV__` 编译成 `false`，
  // 产物里 `warn` / `warnOnce` 会退化成
  //
  //     function warn(message) { return; }
  //
  // ⇒ 整个框架的诊断通道在发布产物里是死的（实测 243 个调用点、91 个文件，0 输出）。
  // 现在 `getDevMode()` 在运行时依次读：setDevMode() → globalThis.__DEV__ →
  // 编译期常量（若应用侧注入了）→ process.env.NODE_ENV → 默认 false。
  // 源码里对 `__DEV__` 的引用全部包在 `typeof` 里，未定义也不会 ReferenceError。
  //
  // 若将来要恢复「编译期裁掉警告」，正确做法是 **dev/prod 双产物**（exports 条件），
  // 而不是把唯一的产物编译成生产形态。
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  // 标记 workspace 依赖为 external，避免 esbuild 尝试打包
  external: ['@lytjs/common-constants'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
});
