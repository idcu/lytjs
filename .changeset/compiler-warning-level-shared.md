---
'@lytjs/compiler': patch
---

修复 `setWarningLevel` 的跨入口分叉。

`warning.ts` 被 `index` / `sfc` / `signal` / `ssr` / `wasm` 五个入口内联，
`globalWarningLevel` 是模块级变量：主入口设置 `'silent'` 后，子入口的
`compilerWarn` 仍按各自副本输出。

改为 `globalThis` + `Symbol.for` 槽。新增 dist 级探针（同一 dist 文件以不同
URL 查询串导入两次，模拟逐入口内联的模块副本），修复前读回 `warn`，修复后为 `silent`。
