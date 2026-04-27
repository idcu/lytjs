# @lytjs/plugin-sdk

Lyt.js 插件开发 SDK - 提供插件规范、开发工具和验证器。

## 简介

`@lytjs/plugin-sdk` 是 Lyt.js 框架的官方插件开发工具包，为插件开发者提供完整的开发体验：

- **类型系统** - 完整的 TypeScript 类型定义，涵盖插件清单、API、权限、配置等
- **插件管理器** - 管理插件生命周期（注册、安装、启用、禁用、卸载）
- **插件验证器** - 验证插件清单、配置、权限和框架兼容性
- **插件注册中心** - 与远程注册中心通信，支持搜索、发布、下载
- **插件脚手架** - 快速创建标准化的插件项目

## 安装

```bash
# 使用 pnpm（推荐）
pnpm add @lytjs/plugin-sdk

# 使用 npm
npm install @lytjs/plugin-sdk

# 使用 yarn
yarn add @lytjs/plugin-sdk
```

## 快速开始

### 创建插件项目

使用脚手架快速创建插件：

```typescript
import { PluginScaffold } from '@lytjs/plugin-sdk';

const scaffold = new PluginScaffold();

await scaffold.scaffold({
  name: 'my-tool',
  description: '我的自定义工具插件',
  author: 'your-name',
  category: 'tool',
  template: 'basic',
});
```

生成的目录结构：

```
lyt-plugin-my-tool/
├── package.json
├── tsconfig.json
├── lyt-plugin.json
├── src/
│   └── index.ts
└── README.md
```

### 编写插件

```typescript
// src/index.ts
import type { LytPluginAPI } from '@lytjs/plugin-sdk';

export interface MyToolOptions {
  prefix?: string;
  debug?: boolean;
}

export async function install(api: LytPluginAPI, options?: MyToolOptions): Promise<void> {
  api.logger.info('my-tool 插件已安装');

  // 读取和写入配置
  const prefix = api.config.get('prefix', '>>');
  api.config.set('initialized', true);

  // 使用持久化存储
  api.store.set('count', 0);

  // 监听事件
  api.on('app:ready', () => {
    api.logger.info('应用已就绪');
  });
}

export async function uninstall(api: LytPluginAPI): Promise<void> {
  api.logger.info('my-tool 插件已卸载');
}
```

### 在应用中使用插件

```typescript
import { createApp } from '@lytjs/core';
import { PluginManager } from '@lytjs/plugin-sdk';
import myTool from 'lyt-plugin-my-tool';

const app = createApp({});

// 创建插件管理器
const manager = new PluginManager({
  app,
  registryUrl: 'https://registry.lytjs.org',
});

// 注册并安装插件
manager.register(myTool);
await manager.install('lyt-plugin-my-tool');
manager.enable('lyt-plugin-my-tool');

// 监听插件事件
manager.on('install', (plugin) => {
  console.log(`插件 ${plugin.name} 已安装`);
});
```

## API 文档

### PluginManager

插件管理器，管理插件的完整生命周期。

```typescript
import { PluginManager } from '@lytjs/plugin-sdk';

const manager = new PluginManager({
  app,                    // 应用实例
  pluginDir: './plugins', // 插件存储目录（可选）
  registryUrl: 'https://registry.lytjs.org', // 注册中心 URL（可选）
  autoLoad: true,         // 自动加载（可选）
});
```

#### 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `register(plugin)` | 注册插件 | `LytPluginResult` |
| `unregister(name)` | 注销插件 | `LytPluginResult` |
| `install(name)` | 安装插件 | `Promise<LytPluginResult>` |
| `uninstall(name)` | 卸载插件 | `Promise<LytPluginResult>` |
| `enable(name)` | 启用插件 | `LytPluginResult` |
| `disable(name)` | 禁用插件 | `LytPluginResult` |
| `getPlugin(name)` | 获取插件信息 | `LytPluginManifest \| undefined` |
| `getAllPlugins()` | 获取所有插件 | `LytPluginManifest[]` |
| `getPluginsByCategory(category)` | 按分类获取 | `LytPluginManifest[]` |
| `search(query)` | 搜索插件 | `LytPluginManifest[]` |
| `checkUpdate(name)` | 检查更新 | `Promise<{current, latest} \| null>` |
| `update(name)` | 更新插件 | `Promise<LytPluginResult>` |
| `on(event, handler)` | 注册事件监听 | `() => void` |
| `emit(event, data)` | 触发事件 | `void` |

### PluginValidator

插件验证器，提供静态验证方法。

```typescript
import { PluginValidator } from '@lytjs/plugin-sdk';

// 验证插件清单
const result = PluginValidator.validateManifest(plugin);
if (!result.valid) {
  console.error('验证失败:', result.errors);
}

// 验证插件名称
PluginValidator.validateName('lyt-plugin-my-tool'); // true
PluginValidator.validateName('my-plugin');          // false

// 验证版本号
PluginValidator.validateVersion('1.0.0');   // true
PluginValidator.validateVersion('v1.0.0');  // false

// 验证兼容性
const compat = PluginValidator.validateCompatibility(plugin, '4.2.0');
```

#### 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `validateManifest(manifest)` | 验证插件清单 | `ValidationResult` |
| `validateConfig(config, schema)` | 验证插件配置 | `ValidationResult` |
| `validatePermissions(permissions)` | 验证权限列表 | `ValidationResult` |
| `validateCompatibility(plugin, version)` | 验证兼容性 | `ValidationResult` |
| `validateName(name)` | 验证名称规范 | `boolean` |
| `validateVersion(version)` | 验证版本号 | `boolean` |

### PluginRegistry

插件注册中心客户端，与远程注册中心通信。

```typescript
import { PluginRegistry } from '@lytjs/plugin-sdk';

const registry = new PluginRegistry('https://registry.lytjs.org');

// 搜索插件
const { plugins, total } = await registry.search('theme', {
  category: 'theme',
  page: 1,
  pageSize: 10,
  sort: 'popular',
});

// 获取热门插件
const popular = await registry.getPopular();

// 下载插件
const buffer = await registry.download('lyt-plugin-dark-mode', '1.0.0');

// 发布插件
await registry.publish(plugin, 'your-auth-token');
```

#### 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `publish(plugin, authToken)` | 发布插件 | `Promise<LytPluginResult>` |
| `search(query, options?)` | 搜索插件 | `Promise<{plugins, total}>` |
| `getPlugin(name)` | 获取插件详情 | `Promise<LytPlugin \| null>` |
| `getVersions(name)` | 获取版本列表 | `Promise<string[]>` |
| `getPopular()` | 获取热门插件 | `Promise<LytPlugin[]>` |
| `getRecent()` | 获取最近更新 | `Promise<LytPlugin[]>` |
| `download(name, version)` | 下载插件包 | `Promise<Buffer>` |
| `getCategories()` | 获取分类列表 | `Promise<CategoryInfo[]>` |

### PluginScaffold

插件脚手架，快速创建插件项目。

```typescript
import { PluginScaffold } from '@lytjs/plugin-sdk';

const scaffold = new PluginScaffold();

await scaffold.scaffold({
  name: 'my-ui-widget',
  description: '自定义 UI 组件插件',
  author: 'your-name',
  category: 'ui',
  template: 'ui',        // basic | ui | tool | integration
  outputDir: './plugins', // 可选，默认当前目录
  version: '1.0.0',       // 可选
  license: 'MIT',         // 可选
});
```

#### 模板类型

| 模板 | 说明 |
|------|------|
| `basic` | 基础模板，包含最小化的 install/uninstall |
| `ui` | UI 模板，包含组件注册和路由配置 |
| `tool` | 工具模板，包含全局方法注册 |
| `integration` | 集成模板，包含第三方服务连接 |

## 插件规范

### 清单格式

每个插件需要在 `lyt-plugin.json` 中声明清单：

```json
{
  "name": "lyt-plugin-my-tool",
  "version": "1.0.0",
  "description": "插件描述",
  "author": "作者名称",
  "license": "MIT",
  "keywords": ["lyt", "plugin", "tool"],
  "main": "./dist/index.mjs",
  "category": "tool",
  "icon": "https://example.com/icon.png",
  "homepage": "https://example.com",
  "repository": "https://gitee.com/user/lyt-plugin-my-tool",
  "permissions": ["storage"],
  "peerDependencies": {
    "@lytjs/core": "^4.0.0"
  }
}
```

### 命名规范

插件名称必须符合以下格式之一：

- `lyt-plugin-xxx` - 标准格式
- `@scope/lyt-plugin-xxx` - 作用域格式

```typescript
import { PluginValidator } from '@lytjs/plugin-sdk';

PluginValidator.validateName('lyt-plugin-dark-mode');     // true
PluginValidator.validateName('@myorg/lyt-plugin-auth');   // true
PluginValidator.validateName('dark-mode');                // false
PluginValidator.validateName('lyt-dark-mode');            // false
```

### 版本要求

插件版本号必须遵循语义化版本规范（semver）：

```
主版本号.次版本号.修订号
1.0.0
2.1.3
1.0.0-beta.1
```

### 插件分类

| 分类 | 说明 |
|------|------|
| `ui` | UI 组件、主题、样式相关 |
| `tool` | 开发工具、构建辅助 |
| `integration` | 第三方服务集成 |
| `theme` | 主题、外观定制 |
| `analytics` | 数据分析、统计 |
| `auth` | 认证、授权 |
| `storage` | 数据存储、缓存 |
| `other` | 其他 |

### 权限列表

| 权限 | 说明 |
|------|------|
| `storage` | 持久化存储 |
| `network` | 网络请求 |
| `clipboard` | 剪贴板访问 |
| `notification` | 系统通知 |
| `theme` | 主题修改 |
| `router` | 路由操作 |
| `i18n` | 国际化 |

## 插件生命周期

插件的生命周期包含以下阶段：

```
注册 (register)
  ↓
安装 (install)
  ├── beforeInstall 钩子
  ├── install 方法
  └── afterInstall 钩子
  ↓
启用 (enable)
  └── onEnable 钩子
  ↓
运行中 (active)
  └── onConfigChange 钩子（配置变更时）
  ↓
禁用 (disable)
  └── onDisable 钩子
  ↓
卸载 (uninstall)
  ├── beforeUninstall 钩子
  ├── uninstall 方法
  └── afterUninstall 钩子
  ↓
注销 (unregister)
```

## 配置 Schema 示例

插件可以通过 `config` 字段声明配置 Schema：

```typescript
import type { LytPlugin } from '@lytjs/plugin-sdk';

const myPlugin: LytPlugin = {
  name: 'lyt-plugin-my-tool',
  version: '1.0.0',
  description: '带配置的插件示例',
  author: 'your-name',
  license: 'MIT',
  keywords: ['tool'],
  main: './dist/index.mjs',
  category: 'tool',
  permissions: ['storage'],

  config: {
    schema: {
      type: 'object',
      properties: {
        themeColor: {
          type: 'string',
          default: '#1890ff',
          description: '主题色',
        },
        maxItems: {
          type: 'number',
          default: 100,
          minimum: 1,
          maximum: 1000,
          description: '最大项目数',
        },
        enabled: {
          type: 'boolean',
          default: true,
          description: '是否启用',
        },
        mode: {
          type: 'string',
          enum: ['light', 'dark', 'auto'],
          default: 'auto',
          description: '显示模式',
        },
      },
    },
    defaults: {
      themeColor: '#1890ff',
      maxItems: 100,
      enabled: true,
      mode: 'auto',
    },
    required: ['themeColor'],
  },

  async install(api) {
    // 读取配置
    const color = api.config.get('themeColor');
    const max = api.config.get('maxItems');
    const mode = api.config.get('mode');

    api.logger.info(`配置: color=${color}, max=${max}, mode=${mode}`);
  },
};
```

## 发布流程

### 1. 准备插件

确保插件通过验证：

```typescript
import { PluginValidator } from '@lytjs/plugin-sdk';

const result = PluginValidator.validateManifest(myPlugin);
if (!result.valid) {
  console.error('验证失败:', result.errors);
  return;
}
if (result.warnings.length > 0) {
  console.warn('警告:', result.warnings);
}
```

### 2. 构建插件

```bash
pnpm build
```

### 3. 发布到注册中心

```typescript
import { PluginRegistry } from '@lytjs/plugin-sdk';

const registry = new PluginRegistry('https://registry.lytjs.org');

const result = await registry.publish(myPlugin, 'your-auth-token');
if (result.success) {
  console.log('发布成功!');
} else {
  console.error('发布失败:', result.error);
}
```

## 许可

MIT
