# Lyt.js

> 下一代轻量级前端框架 v6.0.0

[![CI](https://github.com/idcu/lytjs/actions/workflows/ci.yml/badge.svg)](https://github.com/idcu/lytjs/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-F69220)](https://pnpm.io/)

## 特性

- **轻量**: 核心包体积 < 35KB (gzip)
- **高性能**: 基于精确的响应式系统，最小化重渲染
- **类型安全**: 完整的 TypeScript 支持
- **模块化**: 多层子仓库架构，按需引入
- **渐进式**: 从简单脚本到复杂 SPA，灵活适配
- **生态完善**: 路由、状态管理、CLI、UI 组件库一应俱全

## 安装

```bash
# 使用 npm
npm install @lytjs/core

# 使用 pnpm（推荐）
pnpm add @lytjs/core

# 使用 yarn
yarn add @lytjs/core
```

## 快速开始

```typescript
import { createApp, ref } from "@lytjs/core";

const App = {
  setup() {
    const count = ref(0);
    const increment = () => count.value++;

    return { count, increment };
  },
  template: `
    <div>
      <h1>Count: {{ count }}</h1>
      <button @click="increment">+1</button>
    </div>
  `,
};

createApp(App).mount("#app");
```

## 架构

```
lytjs/
├── packages/
│   ├── common/          # 基础工具库（13 个独立包）
│   ├── reactivity/      # 响应式系统
│   ├── vdom/            # 虚拟 DOM
│   ├── compiler/        # 模板编译器
│   ├── renderer/        # 渲染器
│   ├── component/       # 组件系统
│   ├── core/            # 核心框架（聚合包）
│   ├── ecosystem/       # 生态工具（router/store/cli/devtools/...）
│   ├── lytui/           # UI 组件库
│   ├── plugins/         # 插件
│   └── tools/           # 开发工具
├── docs/                # 文档站
├── examples/            # 示例
├── benchmarks/          # 性能测试
└── e2e/                 # E2E 测试
```

## 子仓库列表

| 子仓库 | 包名 | 说明 |
|:---|:---|:---|
| common-is | `@lytjs/common-is` | 类型判断工具 |
| common-object | `@lytjs/common-object` | 对象操作工具 |
| common-string | `@lytjs/common-string` | 字符串工具 |
| common-path | `@lytjs/common-path` | 路径工具 |
| common-events | `@lytjs/common-events` | 事件系统 |
| common-cache | `@lytjs/common-cache` | 缓存工具 |
| common-timing | `@lytjs/common-timing` | 定时器工具 |
| common-scheduler | `@lytjs/common-scheduler` | 调度器 |
| common-error | `@lytjs/common-error` | 错误处理 |
| common-algorithm | `@lytjs/common-algorithm` | 常用算法 |
| common-vnode | `@lytjs/common-vnode` | VNode 基础类型 |
| common-env | `@lytjs/common-env` | 环境检测 |
| common | `@lytjs/common` | 聚合包 |
| reactivity | `@lytjs/reactivity` | 响应式系统 |
| vdom | `@lytjs/vdom` | 虚拟 DOM |
| compiler | `@lytjs/compiler` | 模板编译器 |
| renderer | `@lytjs/renderer` | 渲染器 |
| component | `@lytjs/component` | 组件系统 |
| core | `@lytjs/core` | 核心框架 |

## 开发

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 运行测试（监听模式）
pnpm test:watch

# 构建
pnpm build

# 代码检查
pnpm lint

# 类型检查
pnpm type-check

# 启动文档站
pnpm docs:dev
```

## 贡献

请阅读 [贡献指南](./docs/guide/contributing.md) 了解详情。

## 许可证

[MIT](./LICENSE)
