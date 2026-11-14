---
scope: build
status: active
severity: P1
last-verified: 2026-11-14
triggers: 1
keywords: [splitting, 入口, 模块级状态, Map, Symbol, 单例]
---

## 症状

- 主入口写、子入口读同一份注册表/开关，静默不生效。
- 单测全绿：vitest alias 到 src，同进程只有一个模块实例。

## 根因

tsup `splitting: false` 逐入口内联：同一模块在每个入口各一份，模块级
`let` / `Map` / `Symbol()` 也随之复制。普通 Symbol 键在两个入口身份不同。

## 正解

- **先减入口**：子路径若只是同一批模块再转出、仓内零真实消费方，合并掉比加
  全局槽更干净，每减一个入口永久消掉一类分叉（reactivity 已合并为单入口）。
- 确需跨入口的状态：挂 `globalThis` + `Symbol.for`，不要用模块级变量。
- 只被单入口消费的状态：保持模块级，不要滥用 globalThis 破坏实例隔离。
- 新增模块级状态先问另一入口会不会读写，登记 `scripts/cross-entry-singletons.json`。

## 判据

`node scripts/check-cross-entry-singletons.mjs`：import dist 入口做「写 A 读 B」探针。
