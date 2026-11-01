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
export { createApp, installTemplateCompiler } from './create-app-with-compiler';

// ③ 编译器专属
export { compile } from '@lytjs/compiler';
export { compileTemplateToRender, clearTemplateRenderCache } from './template-compiler';

// ④ 服务端渲染（**只从主入口转出**）
//
// ⚠️ 2026-10-28 新增（P0）：`@lytjs/renderer` 的 `renderToString` 对**用模板写的
//   组件**一律输出空串（组件解析器只认 `render`）。本模块先确保模板编译器已注入，
//   再转发给 renderer —— 修法在 core 侧，因为 renderer **不能**静态依赖编译器
//   （P1-N：那会给每个用 renderer 的产物加上 52 KB）。
//
// 刻意**不**从 `./runtime` 转出：`runtime` 入口的全部意义是不含编译器，
// 本模块静态依赖 `./template-compiler`，一旦转出该入口立刻失去意义。
export { renderToString, renderToStream } from './ssr';
export type { CoreRenderToStringInput } from './ssr';
