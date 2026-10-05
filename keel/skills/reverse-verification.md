---
scope: verify
status: active
last-verified: 2026-10-05
trigger: 声称"修好了"之前
keywords: [反向验证, 注入, 判据, cp, 恢复, grep]
---

# 反向验证：先证明判据会红

## 做法（四步，顺序不能换）

1. **备份**：`cp <file> /tmp/<file>.bak`（**禁 `git checkout`** 恢复）；
2. **核对备份**：`grep -n "<注入前特征>" /tmp/<file>.bak`（命令重试可能把备份拍在注入后）；
3. **注入缺陷** → 跑判据，确认**变红且报错精确**（不是"跑不起来"）；
4. **恢复** → **再 grep 核对源码**是注入前版本。

## 为什么要这样

- 判据转绿 ≠ 问题解决：追问"还有没有第二/第三道关"（坑 `multi-gate-fix`）；
- 验证器必须真跑一次命令（坑 `verifier-must-really-run`）；
- 判据本身也要能被判死：改门禁脚本必须做一次注入验证（CONSTITUTION 2）。
