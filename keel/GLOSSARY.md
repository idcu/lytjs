---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [术语, 词汇表, 命名]
---

# GLOSSARY

> 术语的**唯一真源**：同一概念只允许一种写法，其他写法都是 bug。

| 术语 | 唯一写法 | 易错写法 / 说明 |
|---|---|---|
| 可调用对象 | `signal()`：`sig()` / `.set()` / `.update()` | 不是 `.value`；见坑 `signal-callable-contract` |
| 转发链 | 逐层显式转发 | 中间层"Pick + 透传"会静默丢弃新字段 |
| 门禁分档 | 快档 / 慢档 | `gate.mjs --tier fast` 或 `slow` |
| 棘轮 | ratchet（只拦新增，基线允存量） | 基线：`circular-baseline.txt` 等 |
| 反向验证 | 注入缺陷 → 确认判据变红 → 恢复 | 不是"再跑一遍看绿" |
| 自证式假绿 | 判据用了生产不会产生的输入 | 最隐蔽的假绿 |
| 真跑 | compile → `new Function` → mount → 断言真实 DOM | `--dry` / `--list` 不算 |
| 单写回 | 上下文只写 `keel/NOW.md` | `.workbuddy/` 已冻结为存档 |
| 坑库 / 蒸馏 | `keel/pitfalls/`；triggers ≥ 3 待蒸馏 | 蒸馏后置 `status: distilled` |
| 冷热区 | 热区参与检索；冷区 = `archive/` `NOW-history/` | 冷区只做死链检查 |
| KNOWN_FAIL | `it.fails` 钉住的已知缺陷 | 修好后它会报 "Expect test to fail" |
