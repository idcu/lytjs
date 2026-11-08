---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S27, ui-styles, circular, ssrThrows, 体积判据, esbuild, tsconfig paths, 棘轮]
---

# NOW · main

## 当前焦点
- **S27 棘轮清零与体积判据单源**已完成（f85a327a → b13b4fd8）：
  - ui-styles 欠账 **159→78**（覆盖组件 25→6），19 个组件逐组件提交 + 负控；
    余 6 个（DatePicker/Cascader/Upload/TimePicker/ColorPicker/Calendar）
    样式区块近乎空白，属整块设计缺失，未动。
  - circular **8→3**（3750dfc9）：下沉 parser-shared.ts；余 2 条 optimizations
    属 B01d 整包合一，1 条 parser-children⇄parser-element 真递归。
  - ssrThrows **5→0**（35f68e1c）：SSR 对 kebab 组件名发 `_ctx.my-comp`
    （被当减法），改方括号取值；signal 快照 115×2、parity 115/115 保持。
  - 体积判据单源（c19f105a）：CI size-check → check-bundle-size，删
    .size-limit.json 与依赖，预算数字未动。真实回归来自 S26 paths 指 src
    泄漏进 esbuild（闭包 29 dist→160 src，minimal-app +4.5KB）；门禁显式
    按消费者口径解析 dist，并新增「无 src 泄漏」断言（负控 6 红→绿）。
- 覆盖率快照纳入 parser-shared：686e088f（445 文件 / 97.98%）。
- 脚手架门禁补根 vite 依赖：b13b4fd8（此前根 node_modules 无 vite，SSR tsc 红）。
- B01d 仍延后。

## 下一步
1. 6 个空样式组件补设计（DatePicker/TimePicker/ColorPicker/Cascader/Upload/Calendar）。
2. 8.0.0 窗口删 createVaporRenderer / VaporRenderer；compiler 余量断言行为化。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
