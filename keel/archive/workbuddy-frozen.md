---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [归档, workbuddy, 冻结, 迁移]
---

# `.workbuddy/` 冻结说明（外部存档指针）

- 位置：仓库**外** `/Volumes/Data/lytjs/.workbuddy/memory/`（413KB，不随版本库走）；
- 状态：**冻结只读**（2026-10-05 起，ADR 0001）——任何会话不得再写入；
- 迁移映射：教训 → `pitfalls/`；待拍板 → `decisions/`；可复用操作 → `skills/`；
  日志留在原地（冷内容不搬迁，保留可追溯性）；
- 为什么放这里：仓储内不需要搬 413KB——热区只放结论，原始记录保留在旁路位置即可。