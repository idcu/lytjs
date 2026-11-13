---
scope: meta
status: active
last-verified: 2026-11-13
keywords: [bundle, 体积预算, first-screen, SSR, codegen, 基线上调, 决策]
type: decision
created: 2026-11-13
superseded-by:
---

# ADR 0031 · first-screen 基线因 SSR codegen 修复上调（75448 → 76990 B）

- 状态：**已批准**（owner 2026-11-13）。
- 决策：仅 `first-screen` baseline 75448 → **76990 B**（预算 76990×1.02 = 78529 B）；
  其余五个入口与 `minimal-app` 硬上限 95948 B 一概不动，容忍度 2% 与判据不变。
- 本记录只解释**一个数字**的上调；不附带任何功能增长授权。

## 背景

`first-screen` 的静态闭包包含**完整编译器**（`@lytjs/core` 主入口静态可达
运行时模板编译器），因此对 `packages/compiler/src/codegen-ssr.ts` 与
`__lytRenderList` helper 的任何修复都会直接推高该入口。

这属于 **A15 登记在案的已知欠账**（`@lytjs/core` 首屏静态闭包含编译器，
留给 B03 AOT / 后续按需化处理），不是本批新引入的结构问题。
只要 codegen 还在静态闭包里，每修一次 SSR 产物就必然抬一次首屏字节；
本次按 A15 流程走 owner 签字 + 决策记录，而不是让门禁长期红。

## 逐提交归因（可复现）

隔离重建相关包 dist 后逐提交实测（`tsx scripts/check-bundle-size.ts --verbose`），
起点 `75448 B` 为 ADR 0027 记录的基线值：

| 提交 | 内容 | 实测 | 增量 |
| --- | --- | --- | --- |
| `e0f02884`（本批之前） | 已含 useId / 首屏回收等既有改动 | 76510 | +1062 |
| `77328838`（C-24） | SSR v-for 对象/数字崩溃与插值丢失 | 76706 | +196 |
| `68e13143`（C-25） | 无参 v-slot 模板不再输出字面量 `template` | 76730 | +24 |
| `6a1481a2`（C-26） | SSR v-model 表单初态（checkbox/radio/select/textarea） | 77011 | +281 |
| `1b767e2d`（helper） | `__lytRenderList` 仅用到 v-for 时注入 | 77025 | +14 |
| `ac3c186a`（C-23） | 撤销 SSR 插值表达式白名单 | 76987 | −38 |
| `dcf0f39a`（batchAsync） | 并发 async batch 可诊断 + 快照归属 | 76990 | +3 |
| **合计** | | **76990** | **+1542** |

`1b767e2d` 名为「收紧注入」，实测仍 +14 B：它新增了 `containsListCall`
判定所需的代码（嵌套 v-for 判定），省下的是「无 v-for 模板」的产物，
而首屏入口自身的模板编译路径仍需要该判定逻辑。

旧预算 `floor(75448 × 1.02) = 76956 B`，实测 76990 超 34 B。
超出的 34 B 不是某一笔「可回退的不必要改动」，而是七笔正确性修复的累计结果；
逐笔回退任何一条都会把已修的 SSR 缺陷放回去，因此只能走签字上调。

## 无「可回退的不必要依赖」的证据

- `first-screen` 首屏闭包 = 入口 chunk + 静态 import 可达 chunk；
  闭包输入只有 `compiler`（121859 B raw）/ `reactivity`（13631 B raw）/ `core`（10102 B raw）。
- `renderer` 不在该闭包内，故本批 renderer/reactivity 的请求作用域改造
  对 `first-screen` 的贡献为 0（`batchAsync` 的 +3 B 来自 reactivity，
  其修复属于 P1-13 正确性要求，动态 import 化会破坏同步 API）。
- 闭包内 `src` 输入为 0（无 tsconfig paths 泄漏），未发现重复打包。
- 编译器按需化不是本轮可做的改动：它同时改变 `@lytjs/core` 公开行为，
  属 B03 AOT 的范围，需要独立设计与兼容性评估。

## v7.1 待办（登记，避免后续每批都调基线）

> **评估 first-screen 是否将编译器拆分 / 按需化。**

- 目标：让 `compiler` 退出 `@lytjs/core` 的静态闭包，使首屏不再为 SSR/AOT
  codegen 修复买单。
- 约束：不得破坏「运行时模板编译可选开启」的既有契约（ADR 0030：
  core/runtime 不含编译器；主入口是否同样按需化需单独决策）。
- 完成前，任何再触达 codegen 的批次若推高 `first-screen`，仍按本 ADR 流程
  逐笔归因 + owner 签字，不允许「按实测改预算」。

## 未采纳备选

- 长期红：slow 档持续失败，等于拿门禁换债务。
- 本批顺手做编译器拆分：范围溢出，会混入 15 条 P1 修复的收尾批次，
  无法逐笔归因。
- 用 `--record` 自动记录：脚本明确拒绝上调，且会丢失逐提交归因。
