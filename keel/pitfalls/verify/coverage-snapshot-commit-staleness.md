---
scope: verify
status: active
severity: P2
last-verified: 2026-11-12
triggers: 1
keywords: [覆盖率, coverage, snapshot, 快照, 过期, commit 年龄]
---

## 症状

`scripts/coverage-snapshot.json` 里的 commit 落后 HEAD 几十个提交，`check-coverage-snapshot`
仍绿（本轮：快照停在 `2026-11-08` 的 `c19f105a`，落后 45 个提交）。

## 根因

门禁只比较「src 文件集合」与「有覆盖率数据的文件比例」，**不校验 commit 年龄或距离**；
快照又是手动生成、没有 CI 自动刷新 ⇒ 只要文件集合没变，快照可以无限期陈旧而门禁恒绿。

## 正解

- 收口/发版前手动刷新：`pnpm run test:coverage -- --maxWorkers=2` 后跑
  `node scripts/coverage-snapshot.mjs`，再跑 `check-coverage-snapshot`。
- 刷新前先记录旧快照的 commit 与落后提交数，写进提交说明/台账（本轮 45 个）。
- 把「门禁绿」与「快照新鲜」分开判断；不要把覆盖率门禁的绿色当作数据时效证据。
