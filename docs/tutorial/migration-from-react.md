# 从 React 迁移到 LytJS

本指南将帮助你从 React 迁移到 LytJS，展示如何将 React 的概念映射到 LytJS。

## 为什么选择 LytJS？

LytJS 为 React 开发者提供了熟悉的开发体验，但有显著优势：

- ✅ **零第三方依赖** - 不依赖 React、ReactDOM、babel 等
- ✅ **双渲染模式** - Vapor（信号驱动）和 VDOM 两种模式
- ✅ **熟悉的模板语法** - 比 JSX 更接近 HTML
- ✅ **内置响应式系统** - 无需 useState/useEffect 模式

## 快速对比

| 功能 | React | LytJS |
|------|-------|-------|
| 组件定义 | function / class | defineComponent |
| 状态管理 | useState | signal / reactive |
| 副作用 | useEffect/watchEffect | watch/watchEffect |
| 语法 | JSX | Template (类似 Vue) |
| 渲染 | VDOM | Vapor + VDOM |
| 学习曲线 | 中等 | 低（特别是从 Vue 迁移） |

## 第一步：安装和设置

### 安装依赖

```bash
# React 项目
npm install react react-dom

# LytJS 项目
npm install @lytjs/core @lytjs/reactivity @lytjs/component @lytjs/ui
```

### 创建应用

**React:**
```typescript
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
```

**LytJS:**
```typescript
import { createApp } from '@lytjs/core'
import App from './App.vue'

const app = createApp(App)
app.mount('#root')

// 或者使用 Vapor 模式（性能更佳）
import { createVaporApp } from '@lytjs/renderer'
const app = createVaporApp(App)
app.mount('#root')
```

## 组件定义

### 基础组件对比

**React (函数组件):**
```typescript
import React, { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  
  const increment = () => {
    setCount(prev => prev + 1)
  }
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>点击</button>
    </div>
  )
}
```

**LytJS:**
```typescript
import { defineComponent, signal } from '@lytjs/component'

const Counter = defineComponent({
  name: 'Counter',
  setup() {
    const count = signal(0)
    
    const increment = () => {
      count.set(count() + 1)
    }
    
    return { count, increment }
  },
  template: `
    <div>
      <p>Count: {{ count() }}</p>
      <button @click="increment">点击</button>
    </div>
  `
})
```

**LytJS (SFC - Single File Component):**
```vue
<template>
  <div>
    <p>Count: {{ count() }}</p>
    <button @click="increment">点击</button>
  </div>
</template>

<script setup lang="ts">
import { signal } from '@lytjs/reactivity'

const count = signal(0)

const increment = () => {
  count.set(count() + 1)
}
</script>
```

## 状态管理

### 基础状态

**React:**
```typescript
import { useState, useCallback } from 'react'

function UserProfile() {
  const [name, setName] = useState('')
  const [age, setAge] = useState(18)
  const [isLoading, setIsLoading] = useState(false)
  
  const updateName = useCallback((newName: string) => {
    setName(newName)
  }, [])
  
  const handleSave = async () => {
    setIsLoading(true)
    await saveToAPI({ name, age })
    setIsLoading(false)
  }
}
```

**LytJS:**
```typescript
import { defineComponent, signal, reactive } from '@lytjs/component'

const UserProfile = defineComponent({
  name: 'UserProfile',
  setup() {
    const name = signal('')
    const age = signal(18)
    const isLoading = signal(false)
    
    const updateName = (newName: string) => {
      name.set(newName)
    }
    
    const handleSave = async () => {
      isLoading.set(true)
      await saveToAPI({ name: name(), age: age() })
      isLoading.set(false)
    }
    
    return { name, age, isLoading, updateName, handleSave }
  }
})

// 或者使用 reactive 管理对象
const state = reactive({
  name: '',
  age: 18,
  isLoading: false
})
```

### 复杂状态 - 使用 LytJS Store

**React (Redux/Zustand):**
```typescript
import { create } from 'zustand'

const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  fetchUser: async (id) => {
    const user = await fetchUser(id)
    set({ user })
  }
}))
```

**LytJS (Store):**
```typescript
import { defineStore } from '@lytjs/store'

const useUserStore = defineStore('user', {
  state: () => ({
    user: null
  }),
  actions: {
    setUser(user) {
      this.user = user
    },
    async fetchUser(id) {
      const user = await fetchUser(id)
      this.setUser(user)
    }
  }
})
```

## 副作用

### 数据获取

**React:**
```typescript
import { useState, useEffect } from 'react'

function UserList() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const data = await api.getUsers()
        setUsers(data)
      } catch (err) {
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])
}
```

**LytJS:**
```typescript
import { defineComponent, signal } from '@lytjs/component'
import { watchEffect } from '@lytjs/reactivity'

const UserList = defineComponent({
  name: 'UserList',
  setup() {
    const users = signal([])
    const isLoading = signal(true)
    const error = signal(null)
    
    const fetchData = async () => {
      try {
        isLoading.set(true)
        const data = await api.getUsers()
        users.set(data)
      } catch (err) {
        error.set(err)
      } finally {
        isLoading.set(false)
      }
    }
    
    // 立即执行
    fetchData()
    
    return { users, isLoading, error }
  }
})
```

## 事件处理

**React:**
```jsx
<button onClick={(e) => handleClick(e)}>点击</button>
<input onChange={(e) => setValue(e.target.value)} />
```

**LytJS:**
```html
<button @click="handleClick">点击</button>
<input v-model="value" />
<!-- 或者 -->
<input @input="(e) => value.set(e.target.value)" />
```

## 条件渲染

**React:**
```jsx
function Greeting({ isLoggedIn, user }) {
  return (
    <div>
      {isLoggedIn ? (
        <div>
          欢迎回来，{user?.name}！
        </div>
      ) : (
        <div>请登录</div>
      )}
    </div>
  )
}
```

**LytJS:**
```html
<template>
  <div>
    <div v-if="isLoggedIn">
      欢迎回来，{{ user?.name }}！
    </div>
    <div v-else>
      请登录
    </div>
  </div>
</template>
```

## 列表渲染

**React:**
```jsx
function ItemList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} className={item.completed ? 'done' : ''}>
          {item.text}
        </li>
      ))}
    </ul>
  )
}
```

**LytJS:**
```html
<template>
  <ul>
    <li 
      v-for="item in items" 
      :key="item.id" 
      :class="{ done: item.completed }"
    >
      {{ item.text }}
    </li>
  </ul>
</template>
```

## UI 组件库

### 使用 LytJS UI 组件

```typescript
import { Button, Input, Card, Dialog, Form } from '@lytjs/ui'

// 在模板中使用
<template>
  <Card title="用户注册">
    <Form @submit="handleSubmit">
      <Input v-model="username" label="用户名" />
      <Input v-model="email" label="邮箱" type="email" />
      <Button type="primary" native-type="submit">注册</Button>
    </Form>
  </Card>
</template>
```

## 路由

### React Router

```typescript
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">首页</Link>
        <Link to="/about">关于</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

function UserDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
}
```

### LytJS Router

```typescript
import { createRouter, createWebHistory, RouterLink, useRouter, useRoute } from '@lytjs/router'

function App() {
  const routes = [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/users/:id', component: UserDetail }
  ]
  
  const router = createRouter({
    history: createWebHistory(),
    routes
  })
  
  return { router }
}

// 组件中使用
function UserDetail() {
  const router = useRouter()
  const route = useRoute()
  const id = route.params.id
}
```

## 常用 Hook 对比

| React Hook | LytJS 对应 |
|------------|-----------|
| `useState` | `signal` 或 `reactive` |
| `useEffect` | `watch` 或 `watchEffect` |
| `useMemo` | `computed` |
| `useCallback` | 直接使用函数（自动优化） |
| `useRef` | 直接使用变量或 `ref` |
| `useContext` | `provide/inject` |

## 常见问题 FAQ

### Q: LytJS 和 React 的学习曲线如何？

A: 如果你有 Vue 经验，LytJS 会非常熟悉。如果你来自 React：
- JSX → Template 语法需要适应
- useState/useEffect → Signal 系统更直观
- 其他概念相似性很高

### Q: 可以同时使用 React 和 LytJS 吗？

A: 可以在同一项目中逐步迁移，使用独立的容器挂载。

### Q: 性能对比如何？

A: LytJS 的 Vapor 模式在性能上显著优于 React：
- 更小的包体积
- 更快的更新
- 更少的内存占用

## 迁移检查清单

- [ ] 学习 LytJS 基础概念
- [ ] 设置项目依赖
- [ ] 创建组件的 LytJS 版本
- [ ] 更新状态管理
- [ ] 更新路由
- [ ] 更新 UI 组件库（可选）
- [ ] 编写/更新测试
- [ ] 性能对比测试
- [ ] 文档更新

## 获取帮助

- 📖 [LytJS 文档](../index.md)
- 💬 [社区支持](https://github.com/lytjs/lytjs)
- 🐛 [提交 issue](https://github.com/lytjs/lytjs/issues)

---

**下一步：** 查看 [Vue 迁移指南](./migration-from-vue.md) 或 [快速开始](./quick-start.md)
