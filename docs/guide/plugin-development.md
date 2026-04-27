# Lyt.js 插件开发指南

本文档介绍如何为 Lyt.js 开发、测试和发布插件。

## 目录

- [快速入门](#快速入门)
- [插件 API 文档](#插件-api-文档)
- [插件类型系统](#插件类型系统)
- [插件生命周期](#插件生命周期)
- [插件开发最佳实践](#插件开发最佳实践)
- [插件发布流程](#插件发布流程)
- [示例插件参考](#示例插件参考)

---

## 快速入门

### 1. 创建插件项目

使用 `@lytjs/plugin-sdk` 提供的脚手架工具快速创建插件：

```js
import { PluginScaffold } from '@lytjs/plugin-sdk'

const scaffold = new PluginScaffold()
scaffold.create({
  name: 'my-plugin',
  description: '我的第一个 Lyt.js 插件',
  author: 'your-name',
  category: 'tool',
})
```

### 2. 手动创建

也可以手动创建插件项目结构：

```
lyt-plugin-my-plugin/
  src/
    index.ts        # 插件入口
  package.json      # 包配置
  README.md         # 文档
  tsconfig.json     # TypeScript 配置
```

### 3. 最小插件示例

```typescript
// src/index.ts

interface MyPluginOptions {
  prefix?: string
}

function createMyPlugin(options?: MyPluginOptions) {
  const { prefix = '[MyPlugin]' } = options || {}

  return {
    // 安装到 Lyt 应用
    install(app: any, _options?: any): void {
      app.config = app.config || {}
      app.config.globalProperties = app.config.globalProperties || {}

      // 注入全局属性
      app.config.globalProperties.$myPlugin = {
        hello(name: string) {
          console.log(`${prefix} Hello, ${name}!`)
        },
      }

      // 通过 provide 注入
      if (typeof app.provide === 'function') {
        app.provide('myPlugin', {
          hello: (name: string) => console.log(`${prefix} Hello, ${name}!`),
        })
      }
    },
  }
}

export { createMyPlugin }
export type { MyPluginOptions }
```

### 4. 使用插件

```typescript
import { createApp } from '@lytjs/core'
import { createMyPlugin } from 'lyt-plugin-my-plugin'

const app = createApp({ /* ... */ })
app.use(createMyPlugin({ prefix: '[Demo]' }))

// 在组件中访问
// this.$myPlugin.hello('World')
```

---

## 插件 API 文档

### 插件安装接口

所有 Lyt.js 插件必须实现 `install` 方法：

```typescript
interface LytPluginInstall {
  install(app: any, options?: any): void
}
```

#### `app` 参数

`app` 是 Lyt.js 应用实例，提供以下能力：

| 属性/方法 | 说明 |
|-----------|------|
| `app.config.globalProperties` | 全局属性注入点 |
| `app.provide(key, value)` | 依赖注入 |
| `app.use(plugin, options)` | 安装子插件 |

#### 注入全局属性

```typescript
install(app: any): void {
  app.config.globalProperties.$myUtil = {
    format(date: Date) {
      return date.toLocaleDateString()
    },
  }
}
```

#### 使用 provide/inject

```typescript
install(app: any): void {
  app.provide('myService', {
    getData() { return fetch('/api/data') },
  })
}
```

---

## 插件类型系统

### LytPlugin 接口

完整的插件类型定义（来自 `@lytjs/plugin-sdk`）：

```typescript
interface LytPlugin {
  /** 插件唯一名称 */
  name: string
  /** 插件版本号（语义化版本） */
  version: string
  /** 插件描述 */
  description: string
  /** 插件作者 */
  author: string
  /** 开源协议 */
  license: string
  /** 关键词列表 */
  keywords: string[]
  /** 入口文件路径 */
  main: string
  /** 插件分类 */
  category: LytPluginCategory
  /** 安装钩子 */
  install?: (api: LytPluginAPI) => void | Promise<void>
  /** 卸载钩子 */
  uninstall?: (api: LytPluginAPI) => void | Promise<void>
  /** 生命周期钩子 */
  hooks?: Partial<Record<LytPluginHook, (api: LytPluginAPI, ...args: any[]) => void | Promise<void>>>
  /** 配置 Schema */
  config?: LytPluginConfig
  /** 所需权限 */
  permissions?: LytPluginPermission[]
  /** 兼容的框架版本 */
  lytVersion?: string
}
```

### 插件分类

```typescript
type LytPluginCategory =
  | 'ui'           // UI 组件
  | 'tool'         // 工具类
  | 'integration'  // 第三方集成
  | 'theme'        // 主题样式
  | 'analytics'    // 数据分析
  | 'auth'         // 认证授权
  | 'storage'      // 数据存储
  | 'other'        // 其他
```

### 插件权限

```typescript
type LytPluginPermission =
  | 'storage'      // 本地存储
  | 'network'      // 网络请求
  | 'clipboard'    // 剪贴板
  | 'notification' // 通知
  | 'theme'        // 主题操作
  | 'router'       // 路由操作
  | 'i18n'         // 国际化
```

### 生命周期钩子

```typescript
type LytPluginHook =
  | 'beforeInstall'   // 安装前
  | 'afterInstall'    // 安装后
  | 'beforeUninstall' // 卸载前
  | 'afterUninstall'  // 卸载后
  | 'onEnable'        // 启用时
  | 'onDisable'       // 禁用时
  | 'onConfigChange'  // 配置变更时
```

---

## 插件生命周期

```
注册 (register)
    |
    v
安装前 (beforeInstall)
    |
    v
安装 (install)
    |
    v
安装后 (afterInstall)
    |
    v
启用 (onEnable)  <------->  禁用 (onDisable)
    |                           |
    v                           v
[运行中]                   [已禁用]
    |
    v
卸载前 (beforeUninstall)
    |
    v
卸载 (uninstall)
    |
    v
卸载后 (afterUninstall)
```

### 使用 PluginManager 管理生命周期

```typescript
import { PluginManager } from '@lytjs/plugin-sdk'

const manager = new PluginManager({ app })

// 注册插件
manager.register({
  name: 'lyt-plugin-demo',
  version: '1.0.0',
  description: '示例插件',
  author: 'your-name',
  license: 'MIT',
  keywords: ['demo'],
  main: 'dist/index.mjs',
  category: 'tool',
  install(api) {
    console.log('插件已安装')
  },
})

// 安装
await manager.install('lyt-plugin-demo')

// 启用
manager.enable('lyt-plugin-demo')

// 禁用
manager.disable('lyt-plugin-demo')

// 卸载
await manager.uninstall('lyt-plugin-demo')
```

---

## 插件开发最佳实践

### 1. 零运行时依赖

Lyt.js 插件应保持零运行时依赖，减少包体积和潜在冲突：

```typescript
// 推荐：使用原生 API
const data = JSON.parse(localStorage.getItem('key') || 'null')

// 不推荐：引入第三方库
import { get } from 'lodash-es'
```

### 2. 完善的 TypeScript 类型

```typescript
// 为所有公共 API 提供类型定义
interface MyPluginOptions {
  /** 前缀字符串，默认 '[Plugin]' */
  prefix?: string
  /** 是否启用调试模式 */
  debug?: boolean
}

interface MyPluginInstance {
  install(app: any, options?: MyPluginOptions): void
  doSomething(value: string): void
}
```

### 3. 命名规范

- 包名：`lyt-plugin-xxx` 或 `@scope/lyt-plugin-xxx`
- 导出函数：`createXxx()`
- 全局属性：`$xxx`

### 4. 错误处理

```typescript
function createMyPlugin(options?: MyPluginOptions) {
  return {
    install(app: any, _options?: any): void {
      try {
        // 插件逻辑
      } catch (error) {
        console.error('[MyPlugin] 安装失败:', error)
        // 静默降级，不阻塞应用
      }
    },
  }
}
```

### 5. 环境兼容

```typescript
const isBrowser = typeof window !== 'undefined'
const isNode = typeof process !== 'undefined'

function safeStorage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}
```

### 6. 配置 Schema

使用 JSON Schema 定义插件配置：

```typescript
const plugin: LytPlugin = {
  // ...
  config: {
    schema: {
      type: 'object',
      properties: {
        prefix: { type: 'string', default: '[Plugin]' },
        debug: { type: 'boolean', default: false },
      },
    },
    defaults: {
      prefix: '[Plugin]',
      debug: false,
    },
    required: [],
  },
}
```

---

## 插件发布流程

### 1. 准备 package.json

```json
{
  "name": "lyt-plugin-my-plugin",
  "version": "1.0.0",
  "description": "我的 Lyt.js 插件",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "license": "MIT",
  "author": "your-name",
  "keywords": ["lyt", "lytjs", "plugin"],
  "peerDependencies": {
    "@lytjs/core": ">=5.0.0"
  }
}
```

### 2. 编写 README.md

README 应包含：
- 插件简介
- 功能特性列表
- 安装命令
- 使用示例
- API 文档
- License 信息

### 3. 插件验证

使用 `PluginValidator` 验证插件元数据：

```typescript
import { PluginValidator } from '@lytjs/plugin-sdk'

const validator = new PluginValidator()
const result = validator.validate(myPlugin)

if (!result.valid) {
  console.error('验证失败:', result.errors)
}
if (result.warnings.length > 0) {
  console.warn('警告:', result.warnings)
}
```

### 4. 发布到注册表

```typescript
import { PluginRegistry } from '@lytjs/plugin-sdk'

const registry = new PluginRegistry('https://registry.lytjs.com')
const result = await registry.publish(myPlugin, authToken)

if (result.success) {
  console.log('发布成功!')
} else {
  console.error('发布失败:', result.error)
}
```

### 5. 发布到 npm

```bash
# 构建
npm run build

# 发布
npm publish --access public
```

---

## 示例插件参考

### 官方插件

| 插件 | 说明 | 分类 |
|------|------|------|
| `@lytjs/plugin-i18n` | 国际化插件 | tool |
| `@lytjs/plugin-auth` | 认证授权插件 | integration |
| `@lytjs/plugin-logger` | 日志插件 | tool |
| `@lytjs/plugin-storage` | 本地存储插件 | tool |
| `@lytjs/plugin-theme` | 主题切换插件 | theme |
| `@lytjs/plugin-chart` | 图表插件 | ui |
| `@lytjs/plugin-highlight` | 代码高亮插件 | ui |
| `@lytjs/plugin-virtual-list` | 虚拟列表插件 | ui |

### 插件模式参考

**工具类插件**（如 logger、storage）：
- 导出 `createXxx(options)` 工厂函数
- 实现 `install(app)` 方法
- 通过 `$xxx` 注入全局属性

**UI 组件插件**（如 chart、highlight）：
- 导出独立的 API 函数（如 `createChart`、`highlight`）
- 不依赖 Lyt.js 应用实例
- 可以独立使用

**集成类插件**（如 auth）：
- 导出 `createXxx(options)` 工厂函数
- 封装第三方服务交互
- 提供完整的状态管理 API
