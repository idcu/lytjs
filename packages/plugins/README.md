# @lytjs/plugins

Lyt.js 官方插件聚合包 - 一键使用所有官方插件。

## 安装

```bash
npm install @lytjs/plugins

# 或使用 pnpm
pnpm add @lytjs/plugins
```

## 特性

- 📦 一键使用所有官方插件
- 🎯 零运行时依赖
- 💡 多种实用插件
- 🔧 易于扩展

## 插件列表

| 插件 | 说明 |
|------|------|
| `@lytjs/plugin-i18n` | 国际化插件 |
| `@lytjs/plugin-auth` | 认证插件 |
| `@lytjs/plugin-logger` | 日志插件 |
| `@lytjs/plugin-storage` | 存储插件 |
| `@lytjs/plugin-theme` | 主题插件 |

## 快速开始

```javascript
import { createApp } from '@lytjs/core';
import {
  i18nPlugin,
  authPlugin,
  loggerPlugin,
  storagePlugin,
  themePlugin
} from '@lytjs/plugins';

const app = createApp(App);
app.use(i18nPlugin, { locale: 'zh-CN' });
app.use(authPlugin, { secret: 'your-secret' });
app.use(loggerPlugin, { level: 'info' });
app.use(storagePlugin, { prefix: 'lyt' });
app.use(themePlugin, { default: 'light' });
app.mount('#app');
```

## 插件使用

### 国际化插件

```javascript
import { i18nPlugin } from '@lytjs/plugins';

app.use(i18nPlugin, {
  locale: 'zh-CN',
  messages: {
    'zh-CN': { hello: '你好' },
    'en-US': { hello: 'Hello' }
  }
});

// 使用
app.config.globalProperties.$t('hello');
```

### 认证插件

```javascript
import { authPlugin } from '@lytjs/plugins';

app.use(authPlugin, {
  secret: 'your-secret',
  storageKey: 'auth-token'
});

// 使用
app.config.globalProperties.$auth.login(credentials);
app.config.globalProperties.$auth.logout();
```

### 日志插件

```javascript
import { loggerPlugin } from '@lytjs/plugins';

app.use(loggerPlugin, {
  level: 'debug', // debug, info, warn, error
  format: 'pretty'
});

// 使用
app.config.globalProperties.$logger.info('Hello');
app.config.globalProperties.$logger.error('Error occurred');
```

### 存储插件

```javascript
import { storagePlugin } from '@lytjs/plugins';

app.use(storagePlugin, {
  prefix: 'lyt',
  type: 'localStorage' // localStorage, sessionStorage
});

// 使用
app.config.globalProperties.$storage.set('key', 'value');
const value = app.config.globalProperties.$storage.get('key');
```

### 主题插件

```javascript
import { themePlugin } from '@lytjs/plugins';

app.use(themePlugin, {
  default: 'light', // light, dark, system
  themes: {
    light: { primary: '#1890ff' },
    dark: { primary: '#096dd9' }
  }
});

// 使用
app.config.globalProperties.$theme.set('dark');
const currentTheme = app.config.globalProperties.$theme.current;
```

## API 参考

### 组合式 API

```javascript
import { useI18n, useAuth, useLogger, useStorage, useTheme } from '@lytjs/plugins';

export default {
  setup() {
    const { t, locale, setLocale } = useI18n();
    const { login, logout, isAuthenticated, user } = useAuth();
    const { logger } = useLogger();
    const { get, set, remove } = useStorage();
    const { current, setTheme } = useTheme();

    return { t, locale, setLocale, login, logout, isAuthenticated, user, logger, get, set, remove, current, setTheme };
  }
};
```

## 示例

### 完整示例

```javascript
import { createApp, defineComponent } from '@lytjs/core';
import {
  i18nPlugin,
  authPlugin,
  loggerPlugin,
  storagePlugin,
  themePlugin,
  useI18n,
  useAuth,
  useLogger,
  useStorage,
  useTheme
} from '@lytjs/plugins';

const App = defineComponent({
  setup() {
    const { t, locale, setLocale } = useI18n();
    const { login, logout, isAuthenticated, user } = useAuth();
    const { logger } = useLogger();
    const { get, set, remove } = useStorage();
    const { current, setTheme } = useTheme();

    return {
      t,
      locale,
      setLocale,
      login,
      logout,
      isAuthenticated,
      user,
      logger,
      get,
      set,
      remove,
      current,
      setTheme
    };
  },
  template: `
    <div>
      <h1>{{ t('hello') }}</h1>
      <p>Current locale: {{ locale }}</p>
      <button @click="setLocale('en-US')">Switch to English</button>
      <button @click="setTheme('dark')">Dark Mode</button>
    </div>
  `
});

const app = createApp(App);
app.use(i18nPlugin, {
  locale: 'zh-CN',
  messages: {
    'zh-CN': { hello: '你好' },
    'en-US': { hello: 'Hello' }
  }
});
app.use(authPlugin, { secret: 'your-secret' });
app.use(loggerPlugin, { level: 'info' });
app.use(storagePlugin, { prefix: 'lyt' });
app.use(themePlugin, { default: 'light' });
app.mount('#app');
```

## 性能

- 轻量级插件集合
- 零运行时依赖
- 按需使用
- 高效的实现

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
