# 快速开始

## 什么是 Lyt.js？

Lyt.js 是一个零依赖的超轻量前端框架，提供与 Vue 3 兼容的 API，支持响应式编程、组件系统、路由、状态管理等功能。它的设计理念是：轻量、快速、易用。

## 在线体验

不想本地安装？直接在浏览器中体验 Lyt.js：

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/lytjs/lytjs/tree/main/examples/stackblitz-starter)

## 安装

### 使用 CLI 创建项目（推荐）

```bash
# 使用 Lyt.js CLI 创建项目
npx @lytjs/cli create my-app

# 进入项目目录
cd my-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### CDN 直接使用

如果你只是想快速尝试 Lyt.js，可以通过 CDN 直接使用：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lyt.js 示例</title>
</head>
<body>
  <div id="app"></div>
  
  <script type="module">
    // 从 ESM CDN 导入 Lyt.js
    import { createApp } from '@lytjs/core'

    // 创建应用实例
    const app = createApp({
      // 模板
      template: `
        <div>
          <h1>{{ title }}</h1>
          <p>计数: {{ count }}</p>
          <button @click="count++">+1</button>
        </div>
      `,
      // 响应式状态
      state: {
        title: 'Hello Lyt.js!',
        count: 0
      }
    })

    // 挂载应用
    app.mount('#app')
  </script>
</body>
</html>
```

### npm 安装

对于生产项目，推荐使用 npm 安装：

```bash
# 安装核心包（仅包含核心功能）
npm install @lytjs/core

# 或安装聚合包（包含所有运行时，如路由、状态管理等）
npm install @lytjs/agg
```

## 项目结构

使用 CLI 创建的项目结构如下：

```
my-app/
├── public/           # 静态资源
│   └── favicon.svg
├── src/              # 源代码
│   ├── components/   # 组件
│   ├── pages/        # 页面
│   ├── router/       # 路由配置
│   ├── store/        # 状态管理
│   ├── styles/       # 样式
│   ├── App.lyt       # 根组件（单文件组件）
│   └── main.ts       # 入口文件
├── .eslintrc.json    # ESLint 配置
├── index.html        # HTML 模板
├── package.json      # 项目配置
└── tsconfig.json     # TypeScript 配置
```

## 基本概念

### 1. 应用实例

使用 `createApp` 创建应用实例：

```javascript
import { createApp } from '@lytjs/core'

const app = createApp({
  // 组件选项
})

app.mount('#app')
```

### 2. 响应式数据

Lyt.js 提供了多种响应式 API：

- **ref()**：创建响应式引用，用于基本类型
- **reactive()**：创建响应式对象，用于复杂类型
- **computed()**：创建计算属性
- **watch()**：监听数据变化

### 3. 模板语法

Lyt.js 支持两种模板语法：

**简写语法（推荐）：**
- 插值表达式：`{{ expression }}`
- 指令：`if`、`each`、`:model` 等
- 事件绑定：`@click`、`@input` 等
- 属性绑定：`:class`、`:style`、`:disabled` 等

**Vue 兼容语法：**
- 插值表达式：`{{ expression }}`
- 指令：`v-if`、`v-each`、`v-bind:model` 等
- 事件绑定：`@click`、`@input` 等
- 属性绑定：`:class`、`:style`、`:disabled` 等

两种语法在功能上完全等效。

## 示例 1：计数器应用

```javascript
import { createApp, ref, computed } from '@lytjs/core'

const app = createApp({
  setup() {
    // 响应式状态
    const count = ref(0)
    
    // 计算属性
    const doubleCount = computed(() => count.value * 2)
    
    // 方法
    function increment() {
      count.value++
    }
    
    function decrement() {
      count.value--
    }
    
    return { count, doubleCount, increment, decrement }
  },
  template: `
    <div class="counter">
      <h1>计数器</h1>
      <div class="controls">
        <button @click="decrement">-</button>
        <span>{{ count }}</span>
        <button @click="increment">+1</button>
      </div>
      <p>双倍值: {{ doubleCount }}</p>
    </div>
  `
})

app.mount('#app')
```

## 示例 2：待办事项应用

```javascript
import { createApp, ref, computed } from '@lytjs/core'

const app = createApp({
  setup() {
    // 响应式状态
    const newTodo = ref('')
    const todos = ref([
      { id: 1, text: '学习 Lyt.js', done: false },
      { id: 2, text: '构建一个应用', done: false },
    ])

    // 计算属性
    const remaining = computed(() =>
      todos.value.filter(t => !t.done).length
    )

    // 方法
    function addTodo() {
      if (!newTodo.value.trim()) return
      todos.value.push({
        id: Date.now(),
        text: newTodo.value,
        done: false,
      })
      newTodo.value = ''
    }

    function toggleTodo(id) {
      const todo = todos.value.find(t => t.id === id)
      if (todo) todo.done = !todo.done
    }

    function removeTodo(id) {
      todos.value = todos.value.filter(t => t.id !== id)
    }

    return { newTodo, todos, remaining, addTodo, toggleTodo, removeTodo }
  },
  template: `
    <div class="todo-app">
      <h1>📝 待办事项</h1>
      <p>剩余 {{ remaining }} 项</p>
      <form @submit.prevent="addTodo">
        <input 
          :model="newTodo" 
          placeholder="添加新任务..." 
          class="todo-input"
        />
        <button type="submit" class="add-button">添加</button>
      </form>
      <ul class="todo-list">
        <li 
          each="todo in todos" 
          :key="todo.id"
          :class="{ completed: todo.done }"
        >
          <input 
            type="checkbox" 
            :checked="todo.done" 
            @change="toggleTodo(todo.id)"
          />
          <span>{{ todo.text }}</span>
          <button @click="removeTodo(todo.id)" class="remove-button">删除</button>
        </li>
      </ul>
    </div>
  `
})

app.mount('#app')
```

## 示例 3：天气应用

```javascript
import { createApp, ref, onMounted } from '@lytjs/core'

const app = createApp({
  setup() {
    const city = ref('北京')
    const weather = ref(null)
    const loading = ref(false)

    async function fetchWeather() {
      if (!city.value.trim()) return
      
      loading.value = true
      try {
        const response = await fetch(`https://api.example.com/weather?city=${encodeURIComponent(city.value)}`)
        const data = await response.json()
        weather.value = data
      } catch (error) {
        console.error('获取天气失败:', error)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      fetchWeather()
    })

    return { city, weather, loading, fetchWeather }
  },
  template: `
    <div class="weather-app">
      <h1>🌤️ 天气查询</h1>
      <div class="search">
        <input 
          :model="city" 
          placeholder="输入城市名称"
          @keyup.enter="fetchWeather"
        />
        <button @click="fetchWeather">查询</button>
      </div>
      
      <div if="loading" class="loading">加载中...</div>
      
      <div if="weather" class="weather-info">
        <h2>{{ weather.city }}</h2>
        <p>温度: {{ weather.temperature }}°C</p>
        <p>天气: {{ weather.description }}</p>
        <p>湿度: {{ weather.humidity }}%</p>
      </div>
      
      <div if class="no-data">请输入城市名称查询天气</div>
    </div>
  `
})

app.mount('#app')
```

## 常见问题

### 1. Lyt.js 与 Vue 3 的区别？

Lyt.js 是一个轻量级的前端框架，提供与 Vue 3 兼容的 API，但体积更小，零依赖。它专注于核心功能，适合小型项目和对性能有要求的场景。

### 2. 如何使用单文件组件？

Lyt.js 支持 `.lyt` 单文件组件，需要在项目中配置相应的构建工具。使用 CLI 创建的项目已经配置好了相关工具。

### 3. 如何添加路由？

可以使用 `@lytjs/router` 包：

```bash
npm install @lytjs/router
```

然后在应用中使用：

```javascript
import { createRouter } from '@lytjs/router'

const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
})

app.use(router)
```

### 4. 如何使用状态管理？

可以使用 `@lytjs/store` 包（Pinia 风格）：

```bash
npm install @lytjs/store
```

然后创建 store：

```javascript
import { createStore } from '@lytjs/store'

const counter = createStore('counter', {
  state: { count: 0 },
  getters: {
    double: (s) => s.count * 2
  },
  actions: {
    increment(s) { s.count++ }
  }
})
```

## 下一步

- [组合式 API 指南](./composition-api.md)
- [选项式 API 指南](./options-api.md)
- [响应式系统](./reactivity.md)
- [组件系统](./component.md)
- [路由](./router.md)
- [状态管理](./store.md)
- [单文件组件](./sfc.md)
- [服务端渲染](./ssr.md)
