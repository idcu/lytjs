---
scope: compiler
status: active
severity: P1
last-verified: 2026-11-06
triggers: 1
keywords: [静态模板复用, 文本槽位, claimTextSlots, v-if 分支, 插入锚点]
---

## 症状

静态 HTML 复用（一次 `createTemplate`、多次 `innerHTML` 复刻）的产品里：同一元素多个
`{{x}}` 只剩最后一个值；`v-if` 分支子树的插值整段消失；分支渲染在父容器末尾而非原位。

## 根因

元素只有一个「文本位置」，对同一元素多次 `setText` 是覆盖；分支子树序列化时若跨过
`INTERPOLATION`，就没有节点承接动态值。位置错乱因分支复用父容器变量作插入目标，
`insert(el, parent)` 缺锚点即等于追加。

## 正解

- 每个插值留 `TEXT_SLOT_COMMENT`，运行期 `claimTextSlots(el)` 认领成独立文本节点，
  按索引 `setText(slots[i], ...)`，互不覆盖。
- 分支子树走同一套槽位，不要「只序列化静态部分」；组件分支序列化成 `data-lyt-comp`
  占位元素再 `mountComponent`。
- 分支插入用其后第一个静态兄弟作锚点（`serializeStaticHTML` 记录 `staticVars`），
  `insert(el, parent, anchor)`；无锚点才退回追加。
