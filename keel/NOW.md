---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S07 完成（core-vnode 去复制），下一步 S08 事件修饰符单一表。

## 11-07 完成
- **S01** `check-deps`+`check-src-hygiene` 入 gate；`check:fast` 与 CI 改委托 `gate.mjs`。
- **S02** `check-deps` 补 24 包层级、删 7 个幽灵包名；未登记包/依赖改为**直接红**；
  实测覆盖 **76/76**，fast **50/50 · 138.1s**；负控（dom→core 反向、ui 缺层、ui→vdom 缺 allowlist）均退出 1。
- **S06** 富实现下沉 `@lytjs/component`，`core`/`core-vnode` 只转发；契约按 core
  （`onError(error, ErrorInfo)`），保留 `capturePromiseRejections`；函数同一性 + 行为 27 例绿。
- **S07** `h/directives/composition/lifecycle` 权威收敛到 `@lytjs/core-vnode`，`core` 只转发；
  新增 7 例函数身份/行为对拍；两测试改用 `importActual` 展开 mock；fast **50/50 · 126.1s**。
- ⚠️ 发现（非 S06 引入）：`pnpm build` 因 `sideEffects:false` 丢弃 `builtin-components`
  副作用，component dist 缺内置组件注册；根配置测试绿，core 包级 dist 测试 5 红，待批次0 处理。
- **待决项 C3**：`@lytjs/ui` 真实依赖 `reactivity/vdom/component/core`，与
  `keel/ARCHITECTURE.md:26`「上层只依赖 core 与 component」冲突；S02 只登记 allowlist 并留痕，
  未改架构文档，待 owner 裁定「修订允许矩阵」或「收紧依赖」。

## 11-06 完成
- A15 体积预算；B01a signal 对拍 77/100；B01b 别名回退；B01 单一权威未达成（`0015` 草稿）。
- B04 契约红 15→0；B05 i18n 29→0、a11y 19/0/1、keyboard 11/0/9、Playwright 9/9。
- 门禁：fast 46/48（dist 重建、覆盖率快照待重生成）；slow 见 gate-logs。

## 下一步
1. **S08** 事件修饰符单一表 → **S09** ADR 0017 公开名登记册。
2. 批次2 **S10** 属性安全 → **S11** style 单位 → **S12** hydration/list-diff 收敛。
3. 批次0 余项 **S03/S04/S05**（re-export 检查、CI/文档同步、负控框架）。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
