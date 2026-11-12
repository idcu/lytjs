---
scope: verify
status: active
severity: P1
last-verified: 2026-11-13
triggers: 4
keywords: [dist, stale, 假绿, bundle, controlled-props]
---

## 症状

旧 dist 会让门禁假绿。2026-11-13 `302d68e8`：bundle 6 入口全绿（首屏
37.4 KB），重建后 3 个超预算；controlled-props 51/51 绿，重建后 49/51
（TreeSelect 已改 modelValue）。上一轮 72/76 中这两项不可信。

## 根因

门禁读 dist，dist 不入库；fast 不 build，slow 的 bundle 又排在 build
前。源码改动未重建即测旧产物。

## 正解

- 引用任何门禁结论前先跑 `check-dist-freshness`；stale 时结论作废。
- 收口前先 build，再跑门禁；归因时 checkout 旧提交 + 重建复测。
- 已实施（2026-11-13）：fast 入口首项 `check-dist-freshness`，stale 即拒跑
  needsDist 项（反证：touch src 后 fast 38 绿/1 红/20 跳过、退出 1；正常路径
  121.0→121.2s）；slow 的 bundle 已移到 build/build:fallback 之后。
