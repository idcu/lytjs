# LytJS (npm 版本)

这个版本展示如何使用 LytJS 包，包含三种渲染模式的对比。

## 重要说明

**使用本地 workspace 包**

由于这是在 monorepo 项目内部，为了避免 pnpm workspace 配置问题，我们使用本地 workspace 包，原理和使用官方 npm 包一样。

## 包映射关系

| 模式 | npm 包 | 说明 |
|------|--------|------|
| VDOM | `@lytjs/core-vnode` | 虚拟 DOM 渲染模式 |
| Signal | `@lytjs/core-signal` | Signal 细粒度更新模式 |
| Vapor | `@lytjs/core-signal` | 同 Signal 包，无虚拟 DOM |
| 完整 | `@lytjs/core` | 包含所有功能的完整包 |

---

## 使用方式

### 步骤 1：在项目根目录安装并构建（已构建可跳过）

```bash
# 回到项目根目录
cd e:\trae\lytjs

# 安装所有依赖
pnpm install

# 构建所有包（包括 core-signal 和 core-vnode）
pnpm run build
```

### 步骤 2：进入 npm 版本目录并运行

```bash
cd benchmarks/js-framework-benchmark/frameworks/keyed/lytjs-npm

# 运行开发服务器
pnpm run dev
```

---

## 入口文件

| 文件 | 说明 |
|------|------|
| [index.html](index.html) | 主页面，带模式选择 |
| [main-signal.js](main-signal.js) | Signal 模式实现 |
| [main-vdom.js](main-vdom.js) | VDOM 模式实现 |
| [main-vapor.js](main-vapor.js) | Vapor 模式实现（同 Signal 包） |

---

## 构建生产版本

```bash
pnpm run build-prod
```

---

## 对比说明

| 版本 | 说明 | 目录 |
|------|------|------|
| 原生实现 | 纯 JavaScript，无依赖，正式用于提交 PR | `../lytjs/` |
| npm 包版本 | 使用 LytJS 包（本地 workspace） | `./` |
