---
scope: verify
status: distilled
severity: P2
last-verified: 2026-10-05
triggers: 1
keywords: [依赖核实, 精确匹配, grep, 注释, 假引用]
---

## 症状

`grep -rl "@lytjs/plugin-vite"` 得到 10 处"引用"，据此断定"不能删"；
精确匹配后发现**真实 import 为 0**（10 处全是注释与提示字符串）。

## 根因

宽松匹配把注释 / 字符串算作引用。

## 正解

- 核实依赖必须**精确匹配**：`from 'X'` / `import('X')`；
- 同族判断：先看命中行内容，再下结论；
- 已并入 CONSTITUTION 硬约束 8（核实纪律）。
