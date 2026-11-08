---
scope: process
status: active
severity: P1
last-verified: 2026-11-08
triggers: 1
keywords: [批量替换, codemod, import, 正则, 跨行, 误吞, diff, 回滚]
---

## 症状

批量改 import 后 `git diff --stat` 出现大量删除（实测 44 文件 / 131 deletions），
相邻的 `@lytjs/component`、`@lytjs/common-is` 等导入整行消失，构建报未定义标识符。

## 根因

正则 `/import\s*\{([\s\S]*?)\}\s*from\s*'目标模块';/` 的起点可落在**更早**的任意
`import {`。非贪婪只约束「最短匹配」，仍会跨过中间 import 行，直到目标模块；
一次替换把中间多行一起吞掉，且替换结果再写回时不会报错。

## 正解

- 按**行**处理：每行用 `^import\s*\{([^}]*)\}\s*from\s*'模块';$` 单独匹配，禁止 `[\s\S]` 跨行；
- 合并同模块导入时先取两边花括号内 specifier 列表再拼接，不用整段正则替换；
- 改完先看 `git diff --stat` 的增删比（只换模块名应接近 +N/−N），异常立刻
  `git checkout -- <path>` 回滚重来；
- codemod 先在三个反例上跑：目标行前面有同形 import、目标 import 多行、目标模块不存在。
