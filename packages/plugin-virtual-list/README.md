# @lytjs/plugin-virtual-list

Lyt.js 虚拟列表插件 - 提供高性能虚拟滚动列表组件，支持动态高度和大数据量渲染。

## 特性

- 虚拟滚动，只渲染可见区域
- 支持固定高度和动态高度两种模式
- 高性能 RAF 节流滚动
- 缓冲区配置，减少白屏闪烁
- 滚动到指定索引 / 位置
- 触底回调（无限滚动）
- 零运行时依赖
- 完整 TypeScript 类型支持

## 安装

```bash
npm install @lytjs/plugin-virtual-list
```

## 使用

### 固定高度列表

```js
import { createVirtualList } from '@lytjs/plugin-virtual-list'

// 生成 100,000 条数据
const items = Array.from({ length: 100000 }, (_, i) => ({
  id: i,
  text: `Item #${i}`,
}))

const list = createVirtualList(document.getElementById('list'), {
  items,
  itemHeight: 40,
  renderItem: (item) => `
    <div style="padding: 0 16px; line-height: 40px; border-bottom: 1px solid #eee;">
      ${item.text}
    </div>
  `,
  height: 500,
  bufferSize: 10,
})
```

### 动态高度列表

```js
const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  title: `Item #${i}`,
  content: 'Lorem ipsum '.repeat(Math.floor(Math.random() * 10) + 1),
}))

const list = createVirtualList(document.getElementById('list'), {
  items,
  estimateHeight: 80,
  renderItem: (item) => `
    <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
      <h3 style="margin: 0 0 8px;">${item.title}</h3>
      <p style="margin: 0; color: #666;">${item.content}</p>
    </div>
  `,
  height: 600,
})
```

### 无限滚动

```js
let page = 0

const list = createVirtualList(document.getElementById('list'), {
  items: loadMore(),
  itemHeight: 50,
  renderItem: (item) => `<div class="item">${item.text}</div>`,
  onReachBottom: () => {
    page++
    const newItems = loadMore(page)
    list.setItems([...list.currentItems, ...newItems])
  },
})
```

### 滚动到指定位置

```js
// 滚动到第 500 项（顶部对齐）
list.scrollToIndex(500)

// 滚动到第 500 项（居中对齐）
list.scrollToIndex(500, 'center')

// 滚动到第 500 项（底部对齐）
list.scrollToIndex(500, 'bottom')

// 滚动到指定像素位置
list.scrollTo(2000)
```

### 更新数据

```js
list.setItems(newItems)
```

### 获取可见范围

```js
const { start, end } = list.getVisibleRange()
console.log(`可见范围: ${start} - ${end}`)
```

### 销毁

```js
list.destroy()
```

## API

### `createVirtualList(container, options): VirtualListInstance`

| 参数 | 类型 | 说明 |
|------|------|------|
| `container` | `HTMLElement` | 容器元素 |
| `options.items` | `VirtualListItem[]` | 数据列表 |
| `options.itemHeight` | `number` | 固定高度（像素） |
| `options.estimateHeight` | `number` | 预估高度（动态高度模式） |
| `options.renderItem` | `(item, index) => string` | 渲染函数 |
| `options.height` | `number` | 容器高度，默认 400 |
| `options.bufferSize` | `number` | 缓冲区项数，默认 5 |
| `options.containerClass` | `string` | 容器 CSS 类名 |
| `options.onScroll` | `(offset) => void` | 滚动回调 |
| `options.onReachBottom` | `() => void` | 触底回调 |
| `options.reachBottomThreshold` | `number` | 触底阈值，默认 50 |

### VirtualListInstance

| 方法 | 说明 |
|------|------|
| `setItems(items)` | 更新数据列表 |
| `scrollToIndex(index, align?)` | 滚动到指定索引 |
| `scrollTo(scrollTop)` | 滚动到指定位置 |
| `getVisibleRange()` | 获取当前可见范围 |
| `getScrollTop()` | 获取当前滚动偏移 |
| `forceUpdate()` | 强制重新渲染 |
| `getContainer()` | 获取容器元素 |
| `destroy()` | 销毁虚拟列表 |

## License

MIT
