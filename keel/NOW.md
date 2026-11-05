---
scope: now
status: active
last-verified: 2026-11-06
updated: 2026-11-06
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
《开发计划 2026-11-05》：**A 阶段收官**（A01–A15 完成）。

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
- **A13** playground 函数组件修复；E2E 45/45 + playground 39/39。

## 11-06 完成
- **A15** 体积预算「基线 + ≤2%」（`bundle-baseline.json`，只降不升）；minimal-app
  89.2 KB；首屏 **69.3 KB**（原 8.5 KB 只量入口）；归因
  `evaluation/LYTJS_体积归因_2026-11-06.md`。17 条断言；注入 6 类全红。
- 门禁：fast 46/46；slow 14/14。
- **B01a** 基础 signal 修 8 缺陷（if05/07/08/09·for08·kb05·mx04·mx06）；
  对拍 74→**77**、基线 26→**23**、`expectedMismatch` 5→**0**；
  门禁扩 vnode/SSR 快照；详见 `evaluation/LYTJS_B01a修复报告_2026-11-06.md`。
- **B01b** 项 2/3/4 与 import 裁剪；短别名实测净负（+6,255 B）→ **回退**，决策 `0014`。
  A 100 模板 **58,797 B**；minimal-app **92,538 B**（回退 −179 B）。

## 下一步
1. 阶段 B：B03 AOT 入口（A15 归因已给靶心）。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发清 .tmp / safe-delete 拦 coverage | 单包复核 / reportsDirectory=/tmp |

