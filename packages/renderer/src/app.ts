// packages/renderer/src/app.ts
// @lytjs/renderer/app —— `createApp` 两种模式所需的渲染器**合并入口**
//
// ## 为什么需要这个子路径（2026-11-13 新增）
//
// `@lytjs/core` 的 `createApp` 需要两个渲染器：
//   · vnode 模式 → `createDOMRenderer`（`@lytjs/renderer/dom`）
//   · signal 模式 → `createSignalRenderer`（`@lytjs/renderer/signal`，同步版）
//
// 两者若各自作为一条动态 import，会形成**两个**打包 entry point：DOM 渲染器
// 不依赖编译器，signal 渲染器依赖，于是共享模块被 esbuild 按「entry point 集合」
// 分成两组 ⇒ 消费者的首屏静态闭包从 2 个 chunk 变成 3 个（实测 gzip +807 B）。
//
// 合成一个子路径后，`@lytjs/core` 只需一条动态 import，共享模块集合一致，
// 静态闭包回到 2 个 chunk。
//
// ## 为什么不放在 `@lytjs/renderer` 包根
//
// 包根的 `createSignalRenderer` 是 async 懒加载包装，且包根还转出 vapor / server
// 等一大串模块 —— 动态导入包根会把它们全部内联进「只用 createApp」的产物。
export { createDOMRenderer } from './dom/dom-renderer';
export { createSignalRenderer } from './signal/signal-renderer';
export type { SignalRenderer } from './signal/signal-renderer';
