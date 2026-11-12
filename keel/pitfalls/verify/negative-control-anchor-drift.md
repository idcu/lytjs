---
scope: verify
status: active
severity: P1
last-verified: 2026-11-12
triggers: 1
keywords: [负控, negative-control, 锚点漂移, 注入, 假绿, anchor]
---

## 症状

负控脚本「通过」，但手动复现缺陷仍然存在；或注入后门禁照样绿，等于没有反证。

## 根因

两类必然失效：

1. **锚点写死旧实现**：守卫里硬编码 `const handler = props ?? attrs`，而 HEAD 已改成
   `let handler` ⇒ `includes(needle)` 恒为 false，注入根本没发生。
2. **同源兜底只注入一处**：同一语义有两段查找（props 直查 + kebab 回查 attrs），
   只改第一段时第二段仍能命中原 handler ⇒ 注入后行为不变，门禁保持绿色。

## 正解

- 锚点从当前源码/产物**实测提取**，找不到时必须抛「注入点漂移」而不是静默跳过。
- 一个缺陷的所有同源兜底一起注入（本轮两处 `?? instance.attrs[...]` 都要去掉）。
- 改完登记表跑 `node scripts/check-negative-controls.mjs --sync`，再跑 `--quick` 全量；
  反证判据只有一个：注入后门禁必须转红，还原后必须回绿。
