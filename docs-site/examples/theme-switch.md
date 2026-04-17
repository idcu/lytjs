# 主题切换示例

使用 `provide` / `inject` 实现跨组件主题切换功能。

## 功能特性

- 亮色/暗色主题切换
- 通过 provide/inject 跨组件传递主题状态
- CSS 变量实现主题样式
- 持久化主题偏好

## 完整代码

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Lyt.js 主题切换</title>
  <script src="https://unpkg.com/lyt/dist/lyt.global.js"></script>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1f2937;
      --card-bg: #f9fafb;
      --border: #e5e7eb;
      --primary: #4f46e5;
      --primary-text: #ffffff;
    }
    [data-theme="dark"] {
      --bg: #111827;
      --text: #f9fafb;
      --card-bg: #1f2937;
      --border: #374151;
      --primary: #818cf8;
      --primary-text: #111827;
    }
    body {
      font-family: sans-serif;
      background: var(--bg);
      color: var(--text);
      transition: background 0.3s, color 0.3s;
      max-width: 600px;
      margin: 40px auto;
      padding: 0 16px;
    }
    .theme-toggle {
      position: fixed;
      top: 16px;
      right: 16px;
      padding: 8px 16px;
      background: var(--primary);
      color: var(--primary-text);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 16px;
      transition: background 0.3s, border-color 0.3s;
    }
    h1 { color: var(--primary); }
    h2 { margin-top: 0; }
    .theme-info { font-size: 14px; color: var(--text); opacity: 0.7; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    const { createApp, ref, provide, inject, onMounted, onUnmounted, defineComponent } = Lyt

    // 主题 Key
    const THEME_KEY = Symbol('theme')

    // 子组件：使用 inject 获取主题
    const ThemeCard = defineComponent({
      name: 'ThemeCard',

      props: {
        title: String,
        description: String
      },

      setup() {
        const theme = inject(THEME_KEY, ref('light'))

        return { theme }
      },

      template: `
        <div class="card">
          <h2>{{ title }}</h2>
          <p>{{ description }}</p>
          <p class="theme-info">当前主题: {{ theme }}</p>
        </div>
      `
    })

    // 子组件：主题指示器
    const ThemeIndicator = defineComponent({
      setup() {
        const theme = inject(THEME_KEY, ref('light'))
        return { theme }
      },

      template: `
        <div class="card" style="text-align: center;">
          <div style="font-size: 48px;">
            {{ theme === 'dark' ? '\u263E' : '\u2600' }}
          </div>
          <p>当前是{{ theme === 'dark' ? '暗色' : '亮色' }}模式</p>
        </div>
      `
    })

    // 根组件：使用 provide 提供主题
    const app = createApp({
      setup() {
        const theme = ref(
          localStorage.getItem('lyt-theme') || 'light'
        )

        // 向所有子组件提供主题
        provide(THEME_KEY, theme)

        function toggleTheme() {
          theme.value = theme.value === 'light' ? 'dark' : 'light'
          localStorage.setItem('lyt-theme', theme.value)
        }

        // 应用主题到 document
        onMounted(() => {
          document.documentElement.setAttribute('data-theme', theme.value)
        })

        return { theme, toggleTheme }
      },

      template: `
        <div>
          <button class="theme-toggle" @click="toggleTheme">
            {{ theme === 'dark' ? '\u2600 亮色模式' : '\u263E 暗色模式' }}
          </button>
          <h1>Lyt.js 主题切换</h1>
          <ThemeIndicator />
          <ThemeCard title="provide / inject" description="通过 provide 向下传递主题状态，子组件通过 inject 获取。" />
          <ThemeCard title="CSS 变量" description="使用 CSS 变量实现主题样式，切换时自动过渡。" />
          <ThemeCard title="响应式更新" description="主题状态是响应式的，切换后所有组件自动更新。" />
        </div>
      `
    })

    app.mount('#app')
  </script>
</body>
</html>
```

## 代码解析

### 1. provide() 提供数据

在根组件的 `setup()` 中使用 `provide` 向所有后代组件提供主题状态：

```ts
const THEME_KEY = Symbol('theme')
const theme = ref('light')

provide(THEME_KEY, theme)
```

使用 `Symbol` 作为 key 避免命名冲突。

### 2. inject() 注入数据

在子组件的 `setup()` 中使用 `inject` 获取主题状态：

```ts
setup() {
  const theme = inject(THEME_KEY, ref('light'))
  return { theme }
}
```

第二个参数是默认值，当没有 provider 时使用。

### 3. CSS 变量实现主题

通过 CSS 变量定义主题色：

```css
:root {
  --bg: #ffffff;
  --text: #1f2937;
}
[data-theme="dark"] {
  --bg: #111827;
  --text: #f9fafb;
}
```

### 4. 数据流

```
根组件 (provide theme)
  ├── ThemeIndicator (inject theme)
  ├── ThemeCard (inject theme)
  └── ThemeCard (inject theme)
```

::: tip
`provide` / `inject` 是跨层级组件通信的推荐方式，特别适合主题、配置等全局状态。更多组件通信方式请参阅 [组件系统](/guide/component)。
:::
