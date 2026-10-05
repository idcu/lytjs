---
scope: verify
status: distilled
severity: P1
last-verified: 2026-10-05
triggers: 3
keywords: [退出码 null, PATH, --dry, 真跑, 运行器, DOM 断言]
---

## 症状

`--list` / `--dry` 看着完全正常，真跑"全部瞬间失败（退出码 **null**，不是 1）"
——子进程 PATH 缺 `node_modules/.bin`。

## 根因

验证器从未真正执行；`null` 退出码被当成普通失败。

## 正解

- 验证"运行器 / 脚本"必须**真跑一次命令**；
- 判"能跑"= compile → `new Function` → jsdom mount → **断言真实 DOM 文本**；
- 已并入 CONSTITUTION 硬约束 8。
