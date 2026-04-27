# @lytjs/cli

Lyt.js 官方命令行工具，提供项目创建、开发服务器和生产构建功能。

## 安装

```bash
# 全局安装
npm install -g @lytjs/cli

# 或使用 pnpm
pnpm add -g @lytjs/cli
```

## 快速开始

### 创建新项目

```bash
lyt create my-app
```

### 启动开发服务器

```bash
cd my-app
lyt dev
```

开发服务器默认运行在 http://localhost:3000

### 构建生产版本

```bash
lyt build
```

## 命令

### `lyt create <name> [options]`

创建一个新的 Lyt.js 项目

```bash
# 基本用法
lyt create my-app

# 选择模板
lyt create my-app --template spa
lyt create my-app --template ssr
lyt create my-app --template ssg

# 使用 TypeScript
lyt create my-app --typescript

# 包含路由
lyt create my-app --router

# 包含状态管理
lyt create my-app --store
```

**选项：**

- `--template, -t`: 项目模板类型 (spa|ssr|ssg)，默认: spa
- `--typescript, --ts`: 使用 TypeScript，默认: true
- `--router`: 包含路由，默认: true
- `--store`: 包含状态管理，默认: true
- `--eslint`: 包含 ESLint 配置，默认: false

### `lyt dev [options]`

启动开发服务器

```bash
# 基本用法
lyt dev

# 指定端口
lyt dev --port 8080

# 指定项目目录
lyt dev --root ./src

# 禁用热更新
lyt dev --no-hmr
```

**选项：**

- `--port, -p`: 端口号，默认: 3000
- `--root, -r`: 项目根目录，默认: .
- `--hmr`: 启用热更新，默认: true
- `--no-hmr`: 禁用热更新

**功能特性：**

- 🚀 快速启动
- 🔥 热模块替换 (HMR)
- 📦 实时 TypeScript 编译
- 🔄 自动刷新
- 📁 静态文件服务
- 🔌 代理支持

### `lyt build [options]`

构建生产版本

```bash
# 基本用法
lyt build

# 指定输出目录
lyt build --outDir ./dist

# 生成源码映射
lyt build --sourcemap
```

**选项：**

- `--outDir, -o`: 输出目录，默认: dist
- `--sourcemap, -s`: 生成源码映射，默认: false
- `--minify`: 压缩代码，默认: true
- `--no-minify`: 不压缩代码

## 项目结构

创建的项目结构如下：

```
my-app/
├── package.json
├── tsconfig.json          # 如果使用 TypeScript
├── lyt.config.ts          # Lyt.js 配置文件
├── index.html
├── src/
│   ├── main.ts            # 入口文件
│   ├── App.lyt            # 根组件
│   ├── components/
│   │   └── Header.ts      # 组件示例
│   ├── pages/
│   │   ├── index.ts       # 首页
│   │   └── about.ts       # 关于页
│   ├── router/
│   │   └── index.ts       # 路由配置 (可选)
│   ├── store/
│   │   └── index.ts       # 状态管理 (可选)
│   └── styles/
│       └── main.css
└── public/
    └── favicon.svg
```

## 配置文件

项目根目录下的 `lyt.config.ts` 或 `lyt.config.js`：

```typescript
import { defineConfig } from '@lytjs/cli';

export default defineConfig({
  // 开发服务器配置
  dev: {
    port: 3000,
    host: 'localhost',
    open: true,
  },

  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
  },

  // 代理配置
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
});
```

## 示例

### 基础项目

```bash
lyt create my-app --template spa
cd my-app
lyt dev
```

### SSR 项目

```bash
lyt create my-app --template ssr
cd my-app
lyt dev
```

### 自定义端口

```bash
lyt dev --port 4000
```

## 命令帮助

```bash
lyt --help
lyt create --help
lyt dev --help
lyt build --help
```

## 更新日志

参见根目录的 CHANGELOG.md

## License

MIT
