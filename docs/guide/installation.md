# 安装

## 系统要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0（推荐）

## 选择渲染模式

LytJS 提供两种核心渲染模式，安装时请根据需求选择：

| 模式 | 包名 | 说明 |
|------|------|------|
| VNode 模式 | `@lytjs/core` | 默认模式，使用虚拟 DOM diff |
| Signal 模式 | `@lytjs/core-signal` | 细粒度响应式更新，性能更高 |

## 包管理器

推荐使用 pnpm：

```bash
# VNode 模式（默认）
pnpm add @lytjs/core

# Signal 模式
pnpm add @lytjs/core-signal
```

也支持 npm 和 yarn：

```bash
# npm
npm install @lytjs/core
npm install @lytjs/core-signal

# yarn
yarn add @lytjs/core
yarn add @lytjs/core-signal
```

## 按需引入

LytJS 采用模块化架构，你可以只安装需要的包：

```bash
# 只需要响应式系统
pnpm add @lytjs/reactivity

# 只需要工具函数
pnpm add @lytjs/common-is
pnpm add @lytjs/common-object

# 需要路由
pnpm add @lytjs/router（规划中）

# 需要状态管理
pnpm add @lytjs/store（规划中）
```

## 独立渲染模式包

除了默认的 `@lytjs/core`，LytJS 提供独立的渲染模式包：

### @lytjs/core-vnode

VNode 模式的独立包，等同于 `@lytjs/core`：

```bash
pnpm add @lytjs/core-vnode
```

### @lytjs/core-signal

Signal 模式的独立包：

```bash
pnpm add @lytjs/core-signal
```

::: warning 注意
`@lytjs/core-vnode` 和 `@lytjs/core-signal` 是独立的渲染模式包，**不支持在同一应用中混合使用**。请根据项目需求选择一种渲染模式，并在整个应用中保持一致。
:::

## TypeScript

LytJS 使用 TypeScript 编写，类型定义已内置，无需额外安装 `@types` 包。

### 类型守卫

LytJS 提供了完整的类型守卫函数，用于在运行时判断响应式类型：

```typescript
import { 
  isRef, 
  isReactive, 
  isReadonly, 
  isProxy,
  isShallowRef,
  isComputedRef,
  isSignal 
} from '@lytjs/reactivity';

const count = ref(0);
const state = reactive({ name: 'LytJS' });
const doubled = computed(() => count.value * 2);
const sig = signal(0);

if (isRef(count)) {
  console.log('count 是一个 Ref');
}

if (isShallowRef(count)) {
  console.log('count 是一个浅层 Ref');
}

if (isComputedRef(doubled)) {
  console.log('doubled 是一个计算属性 Ref');
}

if (isReactive(state)) {
  console.log('state 是一个响应式对象');
}

if (isSignal(sig)) {
  console.log('sig 是一个 Signal');
}
```

## 浏览器兼容性

| 浏览器  | 版本  |
| :------ | :---- |
| Chrome  | >= 80 |
| Firefox | >= 78 |
| Safari  | >= 14 |
| Edge    | >= 80 |

## 开发工具

### Vite 插件

LytJS 提供官方 Vite 插件，支持模板编译和热更新：

```bash
pnpm add @lytjs/vite-plugin -D
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import lytjs from '@lytjs/vite-plugin';

export default defineConfig({
  plugins: [lytjs()],
});
```

### ESLint 插件

```bash
pnpm add eslint-plugin-lytjs -D
```

## 下一步

- [快速开始](./getting-started) - 创建你的第一个 LytJS 应用
- [响应式系统](./reactivity) - 深入理解响应式原理
- [渲染模式](./rendering-modes) - 了解 VNode 和 Signal 模式的详细区别
