---
scope: api
status: active
last-verified: 2026-11-07
keywords: [单一权威, 公开名, 登记册, 身份测试, ADR 0011]
type: decision
created: 2026-11-07
superseded-by:
---

# 0017 公开名身份登记册：同名能力只能一个 owner

## 背景

ADR 0011 要求「同名 API 只许一份权威实现」。S06/S07/S08 已分别收敛
`ErrorBoundary`、core/core-vnode 辅助函数、事件修饰符；但缺少**可执行的登记册**，
下一轮仍可能重新分叉。ADR 0016 已占用编号，故本册编号为 0017。

## 决定

1. **登记册真源**：`keel/contracts/public-names.json`（机器可读，含 `file:line`、
   relay、身份测试、删除条件）。
2. **两种状态，不混用**：
   - `unified`：已收敛。门禁强制「同名只能一个实现」——`src/**` 中恰好一处定义且
     位于 owner；relay 只允许 `export { ... } from`；身份测试必须存在。
   - `registered`：**已登记结构债**。列出 owner/replica/删除条件，门禁只校验清单
     不腐烂（文件、行号、测试存在），**不**把它当作「单一权威已通过」。
3. **门禁**：`node scripts/check-public-names.mjs` 已登记进 `gate --tier fast`
   （`check-public-names`）。
4. **新增重复名**：必须先入册。要标 `unified` 就必须同时收敛实现并补身份测试；
   暂不收敛的标 `registered`，写清 owner、replica、删除条件与关联 ADR。

## unified（强制单一实现）

| 能力 | owner | 转发入口 | 身份测试 |
|---|---|---|---|
| ErrorBoundary + 错误钩子（7 名） | `component/src/error-boundary.ts` | `core/src/error-boundary.ts`、`core-vnode/src/index.ts` | `core/tests/error-boundary-identity.test.ts` |
| `h` | `core-vnode/src/h.ts` | `core/src/h.ts` | `core/tests/core-vnode-parity.test.ts` |
| `withDirectives` / `withMemo` | `core-vnode/src/directives.ts` | `core/src/directives.ts` | 同上 |
| `useSlots` / `useAttrs` / `useModel` | `core-vnode/src/composition.ts` | `core/src/composition.ts` | 同上 |
| 生命周期钩子（11 名） | `component/src/lifecycle.ts` | `core-vnode/src/lifecycle.ts`、`core/src/lifecycle.ts` | 同上 |
| `isEventModifierIntercepted` | `common/packages/events/src/index.ts` | —（三个消费方直接 import） | `scripts/check-event-semantics.mjs` |
| `withModifiers` | `dom-runtime/src/index.ts` | `core/src/runtime-helpers.ts` | `core/tests/core-vnode-parity.test.ts` |
| `renderSlot` / `normalizeSlotValue` | `component/src/slots.ts` | — | `component/tests/slots.test.ts` |

## registered（显式结构债，不参与强制）

| 能力 | owner（目标） | 现存副本 | 删除条件 |
|---|---|---|---|
| `createApp` | `core-vnode/src/create-app.ts` | `core/src/create-app.ts`、`core/src/create-app-with-compiler.ts` | core 两份收敛为转发；`core-signal` 为独立模式不在此列 |
| signal codegen | `compiler/src/codegen-signal.ts` | `codegen-signal-optimized.ts` | ADR 0015 裁定后合并或退休优化版 |
| hydration | `adapter-web/src/web-hydration.ts` | `renderer/src/hydration/enhanced-hydration.ts` | S12 收敛到单一写入路径 |
| keyed list diff | `vdom/src/list-diff.ts` | `dom-runtime/src/index.ts`（`reconcileArray`） | S12 收敛到同一套 keyed diff 语义 |

UI 层 20 处手写 slot 归一化属于同一结构债，归 `slot-helpers` 的删除条件，后续批次处理。

## 为什么用「两种状态」

若把 `registered` 也纳入强制，S09 将被迫在登记册任务里改 `createApp`/codegen/
hydration/list-diff（超出批次 1 范围）；若全部排除，又会让「同名只能一个实现」变成
假绿。两种状态的分界把**已收敛**与**已登记未收敛**分开，门禁只对前者声称通过，
后者在清单里显式可见，避免放宽判据。

## 验证

- `node scripts/check-public-names.mjs`：unified **28 名** + registered **4 组**，退出 0；
- `gate --tier fast`：**51/51 通过**（新增 `check-public-names`）；
- 身份测试：ErrorBoundary 3 例、core-vnode parity 8 例、slot 16 例；
- 负控（人工）：把任一 unified 名字的第二份实现放入 `src/`，脚本退出 1。
