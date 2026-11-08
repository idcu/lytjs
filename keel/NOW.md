---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [C1, C2, C3, vdom, reactivity, core-runtime, L0例外, B01d]
---

# NOW · main

## 当前焦点
- **C1 已完成（45dd43d0）**：`@lytjs/ui` vdom 清零改指 `@lytjs/core/runtime`。
- **C2 已完成（72001721）**：UI reactivity 清零（38 src + 6 测试/require）；依赖面剩 `common-* / component / core`。
- **C3 已完成（ADR 0026）**：文档例外收口。`common-a11y` 立为 UI-only 语义型 L0 叶子例外；`common-is` / `common-string` 立为通用 L0 纯函数叶子；ARCHITECTURE 改为 UI-only 窄例外；0021 已裁并订正实测数字（27/8/19，a11y 14）。
  - 负控：注入 `@lytjs/ui → @lytjs/dom` → check-deps 红（L6→L1 跨层）；撤销后 76/76 绿。
- **C1/C2 实测**：fast 56/56；api-snapshot 39/1961；bundle 六入口与 C1 一致（1697/9471/95367/93230/75015/38171）。
- **B01d 延后**：重开条件与旧台账见 `NOW-history/2026-11-08-S23-S30台账与C3.md`。

## 下一步
1. 无已授权批次待执行；B01d 保持延后，0023 死包删除等 8.0.0 窗口。
2. 复审条件见 ADR 0026（a11y 出现第二消费方 / is·string 失去 L0 叶子属性 / UI 迁独立仓）。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
