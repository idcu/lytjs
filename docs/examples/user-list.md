# 用户列表示例

一个带 API 调用的用户列表应用，展示 Lyt.js 的异步数据处理、路由导航和错误处理功能。

## 在线演示

[在 StackBlitz 上打开](https://stackblitz.com/edit/lytjs-user-list)

## 完整代码

### 项目结构

```
src/
├── components/
│   ├── UserCard.vue
│   ├── UserList.vue
│   └── LoadingSpinner.vue
├── composables/
│   └── useUsers.js
├── views/
│   ├── UserListView.vue
│   └── UserDetailView.vue
├── router/
│   └── index.js
├── api/
│   └── users.js
└── App.vue
```

### App.vue

```vue
<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-brand">
        <router-link to="/">User Manager</router-link>
      </div>
      <div class="nav-links">
        <router-link to="/">用户列表</router-link>
        <router-link to="/about">关于</router-link>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
// 应用入口组件
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  background: #f5f5f5;
}

.navbar {
  background: #3eaf7c;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-brand a {
  color: white;
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  background: rgba(255, 255, 255, 0.2);
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
</style>
```

### router/index.js

```javascript
import { createRouter, createWebHistory } from '@lytjs/router'
import UserListView from '../views/UserListView.vue'
import UserDetailView from '../views/UserDetailView.vue'

const routes = [
  {
    path: '/',
    name: 'UserList',
    component: UserListView,
  },
  {
    path: '/user/:id',
    name: 'UserDetail',
    component: UserDetailView,
    props: true,
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/AboutView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
```

### api/users.js

```javascript
const API_BASE = 'https://jsonplaceholder.typicode.com'

export async function fetchUsers(page = 1, limit = 10) {
  const response = await fetch(
    `${API_BASE}/users?_page=${page}&_limit=${limit}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`)
  }

  const total = parseInt(response.headers.get('X-Total-Count') || '0')
  const users = await response.json()

  return { users, total }
}

export async function fetchUserById(id) {
  const response = await fetch(`${API_BASE}/users/${id}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`)
  }

  return response.json()
}

export async function searchUsers(query) {
  const response = await fetch(`${API_BASE}/users?q=${encodeURIComponent(query)}`)

  if (!response.ok) {
    throw new Error(`Failed to search users: ${response.statusText}`)
  }

  return response.json()
}
```

### composables/useUsers.js

```javascript
import { ref, computed } from '@lytjs/core'
import { fetchUsers, fetchUserById, searchUsers } from '../api/users.js'

export function useUsers() {
  // 状态
  const users = ref([])
  const currentUser = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const currentPage = ref(1)
  const totalUsers = ref(0)
  const searchQuery = ref('')

  // 计算属性
  const hasMore = computed(() => {
    return users.value.length < totalUsers.value
  })

  const isSearching = computed(() => searchQuery.value.length > 0)

  // 方法
  const loadUsers = async (page = 1) => {
    loading.value = true
    error.value = null

    try {
      const { users: newUsers, total } = await fetchUsers(page)

      if (page === 1) {
        users.value = newUsers
      } else {
        users.value.push(...newUsers)
      }

      totalUsers.value = total
      currentPage.value = page
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const loadMore = async () => {
    if (loading.value || !hasMore.value) return
    await loadUsers(currentPage.value + 1)
  }

  const loadUser = async (id) => {
    loading.value = true
    error.value = null

    try {
      currentUser.value = await fetchUserById(id)
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const performSearch = async (query) => {
    searchQuery.value = query

    if (!query) {
      await loadUsers(1)
      return
    }

    loading.value = true
    error.value = null

    try {
      users.value = await searchUsers(query)
      totalUsers.value = users.value.length
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  const refresh = () => {
    loadUsers(1)
  }

  return {
    // 状态
    users,
    currentUser,
    loading,
    error,
    currentPage,
    totalUsers,
    searchQuery,
    // 计算属性
    hasMore,
    isSearching,
    // 方法
    loadUsers,
    loadMore,
    loadUser,
    performSearch,
    clearError,
    refresh,
  }
}
```

### components/LoadingSpinner.vue

```vue
<template>
  <div class="loading-spinner">
    <div class="spinner"></div>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: '加载中...',
  },
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3eaf7c;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

p {
  margin-top: 1rem;
  color: #666;
}
</style>
```

### components/UserCard.vue

```vue
<template>
  <div class="user-card" @click="goToDetail">
    <div class="avatar">
      {{ initials }}
    </div>
    <div class="info">
      <h3>{{ user.name }}</h3>
      <p class="email">{{ user.email }}</p>
      <p class="company">{{ user.company?.name }}</p>
    </div>
    <div class="arrow">→</div>
  </div>
</template>

<script setup>
import { computed } from '@lytjs/core'
import { useRouter } from '@lytjs/router'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
})

const router = useRouter()

const initials = computed(() => {
  return props.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
})

const goToDetail = () => {
  router.push({
    name: 'UserDetail',
    params: { id: props.user.id },
  })
}
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #3eaf7c;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
  margin-right: 1rem;
}

.info {
  flex: 1;
}

.info h3 {
  margin: 0 0 0.25rem 0;
  color: #333;
}

.email {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.company {
  color: #999;
  font-size: 0.85rem;
  margin: 0.25rem 0 0 0;
}

.arrow {
  color: #ccc;
  font-size: 1.5rem;
}
</style>
```

### views/UserListView.vue

```vue
<template>
  <div class="user-list-view">
    <h1>用户列表</h1>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <input
        v-model="searchInput"
        @input="debouncedSearch"
        placeholder="搜索用户..."
        class="search-input"
      />
      <button v-if="isSearching" @click="clearSearch" class="clear-btn">
        清除
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="clearError">重试</button>
    </div>

    <!-- 加载状态 -->
    <LoadingSpinner v-if="loading && users.length === 0" />

    <!-- 用户列表 -->
    <div v-else-if="users.length > 0" class="user-list">
      <UserCard v-for="user in users" :key="user.id" :user="user" />

      <!-- 加载更多 -->
      <div v-if="hasMore && !isSearching" class="load-more">
        <button @click="loadMore" :disabled="loading">
          {{ loading ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <p>{{ isSearching ? '没有找到匹配的用户' : '暂无用户数据' }}</p>
      <button v-if="isSearching" @click="clearSearch">清除搜索</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from '@lytjs/core'
import { useUsers } from '../composables/useUsers.js'
import UserCard from '../components/UserCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const {
  users,
  loading,
  error,
  hasMore,
  isSearching,
  loadUsers,
  loadMore,
  performSearch,
  clearError,
} = useUsers()

const searchInput = ref('')
let searchTimeout = null

// 防抖搜索
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    performSearch(searchInput.value)
  }, 300)
}

const clearSearch = () => {
  searchInput.value = ''
  performSearch('')
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-list-view {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 1.5rem;
  color: #333;
}

.search-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3eaf7c;
}

.clear-btn {
  padding: 0.75rem 1.5rem;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: #e0e0e0;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.load-more {
  text-align: center;
  padding: 2rem;
}

.load-more button {
  padding: 0.75rem 2rem;
  background: #3eaf7c;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.load-more button:hover:not(:disabled) {
  background: #369f6e;
}

.load-more button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message button {
  background: #c62828;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.empty-state button {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: #3eaf7c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

### views/UserDetailView.vue

```vue
<template>
  <div class="user-detail-view">
    <button class="back-btn" @click="goBack">← 返回列表</button>

    <LoadingSpinner v-if="loading" message="加载用户信息..." />

    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="retry">重试</button>
    </div>

    <div v-else-if="currentUser" class="user-detail">
      <div class="header">
        <div class="avatar">{{ initials }}</div>
        <div class="basic-info">
          <h1>{{ currentUser.name }}</h1>
          <p class="username">@{{ currentUser.username }}</p>
        </div>
      </div>

      <div class="info-sections">
        <section class="info-section">
          <h2>联系信息</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>邮箱</label>
              <a :href="`mailto:${currentUser.email}`">{{ currentUser.email }}</a>
            </div>
            <div class="info-item">
              <label>电话</label>
              <span>{{ currentUser.phone }}</span>
            </div>
            <div class="info-item">
              <label>网站</label>
              <a :href="`https://${currentUser.website}`" target="_blank">
                {{ currentUser.website }}
              </a>
            </div>
          </div>
        </section>

        <section class="info-section">
          <h2>公司</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>名称</label>
              <span>{{ currentUser.company?.name }}</span>
            </div>
            <div class="info-item">
              <label>标语</label>
              <span class="catch-phrase">"{{ currentUser.company?.catchPhrase }}"</span>
            </div>
            <div class="info-item">
              <label>业务</label>
              <span>{{ currentUser.company?.bs }}</span>
            </div>
          </div>
        </section>

        <section class="info-section">
          <h2>地址</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>街道</label>
              <span>{{ currentUser.address?.street }}</span>
            </div>
            <div class="info-item">
              <label>城市</label>
              <span>{{ currentUser.address?.city }}</span>
            </div>
            <div class="info-item">
              <label>邮编</label>
              <span>{{ currentUser.address?.zipcode }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-else class="not-found">
      <h2>用户未找到</h2>
      <p>该用户可能不存在或已被删除</p>
      <button @click="goBack">返回列表</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from '@lytjs/core'
import { useRouter } from '@lytjs/router'
import { useUsers } from '../composables/useUsers.js'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const router = useRouter()
const { currentUser, loading, error, loadUser, clearError } = useUsers()

const initials = computed(() => {
  if (!currentUser.value) return ''
  return currentUser.value.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
})

const goBack = () => {
  router.back()
}

const retry = () => {
  loadUser(props.id)
}

onMounted(() => {
  loadUser(props.id)
})
</script>

<style scoped>
.user-detail-view {
  max-width: 800px;
  margin: 0 auto;
}

.back-btn {
  background: none;
  border: none;
  color: #3eaf7c;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  margin-bottom: 1.5rem;
}

.back-btn:hover {
  text-decoration: underline;
}

.user-detail {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #3eaf7c 0%, #369f6e 100%);
  color: white;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: white;
  color: #3eaf7c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  margin-right: 1.5rem;
}

.basic-info h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.username {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.info-sections {
  padding: 2rem;
}

.info-section {
  margin-bottom: 2rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section h2 {
  color: #333;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f0f0f0;
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item label {
  font-size: 0.85rem;
  color: #999;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item a {
  color: #3eaf7c;
  text-decoration: none;
}

.info-item a:hover {
  text-decoration: underline;
}

.catch-phrase {
  font-style: italic;
  color: #666;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.error-message button {
  margin-top: 1rem;
  background: #c62828;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
}

.not-found {
  text-align: center;
  padding: 4rem 2rem;
}

.not-found h2 {
  color: #666;
  margin-bottom: 0.5rem;
}

.not-found p {
  color: #999;
  margin-bottom: 1.5rem;
}

.not-found button {
  background: #3eaf7c;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

## 关键代码解释

### 1. Composable 模式

```javascript
export function useUsers() {
  const users = ref([])
  const loading = ref(false)
  // ...
  return { users, loading, /* ... */ }
}
```

使用 Composable 模式封装可复用的逻辑。`useUsers` 封装了所有用户相关的状态和操作，可以在多个组件中使用。

### 2. 异步数据处理

```javascript
const loadUsers = async (page = 1) => {
  loading.value = true
  error.value = null

  try {
    const { users: newUsers, total } = await fetchUsers(page)
    users.value = newUsers
    totalUsers.value = total
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
```

标准的异步数据获取模式：设置加载状态、清除错误、发起请求、处理成功/失败、重置加载状态。

### 3. 防抖搜索

```javascript
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    performSearch(searchInput.value)
  }, 300)
}
```

使用防抖技术避免频繁的搜索请求，提升性能和用户体验。

### 4. 路由导航

```javascript
const goToDetail = () => {
  router.push({
    name: 'UserDetail',
    params: { id: props.user.id },
  })
}
```

使用编程式导航跳转到用户详情页，传递路由参数。

### 5. 错误处理

```vue
<div v-if="error" class="error-message">
  <p>{{ error }}</p>
  <button @click="clearError">重试</button>
</div>
```

优雅的错误处理 UI，显示错误信息并提供重试操作。

## 下一步

- 学习 [路由](../api/router) 的更多功能
- 了解 [状态管理](../api/store)
- 探索 [SSR](../guide/ssr) 服务端渲染
