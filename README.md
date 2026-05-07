# Lyt.js

> 轻量级、高性能的响应式前端框架

## 特性

- **高性能响应式系统** - 基于 Proxy 的细粒度依赖追踪
- **精确的 VDOM diff 算法** - PatchFlags 和 Block Tree 编译时优化
- **双核心模式** - VNode 模式与 Signal 模式可选
- **模块化包架构** - 分层设计，按需引入
- **TypeScript 全类型支持** - 完整的类型推导
- **安全优先** - 内置 XSS 防护、CSP 支持、输入验证
- **跨平台渲染** - 统一的 Host Contract 接口

## 快速开始

```bash
npm install @lytjs/core
```

```typescript
import { createApp, ref, computed } from '@lytjs/core';

const app = createApp({
  setup() {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    return { count, doubled };
  },
  template: '<div>{{ count }} x 2 = {{ doubled }}</div>',
});

app.mount('#app');
```

## 双核心模式

Lyt.js 提供两种渲染模式，可根据场景选择：

| 包名 | 描述 |
| --- | --- |
| `@lytjs/core` | 完整核心，支持 VNode 和 Signal 双模式 |
| `@lytjs/core-vnode` | 仅 VNode 渲染模式，适合传统模板场景 |
| `@lytjs/core-signal` | 仅 Signal 渲染模式，适合细粒度响应场景 |

## 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│  L5: Web 工具层                                              │
│  web (CSS 变量、ResizeObserver、Web Components)             │
├─────────────────────────────────────────────────────────────┤
│  L4: 核心应用层                                              │
│  core, core-vnode, core-signal, renderer                    │
├─────────────────────────────────────────────────────────────┤
│  L3: 平台适配层                                              │
│  adapter-web                                                 │
├─────────────────────────────────────────────────────────────┤
│  L2: 平台/组件层                                             │
│  component, dom, dom-runtime                                 │
├─────────────────────────────────────────────────────────────┤
│  L1: 核心原语层                                              │
│  reactivity, vdom, compiler                                 │
├─────────────────────────────────────────────────────────────┤
│  L0: 基础层                                                  │
│  common-* (30个子包), shared-types, host-contract           │
└─────────────────────────────────────────────────────────────┘
```

## 包架构

### L0: 基础层

| 包 | 描述 |
| --- | --- |
| `@lytjs/shared-types` | 共享类型定义 |
| `@lytjs/host-contract` | 跨平台渲染接口定义 |
| `@lytjs/common-*` | 30 个工具子包（constants, is, string, error 等） |

### L1: 核心原语层

| 包 | 描述 |
| --- | --- |
| `@lytjs/reactivity` | 响应式系统（ref, reactive, computed, watch） |
| `@lytjs/vdom` | 虚拟 DOM 和 diff 算法 |
| `@lytjs/compiler` | 模板编译器 |

### L2: 平台/组件层

| 包 | 描述 |
| --- | --- |
| `@lytjs/dom-runtime` | DOM 运行时工具 |
| `@lytjs/dom` | DOM 平台封装 |
| `@lytjs/component` | 组件系统 |

### L3: 平台适配层

| 包 | 描述 |
| --- | --- |
| `@lytjs/adapter-web` | Web 平台适配器 |

### L4: 核心应用层

| 包 | 描述 |
| --- | --- |
| `@lytjs/renderer` | DOM/SSR 渲染器 |
| `@lytjs/core` | 核心应用 API（完整版） |
| `@lytjs/core-vnode` | 核心应用 API（仅 VNode 模式） |
| `@lytjs/core-signal` | 核心应用 API（仅 Signal 模式） |

### L5: Web 工具层

| 包 | 描述 |
| --- | --- |
| `@lytjs/web` | Web 平台工具（CSS 变量、ResizeObserver、Web Components） |

## 安全特性

Lyt.js 内置多层安全防护：

- **XSS 防护** - v-html 自动转义，SSR 模式安全输出
- **CSP 支持** - 严格模式检测与优雅降级
- **输入验证** - 动态属性名、事件名、组件名验证
- **递归限制** - 组件递归深度限制（最大 100 层）
- **错误边界** - 完善的错误捕获与恢复机制

## 开发

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发指南。

## 许可证

MIT
