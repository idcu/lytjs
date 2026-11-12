---
scope: verify
status: active
severity: P1
last-verified: 2026-11-12
triggers: 1
keywords: [bundle, 体积门禁, dist, 归因, 首屏, stale]
---

## 症状

改完源码后跑 `check-bundle-size` 数字纹丝不动；或门禁数字与审计/当前 HEAD 对不上
（本轮实测 38245 B 实际对应 `4197fd10` 的旧 dist，而当时工作区源码已是 38346 B）。

## 根因

`check-bundle-size` 打包的是各包的 **dist**，而 dist 是本地构建产物、不入库。
源码提交后若没有重建受影响包，门禁测到的仍是旧代码——数字既不能证明修复有效，
也不能作为预算裁决的依据。

## 正解

- 跑门禁前先重建受影响包：`pnpm --filter @lytjs/<pkg> build`，再跑 `check-bundle-size`。
- 做归因时用 `git checkout <commit> -- <src路径>` + 重建复测校准：例如退回 `4197fd10`
  应复现 38245 B；对不上就说明 dist 或口径有漂移，先修测量再谈裁决。
- 不要把旧 dist 的数字直接写进 ADR/台账；ADR 里注明「隔离重建相关包后实测」。
