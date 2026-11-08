---
scope: meta
status: active
last-verified: 2026-11-09
keywords: [架构, 地图, 包拓扑, 依赖方向, 构建顺序]
---

# ARCHITECTURE

> **只画现状，不写愿望**：改了模块边界或依赖方向等于改红线，走人审关卡。
> 规格见《Keel 设计稿》§5.3。

## 包拓扑（76 包）

| 层 | 内容 | 位置 |
|---|---|---|
| L0 基础 | shared-types · host-contract · common-*（34 子包） | `packages/` |
| L1 核心五件套 | reactivity → vdom → compiler / renderer / component → core | `packages/` |
| L2 上层 | ecosystem（store / router / devtools / ssr-kit …）· plugins | `packages/` |
| L6 聚合消费端 | ui（56 组件；只依赖 core / component 与下方登记的 L0 例外） | `packages/ecosystem/packages/ui` |
| 工程 | scripts（门禁与构建）· e2e · benchmarks · docs | 仓根 |

## 依赖方向（单向）

- `reactivity` 不依赖业务包；`vdom` 只依赖 reactivity；
- `renderer` / `component` 依赖 vdom；`core` 汇聚五件套；
- 上层（ecosystem / plugins）只依赖 core 与 component；
- L6 聚合消费端 `@lytjs/ui` 只依赖 core 与 component，另有两类**登记例外**（ADR 0026）：
  `common-a11y` 为 UI-only 语义型 L0 叶子（不外溢 ecosystem）；`common-is` / `common-string`
  为通用 L0 纯函数叶子。vdom / reactivity 一律经 `@lytjs/core/runtime`，不得直连；
- 反向引用仅允许 `import type`（运行时擦除）与 `await import()`（懒加载）——
  三层分类见坑 `circular-deps-three-layers`；
- 跨包识别约定用 `Symbol.for`（`lytjs:signal`、`Teleport`），不许互相 import 实现。

## 构建顺序

- 真相源 `scripts/build-order.ts`（门禁 `check-build-order` 守）；
- 关键序：`common-vnode → vdom → renderer/component → core → ui`；
- 改源码后的重建要求见 skills/dist-rebuild.md。

## 门禁与真源（只登记位置，不复制内容）

| 事项 | 真源 |
|---|---|
| 门禁清单（单一） | `scripts/gate.mjs`（快 / 慢档） |
| 构建顺序 | `scripts/build-order.ts` |
| 循环依赖棘轮 | `scripts/circular-baseline.txt` |
| 契约 / 文档 / UI 检查 | `scripts/check-*.ts`，登记在 `keel/checks/rules.md` |

## 上下文基座

`keel/`（本目录）：入口 `INDEX.md` → `NOW.md`；坑库 `pitfalls/`；决策 `decisions/`；手册 `skills/`。
