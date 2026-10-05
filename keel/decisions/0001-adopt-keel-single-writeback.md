---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [keel, 接入, 单写回, workbuddy, 冻结]
type: decision
created: 2026-10-05
superseded-by:
---

# 0001 接入 keel 并单写回：`.workbuddy` 冻结为存档

## 背景

`.workbuddy/memory` 累计 413KB（MEMORY.md 单文件 33.9KB、日 20–91KB），无预算、无检索协议；
教训靠人记"已踩 N 次"。keel 提供固定预算（单轮 ≤15,000B）+ 检索协议 + 坑库蒸馏（triggers≥3）。

## 决定

- 上下文唯一真源改为 `keel/`；`.workbuddy/` **冻结为只读存档**，不再写入；
- 迁移映射：MEMORY.md 教训 → `pitfalls/`（triggers 按"已踩次数"反推初值）；
  待拍板项 → `decisions/`；可复用操作 → `skills/`；日志 → 留在原地（不搬，不占仓）；
- keel 上游保持通用：本仓判据文件与上游逐字一致，本地临时补丁登记在 NOW 例外表。

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| 双写（keel + .workbuddy 都更新） | 两个真源，AI 会读/写两处，必然漂移 |
| 把 413KB 原样搬进 `keel/` | 违反字节预算；冷内容不进热区 |
| fork keel 为 lytjs 特化 | 通用性优先（用户明示）；缺口走反馈回植 |

## 影响

- 单轮上下文成本从 ≈54KB 降到 ≤15KB；机器可验（`load-estimate.sh`）；
- 首个外部采用方反馈已回植 keel 上游（awk 兼容 ×2、doctor 传参、CHANGELOG 判据收窄）。
