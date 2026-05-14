# LytJS 插件开发指南

> 本指南帮助开发者创建符合 LytJS v6.0.0 规范的官方插件

## 📋 目录

- [插件概述](#插件概述)
- [创建新插件](#创建新插件)
- [插件结构](#插件结构)
- [配置说明](#配置说明)
- [API 设计](#api-设计)
- [测试编写](#测试编写)
- [构建发布](#构建发布)

---

## 插件概述

### 什么是 LytJS 插件？

LytJS 插件是基于 `definePlugin` API 创建的可插拔功能模块，提供以下特性：
- **可按需引入**：只引入需要的插件
- **配置灵活**：支持插件选项配置
- **生命周期管理**：统一的安装/卸载机制
- **依赖注入**：通过 provide/inject 与应用集成

### 官方插件列表

| 插件名称 | 包名 | 功能描述 |
|---------|------|---------|
| 主题插件 | `@lytjs/plugin-theme` | 深色/浅色主题、CSS 变量管理 |
| 日志插件 | `@lytjs/plugin-logger` | 日志分级、性能追踪、持久化 |
| 认证插件 | `@lytjs/plugin-auth` | 角色管理、权限验证 |
| 存储插件 | `@lytjs/plugin-storage` | localStorage/sessionStorage 封装 |
| 国际化插件 | `@lytjs/plugin-i18n` | 多语言支持、翻译插值 |
| Vite 插件 | `@lytjs/plugin-vite` | Vite 构建集成 |

---

## 创建新插件

### 1. 创建目录结构

```
packages/plugins/packages/plugin-xxx/
├── src/
│   ├── index.ts      # 插件入口
│   └── types.ts      # 类型定义
├── tests/
│   └── index.test.ts # 单元测试
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

### 2. 初始化 package.json

```json
{
  "name": "@lytjs/plugin-xxx",
  "version": "6.0.0",
  "description": "LytJS official plugin for...",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint \"src/**/*.ts\"",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@lytjs/core": "workspace:*",
    "@lytjs/reactivity": "workspace:*",
    "@lytjs/common-is": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^3.0.0"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://gitee.com/lytjs/lytjs.git",
    "directory": "packages/plugins/packages/plugin-xxx"
  },
  "keywords": ["lytjs", "plugin", "xxx"]
}
```

### 3. 配置 TypeScript

**tsconfig.json**
```json
{
  "extends": "../../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@lytjs/core": ["../../../core/dist/index.d.ts"],
      "@lytjs/reactivity": ["../../../reactivity/dist/index.d.ts"],
      "@lytjs/common-is": ["../../../common/packages/is/dist/index.d.ts"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 4. 配置 tsup

**tsup.config.ts**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
  external: [
    '@lytjs/core',
    '@lytjs/reactivity',
    '@lytjs/common-is',
  ],
});
```

### 5. 配置 Vitest

**vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, '../../../common/packages');
const pkgRoot = resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/core': `${pkgRoot}/../../core/dist/index.mjs`,
      '@lytjs/reactivity': `${pkgRoot}/../../reactivity/dist/index.mjs`,
      '@lytjs/common-is': `${commonRoot}/is/dist/index.mjs`,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

---

## 插件结构

### 基本插件代码模板

```typescript
/**
 * @lytjs/plugin-xxx
 *
 * LytJS official plugin description.
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import type { PluginOptions, PluginInstance } from './types';

/**
 * 创建插件实例
 */
export function createPlugin(options: PluginOptions = {}): PluginInstance {
  // 实现插件逻辑
  const state = signal(options.defaultValue || 'default');

  return {
    get value() {
      return state();
    },
    setValue(newValue: string) {
      state.set(newValue);
    },
  };
}

/**
 * 插件定义
 */
const pluginXxx = definePlugin({
  name: 'xxx',
  version: '6.0.0',
  description: 'LytJS official plugin description',
  author: 'LytJS Team',
  keywords: ['lytjs', 'plugin', 'xxx'],

  // 插件配置 Schema
  schema: {
    type: 'object',
    object: {
      properties: {
        option1: { type: 'string', default: 'value1' },
        option2: { type: 'boolean', default: false },
      },
    },
  },

  // 插件安装
  install(app, options) {
    const pluginInstance = createPlugin(options);

    // 挂载到全局属性
    app.config.globalProperties.$xxx = pluginInstance;

    // 提供依赖注入
    app.provide('lyt-xxx', pluginInstance);
  },
});

export default pluginXxx;
export type { PluginOptions, PluginInstance };
export { createPlugin };
```

---

## 配置说明

### 插件配置 Schema

LytJS 使用 ConfigSchema 进行配置验证：

```typescript
schema: {
  type: 'object',
  object: {
    properties: {
      // 字符串选项
      theme: { type: 'string', default: 'light' },
      // 数字选项
      maxSize: { type: 'number', default: 100 },
      // 布尔选项
      enabled: { type: 'boolean', default: true },
      // 数组选项
      whitelist: { type: 'array', default: [] },
      // 对象选项
      customConfig: { type: 'object', default: {} },
    },
  },
}
```

---

## API 设计

### 推荐的设计模式

#### 1. 创建函数 + 实例模式

```typescript
// 创建实例
function createInstance(options) {
  return {
    // 实例方法
  };
}

// 插件导出
export function createXxx(options) {
  return createInstance(options);
}

export default definePlugin({
  install(app, options) {
    app.config.globalProperties.$xxx = createInstance(options);
  },
});
```

#### 2. 响应式状态

```typescript
import { signal, computed, watch } from '@lytjs/reactivity';

function createPlugin() {
  const state = signal(initialValue);

  const derived = computed(() => {
    return state() * 2;
  });

  watch(state, (newValue) => {
    console.log('State changed:', newValue);
  });

  return {
    get value() { return state(); },
    set value(v) { state.set(v); },
    get doubled() { return derived(); },
  };
}
```

---

## 测试编写

### 测试文件模板

```typescript
/**
 * @lytjs/plugin-xxx 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import pluginXxx, { createXxx } from '../src/index';

describe('@lytjs/plugin-xxx', () => {
  describe('插件创建', () => {
    it('应该创建插件实例', () => {
      const plugin = createXxx();
      expect(plugin).toBeDefined();
    });

    it('应该使用自定义选项', () => {
      const plugin = createXxx({ option1: 'custom' });
      expect(plugin.option1).toBe('custom');
    });
  });

  describe('功能测试', () => {
    it('应该正确设置值', () => {
      const plugin = createXxx();
      plugin.value = 'new value';
      expect(plugin.value).toBe('new value');
    });

    it('应该计算派生值', () => {
      const plugin = createXxx({ value: 10 });
      expect(plugin.doubled).toBe(20);
    });
  });

  describe('插件集成', () => {
    it('应该导出插件', () => {
      expect(pluginXxx).toBeDefined();
      expect(pluginXxx.name).toBe('xxx');
    });

    it('应该有 install 方法', () => {
      expect(typeof pluginXxx.install).toBe('function');
    });
  });
});
```

### 运行测试

```bash
# 在插件目录中运行
cd packages/plugins/packages/plugin-xxx
pnpm test

# 运行带覆盖率的测试
pnpm test:coverage

# 监听模式
pnpm test:watch
```

---

## 构建发布

### 1. 本地构建

```bash
# 构建单个插件
cd packages/plugins/packages/plugin-xxx
pnpm build

# 构建所有插件
pnpm run build:plugins
```

### 2. 更新配置文件

#### 更新根目录 package.json

在 `build:plugins` 脚本中添加新插件：

```json
{
  "scripts": {
    "build:plugins": "pnpm --filter '@lytjs/plugin-vite' --filter '@lytjs/plugin-theme' --filter '@lytjs/plugin-logger' --filter '@lytjs/plugin-auth' --filter '@lytjs/plugin-storage' --filter '@lytjs/plugin-i18n' --filter '@lytjs/plugin-xxx' run build"
  }
}
```

#### 更新插件统一入口

在 `packages/plugins/packages/index.ts` 中添加导出：

```typescript
export { default as pluginXxx } from '@lytjs/plugin-xxx';
export type { PluginOptions, PluginInstance } from '@lytjs/plugin-xxx';
export { createXxx } from '@lytjs/plugin-xxx';
```

#### 更新 vitest 配置

在根目录 `vitest.config.ts` 中添加路径别名：

```typescript
resolve: {
  alias: {
    // ... 其他别名
    '@lytjs/plugin-xxx': resolve(root, 'packages/plugins/packages/plugin-xxx/dist/index.mjs'),
  },
},
```

#### 更新文档

- 在 `packages/plugins/README.md` 中添加插件介绍
- 在 `docs/development/ROADMAP_NEXT_STEPS.md` 中记录更新

### 3. 发布到 npm

```bash
# 登录 npm
npm login

# 发布
cd packages/plugins/packages/plugin-xxx
npm publish --access public
```

---

## 开发规范

### 必须遵守

1. **零第三方依赖**：运行时禁止引入任何第三方库
2. **使用现有工具**：优先使用 `@lytjs/common-*` 工具包
3. **TypeScript 严格模式**：不允许使用 `any` 类型
4. **中文注释**：所有公共 API 必须添加中文 JSDoc
5. **统一导出风格**：函数定义在前，统一导出在后

### 推荐实践

1. **单一职责**：每个插件专注一个功能
2. **配置 Schema**：使用 ConfigSchema 进行配置验证
3. **响应式状态**：使用 signal 管理状态
4. **依赖注入**：通过 provide/inject 提供功能
5. **完整测试**：测试覆盖率 ≥ 80%

---

## 示例插件参考

- [plugin-theme](file:///f:/trae/lytjs/packages/plugins/packages/plugin-theme/src/index.ts) - 主题插件
- [plugin-logger](file:///f:/trae/lytjs/packages/plugins/packages/plugin-logger/src/index.ts) - 日志插件
- [plugin-i18n](file:///f:/trae/lytjs/packages/plugins/packages/plugin-i18n/src/index.ts) - 国际化插件

---

## 常见问题

### Q: 如何处理 DOM 操作？
A: 使用原生 DOM API，或导入 `@lytjs/common-dom-helpers`

### Q: 如何处理日期时间？
A: 使用原生 `Date` 对象和 `Intl.DateTimeFormat`

### Q: 如何处理深拷贝？
A: 使用原生 `structuredClone()` 或自己实现

### Q: 如何处理 URL？
A: 使用原生 `URL` 和 `URLSearchParams` API

---

**文档版本**: v1.1
**最后更新**: 2026-05-14
**维护者**: LytJS Team
