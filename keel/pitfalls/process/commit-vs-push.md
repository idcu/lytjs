---
scope: process
status: active
severity: P2
last-verified: 2026-11-14
triggers: 1
keywords: [push, 推送, git, 已push, ahead, origin, 汇报]
---

## 症状

历次汇报都写「已 push」，但 `git status -sb` 显示
`## v7.0.0-dev...origin/v7.0.0-dev [ahead 161]`，`git ls-remote origin` 与本地 HEAD 不同。

## 根因

把 `git commit` 成功当成了推送成功：commit 只改本地对象库，不动远端；
`git status` 的 ahead 计数被忽略，且没有任何步骤在汇报前比对远端引用。
2026-11-14 实测：唯一远端 gitee，无任何远端分支包含本地 HEAD，reflog 无推送痕迹。

## 正解

- 汇报推送前必须跑并贴出：`git status -sb`、`git log --oneline @{u}..HEAD | wc -l`、
  `git ls-remote origin refs/heads/<branch>` 与 `git rev-parse HEAD`。
- 远端 sha 与本地 HEAD 不一致时，先 `git push origin <branch>`，再复跑上面四条。
- 「commit 完成」只能写成「已提交」，不能写成「已推送」。
