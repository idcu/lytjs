# @lytjs/plugin-theme

> Lyt.js 主题切换插件 - 支持亮色/暗色主题和自定义主题

**版本：** 4.2.0

## 安装

```bash
npm install @lytjs/plugin-theme
```

## 使用

### 注册插件

```typescript
import { createApp } from '@lytjs/core'
import { createTheme } from '@lytjs/plugin-theme'

const theme = createTheme({
  default: 'light',
  storageKey: 'lyt_theme',
  themes: {
    light: { '--bg': '#fff', '--text': '#333' },
    dark: { '--bg': '#333', '--text': '#fff' },
  },
})

const app = createApp({})
app.use(theme)
```

### 切换主题

```typescript
// 切换到指定主题
theme.set('dark')

// 在预设主题间循环切换
theme.toggle()

// 重置为默认主题
theme.reset()

// 获取当前主题名称
theme.current // 'dark'
```

### 使用内置主题

插件内置了 `light` 和 `dark` 两套主题，开箱即用：

```typescript
const theme = createTheme({
  default: 'light',
  autoDetect: true, // 自动检测系统主题偏好
})
```

内置主题包含以下 CSS 变量：

| 变量 | 说明 |
|------|------|
| `--bg` | 背景色 |
| `--bg-secondary` | 次要背景色 |
| `--text` | 文字颜色 |
| `--text-secondary` | 次要文字颜色 |
| `--text-muted` | 弱化文字颜色 |
| `--primary` | 主色调 |
| `--primary-hover` | 主色调悬停 |
| `--secondary` | 次要色调 |
| `--success` | 成功色 |
| `--warning` | 警告色 |
| `--error` | 错误色 |
| `--info` | 信息色 |
| `--border` | 边框色 |
| `--shadow` | 阴影色 |

### 动态添加主题

```typescript
// 添加新主题
theme.addTheme('blue', {
  '--bg': '#f0f8ff',
  '--text': '#1a365d',
  '--primary': '#3182ce',
})

// 移除主题
theme.removeTheme('blue')
```

### 动态 CSS 变量

```typescript
// 设置动态 CSS 变量（不保存到持久化）
theme.setVariable('--custom-color', '#ff6600')

// 清除动态变量
theme.clearVariable('--custom-color')

// 清除所有动态变量
theme.clearVariables()
```

### 系统主题检测

```typescript
// 获取系统偏好主题
theme.getSystemPreference() // 'light' | 'dark'

// 监听系统主题变化
const unsubscribe = theme.watchSystemPreference((pref) => {
  console.log('系统主题已切换为:', pref)
})

// 取消监听
unsubscribe()
```

## API

### Options

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `default` | `string` | `'light'` | 默认主题 |
| `storageKey` | `string` | `'lyt_theme'` | localStorage 中存储主题的 key |
| `themes` | `Record<string, ThemeConfig>` | 内置 light/dark | 主题配置对象 |
| `onChange` | `(newTheme: string, oldTheme: string) => void` | - | 主题切换时的回调 |
| `autoDetect` | `boolean` | `true` | 是否自动检测系统主题偏好 |
| `useDataAttribute` | `boolean` | `true` | 是否添加 `data-theme` 属性到 html 标签 |
| `cssPrefix` | `string` | `'--lyt-'` | 自定义 CSS 变量前缀 |
| `debug` | `boolean` | `false` | 是否开启调试模式 |

### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `current` | `string` | 当前主题名称（只读） |

### 方法

| 方法 | 签名 | 描述 |
|------|------|------|
| `set` | `(themeName: string) => void` | 切换到指定主题 |
| `toggle` | `() => void` | 在预设主题间循环切换 |
| `reset` | `() => void` | 重置为默认主题 |
| `list` | `() => string[]` | 获取所有可用主题列表 |
| `addTheme` | `(name: string, config: ThemeConfig) => void` | 动态添加/更新主题 |
| `removeTheme` | `(name: string) => void` | 移除主题（不能移除默认主题） |
| `getConfig` | `() => ThemeConfig \| null` | 获取当前主题的 CSS 变量配置 |
| `getConfigFor` | `(themeName: string) => ThemeConfig \| null` | 获取指定主题的 CSS 变量配置 |
| `setVariable` | `(key: string, value: string) => void` | 动态设置 CSS 变量（不持久化） |
| `clearVariable` | `(key: string) => void` | 清除动态设置的 CSS 变量 |
| `clearVariables` | `() => void` | 清除所有动态变量 |
| `getSystemPreference` | `() => 'light' \| 'dark'` | 获取系统偏好主题 |
| `watchSystemPreference` | `(callback: (theme: 'light' \| 'dark') => void) => () => void` | 监听系统主题变化 |

## License

MIT
