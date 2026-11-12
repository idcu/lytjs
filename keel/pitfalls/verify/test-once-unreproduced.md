---
scope: verify
status: active
severity: P2
last-verified: 2026-11-13
triggers: 2
keywords: [test, 偶发, 未复现, 原始输出]
---

## 症状

`pnpm test` 曾失败一次且未留原始输出，复跑全绿，一度被记为「环境抖动」。

## 证据（2026-11-13 CST）

- 命令 `pnpm test`：01:35:35 门禁跑 423 文件/8833 例全绿（/tmp/lytjs-test-item1.log）；
  01:37:22、01:38:35 两次复跑同样全绿（/tmp/lytjs-test-item3-run{2,3}.log）。
- 本轮 3 次均未复现；原始失败输出缺失，无法定位。

## 根因

未知。失败时未落盘 stdout/stderr，只留「失败过一次」的口头记录。

## 正解

- 不接受「环境抖动」结论：未复现 ≠ 已排除。
- 再出现必须先落盘原始输出（`pnpm test > /tmp/x.log 2>&1`），记录命令、时间、失败用例全名与断言差异。
- 不能复现也要在报告写明「未复现」及上述证据，不得静默。
