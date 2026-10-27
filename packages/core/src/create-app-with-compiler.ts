// src/create-app-with-compiler.ts
// @lytjs/core —— **带运行时模板编译器**的 createApp 入口
//
// ## 为什么需要这一层（P1-N）
//
// `options.template` 的支持依赖 `@lytjs/compiler`（~98 KB raw / ~18 KB gzip 边际成本）。
// 此前这份依赖是**无条件**的：`create-app.ts` 静态 import `./template-compiler`，
// 于是任何 `import { createApp } from '@lytjs/core'` 的应用都必须付这份体积
// （实测最小 app 94.3 KB gzip，而纯 vdom 只要 1.6 KB）。
//
// 现在拆成两个入口：
//   · 本模块 → 主入口 `@lytjs/core` 的 `createApp`：`template` 可用；
//   · `./create-app` → `@lytjs/core/runtime` 的 `createApp`：不含编译器。
//
// ## 为什么注入写在函数体里，而不是模块顶层
//
// 顶层 `setTemplateCompiler(compileTemplateToRender)` 是一条**有副作用的顶层语句**：
// 打包器无法删除它，于是「只 `import { ref } from '@lytjs/core'`」的包也会被塞进
// 整个编译器与 renderer（实测 8.9 KB → 82 KB gzip）。
// 放进 `createApp` 体内后，未调用 `createApp` 的包可以把它完整 tree-shake 掉。
// 注入本身幂等，重复调用只是一次布尔判断。

import { setTemplateCompiler } from '@lytjs/component';
import { createApp as baseCreateApp } from './create-app';
import { compileTemplateToRender } from './template-compiler';
import type { App, AppOptions, Component } from './types';

let compilerInstalled = false;

/**
 * 带运行时模板编译能力的 `createApp`。
 *
 * 与 `@lytjs/core/runtime` 的同名函数**行为完全一致**，唯一差别是：
 * 这里会在首次调用时把 `compileTemplateToRender` 注入 `@lytjs/component`，
 * 使 `options.template` 生效。
 */
export function createApp(
  rootComponent: Component,
  rootProps: Record<string, unknown> | null = null,
  options?: AppOptions,
): App {
  if (!compilerInstalled) {
    setTemplateCompiler(compileTemplateToRender);
    compilerInstalled = true;
  }
  return baseCreateApp(rootComponent, rootProps, options);
}

// 其余导出（类型、辅助函数等）与 runtime 版一致，直接转发。
export * from './create-app';
