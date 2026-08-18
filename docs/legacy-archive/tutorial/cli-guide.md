# LytJS CLI 使用指南

LytJS CLI 是一款强大的开发工具，帮助你快速创建、开发和构建 LytJS 项目。

## 安装

### 全局安装

```bash
# 使用 npm
npm install -g @lytjs/cli

# 使用 pnpm（推荐）
pnpm add -g @lytjs/cli

# 使用 yarn
yarn global add @lytjs/cli
```

### 局部使用（通过 npx）

```bash
npx @lytjs/cli create my-app
```

## 命令列表

| 命令               | 描述                   |
| ------------------ | ---------------------- |
| `lyt create`       | 创建新的 LytJS 项目    |
| `lyt dev`          | 启动开发服务器         |
| `lyt build`        | 构建生产版本           |
| `lyt test`         | 运行测试               |
| `lyt add`          | 生成组件、页面或 store |
| `lyt plugin`       | 插件开发命令           |
| `lyt templates`    | 列出可用的项目模板     |
| `lyt --version/-v` | 显示版本号             |
| `lyt --help`       | 显示帮助信息           |

---

## 创建项目

### 基本用法

```bash
# 创建默认项目
lyt create my-app

# 使用特定模板
lyt create my-app --template minimal

# 强制覆盖已存在的目录
lyt create my-app --force
```

### 项目模板

| 模板名    | 描述                                      |
| --------- | ----------------------------------------- |
| `default` | 默认模板，包含 TypeScript、Vite、测试支持 |
| `minimal` | 最小化模板，无额外依赖                    |
| `ssr`     | 支持 SSR 的模板                           |
| `router`  | 集成 Router 的模板                        |
| `store`   | 集成 Store 的模板                         |
| `full`    | 全功能模板，包含 Router、Store 和 UI 组件 |

### 查看所有模板

```bash
lyt templates
```

### 项目结构（default 模板）

```
my-app/
├── src/
│   ├── App.lyt       # 主应用组件
│   └── main.ts       # 应用入口
├── index.html        # HTML 入口
├── vite.config.ts    # Vite 配置
├── tsconfig.json     # TypeScript 配置
└── package.json      # 项目信息
```

---

## 开发模式

### 启动开发服务器

```bash
lyt dev
```

### 配置开发服务器

```bash
# 指定端口
lyt dev --port 3000

# 指定 host
lyt dev --host 0.0.0.0

# 自动打开浏览器
lyt dev --open
```

---

## 构建项目

### 基本构建

```bash
lyt build
```

### 构建选项

```bash
# 输出到特定目录
lyt build --outDir build

# SSR 构建
lyt build --ssr

# 禁用压缩
lyt build --minify false
```

---

## 测试

### 运行测试

```bash
# 运行并监听变化
lyt test

# 只运行一次
lyt test --watch false

# 生成覆盖率报告
lyt test --coverage

# 按模式筛选测试
lyt test --grep "button"
```

---

## 代码生成

LytJS CLI 支持多种代码生成，提高开发效率！

### 生成组件

```bash
# 生成基本组件
lyt add component Button

# 使用 --force 覆盖已存在的文件
lyt add component Button --force
```

生成的组件结构：

```
src/components/
└── Button.lyt
```

### 生成页面

```bash
lyt add page About
```

生成的页面结构：

```
src/pages/
└── About.lyt
```

### 生成 Store

```bash
lyt add store user
```

生成的 store 结构：

```
src/stores/
└── user.ts
```

### 生成指令

```bash
lyt add directive click-outside
```

生成的指令结构：

```
src/directives/
└── click-outside.ts
```

### 生成组合式函数（Composable）

```bash
lyt add composable fetch-data
```

生成的结构：

```
src/composables/
└── useFetchData.ts
```

### 生成 Hook

```bash
lyt add hook window-size
```

生成的结构：

```
src/hooks/
└── useWindowSize.ts
```

### 生成工具函数

```bash
lyt add util format
```

生成的结构：

```
src/utils/
└── format.ts
```

### 生成中间件

```bash
lyt add middleware auth
```

生成的结构：

```
src/middleware/
└── auth.ts
```

---

## 插件开发

### 创建插件

```bash
# 使用默认模板创建插件
lyt plugin create my-plugin

# 使用特定模板
lyt plugin create my-plugin --template withConfig

# 跳过依赖安装
lyt plugin create my-plugin --skipInstall
```

### 构建插件

```bash
# 基本构建
lyt plugin build

# 带压缩和 sourcemap
lyt plugin build --minify --sourcemap

# 输出到特定目录
lyt plugin build --outDir output
```

### 验证插件

```bash
# 基本验证
lyt plugin validate

# 严格模式
lyt plugin validate --strict

# 将警告视为错误
lyt plugin validate --warningsAsErrors
```

### 查看插件模板

```bash
lyt plugin templates
```

---

## 使用示例

### 完整开发流程

```bash
# 1. 创建项目
lyt create my-blog --template router

# 2. 进入项目
cd my-blog

# 3. 添加组件
lyt add component Header
lyt add component Footer

# 4. 添加页面
lyt add page Home
lyt add page Posts
lyt add page About

# 5. 启动开发
lyt dev --open
```

### 插件开发流程

```bash
# 1. 创建插件
lyt plugin create my-plugin

# 2. 开发插件
cd my-plugin
# 编辑 src/index.ts

# 3. 验证插件
lyt plugin validate

# 4. 构建插件
lyt plugin build --minify --sourcemap
```

---

## 配置文件

### CLI 配置文件

在项目根目录创建 `lyt.config.json` 或 `lyt.config.js` 来自定义 CLI 行为：

```json
{
  "templates": {
    "defaultPath": "./my-templates",
    "customTemplates": {
      "blog": "My blog template"
    }
  },
  "plugin": {
    "defaultOutDir": "dist",
    "defaultMinify": true
  }
}
```

---

## 疑难解答

### Q: 命令不被识别？

A: 确保你已正确安装了 @lytjs/cli：

```bash
# 检查版本
lyt --version

# 如果不行，尝试通过 npx 使用
npx @lytjs/cli --version
```

### Q: 创建项目时安装依赖失败？

A: 可以使用 `--skipInstall` 选项，然后手动安装：

```bash
lyt create my-app --skipInstall
cd my-app
pnpm install
```

### Q: 如何更新 CLI？

A: 更新到最新版本：

```bash
# 全局更新
pnpm update -g @lytjs/cli
```

---

## 下一步

- 学习 [LytJS 核心概念](./index.md)
- 查看 [实战案例](./实战案例教程.md)
- 了解 [官方插件](./官方插件使用指南.md)
