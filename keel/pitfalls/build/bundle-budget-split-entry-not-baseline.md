---
scope: build
status: active
severity: P1
last-verified: 2026-11-14
triggers: 1
keywords: [预算, first-screen, 拆 entry, 基线, opt-in, 子路径, gzip]
---

## 症状

`first-screen` 红（80763 B > 78529 B）。第一反应是抬基线：每次都能绿，
但预算从此追着实测跑。

## 根因

增长是多笔累积的真增量（45 笔 +3332 B，无单笔回归）；默认关闭的 opt-in 代码
（`generateSignalOptimized`）被主入口静态 import，首屏为用不到的功能付 6.4 KB。

## 正解

1. 先逐提交归因，落到哪一笔、多少字节。
2. 预算/基线/断言全不动，只做实缩：切边、去重、拆 entry。
3. 按 ADR 0030/0033 拆：子路径 + 显式注册，未注册抛可操作错误。
4. 拆前后用 115×2 产物逐字节比对；`tsup splitting:false` 下跨入口共享的
   `Symbol()` 必须改 `Symbol.for`，否则元数据读不到、功能静默消失。
5. 实测 80763 → 74595 B（余量 3934 B），230/230 逐字节相同。
6. 判据：拆后首屏 metafile 输入集合不得含被拆模块；主入口与子入口各自 gzip
   都要报，证明是移出首屏而非删代码。
