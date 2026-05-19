# 插件

插件是扩展 LytJS 功能的一种方式。插件可以添加全局功能，如全局组件、指令、混入等。

## 官方插件

LytJS 提供以下官方插件（所有插件零第三方运行时依赖）：

| 插件名 | 描述 | 包名 |
| --- | --- | --- |
| Theme | 主题切换、主题定制、CSS 变量管理 | `@lytjs/plugin-theme` |
| Logger | 日志分级、性能追踪、持久化存储 | `@lytjs/plugin-logger` |
| Auth | 权限路由、权限验证、角色管理 | `@lytjs/plugin-auth` |
| Storage | 本地存储、状态持久化、过期时间 | `@lytjs/plugin-storage` |
| i18n | 国际化支持、语言切换、翻译管理 | `@lytjs/plugin-i18n` |
| Vite | Vite 集成、热更新、构建优化 | `@lytjs/plugin-vite` |
| Chart | 图表渲染、数据可视化 | `@lytjs/plugin-chart` |
| Animation | 动画库、FLIP 动画、过渡组件 | `@lytjs/plugin-animation` |
| Form | 表单管理、状态绑定、验证集成 | `@lytjs/plugin-form` |
| Data Fetch | 数据获取基础、缓存支持 | `@lytjs/plugin-data-fetch` |
| Data | 增强版数据获取、乐观更新 | `@lytjs/plugin-data` |
| Validation | 表单验证、规则系统、自定义验证 | `@lytjs/plugin-validation` |
| Testing | 测试工具集成、组件测试 | `@lytjs/plugin-testing` |

## 使用插件

通过 `app.use()` 方法安装插件：

```typescript
import { createApp } from '@lytjs/core';
import MyPlugin from './my-plugin';

const app = createApp({ /* ... */ });

// 安装插件
app.use(MyPlugin, { /* 可选配置 */ });

app.mount('#app');
```

## 编写插件

一个 LytJS 插件是一个包含 `install` 方法的对象，或者是一个直接作为 install 函数的函数：

```typescript
// 对象形式
const myPlugin = {
  install(app, options) {
    // app 是应用实例
    // options 是通过 app.use() 传入的可选参数

    // 添加全局属性
    app.config.globalProperties.$myMethod = () => {
      console.log('my method');
    };

    // 注册全局组件
    app.component('MyComponent', {
      /* ... */
    });

    // 注册全局指令
    app.directive('my-directive', {
      /* ... */
    });

    // 提供 inject 可用的值
    app.provide('pluginOptions', options);
  },
};

// 函数形式
const myPluginFn = (app, options) => {
  app.config.globalProperties.$myMethod = () => {
    console.log('my method');
  };
};
```

## 插件选项

`app.use()` 接受可选的额外参数，这些参数会传递给插件的 `install` 方法：

```typescript
app.use(MyRouter, {
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});
```

## 常见插件模式

### 全局方法

```typescript
const loggerPlugin = {
  install(app) {
    app.config.globalProperties.$log = (message: string) => {
      console.log(`[LytJS] ${message}`);
    };
  },
};
```

### 提供依赖注入

```typescript
const configPlugin = {
  install(app, options) {
    app.provide('config', options);
  },
};

// 在组件中使用
const MyComponent = {
  inject: ['config'],
  mounted() {
    console.log(this.config.apiUrl);
  },
};
```

## 注意事项

- 插件只能安装一次，重复调用 `app.use()` 安装同一插件会被忽略。
- 插件的 `install` 方法中抛出的错误会中断安装并向上传播。
- 建议在 `app.mount()` 之前安装所有插件，以确保插件功能在应用启动时可用。
