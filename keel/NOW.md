---
scope: now
status: active
last-verified: 2026-10-15
updated: 2026-10-15
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档, 覆盖率, 并行会话]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **登记缺陷按 ADR 0010 二分**；棘轮只上不下。
UI 目录由并行会话在写 ⇒ 走**非 UI 包**车道。

## 本轮完成（2026-10-15 · vdom transition DOM 回退路径 → 3 个真实缺陷）
`transition.ts`（769 行、~9%）补 15 条电池，挖出并修：① `getStylePropAsArray` 用 camelCase 调
`getPropertyValue`（只认 kebab）⇒ **恒报「无过渡」**；② `hasCSSTransition` 的 enter 用 `${name}-from`、
与 `resolveTransitionClasses` 的 `${name}-enter-from` **口径不一致**；③ `d !== '0s'` 字符串判定
⇒ `'auto'` 被当成"有"、`parseDuration` 返 **NaN** ⇒ duration=NaN（下游 `setTimeout(fn,NaN)` 立即触发）。
守卫 15（修复前 9 红）；vdom 435/435；tsc ✅；dist 已重建。

## 本轮完成（2026-10-15 · ADR 0010 两处死代码项 → 均判为缺陷并修复）
① `updateItem`：`diffLists` 未传 compareFn ⇒ `diff.updated` 恒空 ⇒ 分支永不执行。修：
`VaporListOptions` 增 `compareFn?` 并转发。② `serializeData` 的 Date 分支：`JSON.stringify` 先调 `toJSON()` ⇒ replacer 收 ISO 串 ⇒
`__type:'Date'` 失效。修：改用 `this[key]`。守卫 3 + 6。

## 更早（2026-10-15 · UI 电池 7 轮 → 14 个缺陷/怪癖）
Cascader/Tabs/TreeSelect/Dialog/Upload/InputNumber/Pagination 共 207 用例；ADR 0010 首项 Tabs 已修。

## 下一步
1. **非 UI 车道**继续：`devtools/performance`(429) / `signalsInspector`(421) /
   `renderer/enhanced-hydration`(246) / `compiler/client-server-boundary`(244)。
2. 按 ADR 0010 判定 UI 剩余登记项（Pagination / InputNumber / Upload / Dialog / TreeSelect /
   Cascader 共 28 项）—— 需与并行会话串行。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑（已入坑库） | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX，覆盖他人改动**） | 串行；或它写前先重读 | 显式路径 git add；**恢复用 `git checkout HEAD -- <file>`** |
