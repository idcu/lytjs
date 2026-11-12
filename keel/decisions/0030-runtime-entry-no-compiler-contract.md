---
scope: core
status: active
last-verified: 2026-11-13
keywords: [bundle, core/runtime, 编译器, 打包契约, signal 模板, 破坏性变更, renderer/app]
type: decision
created: 2026-11-13
superseded-by:
---

# ADR 0030 · `@lytjs/core/runtime` 产物不得包含编译器（打包契约）

- 状态：**已批准**（owner 2026-11-13，六条前置条件逐条满足后落库）。
- 决策：`@lytjs/core/runtime` 的产物闭包里**不允许**出现 `compiler/dist`；
  `rendererMode: 'signal'` 的模板字符串在 runtime 入口下必须抛出**可操作错误**，
  不得静默降级。该契约由 bundle 门禁的硬断言持续守卫，并配有反证验收。

## 动机

`@lytjs/core` 与 `@lytjs/core/runtime` 的唯一差别是运行时模板编译器。
但此前 runtime 入口的 `createApp` 通过 `await import('@lytjs/renderer')`（**namespace**）
取 DOM / signal 渲染器：

- renderer 包根把 signal / vapor 的发射链全部 live 导出；
- signal / vapor 顶层 `import '@lytjs/compiler'`；
- tsup `splitting:false` 把内部动态 import 全内联 ⇒ **整个编译器被打进 runtime 产物**。

实测 `runtime-app` 从 33,481 B 涨到 94,170 B gzip（+60,689 B），runtime 入口的
存在意义被悄悄抹掉。同类风险还会以「按需解构」复现 —— 已实测
`{ createDOMRenderer } = await import('@lytjs/renderer')` 仍保留 heavy 导出，
**namespace / 解构不会按需 tree-shake**。

## 方案

1. **DOM 渲染器走 `@lytjs/renderer/dom`**，signal 渲染器走 `@lytjs/renderer/signal`
   （均为 esbuild 外部包 specifier，保持 dynamic）。runtime 入口只加载前者。
2. **signal 工厂按 app 实例注入**，不采用模块全局注册：
   同进程里先调主入口、再调 runtime 入口时，全局注册会让 runtime 静默拿到编译器
   （同一 vitest 进程即可复现）。runtime 恒传 `null`。
3. **新增 `@lytjs/renderer/app` 子路径**，把 DOM + signal 合并成**单一**动态入口，
   供主入口使用。两条独立动态 import 会让消费者的首屏静态闭包从 2 个 chunk 变成 3 个
   （实测 gzip +807~1,229 B）；包根 `import('@lytjs/renderer')` 则会内联
   vapor / server（minimal-app 多出约 14 KB gzip）。
4. **可操作错误**：runtime 入口下 `rendererMode: 'signal'` + `template` 直接抛错，
   消息包含 `@lytjs/core` / `@lytjs/compiler` / `@lytjs/renderer/signal` 三条出路，
   且容器保持为空（`host.childNodes.length === 0`）。

## 影响面

| 包 / 入口 | 影响 |
| --- | --- |
| `@lytjs/core`（主入口） | 无变化；vnode / signal 两种模板均可用 |
| `@lytjs/core/runtime` | **破坏性**：signal 模式 + 模板字符串由「静默借用编译器」变为**抛错** |
| `@lytjs/renderer` | 新增子路径 `./app`（`createDOMRenderer` / `createSignalRenderer` / type `SignalRenderer`）；主 barrel 导出面**不变** |
| 示例 / 文档 / playground | 全部使用 `@lytjs/core` 主入口；`examples/slots-demo` 直接用 `@lytjs/renderer/signal`，本就正确，无需改动 |

仓库内扫描结果：**没有**示例或文档依赖 runtime 入口的 signal 模板编译。

## 迁移指引

- 需要运行时 signal 模板编译：改用 `import { createApp } from '@lytjs/core'`。
- 必须留在 runtime 入口：用 `@lytjs/compiler` 预编译，或显式
  `import { createSignalRenderer } from '@lytjs/renderer/signal'` 自行驱动。
- 只写 `render()` / AOT 预编译：不受影响。

## 硬判据（防回接）

`scripts/check-bundle-size.ts` 新增断言：

> `runtime-app 的产物不含编译器模块`
> —— 在 esbuild metafile 的 `outputs[*].inputs` 中，任何 `compiler/dist` 条目
> 的 `bytesInOutput` 必须为 0（`inputs` 含 tree-shaken 模块，只看 `bytesInOutput`
> 才不误判）。

**反证已执行**：临时把 `packages/core/src/runtime.ts` 的 DOM 加载器从
`import('@lytjs/renderer/dom')` 改回 `import('@lytjs/renderer')` 并重建 core 后：

- `❌ runtime-app 的产物不含编译器模块`
- `❌ runtime-app 在预算内`（94,170 B > 93,644 B）
- `❌ first-screen-runtime 在预算内`（38,428 B > 38,400 B）

还原源码并重建后 25/25 断言全绿 ⇒ 判据可红可绿，不是装饰。

## 预算与实测（2026-11-13）

| 入口 | 实测 gzip | 预算 |
| --- | --- | --- |
| vdom-only | 1,349 B | 1.7 KB |
| barrel-only | 9,507 B | 9.5 KB |
| minimal-app | 79,748 B | 93.6 KB |
| runtime-app | 33,481 B | 91.4 KB |
| first-screen | 76,489 B | 75.2 KB |
| first-screen-runtime | 29,724 B | 37.5 KB |

`runtime-app` 从 94,170 B 回落到 33,481 B；`minimal-app` 从基线 91.8 KB 降到 77.9 KB；
`first-screen-runtime` 从 36.8 KB 降到 29.0 KB。**未调整任何基线或预算**。

