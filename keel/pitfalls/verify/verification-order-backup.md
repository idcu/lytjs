---
scope: verify
status: active
severity: P2
last-verified: 2026-10-05
triggers: 2
keywords: [反向验证, 备份, cp, 注入, 恢复, 顺序]
---

## 症状

反向验证的 `cp` 备份可能拍在**注入之后**的版本上（命令重试所致），恢复时把注入版当基线。

## 根因

顺序纪律缺失：备份、注入、恢复、核对四步没有机械检查。

## 正解

- 注入前 `cp` 到 `/tmp`（**禁 `git checkout`**）；
- 备份后 `grep` 核对备份内容确实是注入前版本；恢复后**再 grep 核对源码**；
- 已并入 CONSTITUTION 硬约束 8。
