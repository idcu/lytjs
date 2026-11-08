---
scope: verify
status: active
severity: P2
last-verified: 2026-11-09
triggers: 1
keywords: [dist, mtime, freshness, 假红, 临时破坏]
---

## 症状

做红→绿负控时临时改 `src` 再还原，`check-dist-freshness` 仍报红：dist 时间戳早于源码。

## 根因

该门禁按 mtime 比对 src/dist；编辑（即便内容已还原）会刷新 src 的 mtime。

## 正解

每次临时破坏并还原后，跑 `pnpm --filter @lytjs/compiler run build` 重建 dist 再跑门禁；
不要用 `touch` 伪造时间，那会掩盖真正的产物过期。
