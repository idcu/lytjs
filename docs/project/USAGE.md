# Lyt.js 项目使用指南

---

## 目录

1. [项目结构](#项目结构)
2. [npm 发布前的开发使用](#npm-发布前的开发使用)
3. [npm 发布后的使用](#npm-发布后的使用)
4. [发布流程](#发布流程)
5. [常见问题](#常见问题)

---

## 项目结构

```
lytjs/
├── packages/              # 核心包目录
│   ├── reactivity/        # 响应式系统
│   ├── compiler/          # 编译器
│   ├── vdom/              # 虚拟 DOM
│   ├── renderer/          # 渲染器
│   ├── component/         # 组件系统
│   ├── core/              # 核心入口
│   ├── router/            # 路由
│   ├── store/             # 状态管理
│   ├── cli/               # 命令行工具
│   ├── devtools/          # 开发工具
│   ├── components/        # UI 组件库
│   ├── lytx/              # 元框架
│   └── ...                # 其他插件
├── examples/              # 示例项目
├── docs/                  # 文档
├── benchmarks/            # 性能测试
├── scripts/               # 构建和发布脚本
├── tests/                 # 测试文件
├── package.json           # 项目配置
├── pnpm-workspace.yaml    # monorepo 配置
└── ...                    # 其他配置文件
```

---

## npm 发布前的开发使用

### 方式一：使用本地源文件开发（推荐）

#### 1. 克隆和设置项目

```bash
git clone <your-git-repo-url>
cd lytjs
pnpm install
```

#### 2. 构建所有包

```bash
pnpm build
```

#### 3. 使用示例项目开发

```bash
# 进入示例项目
cd examples/showcase-app
npm install
npm run dev
```

#### 4. 直接引用源码开发

```bash
# 在你的项目中，直接使用 relative path 引用本地包
# 例如在你的 package.json 中：
# {
#   "dependencies": {
#     "@lytjs/core": "file:/path/to/lytjs/packages/core",
#     "@lytjs/cli": "file:/path/to/lytjs/packages/cli"
#   }
# }
```

---

### 方式二：使用 npm link

#### 1. 构建项目

```bash
cd lytjs
pnpm build
```

#### 2. 链接 CLI 包

```bash
cd packages/cli
npm link
```

#### 3. 在项目中使用链接的包

```bash
cd /path/to/your/project
npm link @lytjs/cli
```

#### 4. 使用链接后的 CLI 创建项目

```bash
lyt create my-app
cd my-app
npm install
npm run dev
```

---

### 方式三：使用本地 CLI 直接创建

```bash
# 在 lytjs 根目录构建后
cd /path/to/your/new/project
node /path/to/lytjs/packages/cli/dist/cli.js create my-local-app
cd my-local-app
npm install
npm run dev
```

---

## npm 发布后的使用

### 方式一：使用 CLI 创建项目（推荐）

```bash
# 创建项目
npx @lytjs/cli create my-app
cd my-app
npm install

# 开发
npm run dev

# 构建
npm run build
```

---

### 方式二：直接安装单个包

```bash
# 安装核心包
npm install @lytjs/core @lytjs/reactivity @lytjs/component

# 安装路由和状态管理
npm install @lytjs/router @lytjs/store

# 安装 UI 组件库
npm install @lytjs/components

# 安装 CLI（可选）
npm install -g @lytjs/cli
```

---

### 方式三：CDN 直接使用

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lyt.js CDN 示例</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp } from '@lytjs/core'

    const app = createApp({
      template: `
        <div>
          <h1>{{ title }}</h1>
          <p>计数: {{ count }}</p>
          <button @click="count++">+1</button>
        </div>
      `,
      state: {
        title: 'Hello Lyt.js!',
        count: 0
      }
    })

    app.mount('#app')
  </script>
</body>
</html>
```

---

## 发布流程

### 1. 准备发布

```bash
# 确保在 main 分支
git checkout main

# 拉取最新代码
git pull origin main

# 安装依赖
pnpm install
```

### 2. 清理旧的构建

```bash
pnpm clean
```

### 3. 构建所有包

```bash
pnpm build
```

### 4. 运行测试

```bash
pnpm test
```

### 5. 试运行发布（Dry Run）

```bash
pnpm publish:dry-run
```

### 6. 正式发布

```bash
pnpm publish:all
```

### 7. 或者使用完整的 release 命令

```bash
pnpm release
```

---

## 常见问题

### Q: 如何清理临时文件？

A: 使用：
```bash
pnpm clean:temp
```

### Q: 如何只清理构建输出？

A: 使用：
```bash
pnpm clean
```

### Q: 如何运行性能测试？

A: 使用：
```bash
pnpm benchmark
```

### Q: 发布前需要做哪些检查？

A: 确保：
1. 所有测试通过：`pnpm test`
2. 代码没有 lint 错误：`pnpm lint`
3. 所有包都已构建：`pnpm build`
4. package.json 中的版本号已更新

### Q: 如何本地测试发布的包？

A: 使用 `npm pack` 创建 tarball 并本地安装：
```bash
cd packages/cli
npm pack
cd /path/to/test/project
npm install /path/to/lytjs/packages/cli/<package-name>-x.x.x.tgz
```

---

## 开发规范

### 添加新包

1. 在 `packages/` 目录下创建新包目录
2. 创建 `package.json` 配置
3. 在 `pnpm-workspace.yaml` 中注册（如果需要）
4. 运行 `pnpm install`
5. 在 `scripts/build-all.sh` 中添加构建脚本

### 提交代码前

1. 运行 `pnpm lint` 检查代码规范
2. 运行 `pnpm test` 确保所有测试通过
3. 确保新功能有相应的测试

---

## 版本管理

项目使用 Semantic Versioning (语义化版本)：
- MAJOR: 不兼容的 API 修改
- MINOR: 向下兼容的功能性新增
- PATCH: 向下兼容的问题修正

---

**最后更新**: 2024-04-24
**文档版本**: 1.0

