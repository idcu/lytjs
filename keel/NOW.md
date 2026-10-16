---
scope: now
status: active
last-verified: 2026-10-17
updated: 2026-10-17
keywords: [评估, 门禁, 安全收敛, 硬约束9, keel监管, type-check, a11y, 覆盖率, 并行会话, 空渲染, 双包危险, 平行实现, 同一性守卫]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 本轮完成（2026-10-17 · 立规 0011 + `defineAsyncComponent` 三份收敛为一份）
原有 **3 份平行实现**（component 442 / core 205 / core-vnode 194 行），「修复只落一份」实测两次
（`delay` 只落 component；`showLoading` 未同步 ⇒ core-vnode 是 core 的**陈旧 fork**）。
按 **ADR 0011** 收敛：`@lytjs/component` 为唯一权威实现，core / core-vnode 只**转发**（含类型）；
core 独有能力（retry 契约 / loader 校验 / 同步抛出转 rejection）**下沉**；顺带修 core **漏转**
preload 系列。守卫 8 条（前 **5 红**），含 2 条**函数同一性** ⇒ 副本重现即变红。全量 6583 绿；净删 91 行。

## 本轮完成（2026-10-16 · 空渲染崩溃 + core loading 失效 + 一次误判订正）
① vdom：`render()` 返回 null/undefined 时 `update()` 读 `subTree.el` ⇒ **应用挂载失败**。
② core：`showLoading` 非响应式 ⇒ loading 永不出现。
**订正**：同日登记的「框架层缺陷：setup 未设当前实例」**有误**，真因是 **src/dist 双包危险**
（新坑 `verify/module-identity-src-vs-dist`）。

## 更早（10-16 / 10-15）
async `delay` 与 `clearPreloadCache()`；hydration 优先级与 rIC/IO 降级；transition 三处。

## 下一步
1. **非 UI 车道**继续：`devtools/performance`(429) / `signalsInspector`(421)。
2. 按 ADR 0010 判定 UI 剩余登记项（28 项）—— 需与它串行。
3. 新登记：`suspensible` 装饰性选项（从未读取）。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX**） | 串行 | 显式路径 git add；**恢复用 `git checkout HEAD -- <file>`** |
