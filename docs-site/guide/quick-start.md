# 快速开始

## 通过 CDN 使用

最简单的方式是直接在 HTML 文件中引入 Lyt.js：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Lyt.js 示例</title>
  <script src="https://unpkg.com/lyt/dist/lyt.global.js"></script>
</head>
<body>
  <div id="app"></div>
  <script>
    const { createApp, reactive, ref } = Lyt

    const app = createApp({
      state() {
        return {
          message: ref('Hello Lyt.js!')
        }
      },
      template: `
        <div>
          <h1>{{ message }}</h1>
          <input v-bind:model="message" />
        </div>
      `
    })

    app.mount('#app')
  </script>
</body>
</html>
```

## 通过 npm 安装

::: code-group

```bash [npm]
npm install lyt
```

```bash [pnpm]
pnpm add lyt
```

```bash [yarn]
yarn add lyt
```

:::

## 创建应用

### 选项式 API

```ts
import { createApp, ref } from 'lyt'

const app = createApp({
  name: 'MyApp',

  state() {
    return {
      count: ref(0)
    }
  },

  methods: {
    increment() {
      this.count.value++
    }
  },

  template: `
    <div>
      <p>计数器: {{ count }}</p>
      <button @click="increment">+1</button>
    </div>
  `
})

app.mount('#app')
```

### 组合式 API

```ts
import { createApp, ref, onMounted } from 'lyt'

const app = createApp({
  setup() {
    const count = ref(0)

    function increment() {
      count.value++
    }

    onMounted(() => {
      console.log('组件已挂载')
    })

    return { count, increment }
  },

  template: `
    <div>
      <p>计数器: {{ count }}</p>
      <button @click="increment">+1</button>
    </div>
  `
})

app.mount('#app')
```

## 模板语法简介

Lyt.js 使用增强型 HTML 模板语法：

| 指令 | 说明 | 示例 |
|------|------|------|
| `{{ }}` | 文本插值 | `{{ message }}` |
| `v-if` | 条件渲染 | `<div v-if="show">内容</div>` |
| `v-each` | 列表渲染 | `<li v-each="item in list">{{ item }}</li>` |
| `v-bind` | 属性绑定 | `<img v-bind:src="url" />` |
| `v-on` / `@` | 事件绑定 | `<button @click="handleClick">点击</button>` |
| `v-bind:model` | 双向绑定 | `<input v-bind:model="value" />` |

::: tip 提示
详细的模板语法说明请参阅 [模板语法](./template-syntax) 章节。
:::

## 下一步

- 了解完整的 [模板语法](./template-syntax)
- 深入学习 [响应式系统](./reactivity)
- 掌握 [组件系统](./component)
