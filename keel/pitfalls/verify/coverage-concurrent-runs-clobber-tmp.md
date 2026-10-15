---
scope: verify
status: active
severity: P1
last-verified: 2026-10-15
triggers: 1
keywords: [coverage, 并发, tmp, ENOENT, 覆盖率飘, 并行跑]
---

# 坑：coverage 并发跑互清 .tmp —— 数字作废甚至 ENOENT

## 症状
同一工作区两进程同时 `pnpm test:coverage`：
- 轻则覆盖率**无故下降**（实测 64.45→63.81，-0.64pp ≈ 364 语句凭空消失），
  用例全绿、无报错；
- 重则合并期 `ENOENT: coverage/.tmp/coverage-N.json` 直接崩；
- 负载争抢还会让无关用例假失败（Tabs 电池 2 例并发挂、单跑全绿）。

## 根因
vitest v8 覆盖率把各 worker 中间结果写进**共享目录** `coverage/.tmp/coverage-N.json`，
跑完合并后清空。并发跑共用同一 `.tmp`：A 的清理删掉 B 未合并的文件
⇒ 静默丢失（数字偏低）或 ENOENT。

## 正解
1. 覆盖率**串行独占**：跑前 `ps aux | grep vitest` 确认零进程；并发跑出的数字一律作废重测。
2. 判定依据：单跑绿 + 全量挂、或覆盖率反向异常波动 ⇒ 先查并发，再怀疑测试本身。
3. CI 单 job 单跑天然免疫；本地多 agent 并行是主要风险面。
