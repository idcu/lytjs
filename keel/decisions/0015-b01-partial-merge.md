---
scope: meta
status: active
last-verified: 2026-11-06
keywords: [compiler, codegen, B01, 部分完成, signal, optimized, 决策]
type: decision
created: 2026-11-06
superseded-by:
---

# 0015 B01 部分完成：基础实现为语义主干，优化版保留实验路径

> **状态：草稿（待 owner 拍板）。** 本文先把「实际交付 ≠ 原目标」写清楚，避免用
> 「B01 已完成」的措辞掩盖仍未合并的事实。

## 背景

B01 的原始验收是：

1. 定权威实现，`optimized` 的独有优化迁入或删除；
2. 按 ADR 0011，一个公开名字一份权威实现，其余入口只转发；
3. `check-compiler-parity` 扩到 100 模板；
4. 两实现同模板执行后 DOM 完全一致；
5. `minimal-app` 不因合并增长。

实际只达成 3–5 的一半：**两套实现仍然并存**，没有合并、没有删除；
100 模板对拍为 **77/100**，其余 **23 条** 作为已登记差异进入棘轮基线
（`scripts/compiler-parity-baseline.json` 的 `templateParity.divergent`）。
因此 B01 记为**部分完成**，不记为完成。

## 实际交付（可复算）

- 基础实现修 8 处静默丢内容缺陷（if05/07/08/09 · for08 · kb05 · mx04 · mx06）；
- 100 模板对拍 74 → **77**；`expectedMismatch` 5 → **0**；
- 体积：A 100 模板基础产物 **58,797 B**；`minimal-app` **92,538 B**；
- vnode / SSR 快照逐字一致；
- 保留项 2/3/4（静态 HTML 复用、单插值复用、v-memo）与按引用裁剪 import；
- 短别名实测净负 → 已回退（ADR 0014）。

## 决定（草稿）

1. B01 状态改为**部分完成**：基础实现（`codegen-signal.ts` 路径）成为语义主干与默认路径。
2. 优化版**保留为实验路径**：`optimizeSignal` 默认关闭（沿用 ADR 0012），不作为默认产物。
3. 23 条差异**入基线棘轮**：只允许减少，不允许新增；修好一条同步删一条，否则门禁红。
4. 后续在「修齐」与「下线」之间二选一，**本决策不拍板**：
   - **修齐**：23 条逐条对齐 → 对拍 100/100 → 再按 ADR 0011 合并或只留一份；
   - **下线**：删除 `optimized` 实现、`optimizeSignal` 开关与相关基线，只留基础实现。
5. 选择依据必须先有实测（体积/行为收益与维护成本），不得以推断批准（ADR 0014）。

## 未达成的目标（不要粉饰）

- 「单一权威实现」未达成：两份 codegen 仍并存；
- 「optimized 独有优化迁入或删除」未达成；
- 100 模板对拍未到 100/100（当前 77/100，23 条登记差异）；
- compiler 源码行数未因合并下降。

## 判据

- `node scripts/check-compiler-parity.mjs`：77/100、`expectedMismatch` 0、vnode/SSR 快照一致；
- `scripts/compiler-parity-baseline.json` 的 `templateParity.divergent` 长度 = **23**，且只减不增；
- `optimizeSignal` 默认值 = `false`；
- `minimal-app` 预算不因本决策变化（92,538 B，A15 棘轮）。

## 回退路径

本决策只改记录状态，不改代码；如需恢复到「B01 已完成」的措辞，必须先完成
上述 5 条原始验收并同步删除 23 条基线，否则不得改写。
