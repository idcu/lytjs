# Signal 组件中使用 Proxy ref

本示例展示在以 Signal 模式为主的组件中，如何使用和桥接 Proxy 模式的 `ref`。

## 场景：使用 Ref 组合函数

当需要复用基于 `ref` 的组合函数时。

```ts
import {
  ref,
  computed,
  watch,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  toRef,
  toRefs
} from 'lyt'

// ===== 基于 ref 的组合函数（可能是第三方库） =====
function useLocalStorage<T>(key: string, defaultValue: T) {
  const stored = ref<T>(defaultValue)

  // 初始化：从 localStorage 读取
  try {
    const item = localStorage.getItem(key)
    if (item) {
      stored.value = JSON.parse(item)
    }
  } catch {
    // 忽略解析错误
  }

  // 侦听变化，自动保存
  watch(stored, (newVal) => {
    try {
      localStorage.setItem(key, JSON.stringify(newVal))
    } catch {
      // 忽略存储错误
    }
  }, { deep: true })

  return stored
}

function useDebouncedRef<T>(initialValue: T, delay: number) {
  const value = ref(initialValue)
  const debounced = ref(initialValue)
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(value, (newVal) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = newVal
    }, delay)
  })

  return { value, debounced }
}

// ===== Signal 组件中使用 =====
const theme = useLocalStorage('theme', 'light')
const { value: searchInput, debounced: debouncedSearch } = useDebouncedRef('', 300)

// 将 ref 转为 Signal 计算信号
const themeSignal = computedSignal(() => theme.value)
const searchSignal = computedSignal(() => debouncedSearch.value)

// Signal 副作用
signalEffect(() => {
  console.log(`主题: ${themeSignal()}, 搜索: ${searchSignal()}`)
})

// 修改 ref 的值
theme.value = 'dark'
searchInput.value = 'lytjs'
// 300ms 后 debouncedSearch 更新，触发 signalEffect
```

## 场景：桥接 reactive 与 Signal

将 `reactive` 对象的属性通过 `toRef` / `toRefs` 桥接到 Signal 上下文。

```ts
import {
  reactive,
  toRef,
  toRefs,
  ref,
  watch,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

// ===== Proxy 模式的全局状态（可能是 store） =====
const globalStore = reactive({
  user: {
    name: '张三',
    avatar: '',
    preferences: {
      theme: 'light',
      fontSize: 14
    }
  },
  app: {
    sidebarOpen: true,
    notifications: 0
  }
})

// ===== Signal 组件 =====

// 方式 1：使用 toRef 获取单个属性
const userNameRef = toRef(globalStore.user, 'name')
const userNameSignal = computedSignal(() => userNameRef.value)

// 方式 2：使用 toRefs 获取多个属性
const userRefs = toRefs(globalStore.user)
const prefsRefs = toRefs(globalStore.user.preferences)

const displayInfo = computedSignal(() => {
  return `${userRefs.name.value}，字体大小: ${prefsRefs.fontSize.value}`
})

// Signal 副作用
signalEffect(() => {
  console.log(`用户: ${userNameSignal()}`)
  console.log(displayInfo())
})

// 方式 3：使用 ref 包装整个 reactive 对象
const storeRef = ref(globalStore)
const sidebarOpen = computedSignal(() => storeRef.value.app.sidebarOpen)

signalEffect(() => {
  console.log(`侧边栏: ${sidebarOpen() ? '打开' : '关闭'}`)
})

// 修改 Proxy 状态（Signal 自动感知）
globalStore.user.name = '李四'
globalStore.user.preferences.fontSize = 16
globalStore.app.sidebarOpen = false
```

## 场景：Signal 驱动 UI，Ref 驱动数据

Signal 负责高频 UI 状态，Ref 负责数据持久化。

```ts
import {
  ref,
  watch,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

// ===== Ref：数据层（低频、持久化） =====
const savedDraft = ref('')

// 模拟保存到服务器
async function saveToServer(content: string): Promise<void> {
  console.log(`保存到服务器: "${content}"`)
  savedDraft.value = content
}

// ===== Signal：UI 层（高频、临时） =====
const editorContent = signal('')
const wordCount = computedSignal(() => editorContent().length)
const isModified = computedSignal(() => editorContent() !== savedDraft.value)
const isSaving = signal(false)
const lastSaved = signal<string>('')

// Signal 副作用：显示编辑器状态
signalEffect(() => {
  const modified = isModified()
  const saving = isSaving()
  const status = saving ? '保存中...' : (modified ? '未保存' : '已保存')
  console.log(`[${status}] 字数: ${wordCount()}，上次保存: ${lastSaved()}`)
})

// 保存函数
async function save() {
  if (!isModified()) return

  isSaving.set(true)
  try {
    await saveToServer(editorContent())
    batch(() => {
      lastSaved.set(new Date().toLocaleTimeString())
      isSaving.set(false)
    })
  } catch {
    isSaving.set(false)
    console.log('保存失败')
  }
}

// 自动保存（使用 watch 侦听 Signal 变化）
// 注意：这里通过 computedSignal 桥接
const contentRef = computedSignal(() => editorContent())

// 使用 Proxy 的 watch 来实现自动保存
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

watch(contentRef, () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(save, 2000)
})

// 使用
editorContent.set('Hello Lyt.js')
editorContent.set('Hello Lyt.js Signal Mode')
// 2 秒后自动保存
```

## 场景：双向同步

在 Proxy 和 Signal 之间建立双向同步。

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

// Proxy 状态
const proxyState = reactive({
  temperature: 20,
  humidity: 60
})

// Signal 状态
const tempSignal = signal(20)
const humiditySignal = signal(60)

// Proxy -> Signal 同步
watch(() => proxyState.temperature, (newVal) => {
  tempSignal.set(newVal)
})

watch(() => proxyState.humidity, (newVal) => {
  humiditySignal.set(newVal)
})

// Signal -> Proxy 同步
signalEffect(() => {
  const temp = tempSignal()
  if (proxyState.temperature !== temp) {
    proxyState.temperature = temp
  }
})

signalEffect(() => {
  const humidity = humiditySignal()
  if (proxyState.humidity !== humidity) {
    proxyState.humidity = humidity
  }
})

// 计算信号：舒适度指数
const comfortIndex = computedSignal(() => {
  const t = tempSignal()
  const h = humiditySignal()
  // 简化的舒适度计算
  return Math.round(t - (h > 70 ? (h - 70) * 0.1 : 0))
})

signalEffect(() => {
  console.log(`舒适度指数: ${comfortIndex()}`)
})

// 从任意一侧修改都能同步
proxyState.temperature = 25   // -> Signal 更新
tempSignal.set(22)             // -> Proxy 更新
```

## 最佳实践总结

1. **`toRef` / `toRefs` 是首选桥接工具**：将 reactive 属性转为 Ref，再在 Signal 中使用
2. **`computedSignal(() => ref.value)` 模式**：最简单的单向桥接方式
3. **避免循环更新**：在双向同步时加入条件判断，防止无限循环
4. **Signal 负责高频，Ref 负责持久化**：根据数据特性选择合适的模式
5. **使用 `watch` 侦听 Signal 变化**：通过 `computedSignal` 桥接后，可以用 `watch` 侦听
