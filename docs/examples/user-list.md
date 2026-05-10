# 用户列表示例

一个带 API 调用的用户列表应用，展示 Lyt.js 的异步数据处理、路由导航和错误处理功能。

## 在线演示

[在 StackBlitz 上打开](https://stackblitz.com/edit/lytjs-user-list)

## 完整代码

### 项目结构

```
src/
├── components/
│   ├── UserCard.js
│   ├── UserList.js
│   └── LoadingSpinner.js
├── composables/
│   └── useUsers.js
├── views/
│   ├── UserListView.js
│   └── UserDetailView.js
├── router/
│   └── index.js
├── api/
│   └── users.js
└── App.js
```

### App.js

```javascript
import { createApp, h } from '@lytjs/core'
import { RouterView, RouterLink } from '@lytjs/router'

function setup() {
  return {}
}

function render() {
  return h('div', { id: 'app' }, [
    h('nav', { class: 'navbar' }, [
      h('div', { class: 'nav-brand' }, [
        h(RouterLink, { to: '/' }, 'User Manager'),
      ]),
      h('div', { class: 'nav-links' }, [
        h(RouterLink, { to: '/' }, '用户列表'),
        h(RouterLink, { to: '/about' }, '关于'),
      ]),
    ]),
    h('main', { class: 'main-content' }, [
      h(RouterView),
    ]),
  ])
}

const app = createApp({ setup, render })
```

```css
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
```

### router/index.js

```javascript
import { createRouter, createWebHistory } from '@lytjs/router'
import UserListView from '../views/UserListView.js'
import UserDetailView from '../views/UserDetailView.js'

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
    component: () => import('../views/AboutView.js'),
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

### components/LoadingSpinner.js

```javascript
import { h } from '@lytjs/core'

export function LoadingSpinner(props = {}) {
  const message = props.message || '加载中...'

  return h('div', { class: 'loading-spinner' }, [
    h('div', { class: 'spinner' }),
    message && h('p', {}, message),
  ])
}
```

```css
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
```

### components/UserCard.js

```javascript
import { computed, h } from '@lytjs/core'
import { useRouter } from '@lytjs/router'

export function UserCard(props) {
  const { user } = props
  const router = useRouter()

  const initials = computed(() => {
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  })

  const goToDetail = () => {
    router.push({
      name: 'UserDetail',
      params: { id: user.id },
    })
  }

  return () => h('div', { class: 'user-card', onClick: goToDetail }, [
    h('div', { class: 'avatar' }, initials.value),
    h('div', { class: 'info' }, [
      h('h3', {}, user.name),
      h('p', { class: 'email' }, user.email),
      h('p', { class: 'company' }, user.company?.name),
    ]),
    h('div', { class: 'arrow' }, '→'),
  ])
}
```

```css
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
```

### views/UserListView.js

```javascript
import { ref, onMounted, h } from '@lytjs/core'
import { useUsers } from '../composables/useUsers.js'
import { UserCard } from '../components/UserCard.js'
import { LoadingSpinner } from '../components/LoadingSpinner.js'

export function UserListView() {
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

  return () => h('div', { class: 'user-list-view' }, [
    h('h1', {}, '用户列表'),

    // 搜索栏
    h('div', { class: 'search-bar' }, [
      h('input', {
        class: 'search-input',
        value: searchInput.value,
        onInput: (e) => { searchInput.value = e.target.value; debouncedSearch() },
        placeholder: '搜索用户...',
      }),
      isSearching.value && h('button', { class: 'clear-btn', onClick: clearSearch }, '清除'),
    ]),

    // 错误提示
    error.value && h('div', { class: 'error-message' }, [
      h('p', {}, error.value),
      h('button', { onClick: clearError }, '重试'),
    ]),

    // 加载状态
    loading.value && users.value.length === 0 && h(LoadingSpinner),

    // 用户列表
    users.value.length > 0 && h('div', { class: 'user-list' }, [
      ...users.value.map(user => h(UserCard, { user, key: user.id })),

      // 加载更多
      hasMore.value && !isSearching.value && h('div', { class: 'load-more' }, [
        h('button', { onClick: loadMore, disabled: loading.value },
          loading.value ? '加载中...' : '加载更多'
        ),
      ]),
    ]),

    // 空状态
    users.value.length === 0 && !loading.value && h('div', { class: 'empty-state' }, [
      h('p', {}, isSearching.value ? '没有找到匹配的用户' : '暂无用户数据'),
      isSearching.value && h('button', { onClick: clearSearch }, '清除搜索'),
    ]),
  ])
}
```

```css
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
```

### views/UserDetailView.js

```javascript
import { computed, onMounted, h } from '@lytjs/core'
import { useRouter } from '@lytjs/router'
import { useUsers } from '../composables/useUsers.js'
import { LoadingSpinner } from '../components/LoadingSpinner.js'

export function UserDetailView(props) {
  const { id } = props
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
    loadUser(id)
  }

  onMounted(() => {
    loadUser(id)
  })

  return () => h('div', { class: 'user-detail-view' }, [
    h('button', { class: 'back-btn', onClick: goBack }, '← 返回列表'),

    loading.value && h(LoadingSpinner, { message: '加载用户信息...' }),

    error.value && h('div', { class: 'error-message' }, [
      h('p', {}, error.value),
      h('button', { onClick: retry }, '重试'),
    ]),

    currentUser.value && h('div', { class: 'user-detail' }, [
      h('div', { class: 'header' }, [
        h('div', { class: 'avatar' }, initials.value),
        h('div', { class: 'basic-info' }, [
          h('h1', {}, currentUser.value.name),
          h('p', { class: 'username' }, `@${currentUser.value.username}`),
        ]),
      ]),

      h('div', { class: 'info-sections' }, [
        // 联系信息
        h('section', { class: 'info-section' }, [
          h('h2', {}, '联系信息'),
          h('div', { class: 'info-grid' }, [
            h('div', { class: 'info-item' }, [
              h('label', {}, '邮箱'),
              h('a', { href: `mailto:${currentUser.value.email}` }, currentUser.value.email),
            ]),
            h('div', { class: 'info-item' }, [
              h('label', {}, '电话'),
              h('span', {}, currentUser.value.phone),
            ]),
            h('div', { class: 'info-item' }, [
              h('label', {}, '网站'),
              h('a', { href: `https://${currentUser.value.website}`, target: '_blank' },
                currentUser.value.website
              ),
            ]),
          ]),
        ]),

        // 公司
        h('section', { class: 'info-section' }, [
          h('h2', {}, '公司'),
          h('div', { class: 'info-grid' }, [
            h('div', { class: 'info-item' }, [
              h('label', {}, '名称'),
              h('span', {}, currentUser.value.company?.name),
            ]),
            h('div', { class: 'info-item' }, [
              h('label', {}, '标语'),
              h('span', { class: 'catch-phrase' }, `"${currentUser.value.company?.catchPhrase}"`),
            ]),
            h('div', { class: 'info-item' }, [
              h('label', {}, '业务'),
              h('span', {}, currentUser.value.company?.bs),
            ]),
          ]),
        ]),

        // 地址
        h('section', { class: 'info-section' }, [
          h('h2', {}, '地址'),
          h('div', { class: 'info-grid' }, [
            h('div', { class: 'info-item' }, [
              h('label', {}, '街道'),
              h('span', {}, currentUser.value.address?.street),
            ]),
            h('div', { class: 'info-item' }, [
              h('label', {}, '城市'),
              h('span', {}, currentUser.value.address?.city),
            ]),
            h('div', { class: 'info-item' }, [
              h('label', {}, '邮编'),
              h('span', {}, currentUser.value.address?.zipcode),
            ]),
          ]),
        ]),
      ]),
    ]),

    !currentUser.value && !loading.value && !error.value && h('div', { class: 'not-found' }, [
      h('h2', {}, '用户未找到'),
      h('p', {}, '该用户可能不存在或已被删除'),
      h('button', { onClick: goBack }, '返回列表'),
    ]),
  ])
}
```

```css
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

```javascript
error.value && h('div', { class: 'error-message' }, [
  h('p', {}, error.value),
  h('button', { onClick: clearError }, '重试'),
])
```

优雅的错误处理 UI，显示错误信息并提供重试操作。

## 下一步

- 学习 [路由](../api/router) 的更多功能
- 了解 [状态管理](../api/store)
- 探索 [SSR](../guide/ssr) 服务端渲染
