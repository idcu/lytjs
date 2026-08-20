# @lytjs/plugin-theme

LytJS 官方主题插件，用于 CSS 变量管理、深浅色模式切换与自定义主题支持。

## 简介·独立声明

LytJS 官方主题插件，用于 CSS 变量管理、深浅色模式切换与自定义主题支持。

> **框架无关性说明**：本插件为框架生态包，零第三方依赖，仅构建于 LytJS 核心之上（仅依赖 `@lytjs/core` 与 `@lytjs/reactivity`，已移除未使用的 `@lytjs/common-is`）。按 v6.12 路线图规划，所有 @lytjs/plugin-\* 插件将统一迁出为独立仓库 lytjs-plugins，保持 API 兼容并提供迁移指南。

## 安装

```bash
pnpm add @lytjs/plugin-theme
```

## 使用示例

### 作为插件使用

插件按 LytJS 惯例在应用实例中注册。注册后可通过 `app.config.globalProperties.$theme` 或依赖注入 `lyt-theme` 访问主题管理器。

```typescript
import { createApp } from '@lytjs/core';
import pluginTheme from '@lytjs/plugin-theme';

const app = createApp();

app.use(pluginTheme, {
  defaultTheme: 'light',
  enableSystemTheme: true,
  storageKey: 'lyt-theme',
});
```

### 独立使用

```typescript
import { createThemeManager } from '@lytjs/plugin-theme';

const theme = createThemeManager({ defaultTheme: 'light' });

console.log(theme.currentTheme); // 'light'
console.log(theme.availableThemes); // ['light', 'dark']

// 切换下一个主题（循环）
theme.toggleTheme();

// 指定主题，会同步更新 :root 下的 CSS 变量
theme.setTheme('dark');

// 注册自定义主题
theme.registerTheme({
  name: 'solarized',
  isDark: true,
  variables: {
    '--lyt-bg-primary': '#073642',
    '--lyt-text-primary': '#eee8d5',
    // ...更多 CSS 变量
  },
});

// 获取某主题的变量
const variables = theme.getThemeVariables('solarized');
```

插件内置 `light` 与 `dark` 两套主题，并内置 `--lyt-bg-primary`、`--lyt-text-primary`、`--lyt-primary` 等一组 CSS 变量。设置主题时会在根元素上写入 `data-lyt-theme` 属性，并为深色主题添加 `lyt-theme-dark` 类。

## API 说明

### 导出

- 默认导出：`pluginTheme`（插件，通过 `app.use` 注册）
- `createThemeManager(options?: ThemeOptions): ThemeInstance` 独立创建主题管理器

### ThemeOptions

| 选项                | 类型      | 默认值        | 说明                 |
| ------------------- | --------- | ------------- | -------------------- |
| `defaultTheme`      | `string`  | `'light'`     | 默认主题名           |
| `themes`            | `Theme[]` | 内置两套      | 主题列表             |
| `enableSystemTheme` | `boolean` | `true`        | 是否启用系统主题检测 |
| `storageKey`        | `string`  | `'lyt-theme'` | 本地存储 key         |

### ThemeInstance

| 成员                | 签名                                        | 说明                |
| ------------------- | ------------------------------------------- | ------------------- |
| `currentTheme`      | `string`（只读）                            | 当前主题            |
| `availableThemes`   | `string[]`（只读）                          | 可用主题列表        |
| `setTheme`          | `(name: string) => void`                    | 设置主题            |
| `toggleTheme`       | `() => void`                                | 切换到下一个主题    |
| `registerTheme`     | `(theme: Theme) => void`                    | 注册自定义主题      |
| `getThemeVariables` | `(name?: string) => Record<string, string>` | 获取主题的 CSS 变量 |

`Theme` 结构：`{ name: string; variables: Record<string, string>; isDark?: boolean }`。

## 相关包

- [@lytjs/core](../../../core) 插件定义与运行时核心
- [@lytjs/reactivity](../../../reactivity) 响应式主题状态支持

## 许可证

[MIT](../../../../LICENSE)
