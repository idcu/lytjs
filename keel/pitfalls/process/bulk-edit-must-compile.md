---
scope: process
status: distilled
severity: P1
last-verified: 2026-10-05
triggers: 3
keywords: [批量改写, 生成式, TS1005, 花括号, 重复执行, 行号, write_text]
---

## 症状

"脚本成功但代码是坏的"：缩进算错 → TS1005；`}` 与 `} else if` 各输出一次 → 多一个花括号；
同一补丁被应用两次 → `Duplicate function implementation`。

## 根因

生成式改写没有语法验证；`}` 与 `} else if` 是同一 token 序列。

## 正解

- 批量改完**立刻 `tsup` / `tsc` 验证**，不能只看脚本跑完；
- 大块插入禁用"会被重复执行"的脚本；插入后 `grep -c` 核对份数；
- 改多行 import 不写死行号（前次修改会移位）；python `write_text` 放最后（中途 assert 失败会丢修改）；
- 已并入 CONSTITUTION 硬约束 8。
