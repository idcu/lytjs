# @lytjs/bundler

> LytJS 构建工具集成：在 Vite 中编译 `.lyt` / `.vue` 单文件组件（SFC）。

> ✅ **实现状态（2026-10-10 订正，P1-8）**
>
> 此前本包是**插件骨架**：`transform()` 对 `.lyt`/`.vue` 只 `return null`（不转换、不报错），
> 仅打印一次「尚未实现」告警；`createWebpackPlugin()` 更是只在 `beforeCompile` 里打印告警、
> 完全不做转换。按 README 接入后**什么都不会发生**。
>
> 现在 `transformSFC()` 是**真实实现**（委托 `@lytjs/compiler` 的 SFC 编译器），
> `createVitePlugin()` 真的转换 `.lyt` / `.vue`。**Webpack 通路（假的
> `createWebpackPlugin`）已删除**，不再提供虚假 API。

[![npm version](https://img.shields.io/npm/v/@lytjs/bundler.svg)](https://www.npmjs.com/package/@lytjs/bundler)
[![license](https://img.shields.io/npm/l/@lytjs/bundler.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介·独立声明

`@lytjs/bundler` 是 LytJS 框架的官方构建工具集成包，为 Vite 提供 LytJS 插件，
并内置 `default` / `ssg` / `ssr` 三套预设。

> **依赖说明**：本包**依赖 `@lytjs/compiler`**（仅构建期，不进入运行时产物）——
> 一个框架的构建插件必须知道如何编译该框架的 SFC，这是本包能真正工作的前提。
> 此前「零依赖」的定位正是骨架化的根因。按 v6.12 路线图规划，本包将迁出为
> 独立仓库 `lytjs-bundler`。

## 安装

```bash
npm install -D @lytjs/bundler
```

或使用 pnpm：

```bash
pnpm add -D @lytjs/bundler
```

## 快速开始

### Vite 配置

```typescript
import { defineConfig } from 'vite';
import { createVitePlugin } from '@lytjs/bundler';

export default defineConfig({
  plugins: [createVitePlugin({ ssr: false })],
});
```

### 预设配置

```typescript
import { createViteConfig } from '@lytjs/bundler';

export default createViteConfig({ ssg: true });
```

### Webpack / Rspack（需自备 loader）

本包**不提供** Webpack 插件。可用导出的 `transformSFC()` 自己写一个 loader：

```javascript
// lyt-loader.cjs
const { transformSFC } = require('@lytjs/bundler');

module.exports = function (source) {
  const result = transformSFC(source, this.resourcePath, { ssr: false });
  return result ? result.code : source;
};
```

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [{ test: /\.(lyt|vue)$/, use: [require.resolve('./lyt-loader.cjs')] }],
  },
};
```

## 特性

- 编译 `.lyt` / `.vue` SFC → 可执行 JS 模块（render 函数 + 运行时 style 注入）
- `<style scoped>` 作用域化（基于文件路径的确定性 scope id）
- SSR 目标编译（`ssr: true` ⇒ `renderToString` + HTML 转义）
- `default` / `ssg` / `ssr` 三套预设

## API

### `transformSFC(code, id, options?)`

核心转换函数，把 SFC 源码编译为 JS 模块。返回 `LytTransformResult`；
`id` 不属于 `extensions` 时返回 `null`（表示「不处理」）。

```typescript
import { transformSFC } from '@lytjs/bundler';

const result = transformSFC(source, '/src/App.lyt');
// result.code      —— 编译后的 JS
// result.css       —— 抽取出的 CSS（无 style 块时 undefined）
// result.scopedId  —— 生效的 scope id（无作用域样式时 undefined）
// result.map       —— sourcemap（当前编译器未产出，恒为 null）
```

### `createVitePlugin(options?)`

创建 Vite 插件（`name: 'lytjs'`、`enforce: 'pre'`）。
对 `.lyt` / `.vue` 调用 `transformSFC()`；其它模块返回 `null`。

选项：

| 选项           | 类型                             | 默认               | 说明                                                                             |
| -------------- | -------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `ssr`          | `boolean`                        | `false`            | 按 SSR 目标编译（产出 `renderToString` + HTML 转义）                             |
| `scoped`       | `boolean`                        | 不传               | `true` 全部作用域化 / `false` 全不作用域化 / 不传则按各 style 块的 `scoped` 属性 |
| `rendererMode` | `'vnode' \| 'signal' \| 'vapor'` | `'vnode'`          | 渲染模式，透传给 `@lytjs/compiler`                                               |
| `extensions`   | `readonly string[]`              | `['.lyt', '.vue']` | 需要拦截的扩展名                                                                 |
| `injectCss`    | `boolean`                        | `true`             | 是否在产物末尾追加运行时 style 注入                                              |

### `isLytModule(id, extensions?)`

判断模块 id（可带 `?query`）是否属于需要拦截的扩展名。

### `getPreset(name?)`

获取预设（`default` / `ssg` / `ssr`），未知名称回退到 `default`。
`ssg` 与 `ssr` 预设均按 SSR 目标编译（SSG = SSR 预渲染）。

### `createViteConfig(options?)`

创建完整 Vite 配置。`options` 为转换选项 + `ssg?: boolean`（预设选择）。

## 已知限制

- **不做构建期 CSS 抽取**：样式由运行时注入 `<style>` 标签（SSR 下自动跳过）。
  需要 CSS 抽取 / 样式 HMR 请改用 `@lytjs/plugin-vite`（已迁出至独立仓库）。
- **不产出 sourcemap**：`result.map` 恒为 `null`（上游编译器尚未产出）。
- **不提供 Webpack 插件**：见上文「自备 loader」。

## 相关包

- `@lytjs/compiler` - 模板 / SFC 编译器（本包的实际编译后端）
- `@lytjs/core` - LytJS 核心运行时

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
