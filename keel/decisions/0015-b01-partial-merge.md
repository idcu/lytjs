---
scope: meta
status: active
last-verified: 2026-11-07
keywords: [compiler, codegen, B01, S13, parity, 100/100, signal, optimized, 决策]
type: decision
created: 2026-11-06
superseded-by:
---

# 0015 B01 部分完成：基础实现为语义主干，优化版保留实验路径

> **状态：active（2026-11-07 owner 裁定方向 2：共享 helper 的双发射器）。**

## 更新：2026-11-07 S13 方向 2 落地

Owner 裁定**方向 2（共享 helper 的双发射器）**：语义逻辑抽成单一共享 helper，
两个发射器只保留输出形态差异；两套既有输出契约与测试都不改。

- **语义真源**：`packages/compiler/src/codegen-signal-shared.ts`，集中 AST 读取与
  语义判定（文本槽位、直接文本、静态字面量、组件引用、插值、嵌套元素、
  v-for 列表项 props/子树、列表项组件 props）。发射器只注入 `_ctx.` / `_c.` 前缀
  与各自的文本兜底形态。
- **有意保留的输出形态分叉**：①短别名 vs 全名；②`_c,_n` vs `_ctx,_container`；
  ③`_0/_1` vs `_li/_span`；④`_c.` vs `_ctx.`；⑤空白/拆行差异。
- **为什么保留双发射器**：两份输出契约都被测试固化；单发射器必然改其中一份，
  owner 要求契约不动。
- **不回归判据**：`check-compiler-parity` 共享前后均 **100/100**。
- **顺带修正**：基础实现此前借用优化版 props helper，列表项组件表达式误用 `_c.`
  （其 render 形参是 `_ctx`）；共享后回到 `_ctx.`，测试全过。
- **后续收敛/删除条件**：优化版输出契约被正式废弃、且 `optimizeSignal` 不再作为
  公开开关时，删除优化版发射器，短别名转为单一实现的内部选项。在此之前语义改动
  只能改 shared，禁止两份发射器各写一份。

验证：对拍 **100/100**、`expectedMismatch` 0、baseline divergent 23→0；fast 53/53。

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
