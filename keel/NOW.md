---
scope: now
status: active
last-verified: 2026-11-06
updated: 2026-11-06
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
《开发计划 2026-11-05》：A 阶段收官（A01–A15）。

## 11-05 完成
- **A01–A03** 锁文件守卫、8720 测试全绿、ESLint 45 errors 清零；slow 14/14。
- **A05** 合并/克隆入口拒绝原型键；注入 2 红。
- **A04 / D1** `optimizeSignal` 默认关；基础 codegen 修四类静默丢内容 + `:key`；决策 `0012`。
- **A14 / D2** Golden 20：`mislabeled_stable=0`；决策 `0013`。
- **A06** CLI SSR / 未知模板抛错 / JSX / SFC；`check-scaffold` 113 条。
- **A07** 循环检查 76/76；注入造环退出 1。
- **A08** 修 3 类响应式缺陷（Signal 解包 / Map ADD / computedEffect）；23 条；注入 5/5/3 红。
- **A09** `v-html` 两模式一致；`check-security-html` 24 条；摘消毒 16 红。
- **A10** setup 第二参 / inject 缺键 / 注册 API 生产可见；15 条；8/3/2 红。
- **A11** CI install job + 7 needs；覆盖率快照 434/425（97.93%）；注入 1/1/1 红。
- **A12** `check-release-parity`（declared/parity 分离）；changeset 76/76；注入 2/1/2 红。
- **A13** playground 函数组件修复；E2E 45/45 + playground 39/39。

## 11-06 完成
- **A15** 体积预算「基线+≤2%」（只降不升）；minimal-app 89.2 KB；首屏 **69.3 KB**；
  归因 `evaluation/LYTJS_体积归因_2026-11-06.md`；17 断言，注入 6 类全红。
- 门禁：fast 46/46；slow 14/14。
- **B01a** 基础 signal 修 8 缺陷；对拍 **77/100**、基线 **23**、`expectedMismatch` **0**；
  vnode/SSR 快照一致；详见 `evaluation/LYTJS_B01a修复报告_2026-11-06.md`。
- **B01b** 留项 2/3/4 + import 裁剪；短别名净负 → 回退（决策 `0014`）；
  A 产物 **58,797 B**，minimal-app **92,538 B**。
- **B01 改记部分完成**：单一权威实现未达成；优化版留实验路径、23 条差异入棘轮（决策 `0015` 草稿）。
- **B04 前置** 契约矩阵 + `check-ui-contracts`（120 格：初始红 15、N/A 31 均登记原因）；
  首批 Tag/Link/Spin/Switch 逐组件提交，6 类全绿。

## 下一步
1. B04 余 11 红：Avatar/Button/Dialog/Drawer/InputNumber/Modal/Pagination/Progress 逐组件清。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory=/tmp |

