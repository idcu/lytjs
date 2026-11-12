// src/create-app-with-compiler.ts
// @lytjs/core —— **带运行时模板编译器**的 createApp 入口
//
// ## 为什么需要这一层（P1-N）
//
// `options.template` 的支持依赖 `@lytjs/compiler`（2026-11-06 A15 实测：边际成本
// 36,690 B = 35.8 KB gzip，占 minimal-app 的 40.2%）。
// 此前这份依赖是**无条件**的：`create-app.ts` 静态 import `./template-compiler`，
// 于是任何 `import { createApp } from '@lytjs/core'` 的应用都必须付这份体积
// （实测最小 app 89.2 KB gzip，而纯 vdom 只要 1.7 KB）。
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
import { createAppInternal } from './create-app';
import type { DOMRendererLoader, SignalRendererFactory } from './create-app';
import { compileTemplateToRender } from './template-compiler';
import type { App, AppOptions, Component } from './types';

let compilerInstalled = false;

/**
 * 主入口的惰性渲染器入口。
 *
 * 走 `@lytjs/renderer/app`（DOM + signal 的**合并**子路径）：拆成两条动态
 * import 会让消费者的首屏静态闭包被切成 3 个 chunk（实测 gzip +807 B）。
 * 包根的 `import('@lytjs/renderer')` 会把 vapor / server 等全部内联（实测
 * minimal-app 多出 ~14 KB gzip），同样不可取。
 */
const loadRenderers = () => import('@lytjs/renderer/app');

const signalRendererFactory: SignalRendererFactory = async (template, ctx) => {
  const { createSignalRenderer } = await loadRenderers();
  return createSignalRenderer(template, ctx);
};

// `@lytjs/renderer/app` 与 `@lytjs/renderer/dom` 转出同一个 `createDOMRenderer`
// 声明，因此合并入口的模块类型可直接满足 `DOMRendererLoader`，无需断言。
const loadDOMRenderer: DOMRendererLoader = loadRenderers;

/**
 * **显式**注入运行时模板编译器（幂等）。
 *
 * ⚠️ 2026-11-01 新增：`createApp()` 会顺带注入，但「只做 SSR、从不创建 app」的进程
 * （例如纯 `renderToString` 的服务端）拿不到这个副作用 ⇒ 渲染 `template` 组件时抛错。
 * 此前错误信息写的是"import '@lytjs/core' 即可"——**不准确**，import 不注入，调用才注入。
 *
 * 现在提供显式入口：
 * ```ts
 * import { installTemplateCompiler } from '@lytjs/core';
 * installTemplateCompiler();          // 服务端入口调用一次
 * ```
 */
export function installTemplateCompiler(): void {
  if (!compilerInstalled) {
    setTemplateCompiler(compileTemplateToRender);
    compilerInstalled = true;
  }
}

/**
 * 带运行时模板编译能力的 `createApp`。
 *
 * 与 `@lytjs/core/runtime` 的同名函数相比，这里多两件事：
 *   ① 首次调用时把 `compileTemplateToRender` 注入 `@lytjs/component`，使
 *      组件 `options.template`（vnode 模式）生效；
 *   ② 向实现注入 signal 渲染器工厂，使 `rendererMode: 'signal'` 的模板字符串
 *      也能编译（runtime 入口没有这个工厂，会抛出可操作的错误）。
 */
export function createApp(
  rootComponent: Component,
  rootProps: Record<string, unknown> | null = null,
  options?: AppOptions,
): App {
  installTemplateCompiler();
  return createAppInternal(
    rootComponent,
    rootProps,
    options,
    signalRendererFactory,
    loadDOMRenderer,
  );
}

// 类型转发：`createAppInternal` / 渲染器工厂类型是入口包装的公共签名，
// 但**不再** `export * from './create-app'` —— 那会把内部实现函数暴露到
// `@lytjs/core` 的公开导出面（API 快照会出现非刻意的漂移）。
export type { DOMRendererLoader, SignalRendererFactory } from './create-app';
