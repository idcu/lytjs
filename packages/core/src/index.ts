// src/index.ts
// @lytjs/core - 核心入口（**含**运行时模板编译器）
//
// ⚠️ 2026-10-27 重构（P1-N）：导出面本体已下沉到 `./runtime`，本文件只做三件事：
//   ① 转出 `./runtime` 的全部导出（单一清单，避免两处漂移）；
//   ② 用**带编译器**的 `createApp` 覆盖 runtime 版（显式导出优先于 `export *`）；
//   ③ 补出编译器专属的 API（`compile` / `compileTemplateToRender`）。
//
// 想要不含编译器（体积小 52 KB）的版本：`import { createApp } from '@lytjs/core/runtime'`。

export * from './runtime';

// ② 覆盖：带模板编译器注入的 createApp
export { createApp } from './create-app-with-compiler';

// ③ 编译器专属
export { compile } from '@lytjs/compiler';
export { compileTemplateToRender, clearTemplateRenderCache } from './template-compiler';
