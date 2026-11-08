---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S24, 模块级状态, 隔离, transition前缀, useRouter, activePinia]
---

# NOW · main

## 当前焦点
- **S24 模块级可变状态隔离**：dfb6e639 / 904e54b6 / fd62af18。三类真实跨 app 泄漏，各配双 app 负控（修复前红→修复后绿）。
  - transition 前缀 → 组件优先读 `app.config.transitionPrefix`（`fix(component)`）。
  - router → `useRouter` 先 inject 当前 app 的 `__lytjs_router__`（`fix(core)`）。
  - store → `useStore` 先 inject 当前 app 的 `__lytjs_pinia__`（`fix(core)`）。
- **实测**：fast 56/56；core+component 1276/1276；router+store 215/215；API 39/1961 不变；signal 115×2、parity 115/115 未动。
- **已确认非缺陷**（设计上的进程级单例）：scheduler、warn/dev-mode、SSR `_isSSR`、i18n `state.locale`、DOM 事件委托/批处理、compiler cache、DI 全局根、vdom DOMOps 注册表。
- **S25 测试解耦**已完成，见 NOW-history；B01d 仍延后。
- 新坑：[state](pitfalls/core/state-leak.md)。

## 下一步
1. 清理 S25 两个待决（动态属性名字面量、`_instance` 无读取点）。
2. compiler 余量 476 处 code/preamble 断言分批行为化。
3. 0023 死包删除等 8.0.0 窗口。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
