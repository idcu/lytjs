---
'@lytjs/compiler': patch
---

`setWarningLevel()` 现在**真实生效**：此前它只写一个模块变量，编译器所有告警仍直接走 `warn()` / `console.warn`，设置 `'silent'` 也无法关闭任何警告。现在解析期、变换期、codegen 与 SFC 解析的告警统一经 `compilerWarn()` 输出，并遵守级别：

- `silent`：不输出；
- `warn`：`console.warn`（默认，仍受开发模式判定）；
- `error`：`console.error`（提升可见性，**不抛出**）。

同时接受旧文档公开过的数值枚举作为兼容输入：`0 → 'silent'`，`1/2 → 'warn'`；`getWarningLevel()` 始终返回字符串真源。`docs/api/compiler.md` 中与实现不符的 `enum WarningLevel { Off/Normal/Verbose }` 已订正。
