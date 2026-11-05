---
scope: now
status: active
last-verified: 2026-11-05
updated: 2026-11-05
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
《开发计划 2026-11-05》：A01–A14 已完成（A15 待 owner 决策）。

## 11-05 完成
- **A01–A03** 锁文件守卫、8720 测试全绿、ESLint 45 errors 清零；slow 14/14。
- **A05** 合并/克隆入口拒绝三段原型键；注入 2 红。
- **A04 / D1** `optimizeSignal` 默认关；基础 codegen 修四类静默丢内容 + `:key`；
  注入切回优化器 6 红；决策 `0012`。
- **A14 / D2** Golden 20：`mislabeled_stable=0`；决策 `0013`。
- **A06** CLI SSR / 未知模板抛错 / JSX `.tsx` / SFC 插值；`check-scaffold` 113 条。
- **A07** 循环检查 76/76；注入造环退出 1。
- **A08** `reactive` 解包函数型 Signal、`Map.set` ADD、`computedSignal` activeEffect；
  23 条；注入 5/5/3 红。
- **A09** `v-html` 两模式逐字一致；`check-security-html` 24 条；摘消毒 16 红。
- **A10** setup 第二参真实化、`inject` 缺键 undefined、注册 API 生产可见；15 条；8/3/2 红。
- **A11** CI `install` job + 7 个 job `needs`；覆盖率快照
  `check-coverage-snapshot`（434 文件 / 425 已插桩 97.93%）；注入 1/1/1 红。
- **A12** `check-release-parity`（declared=true / parity=false）；changeset 覆盖 76/76；
  注入 2/1/2 红。
- **A13** playground 修复函数组件不渲染；E2E chromium 45/45 + playground 39/39。
- 门禁：fast 46/46；slow 14/14。

## 下一步
1. A15 体积压缩：等 owner 确认是否现在做。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发清 .tmp / safe-delete 拦 coverage | 单包复核 / reportsDirectory=/tmp |
