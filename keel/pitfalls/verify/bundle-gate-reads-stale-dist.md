---
scope: verify
status: active
severity: P1
last-verified: 2026-11-14
triggers: 5
keywords: [dist, stale, 假绿, bundle, controlled-props]
---

## 症状

旧 dist 会让门禁假绿。2026-11-13 `302d68e8`：bundle 6 入口全绿（首屏 37.4 KB），
重建后 3 个超预算；controlled-props 51/51 绿，重建后 49/51。上一轮 72/76 不可信。

## 根因

门禁读 dist，dist 不入库；fast 不 build，slow 的 bundle 又排在 build 前。

## 正解

- 引用门禁结论前先跑 `check-dist-freshness`；stale 时结论作废。
- 收口前先 build 再跑门禁；归因时 checkout 旧提交 + 重建复测。
- 2026-11-13：fast 首项 freshness；stale 拒跑 needsDist（反证：touch src ⇒
  38 绿/1 红/20 跳过、退出 1）；slow 的 bundle 移到 build 后。
- 2026-11-14 统一口径：读 dist 的门禁一律 `needsDist: true`；任何含 needsDist
  的运行自动前置 freshness（slow 固定 build → build:fallback → freshness → 其余），
  单点同样先判，stale 拒跑 exit 1。此前未标记项的绿不可与新结果横比。
