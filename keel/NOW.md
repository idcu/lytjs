---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S29, 死代码, _instance, 死注册, 双名导出, deprecated]
---

# NOW · main

## 当前焦点
- **S29 死代码与注释矛盾清理**已完成：d51eea43 / ba75eaa4 / aff7cec1 / 2432dd70。
  - `ctx._instance`：core 与 core-vnode 双包字段/赋值/断言全删，全仓零读取点。
  - renderList 非整数注释按实现订正（1.5 ⇒ 2 项、2.5 ⇒ 3 项）。
  - `builtInDirectiveTransforms` 未接入 compile 管线，删除并同步两处测试传参。
  - `createVaporRenderer` / `VaporRenderer` 在 API 快照内 ⇒ 保留并标 deprecated，8.0.0 移除。
- **实测**：fast 56/56；core+core-vnode 917、vdom 573、compiler 1654、renderer 652；
  API 39/1961；signal 115×2、parity 115/115 未动；dist 已重建。
- **基线噪声**：单包 `--filter` 跑 core 时 `@lytjs/core-vnode` 未 alias 到 src，身份对拍假红；
  根配置全绿。见 [pkg-alias](pitfalls/verify/pkg-config-alias-blindspot.md)。
- B01d 仍延后。

## 下一步
1. 8.0.0 窗口删除 `createVaporRenderer` / `VaporRenderer` 双名导出。
2. compiler 余量代码/产物字符串断言分批行为化。
3. 0023 死包删除等 8.0.0 窗口。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
