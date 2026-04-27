# Plugin System API

Lyt.js v3.1.0 enhances the plugin system with complete install, uninstall, and status query capabilities, along with official plugin factory functions.

## app.use()

Installs a plugin to the application instance.

```ts
function use(plugin: Plugin, ...options: any[]): App
```

| Parameter | Type | Description |
|-----------|------|-------------|
| plugin | `Plugin` | Plugin object |
| options | `any[]` | Options passed to the plugin |

**Returns:** `App` -- Application instance (supports chaining)

```ts
import { createApp } from 'lyt'
import { createRouter } from 'lyt/router'
import { createI18n } from 'lyt/plugin'

const app = createApp(App)

app.use(createRouter({ mode: 'history' }))
app.use(createI18n({ locale: 'en-US', messages }))
app.use(myPlugin, { option1: true })

app.mount('#app')
```

### Plugin Interface

```ts
interface Plugin {
  /** Plugin name */
  name?: string
  /** Called on install */
  install: (app: App, ...options: any[]) => void | (() => void)
  /** Called on uninstall */
  uninstall?: (app: App) => void
}
```

The `install` function can return a cleanup function that will be automatically called when the plugin is uninstalled.

```ts
const myPlugin = {
  name: 'my-plugin',
  install(app, options) {
    // Register global properties
    app.config.globalProperties.$myService = new MyService(options)

    // Return cleanup function
    return () => {
      console.log('Plugin cleaned up')
    }
  },
  uninstall(app) {
    delete app.config.globalProperties.$myService
  }
}
```

---

## app.unuse()

Uninstalls an installed plugin.

```ts
function unuse(pluginName: string): App
```

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | `string` | Plugin name |

**Returns:** `App` -- Application instance (supports chaining)

```ts
app.unuse('my-plugin')
```

Uninstall process:
1. Finds the installed plugin
2. Calls the plugin's `uninstall` method (if present)
3. Calls the cleanup function returned by `install` (if present)
4. Removes from the installed list

---

## app.isInstalled()

Checks whether a specified plugin is installed.

```ts
function isInstalled(pluginName: string): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | `string` | Plugin name |

**Returns:** `boolean`

```ts
if (!app.isInstalled('my-plugin')) {
  app.use(myPlugin)
}
```

---

## createI18n()

Creates an internationalization (i18n) plugin.

```ts
import { createI18n } from 'lyt/plugin'

function createI18n(options: I18nOptions): I18nPlugin
```

| Parameter | Type | Description |
|-----------|------|-------------|
| options.locale | `string` | Default locale, default `'zh-CN'` |
| options.fallbackLocale | `string` | Fallback locale, default `'zh-CN'` |
| options.messages | `Record<string, Record<string, string>>` | Translation message map |
| options.datetimeFormats | `Record<string, any>` | Datetime formats |
| options.numberFormats | `Record<string, any>` | Number formats |
| options.missing | `(key: string) => string` | Handler for missing translations |

### Basic Usage

```ts
import { createApp } from 'lyt'
import { createI18n } from 'lyt/plugin'

const i18n = createI18n({
  locale: 'en-US',
  fallbackLocale: 'en-US',
  messages: {
    'en-US': {
      hello: 'Hello',
      greeting: 'Welcome, {name}!',
      items: '{count} items'
    },
    'zh-CN': {
      hello: '你好',
      greeting: '欢迎，{name}！',
      items: '{count} 个项目'
    }
  }
})

const app = createApp(App)
app.use(i18n)
app.mount('#app')
```

### Using in Components

```ts
// Composition API
setup() {
  const { t, locale, availableLocales } = useI18n()

  return {
    message: t('greeting', { name: 'Lyt.js' }),
    changeLang: () => { locale.value = 'zh-CN' }
  }
}
```

```html
<!-- Usage in template -->
<p>{{ t('items', { count: 42 }) }}</p>
```

### I18n API

#### t()

```ts
function t(key: string, params?: Record<string, any>): string
```

Translates the specified key.

#### locale

```ts
const locale: Ref<string>
```

Current locale, read/write.

#### setLocaleMessage()

```ts
function setLocaleMessage(locale: string, messages: Record<string, string>): void
```

Dynamically sets translation messages.

#### mergeLocaleMessage()

```ts
function mergeLocaleMessage(locale: string, messages: Record<string, string>): void
```

Merges translation messages (without overwriting existing ones).

---

## createAuth()

Creates an authentication plugin.

```ts
import { createAuth } from 'lyt/plugin'

function createAuth(options: AuthOptions): AuthPlugin
```

| Parameter | Type | Description |
|-----------|------|-------------|
| options.tokenKey | `string` | Token storage key, default `'lyt_token'` |
| options.storage | `'localStorage' \| 'sessionStorage' \| 'cookie'` | Storage method, default `'localStorage'` |
| options.loginUrl | `string` | Login API endpoint |
| options.logoutUrl | `string` | Logout API endpoint |
| options.refreshUrl | `string` | Token refresh API endpoint |
| options.onAuthSuccess | `(user: UserInfo) => void` | Auth success callback |
| options.onAuthFailure | `(error: Error) => void` | Auth failure callback |

### Basic Usage

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
    console.log('Login successful:', user)
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

User login.

#### logout()

```ts
function logout(): Promise<void>
```

User logout.

#### getToken()

```ts
function getToken(): string | null
```

Gets the current token.

#### isAuthenticated()

```ts
function isAuthenticated(): boolean
```

Checks if the user is authenticated.

#### getUser()

```ts
function getUser(): UserInfo | null
```

Gets the current user information.

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

### Router Guard Integration

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

Creates a logging plugin.

```ts
import { createLogger } from 'lyt/plugin'

function createLogger(options?: LoggerOptions): LoggerPlugin
```

| Parameter | Type | Description |
|-----------|------|-------------|
| options.level | `'debug' \| 'info' \| 'warn' \| 'error' \| 'silent'` | Log level, default `'info'` |
| options.prefix | `string` | Log prefix, default `'[Lyt]'` |
| options.format | `(log: LogEntry) => string` | Custom format function |
| options.transport | `(log: LogEntry) => void` | Custom output target |
| options.timestamp | `boolean` | Whether to show timestamps, default `true` |

### Basic Usage

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

Dynamically changes the log level.

#### createScope()

```ts
logger.createScope(scope: string): ScopedLogger
```

Creates a scoped child logger.

```ts
const httpLogger = logger.createScope('HTTP')
httpLogger.info('Request sent', { url: '/api/data' })
// Output: [MyApp:HTTP] [INFO] Request sent { url: '/api/data' }
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

## Writing Custom Plugins

```ts
import type { Plugin } from 'lyt'

function myAnalyticsPlugin(options: { trackingId: string }): Plugin {
  return {
    name: 'analytics',

    install(app, options) {
      // 1. Inject global properties
      app.config.globalProperties.$track = (event: string, data?: any) => {
        console.log(`[Analytics] ${event}`, data)
      }

      // 2. Provide global components
      app.component('AnalyticsTracker', TrackerComponent)

      // 3. Register global directives
      app.directive('track', {
        mounted(el, binding) {
          el.addEventListener('click', () => {
            app.config.globalProperties.$track(binding.value)
          })
        }
      })

      console.log(`Analytics plugin installed (ID: ${options.trackingId})`)
    },

    uninstall(app) {
      delete app.config.globalProperties.$track
      console.log('Analytics plugin uninstalled')
    }
  }
}

// Usage
app.use(myAnalyticsPlugin({ trackingId: 'UA-12345' }))
```

::: tip
The plugin system supports chaining. You can install multiple plugins in one line: `app.use(plugin1).use(plugin2).use(plugin3)`.
:::
