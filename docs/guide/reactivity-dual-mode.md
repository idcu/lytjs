# 双响应式系统：Proxy 与 Signal

Lyt.js 独特地同时提供了两套响应式系统——**Proxy 模式**和 **Signal 模式**。开发者可以根据场景自由选择，甚至在同一个项目中混合使用。

## 概述

| 特性 | Proxy 模式 | Signal 模式 |
|------|-----------|------------|
| 核心机制 | ES6 Proxy 拦截 get/set | 显式 Signal 读写 |
| 依赖收集 | 自动（属性访问时） | 自动（Signal 调用时） |
| 适用场景 | 深层嵌套对象、表单、类 Vue 开发 | 细粒度更新、大列表、函数式风格 |
| API 风格 | `reactive()` / `ref()` / `computed()` / `watch()` | `signal()` / `computed()` / `effect()` / `batch()` |
| 学习曲线 | 低（类似 Vue 3） | 中（类似 Solid.js） |
| 粒度控制 | 对象级 | 值级 |

两套系统共享同一个调度器（`@lytjs/common` 中的 `queueJob`），因此它们的更新可以正确合并和排序。

## Proxy 模式

Proxy 模式基于 ES6 Proxy 实现，通过拦截对象的属性访问和修改来自动追踪依赖。它的 API 设计与 Vue 3 完全兼容。

### 适用场景

- 深层嵌套的配置对象或状态对象
- 表单数据管理（天然支持嵌套结构）
- 从 Vue 3 迁移的项目
- 偏好声明式、面向对象风格的开发者

### 核心 API

#### `reactive()`

创建深层响应式对象：

```ts
import { reactive } from 'lyt'

const state = reactive({
  count: 0,
  user: {
    name: '张三',
    address: {
      city: '北京'
    }
  }
})

// 直接访问和修改，自动追踪依赖
state.count++
state.user.address.city = '上海'  // 深层响应式
```

::: code-group

```ts [类型签名]
function reactive<T extends object>(target: T, options?: ReactiveOptions): T

interface ReactiveOptions {
  deep?: boolean     // 是否深层响应式（默认 true）
  readonly?: boolean // 是否只读（默认 false）
}
```

:::

#### `ref()`

创建 Ref 引用，用于包装基本类型值：

```ts
import { ref } from 'lyt'

const count = ref(0)
console.log(count.value)  // 0
count.value++

// 也可以包装对象
const user = ref({ name: '张三' })
user.value.name = '李四'  // 深层响应式
```

#### `computed()`

创建计算属性（惰性求值 + 缓存）：

```ts
import { ref, computed } from 'lyt'

const count = ref(0)
const double = computed(() => count.value * 2)

console.log(double.value)  // 0
count.value = 5
console.log(double.value)  // 10
```

#### `watch()` / `watchEffect()`

侦听响应式数据变化：

```ts
import { ref, watch, watchEffect } from 'lyt'

const count = ref(0)

// watch：显式指定侦听源
watch(count, (newVal, oldVal) => {
  console.log(`${oldVal} -> ${newVal}`)
})

// watchEffect：自动追踪依赖
watchEffect(() => {
  console.log(`当前值: ${count.value}`)
})
```

### 完整示例

```ts
import { reactive, ref, computed, watch, watchEffect } from 'lyt'

// 使用 reactive 管理复杂状态
const form = reactive({
  username: '',
  email: '',
  preferences: {
    theme: 'light',
    language: 'zh-CN'
  }
})

// 使用 ref 管理简单值
const isSubmitting = ref(false)

// 计算属性
const isValid = computed(() => {
  return form.username.length >= 3 && form.email.includes('@')
})

// 侦听变化
watchEffect(() => {
  console.log(`表单状态: ${isValid.value ? '有效' : '无效'}`)
})

watch(() => form.preferences.theme, (newTheme) => {
  console.log(`主题切换为: ${newTheme}`)
})
```

## Signal 模式

Signal 模式基于显式的 Signal 读写实现，提供更细粒度的更新控制和更好的性能表现。它的设计理念类似于 Solid.js 和 Angular Signals。

### 适用场景

- 需要细粒度更新的高性能场景
- 大型列表或表格渲染
- 函数式编程风格
- 需要精确控制依赖追踪的场景

### 核心 API

#### `signal()`

创建一个可写信号：

```ts
import { signal } from 'lyt'

const count = signal(0)
console.log(count())  // 0 — 调用即读取

count.set(1)          // 设置值
count.update(n => n + 1)  // 基于旧值更新
console.log(count())  // 2
```

::: code-group

```ts [类型签名]
function signal<T>(initialValue: T): WritableSignal<T>

interface WritableSignal<T> extends Signal<T> {
  set(value: T): void
  update(fn: (prev: T) => T): void
  dispose(): void
}

interface Signal<T> {
  (): T  // 调用即读取
}
```

:::

#### `computed()（Signal 版）`

创建计算信号（只读、惰性求值）：

```ts
import { signal, computed as computedSignal } from 'lyt'

const count = signal(0)
const double = computedSignal(() => count() * 2)

console.log(double())  // 0
count.set(5)
console.log(double())  // 10
```

::: tip
在统一导出中，Signal 的 `computed` 以 `computedSignal` 别名导出，以区分 Proxy 模式的 `computed`。你也可以直接从 `@lytjs/reactivity/signal` 导入。
:::

#### `effect()（Signal 版）`

创建副作用，自动追踪 Signal 依赖：

```ts
import { signal, effect as signalEffect } from 'lyt'

const count = signal(0)

const dispose = signalEffect((onCleanup) => {
  console.log(`当前值: ${count()}`)
  onCleanup(() => {
    console.log('清理旧副作用')
  })
})

count.set(1)   // 输出: 清理旧副作用 -> 当前值: 1
dispose()      // 停止副作用
```

#### `batch()`

批量更新，延迟通知直到最外层 batch 完成：

```ts
import { signal, effect as signalEffect, batch } from 'lyt'

const a = signal(0)
const b = signal(0)

signalEffect(() => {
  console.log(`a=${a()}, b=${b()}`)
})

// 不使用 batch：effect 执行两次
a.set(1)  // 触发一次
b.set(1)  // 再触发一次

// 使用 batch：effect 只执行一次
batch(() => {
  a.set(2)
  b.set(2)
})  // 只触发一次，输出: a=2, b=2
```

#### `untrack()`

在不创建订阅的情况下读取 Signal：

```ts
import { signal, effect as signalEffect, untrack } from 'lyt'

const count = signal(0)
const multiplier = signal(2)

signalEffect(() => {
  // multiplier 的变化不会触发此 effect
  const m = untrack(() => multiplier())
  console.log(`结果: ${count() * m}`)
})
```

### 组件集成 API

Lyt.js 提供了 Signal 与组件渲染函数之间的桥接工具：

```ts
import {
  useSignal,
  useSignalState,
  enterSignalComponentContext,
  onSignalCleanup
} from 'lyt'

// 在组件中使用 Signal
function setup() {
  // 创建与组件生命周期绑定的 Signal
  const [count, setCount] = useSignalState(0)

  // 在渲染函数中追踪 Signal 依赖
  const currentCount = useSignal(count)

  // 注册组件卸载时的清理函数
  onSignalCleanup(() => {
    console.log('组件卸载，清理资源')
  })

  return { count, setCount }
}
```

### 完整示例

```ts
import {
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch,
  untrack
} from 'lyt'

// 创建信号
const items = signal<string[]>([])
const filter = signal('')
const selectedId = signal<number | null>(null)

// 计算信号：过滤后的列表
const filteredItems = computedSignal(() => {
  const keyword = filter()
  if (!keyword) return items()
  return items().filter(item =>
    item.toLowerCase().includes(keyword.toLowerCase())
  )
})

// 计算信号：选中项
const selectedItem = computedSignal(() => {
  const id = selectedId()
  if (id === null) return null
  return items()[id] ?? null
})

// 副作用：日志
signalEffect(() => {
  console.log(`共 ${filteredItems().length} 项匹配`)
})

// 批量操作
function addItem(newItem: string) {
  batch(() => {
    items.update(list => [...list, newItem])
    filter.set('')  // 重置过滤
  })
}
```

## 互操作

Proxy 模式和 Signal 模式可以自由混合使用。以下介绍常见的互操作模式。

### 在 Proxy 组件中使用 Signal

当你的组件主要使用 `reactive` / `ref`，但某个子模块需要 Signal 的细粒度控制时：

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

// Proxy 模式管理表单状态
const form = reactive({
  username: '',
  email: ''
})

// Signal 模式管理搜索（需要细粒度更新）
const searchQuery = signal('')
const searchResults = computedSignal(() => {
  // 在 Signal 计算中读取 Proxy 数据
  return performSearch(searchQuery(), form.username)
})

// Signal 副作用
signalEffect(() => {
  console.log(`搜索 "${searchQuery()}" 返回 ${searchResults().length} 条结果`)
})

// Proxy watch 中更新 Signal
watch(() => form.username, (newName) => {
  searchQuery.set(newName)  // 从 Proxy 更新 Signal
})
```

### 在 Signal 组件中使用 Proxy ref

当你的组件主要使用 Signal，但需要与使用 `ref` 的组合函数交互时：

```ts
import {
  ref,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  watch
} from 'lyt'

// 一个使用 ref 的组合函数（可能是第三方库）
function useCounter(initial: number) {
  const count = ref(initial)
  const increment = () => count.value++
  return { count, increment }
}

// 在 Signal 组件中使用
const counter = useCounter(0)
const displayCount = computedSignal(() => {
  // 在 Signal 计算中读取 ref
  return counter.count.value * 2
})

// 使用 Proxy 的 watch 侦听 ref 变化
watch(counter.count, (newVal) => {
  console.log(`计数器更新为: ${newVal}`)
})

// 在 Signal effect 中读取 ref
signalEffect(() => {
  console.log(`双倍计数: ${displayCount()}`)
})
```

### 使用 `toRef` / `toRefs` 桥接

`toRef` 和 `toRefs` 可以将 `reactive` 对象的属性转为 `Ref`，方便在 Signal 上下文中使用：

```ts
import { reactive, toRef, toRefs, signal, computed as computedSignal } from 'lyt'

const state = reactive({
  firstName: '张',
  lastName: '三',
  age: 25
})

// 将单个属性转为 Ref
const firstNameRef = toRef(state, 'firstName')

// 将所有属性转为 Ref
const refs = toRefs(state)

// 在 Signal 计算中使用 Ref
const fullName = computedSignal(() => {
  return refs.firstName.value + refs.lastName.value
})
```

### 最佳实践

1. **保持一致性**：同一个模块内尽量使用同一种模式，避免频繁切换
2. **边界清晰**：在 Proxy 和 Signal 之间传递数据时，使用 `ref` 作为桥梁
3. **Signal 用于性能热点**：将性能敏感的部分（大列表、频繁更新的数据）用 Signal 实现
4. **Proxy 用于数据建模**：将复杂的数据结构用 Proxy 管理，利用其深层响应式的便利性

### 反模式

```ts
// 反模式 1：在同一个 effect 中混用两种系统
// 这可能导致依赖追踪混乱
import { reactive, signal, effect as signalEffect } from 'lyt'

const state = reactive({ count: 0 })
const count = signal(0)

signalEffect(() => {
  // 不推荐：同时读取 reactive 和 signal
  console.log(state.count, count())
})

// 推荐：分离关注点
signalEffect(() => {
  console.log(count())
})
watch(() => state.count, (val) => {
  console.log(val)
})
```

```ts
// 反模式 2：在 Signal 计算中产生副作用
import { signal, computed as computedSignal } from 'lyt'

const count = signal(0)

// 不推荐：计算信号中不应有副作用
const bad = computedSignal(() => {
  console.log('这会在每次计算时执行')  // 副作用
  return count() * 2
})

// 推荐：将副作用放在 effect 中
import { effect as signalEffect } from 'lyt'

const good = computedSignal(() => count() * 2)
signalEffect(() => {
  console.log(`结果: ${good()}`)
})
```

## 性能对比

### Proxy 模式

**优势：**
- 深层嵌套对象自动响应式，无需手动管理
- API 简洁直观，学习成本低
- 与 Vue 3 生态完全兼容

**劣势：**
- Proxy 本身有一定的运行时开销
- 依赖收集基于属性粒度，修改一个属性可能触发多个 effect
- 大型对象的深层代理会带来内存开销

**适用场景：**
- 中小型应用
- 表单、配置管理等结构化数据
- 从 Vue 3 迁移的项目

### Signal 模式

**优势：**
- 显式依赖追踪，精确控制更新范围
- 无 Proxy 开销，运行时性能更优
- `batch()` 可以有效合并多次更新
- 天然支持细粒度更新（只更新真正变化的部分）

**劣势：**
- 需要手动管理每个状态的 Signal
- 嵌套对象需要为每个属性创建 Signal，代码量较多
- 学习曲线相对较陡

**适用场景：**
- 性能敏感的应用
- 大型列表、表格、画布等高频更新场景
- 函数式编程风格

### 性能对比表

| 场景 | Proxy 模式 | Signal 模式 | 推荐 |
|------|-----------|------------|------|
| 简单计数器 | 优秀 | 优秀 | 均可 |
| 深层嵌套对象 | 优秀（自动） | 一般（需手动） | Proxy |
| 大列表（1000+ 项） | 一般 | 优秀 | Signal |
| 频繁批量更新 | 一般 | 优秀（batch） | Signal |
| 表单管理 | 优秀 | 一般 | Proxy |
| 计算密集型 | 良好 | 优秀 | Signal |
| 内存占用 | 较高（Proxy 缓存） | 较低 | Signal |

### 基准测试参考

```ts
import { reactive, ref, signal, computed as computedSignal, effect as signalEffect, batch } from 'lyt'

// Proxy 模式：更新嵌套对象
const proxyState = reactive({
  items: Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    selected: false
  }))
})

// Signal 模式：更新 Signal 数组
const signalItems = signal(
  Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    selected: false
  }))
)

// Proxy：修改单个项会触发依赖该对象的 effect
// Signal：只有依赖该特定项的 effect 会被触发
```

## 迁移指南

如果你已经使用 Proxy 模式开发了项目，想逐步迁移到 Signal 模式，可以按照以下步骤进行。

### 第一步：识别迁移候选

优先迁移以下场景：

- 频繁更新的数据（如实时数据流、动画状态）
- 大型列表或表格
- 性能瓶颈所在的模块

### 第二步：逐模块替换

```ts
// 迁移前（Proxy 模式）
import { reactive, ref, computed, watch } from 'lyt'

const state = reactive({
  items: [],
  filter: '',
  selectedId: null
})

const filteredItems = computed(() => {
  return state.items.filter(item =>
    item.name.includes(state.filter)
  )
})

watch(() => state.selectedId, (id) => {
  console.log(`选中: ${id}`)
})
```

```ts
// 迁移后（Signal 模式）
import {
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

const items = signal<Item[]>([])
const filter = signal('')
const selectedId = signal<number | null>(null)

const filteredItems = computedSignal(() => {
  const keyword = filter()
  return items().filter(item =>
    item.name.includes(keyword)
  )
})

signalEffect(() => {
  const id = selectedId()
  console.log(`选中: ${id}`)
})
```

### 第三步：利用 batch 优化

将多次 Signal 更新合并为一次批量更新：

```ts
// 迁移前
state.items.push(newItem)
state.filter = ''
state.selectedId = null

// 迁移后
batch(() => {
  items.update(list => [...list, newItem])
  filter.set('')
  selectedId.set(null)
})
```

### 第四步：处理互操作

如果项目不能一次性完全迁移，可以使用以下策略：

```ts
// 策略 1：使用 ref 作为桥梁
import { ref, toRef, signal, computed as computedSignal } from 'lyt'

const proxyState = reactive({ count: 0 })
const countRef = toRef(proxyState, 'count')
const countSignal = computedSignal(() => countRef.value)

// 策略 2：使用 watch 同步状态
import { watch } from 'lyt'

const sourceRef = ref(0)
const targetSignal = signal(0)

watch(sourceRef, (newVal) => {
  targetSignal.set(newVal)
})
```

### 注意事项

1. **Signal 没有深层响应式**：嵌套对象需要手动为每个需要响应式的属性创建 Signal
2. **Signal 的 `computed` 是只读的**：不支持 Proxy 模式中可写计算属性的 `set`
3. **Signal 的 `effect` 返回 dispose 函数**：而不是 Proxy 模式中的 `stop()` 方法
4. **Signal 使用 `batch()` 而非 `nextTick()`**：来控制更新时机

## 相关文档

- [响应式系统](./reactivity.md) — Proxy 模式详细文档
- [组合式 API 指南](./composition-api.md) — 在组件中使用响应式 API
- [性能优化](./performance.md) — 框架性能优化策略
- [示例：Proxy 基础用法](./examples/proxy-basic.md)
- [示例：Signal 基础用法](./examples/signal-basic.md)
- [示例：混合使用两种模式](./examples/mixed-mode.md)
