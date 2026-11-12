---
scope: verify
status: active
severity: P2
last-verified: 2026-11-13
triggers: 3
keywords: [test, 偶发, 固定等待, 时序竞争]
---

## 症状

`pnpm test` 偶发失败：`examples/using-lytjs-as-dep/todo-app.test.ts` 首屏断言
`expected '' to contain 'Todo List'`；复跑可能全绿，一度记为「环境抖动」。

## 证据（2026-11-13 CST）

- 01:35–01:38 三次全量绿（423 文件；原始失败输出缺失）。
- 03:0x 实验：把等待改回固定 30ms，全量并行连跑 5 轮 → **5/5 复现**同一断言；
  改回条件轮询后全量绿（/tmp/repro-{1..5}.log）。

## 根因

固定 30ms 等待 vs 动态加载的时序竞争：`main.js` 未 await `mount()`，而渲染器
`@lytjs/renderer/app` 冷加载在并行负载下 >30ms，首帧尚未落地。
见 [todo-app.test.ts](../../../examples/using-lytjs-as-dep/todo-app.test.ts) 与
[ADR 0030](../../decisions/0030-runtime-entry-no-compiler-contract.md)。

## 正解

- 首帧断言等条件（轮询），不猜延时；新代码优先 `await app.mount()`。失败必须落盘原始输出；未复现 ≠ 已排除，复现后写明轮次与日志路径。
