# @lytjs/config

> LytJS 独立通用配置系统，零框架依赖。提供配置存储、结构校验、默认值/类型转换等能力。

[![npm version](https://img.shields.io/npm/v/@lytjs/config.svg)](https://www.npmjs.com/package/@lytjs/config)
[![license](https://img.shields.io/npm/l/@lytjs/config.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/config` 是从 `@lytjs/core` 中抽离出的独立通用配置系统，不依赖任何框架运行时，可在任意 JavaScript / TypeScript 项目中使用。它提供配置管理、Schema 校验、默认值与类型转换三层能力，方便在框架外复用相同的配置逻辑。

### 核心特性

- **配置存储**：`ConfigManager` 提供点号路径读写、深度合并、变更监听
- **结构校验**：JSON Schema 风格的定义，支持字符串/数字/布尔/对象/数组/枚举/联合类型
- **转换与默认值**：自动应用默认值、执行类型转换、收集警告
- **零框架依赖**：仅依赖 `@lytjs/common-is` 与 `@lytjs/common-object` 工具包
- **完全类型安全**：完整的 TypeScript 类型推导

## 安装

```bash
npm install @lytjs/config
```

或使用 pnpm：

```bash
pnpm add @lytjs/config
```

## 依赖关系

`@lytjs/config` 依赖以下 LytJS 基础工具包：

- `@lytjs/common-is` - 类型判断工具
- `@lytjs/common-object` - 对象工具函数

## 快速开始

### 使用配置管理器

```typescript
import { ConfigManager } from '@lytjs/config';

const config = new ConfigManager({
  api: { baseURL: '/api', timeout: 5000 },
  theme: { primary: '#007bff' },
});

// 获取配置（支持点号路径）
const baseURL = config.get('api.baseURL'); // '/api'

// 设置配置
config.set('api.timeout', 10000);

// 监听变更
const unwatch = config.watch('theme.primary', (newVal, oldVal) => {
  console.log(`主题色从 ${oldVal} 变为 ${newVal}`);
});
```

### 使用 Schema 校验

```typescript
import { validateConfig } from '@lytjs/config';
import type { ConfigSchema } from '@lytjs/config';

const schema: ConfigSchema<string> = {
  type: 'string',
  string: { minLength: 5, format: 'email' },
};

const report = validateConfig('user@example.com', schema);
console.log(report.valid); // true
```

### 使用转换与默认值

```typescript
import { transformConfig } from '@lytjs/config';
import type { ConfigSchema } from '@lytjs/config';

const schema: ConfigSchema<number> = {
  type: 'number',
  default: 42,
  transform: (value) => (typeof value === 'string' ? parseInt(value, 10) : value),
};

const report = transformConfig('50', schema);
console.log(report.config); // 50
```

### 读写的约定（2026-11-04）

- **`get()` 返回的是拷贝**：改它不会影响内部状态，也不会触发监听器（要改请用 `set()`）。
  `getAll()` 同样返回深拷贝。
- **路径段安全**：`get` / `set` / `has` / `delete` 都拒绝 `__proto__` / `constructor` /
  `prototype` 这三段（否则会把值写进 `Object.prototype`，污染进程内所有对象）。
- **监听是完整的**：`set` / `delete` / `merge` / `setMultiple` 都会通知；
  `delete` 与 `setMultiple(config, false)` 里**被移除的键**也会以 `undefined` 通知。

### Schema 的两种写法

```typescript
// ① 本包规范写法（推荐）
const schema: ConfigSchema<{ port: number }> = {
  type: 'object',
  object: { properties: { port: { type: 'number', required: true } } },
};

// ② 扁平 JSON Schema 写法（同样支持）
const flat: ConfigSchema<{ port: number }> = {
  type: 'object',
  properties: { port: { type: 'number', required: true } },
};
```

> ⚠️ 2026-11-04 之前，写法 ② 会被**静默忽略**：`validateConfig()` 返回 `valid: true`，
> 实际一条规则都没跑。现在两种写法等价。

## 主要 API

### `ConfigManager`

配置管理器，支持配置的存储、合并、变更监听。

```typescript
import { ConfigManager } from '@lytjs/config';

const config = new ConfigManager({ api: { baseURL: '/api' } }, { mutable: true, deepMerge: true });
```

常用方法：`get(path, defaultValue)`、`set(path, value)`、`has(path)`、`delete(path)`、`merge(config)`、`getAll()`、`reset(newConfig)`、`clear()`、`watch(path, callback)`、`setMultiple(config)`、`setMutable(mutable)`、`isMutable()`。

### `ConfigValidator` / `validateConfig`

根据 `ConfigSchema` 校验配置值。

```typescript
import { ConfigValidator, validateConfig } from '@lytjs/config';

const validator = new ConfigValidator();
const report = validator.validate(value, schema);
```

`validateConfig(value, schema)` 是便捷函数，直接返回校验报告。

### `ConfigTransformer` / `transformConfig` / `mergeConfig`

应用默认值、执行类型转换并校验。

```typescript
import { ConfigTransformer, transformConfig, mergeConfig } from '@lytjs/config';

const transformer = new ConfigTransformer();
const report = transformConfig(input, schema);
const merged = mergeConfig(defaults, overrides, schema);
```

## TypeScript 类型

`@lytjs/config` 导出的核心类型：

```typescript
// 配置管理器类型
type ConfigValue = string | number | boolean | null | undefined | ConfigObject | ConfigArray;
interface ConfigObject {
  [key: string]: ConfigValue;
}

// Schema 定义
type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum' | 'union';
interface ConfigSchema<T = unknown> {
  type: SchemaType; /* ... */
}

// 校验 / 转换报告
interface ConfigValidationReport {
  valid: boolean; /* ... */
}
interface ConfigTransformReport<T> {
  config: T; /* ... */
}
```

## 浏览器兼容性

`@lytjs/config` 面向纯环境使用，兼容 Node.js 与现代浏览器。

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
