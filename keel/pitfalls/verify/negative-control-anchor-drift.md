---
scope: verify
status: active
severity: P1
last-verified: 2026-11-13
triggers: 2
keywords: [负控, negative-control, 锚点漂移, 注入, 假绿, anchor]
---

## 症状

负控「通过」但缺陷仍在；或注入后门禁仍绿，等于没有反证。

## 根因

1. **锚点写死旧实现**：守卫硬编码旧语句，HEAD 改名后 `includes(needle)` 恒 false，注入没发生。
2. **同源兜底只注入一处**：两段查找只改一段，另一段仍命中 ⇒ 行为不变。

## 正解

- 锚点从当前源码/产物**实测提取**；找不到必须抛「注入点漂移」，不能静默跳过。
- 一个缺陷的所有同源兜底一起注入。
- 跑 `node scripts/check-negative-controls.mjs --sync` 后跑 `--quick`；判据：注入必红、还原必绿。
- 优先**结构锚点**：按函数名定位函数体起点，或按调用形态定位实参区间。

## 实例（2026-11-13）

- `sanitizeHTML`：旧锚依赖首条 `let decoded = str;`，改名 `output` 后漂移；改为 AST 定位函数体起点注入 `return str;`。
- Teleport：旧锚依赖 `cloneIfMounted` 前整段 `patch(null, child, target, …)`；改为按调用形态替换第 3/4 实参。
