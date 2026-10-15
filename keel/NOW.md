---
scope: now
status: active
last-verified: 2026-10-16
updated: 2026-10-16
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档, 覆盖率, 并行会话]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **登记缺陷按 ADR 0010 二分**；棘轮只上不下。UI 由并行会话在写 ⇒
走**非 UI 包**车道。

## 本轮完成（2026-10-16 · enhanced-hydration 非 hydrateApp 路径 → 2 个真实缺陷）
`enhanced-hydration.ts`（728 行、~34%）补 18 条电池（既有测试只覆盖 `hydrateApp`）：
① `queueHydration` 首次调用**同步**启动排空 ⇒ 后续高优先级任务插不到前面（实测 low,high,medium）；
② `requestIdleCallback`/`IntersectionObserver` 在 **Safari 与 Node/jsdom 下均缺失** ⇒ 直接调用抛
`ReferenceError`；且 rIC 在 `await` 内抛 ⇒ 排空循环**静默死掉**（后续任务永不执行）。修：新增
`onIdle()` 降级；无 IO 时 `hydrateVisible` **立即水合全部**。守卫 18（修复前 2 红）。

## 本轮完成（2026-10-15 · vdom transition DOM 回退路径 → 3 个真实缺陷）
`transition.ts`（769 行、~9%）补 15 条电池：① camelCase 调 `getPropertyValue`（只认 kebab）⇒
**恒报「无过渡」**；② enter 类名与 `resolveTransitionClasses` **口径不一致**；③ `d !== '0s'`
字符串判定 ⇒ `parseDuration` 返 **NaN**。守卫 15（修复前 9 红）。

## 更早（2026-10-15 · ADR 0010 两处死代码项 + UI 电池 7 轮）
① `updateItem`：`diffLists` 未传 compareFn ⇒ 分支永不执行；修：增 `compareFn?`。
② `serializeData`：`JSON.stringify` 先调 `toJSON()` ⇒ `__type:'Date'` 失效；修：用 `this[key]`。

## 下一步
1. **非 UI 车道**继续：`devtools/performance`(429) / `signalsInspector`(421) /
   `client-server-boundary`(244)。
2. 按 ADR 0010 判定 UI 剩余登记项（Pagination / InputNumber / Upload / Dialog / TreeSelect /
   Cascader 共 28 项）—— 需与它串行。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX**） | 串行 | 显式路径 git add；**恢复用 `git checkout HEAD -- <file>`** |
