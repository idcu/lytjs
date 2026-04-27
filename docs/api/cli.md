# @lytjs/cli — CLI API

Lyt.js 命令行工具，提供项目创建、开发服务器和生产构建功能。纯 Node.js 原生实现，不依赖任何第三方包。

## 安装

```bash
# 全局安装
npm install -g @lytjs/cli

# 或使用 npx 直接运行
npx @lytjs/cli create my-app
```

## 使用

```bash
lyt <command> [options] [args]
```

---

## 命令

### create

创建一个新的 Lyt.js 项目。

```bash
lyt create <name> [options]
```

#### 参数

| 参数 | 说明 |
|------|------|
| `<name>` | 项目名称（同时作为目录名） |

#### 选项

| 选项 | 说明 |
|------|------|
| `--template <tpl>` | 项目模板（默认: `spa`），可选值: `spa` |

#### 示例

```bash
# 创建项目
lyt create my-app

# 指定模板
lyt create my-app --template spa
```

---

### dev

启动本地开发服务器。

```bash
lyt dev [options]
```

#### 选项

| 选项 | 说明 |
|------|------|
| `-p, --port <port>` | 服务端口（默认: 3000） |
| `--no-hmr` | 关闭热更新 |

#### 功能

- 静态文件服务
- TypeScript 即时编译
- 热模块替换（HMR）
- WebSocket 实时通信

#### 示例

```bash
# 默认启动
lyt dev

# 指定端口
lyt dev --port 8080

# 关闭 HMR
lyt dev --no-hmr
```

---

### build

构建生产版本。

```bash
lyt build [options]
```

#### 选项

| 选项 | 说明 |
|------|------|
| `--minify` | 压缩代码（去除空白和注释） |
| `-o, --outDir <dir>` | 输出目录（默认: `dist`） |
| `--entry <file>` | 入口文件（默认: `index.html`） |

#### 功能

- TypeScript 编译
- 模块打包（内联依赖）
- 去除 console.log
- Source Map 生成
- 静态资源复制

#### 示例

```bash
# 默认构建
lyt build

# 压缩并指定输出目录
lyt build --minify --outDir ./output

# 指定入口文件
lyt build --entry src/main.html
```

---

## 全局选项

| 选项 | 说明 |
|------|------|
| `-h, --help` | 显示帮助信息 |
| `-v, --version` | 显示版本号 |

---

## 内部模块

CLI 工具由以下模块组成：

### create.ts

项目创建模块。根据模板生成项目结构。

```typescript
function createProject(name: string, options: { template: string }): Promise<void>
```

### dev.ts

开发服务器模块。启动 HTTP 服务器，支持 TypeScript 即时编译和 HMR。

```typescript
function startDevServer(options: { port: number; hmr: boolean }): void
```

### build.ts

构建模块。编译 TypeScript、打包模块、优化输出。

```typescript
function buildProject(options: { minify: boolean; outDir: string; entry: string }): Promise<void>
```

### utils.ts

工具模块。提供命令行参数解析、彩色输出和日志功能。

```typescript
function parseArgs(argv: string[]): { command: string; args: string[]; options: Record<string, any> }
function colorText(text: string, color: string): string
const logger: { log: Function; error: Function; warn: Function; info: Function }
```
