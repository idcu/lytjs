# @lytjs/cli

LytJS 项目脚手架与开发命令行工具，用于创建项目、启动开发服务器、构建、测试以及生成组件、页面、插件等代码。

## 安装

```bash
pnpm add @lytjs/cli
```

安装后提供 `lyt` 命令入口。

## 命令

### `create <name>`

基于模板创建新的 LytJS 项目，并自动安装依赖。

```bash
lyt create my-app
lyt create my-app --template minimal
lyt create my-app --template router
lyt create my-app --template full
```

可用模板（`--template`）：

| 模板      | 说明                                   |
| --------- | -------------------------------------- |
| `default` | 默认模板，含 TypeScript 与 Vite        |
| `minimal` | 最小模板，不含额外依赖                 |
| `ssr`     | 启用 SSR 的模板                        |
| `router`  | 集成 Router 的模板                     |
| `store`   | 集成 Store 的模板                      |
| `full`    | 全功能模板（Router、Store 与 UI 组件） |

查看全部模板：`lyt templates`

### `dev`

启动开发服务器。

```bash
lyt dev
lyt dev --port 3000 --open
```

选项：`--port`（默认 5173）、`--host`（默认 localhost）、`--open`（启动时打开浏览器）。

### `build`

构建生产版本。

```bash
lyt build
lyt build --ssr
lyt build --outDir dist --minify false
```

选项：`--outDir`（输出目录，默认 dist）、`--ssr`（构建 SSR）、`--minify false`（禁用压缩）。

### `test`

运行测试。

```bash
lyt test
lyt test --grep pattern --coverage
```

选项：`--watch false`（单次运行，默认监听）、`--coverage`（生成覆盖率报告）、`--grep <pattern>`（按模式过滤测试）。

### `add <type> <name>`

快速生成简单代码片段。类型：`component`、`page`、`store`、`directive`、`composable`、`util`、`middleware`、`hook`。

```bash
lyt add component Button
lyt add page About
lyt add store user
lyt add composable fetch-data
```

### `generate <type> <name>`（别名 `g`）

更高级的代码生成，支持可选附加文件。类型：`component`、`page`、`service`、`hook`、`store`、`layout`、`middleware`。

```bash
lyt generate component Button --styles --test
lyt generate page Dashboard --path ./src/pages
lyt generate store Auth
lyt g page Login
```

选项：`--path <dir>`（输出目录，默认 ./src）、`--styles`（生成样式文件）、`--test`（生成测试文件）、`--storybook`（生成 Storybook 文件）。

### `plugin <sub-command>`

插件开发相关命令。

```bash
lyt plugin create my-plugin
lyt plugin create my-plugin --template withConfig
lyt plugin build
lyt plugin validate
lyt plugin templates
```

`plugin create` 选项：`--template`（default/minimal/withConfig）、`--force`、`--skipInstall`；`plugin build` 选项：`--outDir`、`--minify`、`--sourcemap`；`plugin validate` 选项：`--strict`、`--warningsAsErrors`。

### 通用选项

`--version`、`-v`（查看版本号）、`--help`（查看帮助）。

## API

除命令行外，`@lytjs/cli` 也导出对应的可编程 API：

```typescript
import { create, dev, build, test, add, generate, runCli } from '@lytjs/cli';

// 以编程方式创建项目
await create('my-app', { template: 'router' });

// 运行 CLI 主入口
await runCli(['create', 'my-app']);
```

导出的主要子命令函数：`create`、`listTemplates`、`dev`、`build`、`test`、`add`、`generate`、`createPlugin`、`buildPlugin`、`validatePlugin`、`listPluginTemplates`。

同时导出工具函数：`detectPackageManager`、`getInstallCommand`、`getRunCommand`、`getAddCommand`（包管理器检测与命令生成），以及 `logger` 与文件工具 `ensureDir`、`writeFile`、`readFile`、`exists`。相关选项类型见 `CliOptions`、`CreateOptions`、`DevOptions`、`BuildOptions`、`TestOptions`、`GenerateOptions`。

## 相关包

- `@lytjs/core` - LytJS 核心运行时（脚手架生成项目的基础依赖）
- `@lytjs/plugin-vite` - Vite 构建插件
- `@lytjs/common-is`、`@lytjs/common-env` - 通用工具依赖

## 许可证

[MIT](../../../../LICENSE)
