---
scope: core
status: active
last-verified: 2026-11-14
keywords: [bundle, first-screen, 编译器, 拆 entry, 子路径, signal, optimizeSignal, 破坏性变更]
type: decision
created: 2026-11-14
superseded-by:
---

# ADR 0033 · 优化发射器拆到 `@lytjs/compiler/signal-optimized` 子入口

- 状态：**已批准**（owner 2026-11-14，明确要求「拆 entry，不抬预算」）。
- 决策：`generateSignalOptimized` 不再从 `@lytjs/compiler` 主入口导出；优化发射器
  只在子路径 `@lytjs/compiler/signal-optimized` 导出，并必须通过
  `registerSignalOptimizedGenerator()` **显式注册**。未注册时
  `compile({ optimizeSignal: true })` 抛可操作错误，**不降级**、不 warn 后继续。

## 动机

`first-screen` 从基线签字点 76990 B 增至 80763 B（+3773 B）。逐提交实测（`git archive`
逐笔重建 dist + 同一 esbuild 计量）显示：**多笔累积、无单笔回归**——compiler 变化
3332 B、其它包 441 B。首屏静态闭包包含完整编译器属 A15 已知欠账（ADR 0031），
但继续按功能增长抬预算只会把问题推给下一次。

`generateSignalOptimized` 是默认关闭的 opt-in 实验路径（ADR 0028），却从主入口
**静态 import**，使每个 `import { createApp } from '@lytjs/core'` 的首屏闭包都为它
支付 6.4 KB gzip。把它移出主入口图是真实切边，不是删代码。

## 方案

1. 新增 `signal-optimized-registry.ts`：主入口只读注册槽，不静态引用发射器。
2. 新增子路径入口 `signal-optimized.ts`：导出 `generateSignalOptimized` 与
   `registerSignalOptimizedGenerator()`。
3. `compile()` 在 `optimizeSignal === true` 且未注册时抛错，消息直接给出
   `import { registerSignalOptimizedGenerator } from '@lytjs/compiler/signal-optimized'`
   与 `registerSignalOptimizedGenerator();` 两行。
4. 注册槽挂在 `globalThis` 的 `Symbol.for` 键上：`tsup` 以 `splitting:false` 逐入口
   内联模块，模块级变量无法跨 `index.mjs` / `signal-optimized.mjs` 共享。
5. 同批把 `MEMO_KEY` / `MEMO_CODEGEN_KEY` / `SCOPE_PARAMS_KEY` 改为 `Symbol.for`：
   transform 在 `index` 副本写元数据、codegen 在子入口副本读；普通 `Symbol()` 会让
   v-memo 守卫**静默消失**（实测 230 份产物中恰好 1 份不同）。

## 影响面

| 入口 | 影响 |
| --- | --- |
| `@lytjs/compiler` 主入口 | **破坏性**：不再导出 `generateSignalOptimized`；`optimizeSignal:true` 需先注册 |
| `@lytjs/compiler/signal-optimized` | 新增子路径（`generateSignalOptimized` / `registerSignalOptimizedGenerator`） |
| 默认 `optimizeSignal` 未传 | 无变化，仍走基础实现，无需注册 |
| `createSignalRenderer`（运行时） | 写死 `optimizeSignal:false`，无需注册 |

## 迁移

```ts
import { registerSignalOptimizedGenerator } from '@lytjs/compiler/signal-optimized';
registerSignalOptimizedGenerator(); // 应用入口执行一次
```

仓库内显式调用方全部改为显式注册：7 个 compiler 测试、5 个 renderer 测试、
`check-compiler-parity` 与 `check-signal-profile-snapshot` 两个门禁脚本。

## 验收（2026-11-14）

| 项 | 拆前 | 拆后 |
| --- | --- | --- |
| first-screen gzip | 80,763 B | **74,595 B**（预算 78,529 B，余量 3,934 B） |
| compiler `index.mjs` gzip | — | 61,486 B |
| compiler `signal-optimized.mjs` gzip | — | 23,965 B |
| 115×2 产物 | 基线 137,856 B | **逐字节相同 230/230** |

首屏闭包 metafile：2 个 chunk，输入集合中**不含** `codegen-signal-optimized`。
`check-bundle-size` 25/25 通过；未调整预算、基线或断言。

## 负控

把 `registerSignalOptimizedGenerator()` 从调用方移除 ⇒ `compile({optimizeSignal:true})`
必须抛错（`packages/compiler/tests/signal-optimized-registration.test.ts` 断言错误消息
含子路径与注册函数名）。把三个元数据键改回 `Symbol()` ⇒
`check-signal-profile-snapshot` 必红（`di02/optimized` 丢 v-memo 守卫）。
