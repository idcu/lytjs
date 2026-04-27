# Proxy 组件中使用 Signal

本示例展示在以 Proxy 模式（`reactive` / `ref`）为主的组件中，如何引入 Signal 来优化特定场景。

## 场景：实时搜索

在表单组件中使用 Proxy 管理表单状态，同时使用 Signal 实现高性能的实时搜索。

```ts
import {
  reactive,
  ref,
  computed,
  watch,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

// ===== Proxy 模式：管理表单状态 =====
const form = reactive({
  username: '',
  email: '',
  role: 'user'
})

const isSubmitting = ref(false)

const isFormValid = computed(() => {
  return (
    form.username.length >= 3 &&
    form.email.includes('@') &&
    ['user', 'admin', 'editor'].includes(form.role)
  )
})

// ===== Signal 模式：管理实时搜索 =====
const searchQuery = signal('')
const searchResults = signal<string[]>([])
const isSearching = signal(false)

// 模拟搜索函数
async function performSearch(query: string, username: string): Promise<string[]> {
  const combined = `${query} ${username}`.trim()
  if (!combined) return []
  // 模拟 API 调用
  return [`结果 1: ${combined}`, `结果 2: ${combined}`, `结果 3: ${combined}`]
}

// Signal 计算信号：搜索关键词（从 Proxy 状态派生）
const effectiveQuery = computedSignal(() => {
  return `${searchQuery()} ${form.username}`.trim()
})

// Signal 副作用：执行搜索
signalEffect((onCleanup) => {
  const query = effectiveQuery()
  if (!query) {
    searchResults.set([])
    return
  }

  isSearching.set(true)
  let cancelled = false

  onCleanup(() => {
    cancelled = true
  })

  performSearch(searchQuery(), form.username).then(results => {
    if (!cancelled) {
      batch(() => {
        searchResults.set(results)
        isSearching.set(false)
      })
    }
  })
})

// ===== Proxy watch：同步状态 =====
watch(() => form.username, (newName) => {
  console.log(`用户名变更: ${newName}`)
  // 可以在这里触发其他 Proxy 相关的逻辑
})

watch(isFormValid, (valid) => {
  console.log(`表单${valid ? '有效' : '无效'}`)
})

// ===== 使用 =====
form.username = '张三'
form.email = 'zhangsan@example.com'
searchQuery.set('test')

// 输出:
// 用户名变更: 张三
// 表单有效
// （搜索结果异步返回后更新）
```

## 场景：性能计数器

在组件中使用 Proxy 管理配置，使用 Signal 管理高频更新的计数器。

```ts
import {
  reactive,
  ref,
  watch,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

// Proxy：管理配置（低频变化）
const config = reactive({
  theme: 'dark',
  locale: 'zh-CN',
  maxItems: 100,
  refreshInterval: 1000
})

// Signal：管理高频数据
const tickCount = signal(0)
const fps = signal(0)
const frameTime = signal(0)
const isRunning = signal(false)

// 计算信号
const displayFps = computedSignal(() => {
  const interval = untrack(() => config.refreshInterval)
  return Math.round(fps() * (1000 / interval))
})

// Signal 副作用：显示性能指标
signalEffect(() => {
  if (!isRunning()) return
  console.log(`FPS: ${fps()}, 帧时间: ${frameTime()}ms, 计数: ${tickCount()}`)
})

// Proxy watch：配置变更
watch(() => config.refreshInterval, (newInterval) => {
  console.log(`刷新间隔变更为: ${newInterval}ms`)
})

// 模拟动画循环
function simulateFrame() {
  if (!isRunning()) return

  batch(() => {
    tickCount.update(n => n + 1)
    frameTime.set(Math.random() * 16 + 1)
    fps.set(Math.round(1000 / frameTime()))
  })

  requestAnimationFrame(simulateFrame)
}

// 启动
isRunning.set(true)
simulateFrame()

// 修改配置（不影响 Signal 的高频更新）
config.refreshInterval = 500
```

## 场景：通知系统

Proxy 管理通知列表，Signal 管理未读计数（高频更新）。

```ts
import {
  reactive,
  computed,
  watch,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

interface Notification {
  id: number
  title: string
  read: boolean
  timestamp: number
}

// Proxy：管理通知列表
const notifications = reactive<{
  items: Notification[]
  filter: 'all' | 'unread' | 'read'
}>({
  items: [],
  filter: 'all'
})

// Signal：管理未读计数（可能被高频更新）
const unreadCount = signal(0)

// Proxy 计算属性
const filteredNotifications = computed(() => {
  switch (notifications.filter) {
    case 'unread':
      return notifications.items.filter(n => !n.read)
    case 'read':
      return notifications.items.filter(n => n.read)
    default:
      return notifications.items
  }
})

// Signal 计算信号
const hasUnread = computedSignal(() => unreadCount() > 0)
const badgeText = computedSignal(() => {
  const count = unreadCount()
  return count > 99 ? '99+' : String(count)
})

// 同步 Proxy 状态到 Signal
watch(
  () => notifications.items.filter(n => !n.read).length,
  (count) => {
    unreadCount.set(count)
  }
)

// Signal 副作用：未读变化时通知
signalEffect(() => {
  if (hasUnread()) {
    console.log(`🔔 ${unreadCount()} 条未读通知`)
  }
})

// 操作函数
function addNotification(title: string) {
  batch(() => {
    notifications.items.push({
      id: Date.now(),
      title,
      read: false,
      timestamp: Date.now()
    })
  })
}

function markAllRead() {
  batch(() => {
    for (const n of notifications.items) {
      n.read = true
    }
    unreadCount.set(0)
  })
}

// 使用
addNotification('新消息')
addNotification('系统更新')
console.log(badgeText())  // '2'
markAllRead()
console.log(badgeText())  // '0'
```

## 最佳实践总结

1. **Proxy 管理结构化数据**：表单、配置、列表等复杂对象用 `reactive`
2. **Signal 管理高频数据**：计数器、FPS、实时搜索等用 `signal`
3. **使用 `watch` 桥接**：通过 `watch` 将 Proxy 状态变化同步到 Signal
4. **使用 `batch` 合并更新**：在同时修改 Proxy 和 Signal 时使用 `batch`
5. **边界清晰**：每个模块明确使用哪种模式，减少混用
