---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S01 完成（gate 单一真源），下一步 S02。

## 11-07 完成
- **S01** `check-deps`+`check-src-hygiene` 入 gate；`check:fast` 与 CI 改委托 `gate.mjs`。
- 实测 fast **48→50 项，50/50 · 132.5s**；`check-deps` 24/76 覆盖缺口仍待 S02。

## 11-06 完成
- **A15** 体积预算「基线+≤2%」；最小应用 89.2 KB / 首屏 **69.3 KB**。
- **B01a** signal 修 8 缺陷；对拍 77/100、基线 23、`expectedMismatch` 0。
- **B01b** 短别名净负回退（决策 `0014`）；A 产物 **58,797 B**。
- **B01 改记部分完成**：单一权威未达成；23 条入棘轮（决策 `0015` 草稿）。
- **B04 收敛** 红 15→**0**；8 组件逐提交；样式门禁收紧（31 组件/199 类，
  Golden 6 清零，experimental 160 条入棘轮）。
- **B05 i18n** 20 key × zh-CN/en-US；运行时 `setUiLocale`；缺键回退 zh-CN 再抛错；
  Golden 硬编码 29 处（去重 27）→ **0**；`check-ui-i18n` fast。
- **B05 a11y** 契约扩到七类 140 格：初始 a11y 18/1/1（Avatar 红）→ **19/0/1**；
  判据覆盖 role/aria-modal/aria-expanded/aria-label/alt/焦点管理/tab 顺序。
- **B05 键盘** 判据收到元素级；InputNumber 加减 span 补 Enter/Space；keyboard 11/0/9。
- **B05 浏览器** Playwright 9/9（10.9s）：Dialog/Modal/Drawer 遮罩、ESC、焦点归还、
  Tab 首尾环绕；InputNumber/Pagination 键盘。暴露并修复弹层 `isClosing` 重开竞态。
- 门禁：fast **46/48**（2 项：dist 已重建、覆盖率快照待重生成）；slow 见 gate-logs。

## 下一步
1. **S02** 补齐 `check-deps` 的 24 个包层级覆盖、删除 7 个幽灵包名，未登记层直接红。
2. **S03** 让 `check-package-deps` 识别 `export ... from`，补 `common-constants` 声明。
3. **S04/S05** CI/文档口径同步 + 门禁负控框架；随后复跑 slow 归档日志。
4. B06 i18n 范围外组件（experimental 25 个）按需收敛。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
