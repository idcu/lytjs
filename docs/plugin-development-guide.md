# Lyt.js 插件开发教程

## 目录

- [1. 概述](#1-概述)
- [2. 插件类型](#2-插件类型)
  - [2.1 应用级插件](#21-应用级插件)
  - [2.2 组件级插件](#22-组件级插件)
  - [2.3 渲染器插件](#23-渲染器插件)
- [3. 快速开始](#3-快速开始)
- [4. 插件 API](#4-插件-api)
  - [4.1 install(app) 方法](#41-installapp-方法)
  - [4.2 app.provide / app.inject](#42-appprovide--appinject)
  - [4.3 app.component](#43-appcomponent)
  - [4.4 app.directive](#44-appdirective)
- [5. 示例插件](#5-示例插件)
  - [5.1 日志插件](#51-日志插件)
  - [5.2 主题插件](#52-主题插件)
  - [5.3 国际化插件](#53-国际化插件)
- [6. 插件测试](#6-插件测试)
- [7. 发布插件](#7-发布插件)
- [8. 最佳实践](#8-最佳实践)

---

## 1. 概述

Lyt.js 的插件系统是其核心架构的重要组成部分，采用与 Vue 3 类似的 `app.use()` 模式，为开发者提供了灵活、可组合的扩展机制。

### 设计理念

- **渐进式增强**：插件按需加载，不影响核心框架体积
- **依赖注入**：通过 `provide/inject` 实现跨层级数据共享
- **类型安全**：完整的 TypeScript 类型支持
- **可组合性**：多个插件可以协同工作，互不冲突
- **生命周期管理**：提供安装、启用、禁用、卸载等完整生命周期钩子

### 插件系统架构

```
Lyt App
  |
  +-- app.use(PluginA)  -->  PluginA.install(app)
  |     |
  |     +-- app.provide('serviceA', ...)
  |     +-- app.component('CompA', ...)
  |     +-- app.directive('dirA', ...)
  |
  +-- app.use(PluginB)  -->  PluginB.install(app)
        |
        +-- app.provide('serviceB', ...)
        +-- app.component('CompB', ...)
```

---

## 2. 插件类型

### 2.1 应用级插件

应用级插件通过 `app.use()` 安装到整个应用实例，是最常用的插件类型。它们在应用创建时注册，对所有组件生效。

**特点**：
- 通过 `app.use(plugin)` 安装
- 可以访问完整的应用实例 API
- 适合全局功能（路由、状态管理、国际化等）

```typescript
// 应用级插件的基本结构
interface AppPlugin {
  install: (app: LytApp, ...options: any[]) => void
}

// 或者使用工厂函数
function createMyPlugin(options?: PluginOptions): AppPlugin {
  return {
    install(app, ...args) {
      // 插件逻辑
    }
  }
}
```

**使用示例**：

```typescript
import { createApp } from '@lytjs/core'
import { createRouter } from '@lytjs/plugin-router'
import { createI18n } from '@lytjs/plugin-i18n'

const app = createApp(App)

// 安装应用级插件
app.use(createRouter({ routes }))
app.use(createI18n({ locale: 'zh-CN', messages }))
```

### 2.2 组件级插件

组件级插件作用于特定组件或组件树，通过 `provide/inject` 机制在组件层级传递。

**特点**：
- 在组件的 `setup()` 中注册
- 通过 `provide` 向子组件注入
- 适合局部功能（表单验证、数据加载等）

```typescript
import { defineComponent, provide, ref } from '@lytjs/core'

// 父组件提供插件服务
const ParentComponent = defineComponent({
  name: 'ParentComponent',
  setup() {
    const formState = ref({})

    // 向子组件注入表单上下文
    provide('formContext', {
      register(field: string, rules: any[]) {
        // 注册表单字段
      },
      validate() {
        // 验证表单
        return true
      }
    })

    return {}
  }
})

// 子组件使用插件服务
const ChildComponent = defineComponent({
  name: 'ChildComponent',
  setup() {
    const formContext = inject('formContext')

    // 使用注入的服务
    formContext?.register('username', [
      { required: true, message: '请输入用户名' }
    ])

    return {}
  }
})
```

### 2.3 渲染器插件

渲染器插件扩展 Lyt.js 的渲染能力，自定义 DOM 操作或创建自定义渲染器。

**特点**：
- 通过自定义渲染器 API 扩展
- 可以实现 SSR、Canvas 渲染、终端渲染等
- 适合底层渲染定制

```typescript
import { createRenderer } from '@lytjs/core'

// 自定义 Canvas 渲染器插件
function createCanvasPlugin(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!

  return {
    install(app: any) {
      const renderer = createRenderer({
        createElement(type) {
          return { type, props: {}, children: [] }
        },
        setElementText(node, text) {
          node.text = text
        },
        patchProp(node, key, prevValue, nextValue) {
          node.props[key] = nextValue
        },
        insert(node, parent, anchor) {
          // Canvas 绘制逻辑
          ctx.fillText(node.text || '', 10, 10)
        },
        remove(node) {
          // Canvas 清除逻辑
        }
      })

      app.config.renderer = renderer
    }
  }
}
```

---

## 3. 快速开始

### 步骤 1：创建插件项目

```bash
mkdir lyt-plugin-my-plugin
cd lyt-plugin-my-plugin
```

### 步骤 2：初始化项目

```bash
npm init -y
npm install typescript @lytjs/core --save-dev
```

### 步骤 3：创建插件入口文件

```typescript
// src/index.ts

import type { App } from '@lytjs/core'

export interface MyPluginOptions {
  /** 前缀字符串 */
  prefix?: string
  /** 是否启用调试模式 */
  debug?: boolean
}

export function createMyPlugin(options: MyPluginOptions = {}) {
  const { prefix = '[MyPlugin]', debug = false } = options

  return {
    install(app: App) {
      // 1. 注入全局属性
      app.config.globalProperties.$myPlugin = {
        version: '1.0.0',
        prefix,
        debug,
      }

      // 2. 通过 provide 提供服务
      app.provide('myPluginOptions', options)

      // 3. 注册全局组件（可选）
      // app.component('MyPluginComponent', MyComponent)

      // 4. 注册全局指令（可选）
      // app.directive('my-directive', myDirective)

      if (debug) {
        console.log(`${prefix} Plugin installed successfully`)
      }
    },
  }
}
```

### 步骤 4：配置 TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

### 步骤 5：配置 package.json

```json
{
  "name": "@lytjs/plugin-my-plugin",
  "version": "1.0.0",
  "description": "My Lyt.js plugin",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "peerDependencies": {
    "@lytjs/core": ">=5.0.0"
  },
  "devDependencies": {
    "@lytjs/core": ">=5.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 步骤 6：在应用中使用

```typescript
import { createApp } from '@lytjs/core'
import { createMyPlugin } from '@lytjs/plugin-my-plugin'
import App from './App.lyt'

const app = createApp(App)

app.use(createMyPlugin({
  prefix: '[Demo]',
  debug: true,
}))

app.mount('#app')
```

---

## 4. 插件 API

### 4.1 install(app) 方法

`install` 是每个插件必须实现的方法，在 `app.use()` 调用时自动执行。

```typescript
interface PluginInstallFunction {
  (app: App, ...options: any[]): void
}
```

**app 实例提供的核心 API**：

| API | 说明 |
|-----|------|
| `app.config` | 应用配置对象 |
| `app.config.globalProperties` | 全局属性，可通过 `this.$xxx` 访问 |
| `app.provide(key, value)` | 提供依赖注入 |
| `app.use(plugin, options)` | 安装子插件 |
| `app.component(name, component)` | 注册全局组件 |
| `app.directive(name, directive)` | 注册全局指令 |
| `app.mixin(mixin)` | 全局混入 |
| `app.mount(rootContainer)` | 挂载应用 |
| `app.unmount()` | 卸载应用 |

**完整示例**：

```typescript
import type { App } from '@lytjs/core'
import MyComponent from './MyComponent.vue'
import { myDirective } from './directives'

export function createFullPlugin() {
  return {
    install(app: App) {
      // 设置全局配置
      app.config.globalProperties.$version = '1.0.0'

      // 依赖注入
      app.provide('pluginService', {
        getData() { return 'hello' }
      })

      // 注册全局组件
      app.component('MyComponent', MyComponent)

      // 注册全局指令
      app.directive('focus', {
        mounted(el) {
          el.focus()
        }
      })

      // 安装子插件
      // app.use(subPlugin)
    }
  }
}
```

### 4.2 app.provide / app.inject

`provide` 和 `inject` 是 Lyt.js 的依赖注入机制，允许插件向组件树中注入数据和服务。

**app.provide(key, value)**

在插件安装时提供数据，所有后代组件都可以通过 `inject` 获取：

```typescript
// 插件中提供
app.provide('config', {
  apiBaseUrl: 'https://api.example.com',
  timeout: 5000,
})

app.provide('httpClient', {
  async get(url: string) {
    const response = await fetch(url)
    return response.json()
  },
  async post(url: string, data: any) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },
})
```

**inject(key, defaultValue)**

在组件中获取注入的数据：

```typescript
import { defineComponent, inject } from '@lytjs/core'

const MyComponent = defineComponent({
  name: 'MyComponent',
  setup() {
    // 获取注入的配置
    const config = inject('config')
    const httpClient = inject('httpClient')

    // 带默认值
    const theme = inject('theme', 'light')

    // 使用 TypeScript 类型
    const config2 = inject<{ apiBaseUrl: string; timeout: number }>('config')

    return { config, theme }
  }
})
```

**provide/inject 的响应式**：

```typescript
import { reactive, ref } from '@lytjs/core'

// 提供响应式数据
app.provide('counter', ref(0))
app.provide('userState', reactive({
  name: '',
  isLoggedIn: false,
}))

// 在组件中修改会触发更新
const counter = inject<import('@lytjs/core').Ref<number>>('counter')
counter.value++ // 触发响应式更新
```

### 4.3 app.component

通过 `app.component()` 注册全局组件，使其在应用中的任何模板中都可以直接使用。

```typescript
import { defineComponent, h } from '@lytjs/core'

// 定义组件
const MyButton = defineComponent({
  name: 'MyButton',
  props: {
    type: { type: String, default: 'default' },
    size: { type: String, default: 'medium' },
  },
  setup(props, { slots }) {
    return () => h(
      'button',
      { class: [`btn-${props.type}`, `btn-${props.size}`] },
      slots.default?.()
    )
  }
})

// 在插件中注册
export function createUIPlugin() {
  return {
    install(app: any) {
      // 注册单个组件
      app.component('MyButton', MyButton)

      // 批量注册组件
      const components = {
        MyButton,
        MyInput: defineComponent({ /* ... */ }),
        MyModal: defineComponent({ /* ... */ }),
      }

      for (const [name, component] of Object.entries(components)) {
        app.component(name, component)
      }
    }
  }
}
```

### 4.4 app.directive

通过 `app.directive()` 注册自定义指令，扩展模板的 DOM 操作能力。

```typescript
// 在插件中注册指令
export function createDirectivesPlugin() {
  return {
    install(app: any) {
      // v-focus: 自动聚焦
      app.directive('focus', {
        mounted(el: HTMLElement) {
          el.focus()
        }
      })

      // v-permission: 权限控制
      app.directive('permission', {
        mounted(el: HTMLElement, binding: any) {
          const requiredPermission = binding.value
          const userPermissions = inject('userPermissions', [])

          if (!userPermissions.includes(requiredPermission)) {
            el.parentNode?.removeChild(el)
          }
        }
      })

      // v-loading: 加载状态
      app.directive('loading', {
        mounted(el: HTMLElement, binding: any) {
          if (binding.value) {
            el.classList.add('is-loading')
            el.setAttribute('data-loading', 'true')
          }
        },
        updated(el: HTMLElement, binding: any) {
          if (binding.value) {
            el.classList.add('is-loading')
            el.setAttribute('data-loading', 'true')
          } else {
            el.classList.remove('is-loading')
            el.removeAttribute('data-loading')
          }
        }
      })

      // v-debounce: 防抖指令
      app.directive('debounce', {
        mounted(el: HTMLElement, binding: any) {
          const [handler, delay = 300] = binding.value
          let timer: ReturnType<typeof setTimeout> | null = null

          el.addEventListener('input', () => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => handler(), delay)
          })
        }
      })
    }
  }
}
```

---

## 5. 示例插件

### 5.1 日志插件

一个简化版的日志插件，提供分级日志记录功能。

```typescript
// @lytjs/plugin-logger/src/index.ts

import type { App } from '@lytjs/core'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export interface LoggerPluginOptions {
  /** 日志级别，默认 'info' */
  level?: LogLevel
  /** 日志前缀 */
  prefix?: string
  /** 是否包含时间戳 */
  timestamp?: boolean
  /** 自定义日志处理器 */
  handler?: (level: LogLevel, args: any[]) => void
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

export interface Logger {
  debug(...args: any[]): void
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
}

export function createLoggerPlugin(options: LoggerPluginOptions = {}) {
  const {
    level = 'info',
    prefix = '[Lyt]',
    timestamp = true,
    handler,
  } = options

  const currentLevel = LOG_LEVELS[level]

  function formatMessage(lvl: string, args: any[]): any[] {
    const parts: any[] = []
    if (timestamp) {
      parts.push(`[${new Date().toISOString()}]`)
    }
    parts.push(`${prefix} [${lvl}]`)
    return [...parts, ...args]
  }

  function log(lvl: LogLevel, lvlName: string, args: any[]) {
    if (LOG_LEVELS[lvl] < currentLevel) return

    if (handler) {
      handler(lvl, args)
      return
    }

    const formatted = formatMessage(lvlName, args)
    switch (lvl) {
      case 'debug':
        console.debug(...formatted)
        break
      case 'info':
        console.info(...formatted)
        break
      case 'warn':
        console.warn(...formatted)
        break
      case 'error':
        console.error(...formatted)
        break
    }
  }

  const logger: Logger = {
    debug: (...args) => log('debug', 'DEBUG', args),
    info: (...args) => log('info', 'INFO', args),
    warn: (...args) => log('warn', 'WARN', args),
    error: (...args) => log('error', 'ERROR', args),
  }

  return {
    install(app: App) {
      // 注入全局属性
      app.config.globalProperties.$logger = logger

      // 通过 provide 注入
      app.provide('logger', logger)

      // 提供 setLevel 方法
      app.provide('setLoggerLevel', (newLevel: LogLevel) => {
        options.level = newLevel
      })
    },
  }
}
```

**使用方式**：

```typescript
import { createApp } from '@lytjs/core'
import { createLoggerPlugin } from '@lytjs/plugin-logger'

const app = createApp(App)

app.use(createLoggerPlugin({
  level: 'debug',
  prefix: '[MyApp]',
  timestamp: true,
}))

// 在组件中使用
// import { inject } from '@lytjs/core'
// const logger = inject<Logger>('logger')
// logger.info('组件已挂载')
```

### 5.2 主题插件

一个简化版的主题切换插件，支持亮色/暗色主题。

```typescript
// @lytjs/plugin-theme/src/index.ts

import { reactive, watch, inject } from '@lytjs/core'
import type { App } from '@lytjs/core'

export type ThemeMode = 'light' | 'dark' | 'auto'

export interface ThemePluginOptions {
  /** 默认主题模式 */
  defaultTheme?: ThemeMode
  /** 自定义主题变量 */
  themes?: {
    light?: Record<string, string>
    dark?: Record<string, string>
  }
  /** 是否持久化到 localStorage */
  persist?: boolean
  /** localStorage key */
  storageKey?: string
}

export interface ThemeContext {
  /** 当前主题模式 */
  mode: { value: ThemeMode }
  /** 实际生效的主题（解析 auto 后） */
  resolvedTheme: { value: 'light' | 'dark' }
  /** 切换主题 */
  toggle: () => void
  /** 设置指定主题 */
  setTheme: (mode: ThemeMode) => void
  /** 获取 CSS 变量值 */
  getVar: (name: string) => string | undefined
  /** 设置 CSS 变量值 */
  setVar: (name: string, value: string) => void
}

export function createThemePlugin(options: ThemePluginOptions = {}) {
  const {
    defaultTheme = 'auto',
    themes = {},
    persist = true,
    storageKey = 'lyt-theme',
  } = options

  // 默认主题变量
  const defaultThemes = {
    light: {
      '--lyt-bg': '#ffffff',
      '--lyt-fg': '#1a1a1a',
      '--lyt-primary': '#4f46e5',
      '--lyt-border': '#e5e7eb',
      ...themes.light,
    },
    dark: {
      '--lyt-bg': '#1a1a2e',
      '--lyt-fg': '#e5e7eb',
      '--lyt-primary': '#818cf8',
      '--lyt-border': '#374151',
      ...themes.dark,
    },
  }

  // 从 localStorage 恢复
  let savedTheme = defaultTheme
  if (persist && typeof localStorage !== 'undefined') {
    savedTheme = (localStorage.getItem(storageKey) as ThemeMode) || defaultTheme
  }

  const mode = reactive({ value: savedTheme as ThemeMode })
  const resolvedTheme = reactive({ value: 'light' as 'light' | 'dark' })

  function resolveTheme(m: ThemeMode): 'light' | 'dark' {
    if (m === 'auto') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'light'
    }
    return m
  }

  function applyTheme(theme: 'light' | 'dark') {
    const vars = defaultThemes[theme]
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      root.setAttribute('data-theme', theme)
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
    }
  }

  function setTheme(m: ThemeMode) {
    mode.value = m
    resolvedTheme.value = resolveTheme(m)
    applyTheme(resolvedTheme.value)
    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, m)
    }
  }

  function toggle() {
    setTheme(resolvedTheme.value === 'light' ? 'dark' : 'light')
  }

  function getVar(name: string): string | undefined {
    return defaultThemes[resolvedTheme.value]?.[name]
  }

  function setVar(name: string, value: string) {
    defaultThemes[resolvedTheme.value]![name] = value
    applyTheme(resolvedTheme.value)
  }

  // 监听系统主题变化
  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (mode.value === 'auto') {
          resolvedTheme.value = resolveTheme('auto')
          applyTheme(resolvedTheme.value)
        }
      })
  }

  const themeContext: ThemeContext = {
    mode,
    resolvedTheme,
    toggle,
    setTheme,
    getVar,
    setVar,
  }

  return {
    install(app: App) {
      // 初始化主题
      setTheme(mode.value)

      // 注入全局属性
      app.config.globalProperties.$theme = themeContext

      // 通过 provide 注入
      app.provide('themeContext', themeContext)
    },
  }
}
```

**使用方式**：

```typescript
import { createApp } from '@lytjs/core'
import { createThemePlugin } from '@lytjs/plugin-theme'

const app = createApp(App)

app.use(createThemePlugin({
  defaultTheme: 'auto',
  persist: true,
  themes: {
    light: { '--lyt-primary': '#3b82f6' },
    dark: { '--lyt-primary': '#60a5fa' },
  },
}))

// 在组件中使用
// const theme = inject<ThemeContext>('themeContext')
// theme.toggle()  // 切换主题
// theme.setTheme('dark')  // 设置暗色主题
```

### 5.3 国际化插件

一个简化版的国际化（i18n）插件。

```typescript
// @lytjs/plugin-i18n/src/index.ts

import { reactive, computed, ref } from '@lytjs/core'
import type { App } from '@lytjs/core'

export interface I18nPluginOptions {
  /** 默认语言 */
  locale?: string
  /** 回退语言 */
  fallbackLocale?: string
  /** 消息映射 */
  messages?: Record<string, Record<string, string>>
  /** 是否允许 HTML */
  warnHtmlMessage?: boolean
}

export interface I18nContext {
  /** 当前语言 */
  locale: { value: string }
  /** 回退语言 */
  fallbackLocale: { value: string }
  /** 切换语言 */
  setLocale: (locale: string) => void
  /** 翻译函数 t(key, params?) */
  t: (key: string, params?: Record<string, string | number>) => string
  /** 添加消息 */
  mergeMessages: (locale: string, messages: Record<string, string>) => void
  /** 可用语言列表 */
  availableLocales: computed<string[]>
}

export function createI18nPlugin(options: I18nPluginOptions = {}) {
  const {
    locale: defaultLocale = 'zh-CN',
    fallbackLocale = 'zh-CN',
    messages: initialMessages = {},
    warnHtmlMessage = true,
  } = options

  const locale = ref(defaultLocale)
  const messages = reactive<Record<string, Record<string, string>>>(
    { ...initialMessages }
  )

  const availableLocales = computed(() => Object.keys(messages))

  function resolveMessage(key: string, loc: string): string | undefined {
    // 精确匹配
    if (messages[loc]?.[key] !== undefined) {
      return messages[loc][key]
    }
    // 尝试回退语言
    if (loc !== fallbackLocale && messages[fallbackLocale]?.[key] !== undefined) {
      return messages[fallbackLocale][key]
    }
    // 尝试所有语言
    for (const l of Object.keys(messages)) {
      if (messages[l][key] !== undefined) {
        return messages[l][key]
      }
    }
    return undefined
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const message = resolveMessage(key, locale.value)

    if (message === undefined) {
      console.warn(`[i18n] Key "${key}" not found for locale "${locale.value}"`)
      return key
    }

    if (!params) return message

    // 替换参数占位符 {name}, {count} 等
    return message.replace(/\{(\w+)\}/g, (_, paramKey) => {
      const value = params[paramKey]
      return value !== undefined ? String(value) : `{${paramKey}}`
    })
  }

  function setLocale(loc: string) {
    if (!messages[loc]) {
      console.warn(`[i18n] Locale "${loc}" not available`)
      return
    }
    locale.value = loc
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', loc)
    }
  }

  function mergeMessages(loc: string, newMessages: Record<string, string>) {
    if (!messages[loc]) {
      messages[loc] = {}
    }
    Object.assign(messages[loc], newMessages)
  }

  const i18nContext: I18nContext = {
    locale,
    fallbackLocale: ref(fallbackLocale),
    setLocale,
    t,
    mergeMessages,
    availableLocales,
  }

  return {
    install(app: App) {
      // 注入全局属性
      app.config.globalProperties.$t = t
      app.config.globalProperties.$i18n = i18nContext

      // 通过 provide 注入
      app.provide('i18n', i18nContext)
    },
  }
}
```

**使用方式**：

```typescript
import { createApp } from '@lytjs/core'
import { createI18nPlugin } from '@lytjs/plugin-i18n'

const app = createApp(App)

app.use(createI18nPlugin({
  locale: 'zh-CN',
  fallbackLocale: 'en',
  messages: {
    'zh-CN': {
      hello: '你好，{name}！',
      welcome: '欢迎来到 Lyt.js',
      count: '当前数量：{count}',
    },
    en: {
      hello: 'Hello, {name}!',
      welcome: 'Welcome to Lyt.js',
      count: 'Current count: {count}',
    },
  },
}))

// 在组件中使用
// const { t, setLocale, locale } = inject<I18nContext>('i18n')
// t('hello', { name: 'World' })  // => "你好，World！"
// setLocale('en')
// t('hello', { name: 'World' })  // => "Hello, World!"
```

---

## 6. 插件测试

### 单元测试

使用 Vitest 或 Jest 对插件进行单元测试：

```typescript
// tests/logger.plugin.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLoggerPlugin, type LoggerPluginOptions } from '../src/index'

// 创建模拟的 app 实例
function createMockApp() {
  const provides: Record<string, any> = {}
  const globalProperties: Record<string, any> = {}

  return {
    config: { globalProperties },
    provide(key: string, value: any) {
      provides[key] = value
    },
    component(name: string, component: any) {
      // mock
    },
    directive(name: string, directive: any) {
      // mock
    },
    _provides: provides,
    _globalProperties: globalProperties,
  }
}

describe('createLoggerPlugin', () => {
  it('应该正确安装插件', () => {
    const app = createMockApp()
    const plugin = createLoggerPlugin()

    plugin.install(app as any)

    // 验证 provide 被调用
    expect(app._provides.logger).toBeDefined()
    expect(app._provides.logger.info).toBeInstanceOf(Function)
    expect(app._provides.logger.warn).toBeInstanceOf(Function)
    expect(app._provides.logger.error).toBeInstanceOf(Function)
    expect(app._provides.logger.debug).toBeInstanceOf(Function)

    // 验证全局属性
    expect(app._globalProperties.$logger).toBeDefined()
  })

  it('应该根据日志级别过滤日志', () => {
    const app = createMockApp()
    const consoleSpy = vi.spyOn(console, 'debug')

    const plugin = createLoggerPlugin({ level: 'info' })
    plugin.install(app as any)

    const logger = app._provides.logger

    // debug 级别低于 info，不应输出
    logger.debug('should not appear')
    expect(consoleSpy).not.toHaveBeenCalled()

    // info 级别应该输出
    logger.info('should appear')
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('应该支持自定义前缀', () => {
    const app = createMockApp()
    const consoleSpy = vi.spyOn(console, 'info')

    const plugin = createLoggerPlugin({ prefix: '[TestApp]' })
    plugin.install(app as any)

    app._provides.logger.info('hello')

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[TestApp]')
    )
  })

  it('应该支持自定义日志处理器', () => {
    const app = createMockApp()
    const handler = vi.fn()

    const plugin = createLoggerPlugin({ handler })
    plugin.install(app as any)

    app._provides.logger.info('custom handler')

    expect(handler).toHaveBeenCalledWith('info', ['custom handler'])
  })
})
```

### 集成测试

测试插件与应用的集成：

```typescript
// tests/integration.test.ts

import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, h, inject } from '@lytjs/core'
import { createLoggerPlugin } from '@lytjs/plugin-logger'
import { createThemePlugin } from '@lytjs/plugin-theme'

describe('插件集成测试', () => {
  it('多个插件应该能同时工作', () => {
    const app = createApp(defineComponent({
      setup() {
        const logger = inject('logger')
        const theme = inject('themeContext')
        return { logger, theme }
      },
      render() { return h('div') }
    }))

    app.use(createLoggerPlugin({ level: 'debug' }))
    app.use(createThemePlugin({ defaultTheme: 'light' }))

    // 验证两个插件都正确安装
    expect(app.config.globalProperties.$logger).toBeDefined()
    expect(app.config.globalProperties.$theme).toBeDefined()
  })
})
```

---

## 7. 发布插件

### 命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 官方插件 | `@lytjs/plugin-xxx` | `@lytjs/plugin-logger` |
| 社区插件 | `lyt-plugin-xxx` | `lyt-plugin-chart` |
| 作用域插件 | `@scope/lyt-plugin-xxx` | `@company/lyt-plugin-analytics` |

### 发布流程

#### 1. 准备工作

```bash
# 确保代码已构建
npm run build

# 运行测试
npm run test

# 检查包内容
npm pack --dry-run
```

#### 2. 配置 package.json

```json
{
  "name": "@lytjs/plugin-my-plugin",
  "version": "1.0.0",
  "description": "Description of your plugin",
  "author": "Your Name <your@email.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://gitee.com/your-org/lyt-plugin-my-plugin"
  },
  "keywords": ["lyt", "lytjs", "plugin", "your-keyword"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "sideEffects": false,
  "peerDependencies": {
    "@lytjs/core": ">=5.0.0"
  },
  "devDependencies": {
    "@lytjs/core": "^5.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "test": "vitest run",
    "prepublishOnly": "npm run build && npm run test"
  }
}
```

#### 3. 编写 README.md

README 应包含以下内容：

```markdown
# @lytjs/plugin-my-plugin

简短描述插件功能。

## 安装

\```bash
npm install @lytjs/plugin-my-plugin
\```

## 使用

\```typescript
import { createApp } from '@lytjs/core'
import { createMyPlugin } from '@lytjs/plugin-my-plugin'

const app = createApp(App)
app.use(createMyPlugin({ /* options */ }))
\```

## API

### Options

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| option1 | string | '' | 描述 |

### Methods

| 方法 | 参数 | 说明 |
|------|------|------|
| method1 | (arg: string) => void | 描述 |

## License

MIT
```

#### 4. 发布到 npm

```bash
# 登录 npm（首次）
npm login

# 发布公开包
npm publish --access public

# 发布 beta 版本
npm publish --tag beta
```

#### 5. 版本管理

遵循语义化版本（SemVer）：

```bash
# 补丁版本（bug 修复）
npm version patch

# 次版本（新功能，向后兼容）
npm version minor

# 主版本（破坏性变更）
npm version major

# 推送 tag 触发 CI/CD
git push --follow-tags
```

---

## 8. 最佳实践

### 8.1 插件设计原则

1. **单一职责**：每个插件只做一件事，保持功能聚焦
2. **零运行时依赖**：尽量不引入第三方运行时依赖，减少包体积
3. **可配置**：通过选项对象提供合理的默认值和灵活的配置
4. **可卸载**：提供清理逻辑，避免内存泄漏
5. **TypeScript 优先**：提供完整的类型定义

### 8.2 编码规范

```typescript
// 推荐：使用工厂函数模式
export function createMyPlugin(options?: MyPluginOptions) {
  // 在闭包中处理选项
  const { prefix = '[Plugin]' } = options || {}

  return {
    install(app: App) {
      // 安装逻辑
    },
  }
}

// 推荐：导出类型
export type { MyPluginOptions }

// 推荐：错误处理
export function createSafePlugin() {
  return {
    install(app: App) {
      try {
        // 插件逻辑
      } catch (error) {
        console.error('[SafePlugin] 安装失败:', error)
        // 静默降级，不阻塞应用启动
      }
    },
  }
}

// 推荐：环境检测
function isServer(): boolean {
  return typeof window === 'undefined'
}

function safeLocalStorage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}
```

### 8.3 性能优化

```typescript
// 1. 延迟加载
export function createLazyPlugin() {
  return {
    install(app: App) {
      // 只在需要时加载
      app.provide('heavyService', {
        async load() {
          const module = await import('./heavy-module')
          return module.default
        }
      })
    },
  }
}

// 2. 按需注册
export function createSelectivePlugin(options: { components?: string[] }) {
  return {
    install(app: App) {
      const { components = [] } = options || {}

      // 只注册用户需要的组件
      if (components.includes('button')) {
        app.component('MyButton', ButtonComponent)
      }
      if (components.includes('modal')) {
        app.component('MyModal', ModalComponent)
      }
    },
  }
}

// 3. 使用 WeakMap 避免内存泄漏
const instanceMap = new WeakMap<object, PluginInstance>()

export function createTrackedPlugin() {
  return {
    install(app: App) {
      const instance = new PluginInstance()
      instanceMap.set(app, instance)
    },
  }
}
```

### 8.4 文档与测试

- 为所有公共 API 编写 JSDoc 注释
- 为每个插件编写单元测试，覆盖率不低于 80%
- 提供 README.md 和 CHANGELOG.md
- 在 CI 中运行测试和类型检查

### 8.5 安全注意事项

- 不要在插件中存储敏感信息
- 对用户提供的数据进行验证和清理
- 使用 CSP 安全的模板渲染
- 定期更新依赖，修复安全漏洞
