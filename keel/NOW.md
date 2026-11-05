---
scope: now
status: active
last-verified: 2026-11-05
updated: 2026-11-05
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
《开发计划 2026-11-05》：A08–A10 已完成，等待下一批指令。

## 11-05 完成（A01–A10 / A14）
- **A01–A03** 锁文件守卫、8720 测试全绿、ESLint 45 errors 清零；slow 14/14。
- **A05** 合并/克隆入口拒绝三段原型键；注入 2 红。
- **A04 / D1** `optimizeSignal` 默认关；基础 codegen 修四类静默丢内容 + `:key`；parity 基线只减不增；
  注入切回优化器 6 红；1669/1669。决策 `0012`。
- **A14 / D2** Golden 20：20 stable，41 个 `experimental`；`mislabeled_stable=0`；注入立红。决策 `0013`。
- **A06** CLI SSR `createApp(App)`；未知模板抛错；JSX `.tsx`；SFC `{{ title }}`；signal `set()/update()`。
  `check-scaffold` 113 条；注入去掉 `createApp()` ⇒ [7] 红。
- **A07** 循环检查器 61 → 76/76，断言覆盖数 == manifest 目录数；`--src` 0 新增，dist 0 环；
  注入 `ssg` 造环 ⇒ 退出 1。
- **A08** `reactive` 解包函数型 Signal（读写穿）；`Map.set` 新增按 ADD 触发，去重 ITERATE，
  非字符串 key 回落；`computedSignal` 设 activeEffect。`check-reactivity-semantics` 23 条；5/5/3 红。
- **A09** `v-html` 两模式逐字一致（`setHTML` 自 10-27 消毒）；`check-security-html` 24 条；摘消毒 16 红。
- **A10** setup 第二参 inject/emit/expose 真实化；`inject` 缺键 undefined（类型 `T|undefined`）；
  注册 API 生产可见；`check-core-signal-contract` 15 条；注入 8/3/2 红。
- 门禁：fast 44/44（~124s）；slow 14/14（651s）。

## 下一步
1. 等 owner 指定下一批（B 阶段）。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发清 .tmp / safe-delete 拦 coverage | 单包复核 / reportsDirectory=/tmp |
