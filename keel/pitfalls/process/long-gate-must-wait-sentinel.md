---
scope: process
status: active
severity: P2
last-verified: 2026-11-14
triggers: 1
keywords: [长跑, 门禁, slow, 后台, 结束哨兵, auto_wakeup]
---

## 症状

- slow / build 全档后台启动，turn 就结束，结果两次丢失。
- 下一轮只剩半截日志，分不清"还在 build"与"已红"。

## 根因

`auto_wakeup=false` 的后台任务在 turn 结束后无人唤醒；"后台启动 + 口头等待 + 结束 turn"不是收尾。

## 正解

1. 启动即写结束哨兵：`<长命令>; echo "SLOW_EXIT=$?"`。
2. **同一 turn 内**轮询直到哨兵出现：`for i in $(seq 1 N); do grep -q SLOW_EXIT /tmp/x.log && break; sleep 30; done`。
3. 或把结果落成固定 JSON（commit / sha / 各门禁耗时 / exit），下一轮首读 JSON。
4. 无哨兵 ⇒ 不做后续动作；不重启同一门禁（会得到两份矛盾的中间态）。

## 判据

- 报告给：结束行原文、逐项耗时、跑后 `git status -sb` 与 HEAD。
- 日志无 `SLOW_EXIT=` 时，禁止声称"已跑完 / 已通过"。
