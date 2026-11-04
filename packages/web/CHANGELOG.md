# @lytjs/web 更新日志

## [未发布] - 2026-11-04

### 🐞 修复（主题残留 / SSR 崩溃 / 读写不对称 / 订阅失效）

- **`ThemeManager.apply()` 不清理旧主题独有的变量**（P1）：`light({bg, border})` →
  `dark({bg})` 之后 `--border` 仍是 `gray` ⇒ 页面变成「深色底 + 浅色边框」。
  现在只移除「旧主题有、新主题没有」的变量。
- **`setCSSVar('name', value)` 抛看不懂的 TypeError**（P1）：此前只接受对象参数或
  `(element, name, value)`，于是最常见的写法抛
  `Cannot use 'in' operator to search for 'element' in primary` ——
  而读那边 `getCSSVar('primary')` 就是字符串，**读写不对称**。
  现在支持简写 `setCSSVar('name', value, options?)`；其它非法形态给出可操作的错误。
- **SSR（无 `document`）下直接抛错**（P1）：`setCSSVar` / `getCSSVar` / `hasCSSVar` /
  `getAllCSSVars` 都直接写 `document.documentElement` / `window.getComputedStyle`
  ⇒ 同一份组件在 SSR 里一调用就是 `ReferenceError: document is not defined`（页面 500）。
  现在统一走 `getRootElement()` / `canComputeStyle()`：没有 DOM 时写操作 no-op、
  读操作返回 fallback，`ThemeManager` / `CSSVarObserver` 允许构造。
- **`observe(['a'])` 之后 `subscribe('b')` 永远收不到**（P2）：`checkChanges` 只检查
  observe 的列表，后订阅的名字被排除在外。现在把已订阅的名字并进检查范围。
- **未注册主题静默返回 `false`**：`apply('nope')` 现在给出告警（列出已注册主题）。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## [6.6.0] - 2026-05-21

### 🚀 版本升级

- 版本升级至 v6.6.0
- 保持完全向后兼容

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。

### 🔧 内部改进

- 构建工具 `tsup` 升级至 `^8.3.6`
- TypeScript 升级至 `^5.7.3`
- 测试框架 `vitest` 升级至 `^3.0.0`
