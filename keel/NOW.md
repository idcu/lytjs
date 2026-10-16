---
scope: now
status: active
last-verified: 2026-10-16
updated: 2026-10-16
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档, 覆盖率, 并行会话, 空渲染, 双包危险]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **登记缺陷按 ADR 0010 二分**；棘轮只上不下。UI 由并行会话在写 ⇒
走**非 UI 包**车道。

## 本轮完成（2026-10-16 · 空渲染崩溃 + core loading 失效）
① **vdom 空渲染崩溃（P1）**：`render(): VNode | null` 是声明签名，而 `update()` 无条件读
`subTree.el` ⇒ `TypeError` ⇒ **应用挂载失败**（最小复现 `{ render: () => null }`；触发者 = core 异步
组件未配 `loadingComponent` 的首帧）。修：加空渲染分支（变「空」须**主动卸载**；钩子照常触发）。
② **core `loadingComponent` 完全失效**：`showLoading` 是普通变量却被 `render()` 读 ⇒ 不重渲染 ⇒
loading 永不出现；修：改 `ref`。
守卫：vdom 5 + core e2e 7；全量 6575 用例绿。
**订正**：上轮登记的「框架层缺陷：setup 未设当前实例」**有误** —— 真因是 **src/dist 双包危险**
（alias 指 dist、被测组件走 src ⇒ `getCurrentInstance` 各持一份），全 dist 正常。新坑
`verify/module-identity-src-vs-dist`。

## 更早（10-16 async 2 修 · hydration 2 · 10-15 transition 3）
`delay` 只当 `=== 0` 开关用 ⇒ loading 立刻闪出；`clearPreloadCache()` 无参清不掉；
`queueHydration` 同步排空 ⇒ 优先级失效；rIC/IO 缺失即抛；transition 三处（camelCase 取样式 /
enter 类名口径 / `'0s'` 字符串判定）。

## 下一步
1. **非 UI 车道**继续：`devtools/performance`(429) / `signalsInspector`(421)。
2. 按 ADR 0010 判定 UI 剩余登记项（28 项）—— 需与它串行。
3. **`defineAsyncComponent` 有两份平行实现**（core 205 行 / component 442 行），缺陷各修一半 ⇒
   需决策是否合一；`@lytjs/core` 还**漏转** preload 系列（主入口拿不到）。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX**） | 串行 | 显式路径 git add；**恢复用 `git checkout HEAD -- <file>`** |
