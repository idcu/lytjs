# @lytjs/di

> LytJS 独立通用依赖注入系统，零框架依赖。提供 `InjectionToken`、Provider 树、生命周期作用域与依赖解析能力。

[![npm version](https://img.shields.io/npm/v/@lytjs/di.svg)](https://www.npmjs.com/package/@lytjs/di)
[![license](https://img.shields.io/npm/l/@lytjs/di.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/di` 是从框架中抽离出的独立通用依赖注入系统，不依赖任何框架运行时，可在任意 JavaScript / TypeScript 项目中使用。它以纯 Provider 树为核心，通过 `InjectionToken`、生命周期作用域与依赖解析器提供类型安全、可嵌套、支持作用域的注入能力，供框架内部及外部项目复用。

### 核心特性

- **类型安全令牌**：`InjectionToken` 携带泛型类型、工厂函数与生命周期元数据
- **Provider 树**：支持嵌套节点层级，子作用域可覆盖父作用域的值
- **生命周期管理**：`singleton` / `scoped` / `transient` 三种生命周期
- **零框架依赖**：仅依赖 `@lytjs/common-is` 工具包
- **作用域可扩展**：通过 `setProviderScopeFactory` 注入任意满足 `ProviderScope` 结构的实现（如响应式 `EffectScope`）

## 安装

```bash
npm install @lytjs/di
```

或使用 pnpm：

```bash
pnpm add @lytjs/di
```

## 依赖关系

`@lytjs/di` 依赖以下 LytJS 基础工具包：

- `@lytjs/common-is` - 类型判断工具

## 快速开始

### 使用 InjectionToken 与 provide / inject

```typescript
import { InjectionToken, withProviderScope, provideValue, injectValue } from '@lytjs/di';

const API_URL = new InjectionToken<string>('api-url');

const url = withProviderScope(() => {
  provideValue(API_URL, 'https://api.example.com');
  return injectValue(API_URL);
});
// '/api' → 'https://api.example.com'
```

### 携带工厂与生命周期的 Token

```typescript
import { InjectionToken } from '@lytjs/di';

let count = 0;
const Session = new InjectionToken<number>('session', {
  factory: () => ++count,
  lifecycle: 'singleton',
});
```

### 使用 ProviderConfig 提供值

```typescript
import { provideValue } from '@lytjs/di';

provideValue('db', {
  provide: { connect: () => {} },
  lifecycle: 'scoped',
});

provideValue('db-factory', {
  useFactory: () => ({ connect: () => {} }),
  lifecycle: 'transient',
});
```

## 主要 API

### `InjectionToken<T>`

类型安全的注入令牌，可携带元数据。

```typescript
import { InjectionToken, isInjectionToken } from '@lytjs/di';

const USER = new InjectionToken<User>('user', {
  factory: () => fetchUser(),
  lifecycle: 'singleton',
});

isInjectionToken(USER); // true
```

Token 属性：`description`（描述）、`__token`（唯一标识）、`factory`（工厂函数）、`lifecycle`（生命周期）。

### `withProviderScope` / `enterProviderScope` / `exitProviderScope`

创建并进入 Provider 作用域，作用域内 `provideValue` 写入当前节点，`injectValue` 沿父链查找。

```typescript
import { withProviderScope, enterProviderScope, exitProviderScope } from '@lytjs/di';

withProviderScope(() => {
  provideValue('key', 'value');
  return injectValue('key'); // 'value'
});

// 或手动管理
const node = enterProviderScope();
try {
  provideValue('key', 'value');
} finally {
  exitProviderScope();
}
```

### `provideValue` / `provideToNode`

向当前上下文或指定节点提供值。

```typescript
import { provideValue, provideToNode, createProviderNode } from '@lytjs/di';

provideValue('key', 'root');

const node = createProviderNode();
provideToNode(node, 'key', { provide: 'child', lifecycle: 'scoped' });
```

### `injectValue` / `injectFromNode`

解析注入值。解析顺序：当前 Provider 节点链 → 全局根节点链 → 令牌工厂 → 默认值 / 抛错。

```typescript
import { injectValue, injectFromNode, getCurrentProviderNode } from '@lytjs/di';

const val = injectValue('key', { optional: true });
const val2 = injectValue('key', { default: 'fallback' });
```

`EnhancedInjectOptions` 支持 `optional`、`default`、`from`、`local`、`skipSelf`。

### `createProviderRecord` / `resolveKey`

底层工具函数，构造 Provider 记录与解析 key 标识。

## Provider 生命周期

- `singleton`：全局单例，同一 Provider 节点内复用
- `scoped`：作用域内复用
- `transient`：按需解析，每次返回新的实例（值为函数时每次调用）

## 作用域扩展

`@lytjs/di` 保持零框架依赖，通过 `setProviderScopeFactory` 注入任意满足 `ProviderScope` 结构的作用域实现。

```typescript
import { setProviderScopeFactory, getProviderScopeFactory } from '@lytjs/di';
import type { ProviderScope } from '@lytjs/di';

setProviderScopeFactory(() => {
  return {
    active: true,
    run: (fn) => fn(),
    stop: () => {},
  } as ProviderScope;
});
```

## TypeScript 类型

`@lytjs/di` 导出的核心类型：

```typescript
type ProviderLifecycle = 'singleton' | 'scoped' | 'transient';

interface ProviderConfig<T = unknown> {
  provide?: T;
  useFactory?: () => T;
  useExisting?: InjectionToken<T> | string | symbol;
  lifecycle?: ProviderLifecycle;
  optional?: boolean;
}

interface ProviderRecord {
  value: unknown;
  lifecycle: ProviderLifecycle;
  scope?: unknown;
  instanceId?: symbol;
}

interface EnhancedInjectOptions<T = unknown> {
  optional?: boolean;
  default?: T | (() => T);
  from?: InjectionToken<T> | string | symbol;
  local?: boolean;
  skipSelf?: boolean;
}
```

## 浏览器兼容性

`@lytjs/di` 面向纯环境使用，兼容 Node.js 与现代浏览器。

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)