---
scope: meta
status: active
last-verified: 2026-11-08
keywords: [compiler, codegen, B01, S13, parity, 100/100, signal, optimized, 决策, 校验]
type: decision
created: 2026-11-06
superseded-by:
---

# 0015 B01 部分完成：基础实现为语义主干，优化版保留实验路径

> **状态：active（2026-11-07 owner 裁定方向 2：共享 helper 的双发射器）。**

## 补记：2026-11-08 `optimizeSignal:true` 校验行为修正

**这是修复能力缺失（correction），不是契约破坏。**

- 非法组件名/属性名/事件名/`v-island` 表达式从不是合法输入；基础版一直抛错，
  优化版此前静默接受并产出运行期才失败的代码。「接受非法输入」不是承诺过的契约。
- 合法输入零影响：200 份 signal profile 产物逐字一致（103,012 B）、
  `check-compiler-parity` 100/100；默认路径 `optimizeSignal:false` 不变。
- 无新增/改名/改签名；四个 validator 下沉 `codegen-signal-shared.ts`，两版文案逐字一致。
- 受影响入口：`compile(..., { rendererMode: 'signal'|'vapor', optimizeSignal: true })`
  与公开导出 `generateSignalOptimized`；vnode/SSR 与默认路径不受影响。
- 迁移：非法模板升级后收到与基础版相同的 `Error`，改模板即可，无 API 动作。
  裸表达式 tag（`:is="_ctx.Foo"`）两版都不按字面名校验，本次未改该边界。
- 负控：`packages/compiler/tests/codegen-coverage-battery.test.ts` 的
  `invalid-component-name` / `invalid-island-expression`，及
  `negative control: opt 与 base 走同一校验路径`（4 组文案逐字对照）；
  修复前红（组件/island 不报、属性/事件文案不同），修复后绿。

## 2026-11-07 方向 2 落地（owner 裁定）

- 语义真源：`packages/compiler/src/codegen-signal-shared.ts`；发射器只注入
  `_ctx.`/`_c.` 前缀与各自文本兜底。
- 有意保留形态分叉：短别名 vs 全名；`_c,_n` vs `_ctx,_container`；
  `_0/_1` vs `_li/_span`；`_c.` vs `_ctx.`；空白/拆行。
- 保留双发射器：两份输出契约均被测试固化，单发射器必改其一。
- 顺带修正：列表项组件表达式误用 `_c.`（render 形参是 `_ctx`），共享后改回。
- 收敛条件：优化版契约废弃且 `optimizeSignal` 不再是公开开关时，删优化版发射器；
  在此之前语义只改 shared，禁止两份各写一份。验证：对拍 100/100、fast 53/53。

## 2026-11-08 `<template>` 哨兵按缺陷修（两 profile）

- 缺陷：signal 模式把 `__LYTJS_FRAGMENT__` 当组件名直传，`<template v-if>` 运行期
  `ReferenceError`、`<template v-for>` 静默空项；运行时零特判 ⇒ 内部表示泄露。
- 修法：两发射器映射到 `@lytjs/vdom` `Fragment`，`mountVNode(createVNode(Fragment,null,children),host)`；
  分支宿主 `<span data-lyt-frag style="display:contents">`。`serializeVNodeCall` 折回同步移除。
- 门禁：新增 tf01/tf02/tf03/tf04；parity 104/104、快照 104×2；原 100×2 逐字不变。
- 负控：回退直传 ⇒ parity 3 条 base-throws + 1 条分叉、快照 4 条红；恢复回绿。
- 残余：tf03 嵌套 `<template v-if>` 两 profile 一致空渲染，属独立缺口。

## 背景与交付

- 原始验收 5 条（权威实现、单权威入口、parity 100、DOM 一致、minimal-app 不增）
  仅达成 3–5 的一半：两套实现仍并存，对拍 77/100，23 条登记为棘轮基线
  （`scripts/compiler-parity-baseline.json` 的 `templateParity.divergent`）。
- 基础实现修 8 处静默丢内容缺陷（if05/07/08/09 · for08 · kb05 · mx04 · mx06）；
  对拍 74→77，`expectedMismatch` 5→0；体积 A 100 模板 58,797 B、minimal-app 92,538 B；
  vnode/SSR 快照逐字一致；保留静态 HTML 复用、单插值复用、v-memo 与按引用裁剪 import；
  短别名净负已回退（ADR 0014）。

## 决定

1. B01 记**部分完成**：基础路径为语义主干与默认路径；优化版保留为实验路径，
   `optimizeSignal` 默认 `false`（ADR 0012）。
2. 23 条差异入基线棘轮：只减不增，修好一条同步删一条。
3. 「修齐」与「下线」本决策不拍板；选择前必须先实测（ADR 0014）。

## 判据与回退

- `check-compiler-parity`：77/100、`expectedMismatch` 0、vnode/SSR 快照一致；
  `templateParity.divergent` 长度 = 23 且只减不增；`optimizeSignal` 默认 `false`；
  minimal-app 不因本决策变化（92,538 B，A15 棘轮）。
- 本决策只改记录；恢复「已完成」措辞须先完成 5 条原始验收并删 23 条基线。
