# @lytjs/common-error 更新日志

## [未发布] - 2026-11-04

### 🐞 修复（P0：整个框架的诊断通道在产物里是死的）

- **`warn` / `warnOnce` 在产物里退化成 `function warn(message) { return; }`**：
  构建把 `__DEV__` **编译成了 `false`**，而这两个函数直接写 `if (!__DEV__) return;` ⇒
  整条语句被折叠成 `return;`。实测 `warn('x')` 输出 **0 次**（而 `error()` 正常）。
  全仓 **250 个 `warn` / `warnOnce` 调用点、91 个文件**（prop 冲突、无效 prop、
  循环 mixin、不安全属性被拦截、v-html 非字符串、重复创建渲染器……）在消费产物时
  一条都不会打印。这类缺陷不会让任何行为断言变红，只会让**排查信息消失**。
- **`setDevMode()` 从来没生效过**：它写的是 `globalThis.__DEV__`，而 `warn` 读的是
  **词法作用域里的编译期常量** `__DEV__` —— 两者不是同一个东西，所以
  `setDevMode(true)` 打不开、`setDevMode(false)` 也关不掉。
- **`getDevMode()` 在产物里恒为 `false`**：同样的原因（读的是被替换成 `false` 的常量）。

### ✨ 改法

`getDevMode()` 改为**运行时**判定，顺序：`setDevMode()` → `globalThis.__DEV__` →
编译期常量（应用侧 `define` 注入时仍然优先，可被 bundler 静态求值 / DCE）→
`process.env.NODE_ENV !== 'production'` → 默认 `false`。
`warn` / `warnOnce` / `error` 全部走它。

同时**移除本包 tsup 里的 `define: { __DEV__: 'false' }`** —— 本包就是「开发模式判定」
本身，把常量烘进产物等于把开关焊死。源码里对 `__DEV__` 的引用全部包在 `typeof` 里，
未定义也不会 `ReferenceError`；三处 `if (__DEV__) { warn(...) }` 的双重门也一并去掉
（`warn()` 自己就带判定，双门只会在去掉 define 后变成 ReferenceError）。

### 📌 已知缺口（不在本轮范围）

其余包的 tsup 仍然把 `__DEV__` 定义成 `false`，因此**被 `if (__DEV__)` 包住的 179 个
调用点**在各自产物里仍会被整段删除。要彻底解决需要 **dev/prod 双产物**（`exports` 条件），
而不是把唯一的产物编译成生产形态。本轮先把「函数本身是活的」这件事修好并加了门禁。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## [6.6.0] - 2026-05-21

### 🚀 版本升级

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.6.0

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。
