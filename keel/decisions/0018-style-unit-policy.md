---
scope: api
status: active
last-verified: 2026-11-07
keywords: [style, 单位, px, 三模式一致, 破坏性变更, ADR 0011]
type: decision
created: 2026-11-07
superseded-by:
---

# 0018 style 数值策略：统一不自动补 px

## 背景

同一条 `:style="{ width: 10 }"` 在三种模式下曾产生不同结果：

| 模式 | 写入路径 | 旧行为 |
|---|---|---|
| vnode | `common-dom.patchStyle` | `setProperty('width', '10')`，**不补 px** |
| signal | `dom-runtime.setStyle` | 命中 `NUMERIC_STYLE_PROPERTIES` ⇒ `width: '10px'` |
| SSR | `renderer.renderAttributeToString` | `String(val)`，**不补 px** |

signal 是唯一补 px 的路径（FIX P2-45），且列表把 `line-height` 也补成 `px`
（本身即非法 CSS）。三模式对同一模板输出不同 DOM，水合与 SSR 对拍无法收敛。

## 决定

1. **统一不自动补 px**。数值按 `String(value)` 原样序列化，长度类属性由调用方显式
   带单位（`{ width: '10px' }`）。
2. **序列化唯一真源**：`@lytjs/common-string` 的 `normalizeStyleValue` /
   `buildStyleString`。vnode（`common-dom.patchStyle`）、signal（`dom-runtime`
   的 `normalizeStyle` / `setStyle`）、SSR（`renderer` 的 `renderAttributeToString`）
   都必须复用，不得各自拼装（ADR 0011）。
3. 从 `dom-runtime` 删除本地 `NUMERIC_STYLE_PROPERTIES`、`isNumericStyleProperty`
   与本地 `camelToKebab`；`dom-runtime` 新增 `@lytjs/common-string` 依赖。

## 破坏性变更（MINOR 内需标注）

- **受影响入口**：`@lytjs/dom-runtime` 的 `setStyle` / `normalizeStyle`（含经
  `@lytjs/core` `runtime-helpers` 再导出、signal codegen 生成的 `:style` 运行时调用）。
- **破坏点**：依赖自动补 px 的写法（`setStyle(el, { width: 100 })`、模板
  `:style="{ width: 10 }"`）在 signal 模式下不再得到 `100px`，浏览器会丢弃该声明。
- **迁移**：数值形式的长度/间距类属性改为显式单位，如 `{ width: '100px' }`；
  无单位合法的属性（`font-weight: 700`、`opacity: 0.5`、`z-index: 1`）可直接用数值。
- vnode / SSR 路径**行为不变**（它们本来就不补 px），只有 signal 路径改变。

## 为什么选「不补」而非「统一补」

- vnode 与 SSR 已是既有主流路径，统一补会把大量无单位合法属性（`font-weight`、
  `opacity`、`flex`、`z-index`）破坏成 `700px` 之类的非法值，破坏面更大；
- 「不补」只需 signal 收敛，且把单位选择权交给使用者，与 CSS 原生语义一致。

## 验证

- `dom-runtime` 单测：`{ width: 100 }` → `width:100`、`{ lineHeight: 2 }` → `line-height:2`；
- `scripts/check-render-parity.mjs`：新增 style 三模式对拍（数值不补 px、显式 `10px`
  原样保留），**10/10 通过**；
- 负控（人工）：在 `common-string` 构建产物里注入 `number ⇒ +'px'`，门禁 **8/10**、
  退出 1；恢复后 10/10；
- `gate --tier fast`：**52/52 通过**（沿用 S10 的 `check-render-parity`，未新增项）。
