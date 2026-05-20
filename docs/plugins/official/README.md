# LytJS 官方插件

LytJS 官方插件集合，提供主题、日志、认证、存储、国际化等常用功能。

## 📦 插件列表

### 1. @lytjs/plugin-theme - 主题插件

提供深色/浅色主题切换、CSS 变量管理、系统主题自动切换等功能。

**主要功能：**

- 深色/浅色主题切换
- CSS 变量管理
- 系统主题自动检测和切换
- 自定义主题注册
- 主题持久化存储

**使用示例：**

```typescript
import { definePlugin, pluginTheme } from '@lytjs/plugin-theme';

// 在应用中安装插件
app.use(pluginTheme, {
  defaultTheme: 'dark',
  enableSystemTheme: true,
});

// 使用主题功能
app.config.globalProperties.$theme.setTheme('dark');
app.config.globalProperties.$theme.toggleTheme();
```

### 2. @lytjs/plugin-logger - 日志插件

提供日志分级、性能追踪、持久化存储等功能。

**主要功能：**

- 日志分级（debug/info/warn/error）
- 日志持久化存储
- 性能追踪
- 自定义格式化
- 日志清理

**使用示例：**

```typescript
import { pluginLogger } from '@lytjs/plugin-logger';

app.use(pluginLogger, {
  level: 'debug',
  enablePersistence: true,
});

app.config.globalProperties.$logger.info('Hello World');
app.config.globalProperties.$logger.startMeasure('api-call');
```

### 3. @lytjs/plugin-auth - 认证插件

提供角色管理、权限验证、用户认证等功能。

**主要功能：**

- 用户登录/登出
- 角色管理
- 权限验证
- 超级管理员权限
- 持久化存储

**使用示例：**

```typescript
import { pluginAuth } from '@lytjs/plugin-auth';

app.use(pluginAuth, {
  enablePersistence: true,
});

const user = {
  id: '1',
  roles: ['admin'],
  permissions: ['read', 'write'],
};

app.config.globalProperties.$auth.login(user);
app.config.globalProperties.$auth.hasRole('admin');
```

### 4. @lytjs/plugin-storage - 存储插件

提供 localStorage/sessionStorage 封装，支持过期时间等功能。

**主要功能：**

- localStorage/sessionStorage 支持
- JSON 序列化
- 过期时间
- 命名空间前缀
- 批量清理

**使用示例：**

```typescript
import { pluginStorage } from '@lytjs/plugin-storage';

app.use(pluginStorage, {
  defaultType: 'local',
  prefix: 'myapp_',
});

app.config.globalProperties.$storage.set('key', 'value', 3600000);
const value = app.config.globalProperties.$storage.get('key');
```

### 5. @lytjs/plugin-i18n - 国际化插件

提供完整的国际化支持，包括语言切换、翻译插值等功能。

**主要功能：**

- 多语言支持
- 翻译插值（命名参数和位置参数）
- 嵌套键支持
- 语言包注册
- 回退语言
- 响应式语言切换

**使用示例：**

```typescript
import { createI18n, pluginI18n } from '@lytjs/plugin-i18n';

// 创建 i18n 实例
const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': {
      hello: '你好',
      greeting: '欢迎，{name}',
    },
    'en-US': {
      hello: 'Hello',
      greeting: 'Welcome, {name}',
    },
  },
});

// 在应用中使用
app.use(pluginI18n);

// 使用翻译
app.config.globalProperties.$t('hello'); // '你好'
app.config.globalProperties.$t('greeting', { name: 'John' }); // '欢迎，John'
```

### 6. @lytjs/plugin-vite - Vite 构建插件

提供 LytJS 应用的 Vite 构建支持。

## 🚀 快速开始

### 安装单个插件

```bash
pnpm add @lytjs/plugin-theme
```

### 安装所有插件

```bash
pnpm add @lytjs/plugin-theme @lytjs/plugin-logger @lytjs/plugin-auth @lytjs/plugin-storage @lytjs/plugin-i18n
```

### 在应用中使用

```typescript
import { createApp } from '@lytjs/core';
import pluginTheme from '@lytjs/plugin-theme';
import pluginLogger from '@lytjs/plugin-logger';
import pluginAuth from '@lytjs/plugin-auth';
import pluginStorage from '@lytjs/plugin-storage';
import pluginI18n from '@lytjs/plugin-i18n';

const app = createApp();

// 安装插件
app.use(pluginTheme);
app.use(pluginLogger);
app.use(pluginAuth);
app.use(pluginStorage);
app.use(pluginI18n);

app.mount('#app');
```

## 📚 统一导出

你也可以通过统一入口导入所有插件：

```typescript
import {
  pluginTheme,
  pluginLogger,
  pluginAuth,
  pluginStorage,
  pluginI18n,
  pluginVite,
} from '@lytjs/plugins';
```

## 🏗️ 开发说明

### 构建所有插件

```bash
cd packages/plugins
pnpm build
```

### 运行插件测试

```bash
cd packages/plugins
pnpm test
```

### 添加新插件

1. 在 `packages/plugins/packages/` 下创建新插件目录
2. 参考现有插件的结构
3. 更新 `packages/plugins/packages/index.ts` 统一导出
4. 更新根目录 `package.json` 的构建脚本

## 📄 许可证

MIT
