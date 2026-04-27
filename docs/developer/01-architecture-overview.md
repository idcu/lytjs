# Lyt.js 架构总览

## 🌟 Lyt.js 是什么？

Lyt.js 是一个**纯原生、零依赖**的轻量级前端框架，采用与 Vue 3 兼容的 API 设计。它的核心理念是：**用最少的代码，做最多的事情**。

## 🏗️ 整体架构

Lyt.js 采用**分层设计**，从底层到上层分为三个主要层次：

```
┌─────────────────────────────────────────┐
│     应用层 (Application Layer)          │
│  createApp | 插件 | 全局配置            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    核心引擎层 (Core Engine Layer)       │
│  reactivity | compiler | renderer       │
│  component | router | store             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   平台适配层 (Platform Adapter Layer)   │
│  DOM | SSR | Native | MiniApp | Vapor  │
└─────────────────────────────────────────┘
```

## 📦 包结构详解

### 核心包（必须了解）

| 包名 | 作用 | 文件大小 | 依赖 |
|------|------|----------|------|
| `@lytjs/reactivity` | 响应式系统，数据变化自动更新视图 | ~2.8KB | 无 |
| `@lytjs/compiler` | 模板编译器，将模板转为渲染函数 | ~4.9KB | 无 |
| `@lytjs/renderer` | 渲染器，负责虚拟 DOM 到真实 DOM | ~5.0KB | reactivity |
| `@lytjs/component` | 组件系统，defineComponent、生命周期等 | ~3.5KB | reactivity, renderer |
| `@lytjs/core` | 核心入口，createApp、h 函数等 | ~2.1KB | compiler, renderer, component |
| `@lytjs/lytjs` | 聚合包，一键安装全部 | ~28.6KB | 以上全部 |

### 功能包（按需使用）

| 包名 | 作用 | 依赖 |
|------|------|------|
| `@lytjs/router` | 路由系统，History/Hash 双模式 | reactivity |
| `@lytjs/store` | 状态管理，Pinia 风格 API | reactivity |
| `@lytjs/cli` | 命令行工具，脚手架、开发、构建 | 无 |
| `@lytjs/devtools` | 浏览器调试工具 | 无 |
| `@lytjs/components` | UI 组件库，28+ 组件 | 无 |
| `@lytjs/lytx` | 元框架，SSR/SSG 支持 | 无 |

## 🔄 数据流

### 从模板到页面的完整流程

```
模板字符串
    ↓
[compiler] 编译 → 渲染函数
    ↓
[renderer] 渲染 → 虚拟 DOM (VNode)
    ↓
[reactivity] 响应式更新
    ↓
[renderer] Patch → 真实 DOM
    ↓
页面展示
```

### 组件更新流程

```
用户操作 → 数据变化
    ↓
[reactivity] 触发 effect
    ↓
[component] 标记组件需要更新
    ↓
[renderer] Patch 对比
    ↓
只更新变化的部分 DOM
```

## 🧩 模块依赖关系

Lyt.js 的模块设计遵循**单向依赖、低耦合**原则：

```
lytjs (聚合)
  ↑
  ├── core
  │     ↑
  │     ├── renderer
  │     │     ↑
  │     │     └── reactivity
  │     └── component
  │           ↑
  │           └── reactivity
  ├── router
  │     ↑
  │     └── reactivity
  └── store
        ↑
        └── reactivity
```

**关键点：**
- `reactivity` 是最底层，被所有其他模块依赖
- 各功能模块（router、store）只依赖 reactivity，不互相依赖
- core 模块负责整合核心能力
- lytjs 模块只是聚合导出，不包含逻辑

## 🎯 设计理念

### 1. 纯原生实现

所有功能都用原生 JavaScript/TypeScript 实现，**零第三方依赖**。这意味着：
- 打包体积极小
- 不会出现依赖冲突
- 代码完全可控

### 2. 模块化设计

每个包都是独立的，可以单独使用。你可以：
- 只使用 reactivity 进行响应式编程
- 只使用 compiler 进行模板编译
- 按需组合你需要的功能

### 3. Vue 3 兼容 API

API 设计与 Vue 3 高度兼容，降低学习成本：
- 相同的 Composition API
- 类似的 Options API
- 只需要把 `v-if` 改成 `if`，`v-for` 改成 `each`

## 📁 项目目录结构

```
lytjs/
├── packages/              # 核心包（重要！）
│   ├── reactivity/       # 响应式系统
│   ├── compiler/         # 模板编译器
│   ├── renderer/         # 渲染器
│   ├── component/        # 组件系统
│   ├── core/             # 核心入口
│   ├── router/           # 路由
│   ├── store/            # 状态管理
│   ├── cli/              # 命令行工具
│   ├── devtools/         # 开发者工具
│   ├── components/       # UI 组件库
│   ├── lytx/             # 元框架
│   ├── lytjs/            # 聚合包
│   └── vscode-extension/ # VSCode 扩展
├── benchmarks/            # 性能基准
├── docs/                 # 文档（你在这里）
│   ├── api/              # API 参考
│   └── developer/        # 开发者文档
├── docs-site/            # 用户文档网站
└── examples/             # 示例
```

## 🎓 学习路径建议

### 初学者路径

1. **先看架构** - 阅读本文档了解整体
2. **从 reactivity 开始** - 理解响应式是基础
3. **再看 renderer** - 了解虚拟 DOM
4. **然后 component** - 理解组件系统
5. **最后 core** - 了解如何整合

### 进阶路径

1. **阅读所有核心模块** - 深入理解实现
2. **查看测试用例** - 了解用法
3. **尝试修改代码** - 动手实践
4. **阅读功能模块** - 了解 router/store
5. **参与贡献** - 提交 PR

## 🚀 下一步

现在你对 Lyt.js 的整体架构有了了解，接下来可以：

1. **深入核心模块** - 从 [reactivity](./core/01-reactivity.md) 开始
2. **查看源代码** - 打开 `packages/` 目录，阅读源码
3. **运行测试** - 执行 `pnpm test` 看看测试用例

记住：**不要怕看不懂代码**，每个模块都有详细的文档等着你！

---

## 📚 相关文档

- [入门指南](./02-getting-started.md) - 从零开始
- [代码规范](./03-coding-standards.md) - 开发规范
- [核心模块](./core/) - 深入每个核心模块
