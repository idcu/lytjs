# 插件系统 API

Lyt.js v3.1.0 增强了插件系统，提供完整的安装、卸载、状态查询能力，以及官方插件工厂函数。

## app.use()

安装插件到应用实例。

```ts
function use(plugin: Plugin, ...options: any[]): App
```

| 参数 | 类型 | 说明 |
|------|------|------|
| plugin | `Plugin` | 插件对象 |
| options | `any[]` | 传递给插件的选项参数 |

**返回值：** `App` — 应用实例（支持链式调用）

```ts
import { createApp } from 'lyt'
import { createRouter } from 'lyt/router'
import { createI18n } from 'lyt/plugin'

const app = createApp(App)

app.use(createRouter({ mode: 'history' }))
app.use(createI18n({ locale: 'zh-CN', messages }))
app.use(myPlugin, { option1: true })

app.mount('#app')
```

### Plugin 接口

```ts
interface Plugin {
  /** 插件名称 */
  name?: string
  /** 安装时调用 */
  install: (app: App, ...options: any[]) => void | (() => void)
  /** 卸载时调用 */
  uninstall?: (app: App) => void
}
```

`install` 函数可以返回一个清理函数，该函数会在插件被卸载时自动调用。

```ts
const myPlugin = {
  name: 'my-plugin',
  install(app, options) {
    // 注册全局属性
    app.config.globalProperties.$myService = new MyService(options)

    // 返回清理函数
    return () => {
      console.log('插件已清理')
    }
  },
  uninstall(app) {
    delete app.config.globalProperties.$myService
  }
}
```

---

## app.unuse()

卸载已安装的插件。

```ts
function unuse(pluginName: string): App
```

| 参数 | 类型 | 说明 |
|------|------|------|
| pluginName | `string` | 插件名称 |

**返回值：** `App` — 应用实例（支持链式调用）

```ts
app.unuse('my-plugin')
```

卸载流程：
1. 查找已安装的插件
2. 调用插件的 `uninstall` 方法（如果存在）
3. 调用 `install` 返回的清理函数（如果存在）
4. 从已安装列表中移除

---

## app.isInstalled()

检查指定插件是否已安装。

```ts
function isInstalled(pluginName: string): boolean
```

| 参数 | 类型 | 说明 |
|------|------|------|
| pluginName | `string` | 插件名称 |

**返回值：** `boolean`

```ts
if (!app.isInstalled('my-plugin')) {
  app.use(myPlugin)
}
```

---

## createI18n()

创建国际化（i18n）插件。

```ts
import { createI18n } from 'lyt/plugin'

function createI18n(options: I18nOptions): I18nPlugin
```

| 参数 | 类型 | 说明 |
|------|------|------|
| options.locale | `string` | 默认语言，默认 `'zh-CN'` |
| options.fallbackLocale | `string` | 回退语言，默认 `'zh-CN'` |
| options.messages | `Record<string, Record<string, string>>` | 翻译消息映射 |
| options.datetimeFormats | `Record<string, any>` | 日期时间格式 |
| options.numberFormats | `Record<string, any>` | 数字格式 |
| options.missing | `(key: string) => string` | 缺失翻译时的处理函数 |

### 基本使用

```ts
import { createApp } from 'lyt'
import { createI18n } from 'lyt/plugin'

const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': {
      hello: '你好',
      greeting: '欢迎，{name}！',
      items: '{count} 个项目'
    },
    'en-US': {
      hello: 'Hello',
      greeting: 'Welcome, {name}!',
      items: '{count} items'
    }
  }
})

const app = createApp(App)
app.use(i18n)
app.mount('#app')
```

### 在组件中使用

```ts
// 组合式 API
setup() {
  const { t, locale, availableLocales } = useI18n()

  return {
    message: t('greeting', { name: 'Lyt.js' }),
    changeLang: () => { locale.value = 'en-US' }
  }
}
```

```html
<!-- 模板中使用 -->
<p>{{ t('items', { count: 42 }) }}</p>
```

### I18n API

#### t()

```ts
function t(key: string, params?: Record<string, any>): string
```

翻译指定 key。

#### locale

```ts
const locale: Ref<string>
```

当前语言，可读写。

#### setLocaleMessage()

```ts
function setLocaleMessage(locale: string, messages: Record<string, string>): void
```

动态设置翻译消息。

#### mergeLocaleMessage()

```ts
function mergeLocaleMessage(locale: string, messages: Record<string, string>): void
```

合并翻译消息（不覆盖已有）。

---

## createAuth()

创建认证插件。

```ts
import { createAuth } from 'lyt/plugin'

function createAuth(options: AuthOptions): AuthPlugin
```

| 参数 | 类型 | 说明 |
|------|------|------|
| options.tokenKey | `string` | Token 存储键名，默认 `'lyt_token'` |
| options.storage | `'localStorage' \| 'sessionStorage' \| 'cookie'` | 存储方式，默认 `'localStorage'` |
| options.loginUrl | `string` | 登录接口地址 |
| options.logoutUrl | `string` | 登出接口地址 |
| options.refreshUrl | `string` | Token 刷新接口地址 |
| options.onAuthSuccess | `(user: UserInfo) => void` | 认证成功回调 |
| options.onAuthFailure | `(error: Error) => void` | 认证失败回调 |

### 基本使用

```ts
import { createApp } from 'lyt'
import { createAuth } from 'lyt/plugin'

const auth = createAuth({
  tokenKey: 'my_app_token',
  storage: 'localStorage',
  loginUrl: '/api/auth/login',
  logoutUrl: '/api/auth/logout',
  refreshUrl: '/api/auth/refresh',
  onAuthSuccess(user) {
    console.log('登录成功:', user)
  }
})

const app = createApp(App)
app.use(auth)
app.mount('#app')
```

### Auth API

#### login()

```ts
function login(credentials: { username: string; password: string }): Promise<UserInfo>
```

用户登录。

#### logout()

```ts
function logout(): Promise<void>
```

用户登出。

#### getToken()

```ts
function getToken(): string | null
```

获取当前 Token。

#### isAuthenticated()

```ts
function isAuthenticated(): boolean
```

判断是否已认证。

#### getUser()

```ts
function getUser(): UserInfo | null
```

获取当前用户信息。

```ts
interface UserInfo {
  id: string | number
  username: string
  email?: string
  roles?: string[]
  permissions?: string[]
  [key: string]: any
}
```

### 路由守卫集成

```ts
import { createRouter } from 'lyt/router'
import { createAuth } from 'lyt/plugin'

const auth = createAuth({ loginUrl: '/api/login' })
const router = createRouter({ mode: 'history' })

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !auth.isAuthenticated()) {
    next('/login')
  } else {
    next()
  }
})
```

---

## createLogger()

创建日志插件。

```ts
import { createLogger } from 'lyt/plugin'

function createLogger(options?: LoggerOptions): LoggerPlugin
```

| 参数 | 类型 | 说明 |
|------|------|------|
| options.level | `'debug' \| 'info' \| 'warn' \| 'error' \| 'silent'` | 日志级别，默认 `'info'` |
| options.prefix | `string` | 日志前缀，默认 `'[Lyt]'` |
| options.format | `(log: LogEntry) => string` | 自定义格式化函数 |
| options.transport | `(log: LogEntry) => void` | 自定义输出目标 |
| options.timestamp | `boolean` | 是否显示时间戳，默认 `true` |

### 基本使用

```ts
import { createApp } from 'lyt'
import { createLogger } from 'lyt/plugin'

const logger = createLogger({
  level: 'debug',
  prefix: '[MyApp]',
  timestamp: true
})

const app = createApp(App)
app.use(logger)
app.mount('#app')
```

### Logger API

#### debug() / info() / warn() / error()

```ts
logger.debug(message: string, ...args: any[]): void
logger.info(message: string, ...args: any[]): void
logger.warn(message: string, ...args: any[]): void
logger.error(message: string, ...args: any[]): void
```

#### setLevel()

```ts
logger.setLevel(level: LogLevel): void
```

动态修改日志级别。

#### createScope()

```ts
logger.createScope(scope: string): ScopedLogger
```

创建带作用域的子 Logger。

```ts
const httpLogger = logger.createScope('HTTP')
httpLogger.info('请求发送', { url: '/api/data' })
// 输出: [MyApp:HTTP] [INFO] 请求发送 { url: '/api/data' }
```

### LogEntry

```ts
interface LogEntry {
  level: LogLevel
  message: string
  args: any[]
  timestamp: number
  scope?: string
}
```

---

## 编写自定义插件

```ts
import type { Plugin } from 'lyt'

function myAnalyticsPlugin(options: { trackingId: string }): Plugin {
  return {
    name: 'analytics',

    install(app, options) {
      // 1. 注入全局属性
      app.config.globalProperties.$track = (event: string, data?: any) => {
        console.log(`[Analytics] ${event}`, data)
      }

      // 2. 提供全局组件
      app.component('AnalyticsTracker', TrackerComponent)

      // 3. 注册全局指令
      app.directive('track', {
        mounted(el, binding) {
          el.addEventListener('click', () => {
            app.config.globalProperties.$track(binding.value)
          })
        }
      })

      console.log(`Analytics 插件已安装 (ID: ${options.trackingId})`)
    },

    uninstall(app) {
      delete app.config.globalProperties.$track
      console.log('Analytics 插件已卸载')
    }
  }
}

// 使用
app.use(myAnalyticsPlugin({ trackingId: 'UA-12345' }))
```

::: tip 提示
插件系统支持链式调用，可以在一行中安装多个插件：`app.use(plugin1).use(plugin2).use(plugin3)`。
:::
