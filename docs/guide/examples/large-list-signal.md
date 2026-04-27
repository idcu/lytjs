# 大列表的 Signal 优化

本示例展示如何使用 Signal 模式优化大型列表的性能，实现细粒度更新。

## 问题：Proxy 模式的性能瓶颈

```ts
import { reactive, effect } from 'lyt'

// Proxy 模式：修改一个项目会触发依赖整个列表的 effect
const list = reactive(
  Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    selected: false,
    score: Math.floor(Math.random() * 100)
  }))
)

let renderCount = 0

// 这个 effect 依赖整个列表，任何修改都会触发
effect(() => {
  renderCount++
  console.log(`[Proxy] 第 ${renderCount} 次渲染，列表长度: ${list.length}`)
})

// 修改一个项目 -> 整个列表的 effect 都会触发
list[0].selected = true
// 输出: [Proxy] 第 2 次渲染，列表长度: 10000

list[5000].score = 99
// 输出: [Proxy] 第 3 次渲染，列表长度: 10000
```

## 方案：Signal 模式的细粒度更新

```ts
import {
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch,
  untrack
} from 'lyt'

interface Item {
  id: number
  name: string
  selected: boolean
  score: number
}

// ===== 方案 1：使用 Signal 管理列表 + 细粒度计算 =====

const items = signal<Item[]>(
  Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    selected: false,
    score: Math.floor(Math.random() * 100)
  }))
)

const filterText = signal('')
const sortBy = signal<'name' | 'score'>('score')

// 计算信号：过滤和排序
const processedItems = computedSignal(() => {
  const keyword = filterText()
  const order = sortBy()
  let result = items()

  if (keyword) {
    result = result.filter(item =>
      item.name.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  return [...result].sort((a, b) => {
    if (order === 'name') return a.name.localeCompare(b.name)
    return b.score - a.score
  })
})

// 计算信号：统计信息
const stats = computedSignal(() => {
  const list = items()
  const selected = list.filter(i => i.selected).length
  const avgScore = list.reduce((sum, i) => sum + i.score, 0) / list.length
  return { total: list.length, selected, avgScore: Math.round(avgScore) }
})

// 副作用：只依赖统计信息
signalEffect(() => {
  const s = stats()
  console.log(`总计: ${s.total}, 选中: ${s.selected}, 平均分: ${s.avgScore}`)
})

// 副作用：只依赖过滤后的列表长度
signalEffect(() => {
  console.log(`显示 ${processedItems().length} 项`)
})

// ===== 优化操作 =====

// 批量更新：一次触发
function selectAll() {
  batch(() => {
    items.update(list =>
      list.map(item => ({ ...item, selected: true }))
    )
  })
}

// 单项更新：使用 map 创建新数组
function toggleItem(id: number) {
  items.update(list =>
    list.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    )
  )
}

// 添加项目
function addItem(item: Item) {
  items.update(list => [...list, item])
}

// 删除项目
function removeItem(id: number) {
  items.update(list => list.filter(item => item.id !== id))
}

// 批量删除选中项
function removeSelected() {
  batch(() => {
    items.update(list => list.filter(item => !item.selected))
  })
}

// 使用
toggleItem(0)
filterText.set('item 1')
sortBy.set('name')
```

## 方案 2：每个项目一个 Signal（极致细粒度）

```ts
import {
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

interface ItemSignals {
  id: number
  name: signal<string>
  selected: signal<boolean>
  score: signal<number>
}

// 为每个项目创建独立的 Signal
const itemSignals = signal<ItemSignals[]>(
  Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: signal(`Item ${i}`),
    selected: signal(false),
    score: signal(Math.floor(Math.random() * 100))
  }))
)

// 全局过滤和排序
const filterText = signal('')

const filteredItems = computedSignal(() => {
  const keyword = filterText()
  const items = itemSignals()
  if (!keyword) return items
  return items.filter(item =>
    item.name().toLowerCase().includes(keyword.toLowerCase())
  )
})

// 只依赖特定项目的 effect
// 修改 item[0] 不会触发依赖 item[1] 的 effect
signalEffect(() => {
  const first = itemSignals()[0]
  if (first) {
    console.log(`第一项: ${first.name()}, 选中: ${first.selected()}`)
  }
})

// 修改单个项目（不影响其他项目的 effect）
function toggleItem(index: number) {
  const items = itemSignals()
  if (items[index]) {
    items[index].selected.update(s => !s)
  }
}

function updateScore(index: number, newScore: number) {
  const items = itemSignals()
  if (items[index]) {
    items[index].score.set(newScore)
  }
}

// 使用
toggleItem(0)      // 只触发依赖 item[0] 的 effect
updateScore(1, 99) // 只触发依赖 item[1] 的 effect
```

## 方案 3：虚拟列表 + Signal

```ts
import {
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

// 大数据集
const allItems = signal<string[]>(
  Array.from({ length: 100000 }, (_, i) => `Item ${i}`)
)

// 虚拟滚动参数
const scrollTop = signal(0)
const viewportHeight = signal(600)
const itemHeight = signal(40)

// 计算可见范围
const visibleRange = computedSignal(() => {
  const scroll = scrollTop()
  const height = viewportHeight()
  const itemH = itemHeight()

  const startIndex = Math.floor(scroll / itemH)
  const endIndex = Math.min(
    startIndex + Math.ceil(height / itemH) + 2,
    allItems().length
  )

  return { startIndex, endIndex }
})

// 只计算可见项
const visibleItems = computedSignal(() => {
  const { startIndex, endIndex } = visibleRange()
  return allItems().slice(startIndex, endIndex).map((name, i) => ({
    index: startIndex + i,
    name
  }))
})

// 总高度（用于滚动条）
const totalHeight = computedSignal(() => {
  return allItems().length * itemHeight()
})

// 偏移量（用于定位）
const offsetY = computedSignal(() => {
  return visibleRange().startIndex * itemHeight()
})

// 副作用：只渲染可见项
signalEffect(() => {
  const items = visibleItems()
  const offset = offsetY()
  console.log(`渲染 ${items.length} 项，偏移: ${offset}px`)
  // 实际应用中这里会更新 DOM
})

// 模拟滚动
function onScroll(newScrollTop: number) {
  scrollTop.set(newScrollTop)
}

// 使用
onScroll(0)       // 渲染约 17 项
onScroll(1000)    // 渲染约 17 项（不同的项）
onScroll(50000)   // 渲染约 17 项（接近末尾）
```

## 性能对比总结

| 操作 | Proxy 模式 | Signal（方案 1） | Signal（方案 2） | Signal（方案 3） |
|------|-----------|-----------------|-----------------|-----------------|
| 修改单项 | 触发整个列表 effect | 只触发依赖项 effect | 只触发该项 effect | 只触发该项 effect |
| 添加项目 | 触发整个列表 effect | 只触发依赖列表长度的 effect | 需要更新 items signal | 只触发可见范围 effect |
| 过滤/搜索 | 需要遍历整个列表 | computedSignal 自动缓存 | computedSignal 自动缓存 | computedSignal + 虚拟滚动 |
| 内存占用 | 中等（Proxy 缓存） | 中等 | 较高（每项多个 Signal） | 低（只创建可见项） |
| 适用列表大小 | < 1000 | < 10000 | < 5000 | 100000+ |

## 选择建议

- **< 1000 项**：Proxy 模式足够，代码更简洁
- **1000 - 10000 项**：Signal 方案 1（数组 Signal + computedSignal）
- **需要单项独立更新**：Signal 方案 2（每项独立 Signal）
- **10000+ 项**：Signal 方案 3（虚拟列表 + Signal）
