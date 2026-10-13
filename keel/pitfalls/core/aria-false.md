---
scope: core
status: active
severity: P1
last-verified: 2026-10-13
triggers: 1
keywords: [aria, false, 布尔属性, removeAttribute, a11y, patchAttr, 语义丢失]
---

## 症状

`aria-*` 传布尔 `false` 时属性被**整个移除**，而不是渲染成 `"false"`。实测（2026-10-13）：
`Select` 关闭态 `trigger.getAttribute('aria-expanded')` 返回 `null` —— 而 WAI-ARIA 要求
组合框的 `aria-expanded` **必须存在**且为 `true`/`false`，缺失 ≠ false（读屏读不到「已折叠」）。

## 根因

`common-dom` 的 `patchAttr` 把 `false` 与 `null` 同等对待：
`if (value == null || value === false) el.removeAttribute(key)`。
这对 HTML **布尔属性**（`disabled`/`checked`）正确，但 `aria-*` 是**字符串属性** ——
`false` 与「不设置」语义不同（`aria-hidden="false"` = 显式不隐藏；缺省 = 继承祖先）。

## 正解

- `aria-*` 的 `false` ⇒ `setAttribute(key, 'false')`；只有 `null`/`undefined` 才移除
  （Vue 运行时同此）。已修 `common-dom` + 3 条守卫测试（注入旧行为 ⇒ 2 条变红）。
- 判据：改属性写入逻辑后必跑 `common-dom` 的 `tests/index.test.ts`。
