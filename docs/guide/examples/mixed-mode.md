# 混合使用两种模式

本示例展示如何在同一个项目中混合使用 Proxy 模式和 Signal 模式，发挥各自的优势。

## 架构原则

```
┌─────────────────────────────────────────────┐
│                   应用层                      │
├──────────────────┬──────────────────────────┤
│   Proxy 模式      │      Signal 模式         │
│   (数据建模)      │      (UI 状态)           │
│                  │                          │
│ • 全局 Store      │ • 组件局部状态            │
│ • 表单数据        │ • 高频更新数据            │
│ • 配置对象        │ • 动画/计时器             │
│ • API 数据        │ • 虚拟滚动               │
├──────────────────┴──────────────────────────┤
│              桥接层 (ref / watch)             │
├─────────────────────────────────────────────┤
│              共享调度器 (queueJob)             │
└─────────────────────────────────────────────┘
```

## 示例：仪表盘应用

一个完整的仪表盘应用，展示如何混合使用两种模式。

```ts
import {
  // Proxy 模式 API
  reactive,
  ref,
  computed,
  watch,
  watchEffect,
  toRef,
  toRefs,
  // Signal 模式 API
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch,
  untrack,
  // 组件集成
  useSignalState,
  onSignalCleanup
} from 'lyt'

// ============================================================
// 第一部分：Proxy 模式 — 全局数据层
// ============================================================

// 全局配置（低频变化，使用 Proxy）
const appConfig = reactive({
  theme: 'dark' as 'dark' | 'light',
  locale: 'zh-CN' as 'zh-CN' | 'en-US',
  refreshInterval: 5000,
  maxDataPoints: 100
})

// 全局 Store（结构化数据，使用 Proxy）
const dashboardStore = reactive({
  user: {
    id: 1,
    name: '张三',
    role: 'admin'
  },
  widgets: [
    { id: 'revenue', title: '营收', type: 'chart', visible: true },
    { id: 'users', title: '用户', type: 'chart', visible: true },
    { id: 'orders', title: '订单', type: 'table', visible: true },
    { id: 'notifications', title: '通知', type: 'list', visible: true }
  ],
  notifications: [] as Array<{
    id: number
    message: string
    read: boolean
    timestamp: number
  }>
})

// Proxy 计算属性
const visibleWidgets = computed(() =>
  dashboardStore.widgets.filter(w => w.visible)
)

const unreadCount = computed(() =>
  dashboardStore.notifications.filter(n => !n.read).length
)

// ============================================================
// 第二部分：Signal 模式 — UI 状态层
// ============================================================

// 侧边栏状态（高频交互）
const sidebarOpen = signal(true)
const activeWidgetId = signal<string | null>(null)

// 实时数据（高频更新）
const revenueData = signal<number[]>([])
const userData = signal<number[]>([])
const orderData = signal<{ id: number; amount: number; status: string }[]>([])

// 加载状态
const isRefreshing = signal(false)
const lastRefreshTime = signal<string>('')

// 搜索/过滤
const searchQuery = signal('')
const dateRange = signal<{ start: Date; end: Date }>({
  start: new Date(Date.now() - 7 * 24 * 3600 * 1000),
  end: new Date()
})

// ============================================================
// 第三部分：桥接层 — 连接 Proxy 和 Signal
// ============================================================

// Proxy -> Signal：配置变化同步
watch(() => appConfig.theme, (theme) => {
  console.log(`主题切换: ${theme}`)
  // 在实际应用中这里会更新 CSS 变量等
})

watch(() => appConfig.refreshInterval, (interval) => {
  console.log(`刷新间隔: ${interval}ms`)
})

// Proxy -> Signal：通知数量同步
const unreadSignal = computedSignal(() => unreadCount.value)

signalEffect(() => {
  const count = unreadSignal()
  if (count > 0) {
    console.log(`🔔 ${count} 条未读通知`)
  }
})

// Signal -> Proxy：活跃组件同步
signalEffect(() => {
  const widgetId = activeWidgetId()
  if (widgetId) {
    console.log(`激活组件: ${widgetId}`)
  }
})

// ============================================================
// 第四部分：业务逻辑
// ============================================================

// 模拟数据刷新
async function refreshData() {
  if (isRefreshing()) return

  isRefreshing.set(true)
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500))

    batch(() => {
      // 更新 Signal 数据
      revenueData.update(data => {
        const newData = [...data, Math.random() * 10000]
        return newData.slice(-appConfig.maxDataPoints)
      })

      userData.update(data => {
        const newData = [...data, Math.floor(Math.random() * 100)]
        return newData.slice(-appConfig.maxDataPoints)
      })

      // 更新 Proxy 数据
      dashboardStore.notifications.unshift({
        id: Date.now(),
        message: '数据已刷新',
        read: false,
        timestamp: Date.now()
      })

      lastRefreshTime.set(new Date().toLocaleTimeString())
      isRefreshing.set(false)
    })
  } catch {
    isRefreshing.set(false)
  }
}

// 过滤订单
const filteredOrders = computedSignal(() => {
  const query = searchQuery()
  const orders = orderData()
  if (!query) return orders
  return orders.filter(o =>
    String(o.id).includes(query) || o.status.includes(query)
  )
})

// 组件可见性切换（Proxy 操作）
function toggleWidget(id: string) {
  const widget = dashboardStore.widgets.find(w => w.id === id)
  if (widget) {
    widget.visible = !widget.visible
  }
}

// 标记所有通知已读（Proxy 操作）
function markAllRead() {
  for (const n of dashboardStore.notifications) {
    n.read = true
  }
}

// ============================================================
// 第五部分：自动刷新（混合使用 watch 和 signalEffect）
// ============================================================

let refreshTimer: ReturnType<typeof setInterval> | null = null

// 使用 Proxy watch 监听刷新间隔变化
watch(() => appConfig.refreshInterval, (interval) => {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(refreshData, interval)
})

// 使用 Signal effect 监听侧边栏状态
signalEffect((onCleanup) => {
  if (sidebarOpen()) {
    console.log('侧边栏打开')
  } else {
    console.log('侧边栏关闭')
  }
})

// ============================================================
// 第六部分：使用
// ============================================================

// 初始化
refreshData()

// 修改 Proxy 配置
appConfig.refreshInterval = 3000

// 修改 Signal UI 状态
sidebarOpen.set(false)
activeWidgetId.set('revenue')

// 搜索
searchQuery.set('pending')

// 切换组件可见性
toggleWidget('notifications')
```

## 示例：混合模式的状态管理

```ts
import {
  reactive,
  ref,
  computed,
  watch,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch,
  toRef
} from 'lyt'

// ===== 全局 Store（Proxy 模式）=====
const store = reactive({
  // 用户信息
  user: null as { id: number; name: string } | null,

  // 设置
  settings: {
    theme: 'light',
    language: 'zh-CN',
    autoSave: true,
    autoSaveInterval: 5000
  },

  // 数据
  projects: [] as Array<{
    id: number
    name: string
    status: 'active' | 'archived'
  }>
})

// ===== 组件局部状态（Signal 模式）=====

// 编辑器组件
function useEditor(projectId: number) {
  const content = signal('')
  const isDirty = signal(false)
  const isSaving = signal(false)
  const wordCount = computedSignal(() => content().length)

  // 查找项目
  const projectRef = computed(() =>
    store.projects.find(p => p.id === projectId)
  )

  // 从 Proxy 加载内容
  function load() {
    const project = projectRef.value
    if (project) {
      content.set(`项目: ${project.name}`)
      isDirty.set(false)
    }
  }

  // 保存到 Proxy
  async function save() {
    if (!isDirty()) return

    isSaving.set(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      // 更新 Proxy store
      const project = store.projects.find(p => p.id === projectId)
      if (project) {
        project.name = content().split('\n')[0].replace('项目: ', '')
      }
      batch(() => {
        isDirty.set(false)
        isSaving.set(false)
      })
    } catch {
      isSaving.set(false)
    }
  }

  // 自动保存
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  signalEffect((onCleanup) => {
    if (isDirty() && store.settings.autoSave) {
      autoSaveTimer = setTimeout(save, store.settings.autoSaveInterval)
    }

    onCleanup(() => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
    })
  })

  return { content, isDirty, isSaving, wordCount, load, save }
}

// ===== 使用 =====
store.projects.push({ id: 1, name: '我的项目', status: 'active' })

const editor = useEditor(1)
editor.load()

editor.content.set('项目: 新名称\n更多内容...')
// 5 秒后自动保存（如果 autoSave 开启）
```

## 混合模式最佳实践

### 1. 明确分层

```ts
// 推荐：Proxy 管理数据，Signal 管理 UI
// 数据层（Proxy）
const dataStore = reactive({ items: [], config: {} })

// UI 层（Signal）
const isLoading = signal(false)
const selectedId = signal<number | null>(null)
const scrollTop = signal(0)
```

### 2. 单向数据流

```ts
// 推荐：Proxy -> Signal（数据驱动 UI）
const dataRef = computed(() => dataStore.items)
const displayItems = computedSignal(() => dataRef.value.filter(...))

// 不推荐：Signal -> Proxy（UI 反写数据，容易混乱）
```

### 3. 桥接模式选择

```ts
// 场景 1：Proxy 属性 -> Signal（使用 toRef + computedSignal）
const nameRef = toRef(store.user, 'name')
const nameSignal = computedSignal(() => nameRef.value)

// 场景 2：Proxy 整体 -> Signal（使用 ref 包装）
const storeRef = ref(store)
const userSignal = computedSignal(() => storeRef.value.user)

// 场景 3：Signal -> Proxy（使用 watch）
watch(signalValue, (newVal) => {
  store.someField = newVal
})

// 场景 4：双向同步（使用 watch + 条件判断）
watch(() => store.field, (val) => { fieldSignal.set(val) })
signalEffect(() => {
  const val = fieldSignal()
  if (store.field !== val) store.field = val
})
```

### 4. 批量更新

```ts
// 推荐：同时修改 Proxy 和 Signal 时使用 batch
batch(() => {
  // Proxy 修改
  store.items.push(newItem)
  store.filter = ''

  // Signal 修改
  selectedId.set(newItem.id)
  isLoading.set(false)
})
```
