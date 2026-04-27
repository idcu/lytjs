# 服务端渲染 (SSR)

Lyt.js 内置 SSR 支持，可以将组件渲染为 HTML 字符串，用于服务端渲染场景。

## renderToString()

将 VNode 树同步渲染为 HTML 字符串：

```ts
import { renderToString } from 'lyt/renderer'

const html = renderToString(vnode)
console.log(html)
// '<div class="app"><h1>Hello</h1><p>内容</p></div>'
```

### 支持的 VNode 类型

- **Element VNode** — 输出 HTML 标签 + 属性 + 子节点
- **Text VNode** — 输出转义后的文本内容
- **Comment VNode** — 输出 HTML 注释 `<!-- -->`
- **Fragment VNode** — 只输出子节点（无包裹标签）
- **Component VNode** — 递归渲染组件 render 函数输出
- **Null/Undefined** — 不输出任何内容

### 特殊处理

- `class`/`style`/`event` 属性的序列化
- 自闭合标签（`br`/`hr`/`img`/`input` 等）
- HTML 转义（防 XSS）
- `data-*` 自定义属性
- `aria-*` 无障碍属性
- `dangerouslySetInnerHTML` 支持

## renderToStream()

将 VNode 树异步流式序列化，逐步输出 HTML：

```ts
import { renderToStream } from 'lyt/renderer'

// 使用 ReadableStream
const stream = renderToStream(vnode, {
  prefix: '<!DOCTYPE html><html><body>',
  suffix: '</body></html>'
})

// 在 Node.js 中使用
import { Readable } from 'stream'

Readable.from(stream).pipe(res)
```

### renderToStreamGenerator()

使用 Generator 函数进行流式渲染：

```ts
import { renderToStreamGenerator } from 'lyt/renderer'

async function handleRequest(req, res) {
  res.write('<!DOCTYPE html><html><body>')

  for await (const chunk of renderToStreamGenerator(vnode)) {
    res.write(chunk)
  }

  res.end('</body></html>')
}
```

## Suspense 集成

SSR 支持与 Suspense 组件集成，实现异步数据的流式渲染：

```ts
import { Suspense } from 'lyt/component'
import { renderToStream } from 'lyt/renderer'

const vnode = h(Suspense, {}, {
  default: () => h(AsyncComponent),
  fallback: () => h('div', null, '加载中...')
})

// 流式渲染：先输出 fallback，异步数据就绪后输出实际内容
const stream = renderToStream(vnode)
```

## Hydration（注水）

客户端注水将服务端渲染的静态 HTML "激活"为可交互的应用。

### hydrate()

```ts
import { hydrate } from 'lyt/renderer'

const app = createApp(App)
hydrate(app, document.getElementById('app'))
```

注水过程：
1. 遍历服务端渲染的 DOM 树
2. 对比每个 DOM 节点与对应的客户端 VNode
3. 如果匹配（标签名相同），复用 DOM 节点，绑定事件
4. 如果不匹配，标记为 hydration mismatch
5. 递归处理子节点
6. 注水完成后触发 `onHydrated` 回调

### HydrateOptions

```ts
interface HydrateOptions {
  /** 是否在注水不匹配时发出警告 */
  warnOnMismatch?: boolean
}
```

### HydrateResult

```ts
interface HydrateResult {
  /** 是否成功 */
  success: boolean
  /** 不匹配的节点数 */
  mismatches: number
}
```

### 工具函数

```ts
import {
  isHydrating,
  setHydrating,
  onHydrated,
  getHydrateStats,
  resetHydrateStats
} from 'lyt/renderer'

isHydrating()              // 判断是否处于注水模式
setHydrating(true)         // 设置注水模式
onHydrated(() => {         // 注水完成回调
  console.log('注水完成')
})
getHydrateStats()          // 获取注水统计信息
resetHydrateStats()        // 重置注水统计
```

## Islands Architecture（v3.1.0 新增）

Lyt.js v3.1.0 支持 Islands Architecture，允许页面大部分内容保持纯静态 HTML，仅对需要交互的"岛屿"组件进行注水。

### 什么是 Islands Architecture

传统 SSR 会对整个页面进行 Hydration，即使大部分内容是静态的。Islands Architecture 将页面分解为多个"岛屿"（Islands），只有被标记为岛屿的交互组件才会被注水，其余内容保持静态 HTML。

### defineIsland()

将组件标记为 Island 组件：

```ts
import { defineIsland } from 'lyt/ssr'

const SearchBar = defineIsland({
  name: 'SearchBar',

  setup() {
    const query = ref('')
    const results = ref([])

    async function search() {
      results.value = await fetchResults(query.value)
    }

    return { query, results, search }
  },

  template: `
    <div class="search-bar">
      <input v-bind:model="query" @keyup.enter="search" placeholder="搜索..." />
      <ul>
        <li v-each="item in results">{{ item.title }}</li>
      </ul>
    </div>
  `
})
```

### 在页面中使用 Islands

```ts
// server.js
import { createApp } from 'lyt'
import { renderToString } from 'lyt/renderer'
import { defineIsland } from 'lyt/ssr'
import Header from './Header'
import SearchBar from './SearchBar'
import Footer from './Footer'

function render(url) {
  const app = createApp({
    components: { Header, SearchBar, Footer },
    template: `
      <div>
        <Header />              <!-- 静态组件，不注水 -->
        <SearchBar />           <!-- Island 组件，会注水 -->
        <main>
          <article>静态内容...</article>
        </main>
        <Footer />              <!-- 静态组件，不注水 -->
      </div>
    `
  })

  const html = renderToString(app._component)

  return `
    <!DOCTYPE html>
    <html>
      <head><title>Lyt.js Islands</title></head>
      <body>
        <div id="app">${html}</div>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  `
}
```

### Island 组件的客户端注水

```ts
// client.js
import { hydrateIslands } from 'lyt/ssr'

// 仅注水 Island 组件，跳过静态内容
hydrateIslands()
```

### Island 选项

```ts
interface IslandOptions {
  /** 是否懒加载注水（进入视口时才注水） */
  lazy?: boolean
  /** 懒加载的 IntersectionObserver 选项 */
  lazyOptions?: IntersectionObserverInit
  /** 注水策略 */
  strategy?: 'load' | 'idle' | 'visible' | 'media'
}
```

```ts
const CommentSection = defineIsland({
  name: 'CommentSection',
  island: {
    lazy: true,
    strategy: 'visible'  // 进入视口时才注水
  },
  // ...
})
```

### 注水策略

| 策略 | 说明 |
|------|------|
| `load` | 页面加载完成后立即注水（默认） |
| `idle` | 浏览器空闲时注水（`requestIdleCallback`） |
| `visible` | 组件进入视口时注水（`IntersectionObserver`） |
| `media` | 匹配指定媒体查询时注水 |

## Partial Hydration（v3.1.0 新增）

Partial Hydration 允许对应用的不同部分使用不同的注水策略，实现更精细的 Hydration 控制。

### hydratePartial()

```ts
import { hydratePartial } from 'lyt/ssr'

function hydratePartial(
  app: App,
  container: HTMLElement,
  options?: PartialHydrateOptions
): Promise<PartialHydrateResult>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| app | `App` | 应用实例 |
| container | `HTMLElement` | 挂载容器 |
| options.regions | `HydrationRegion[]` | 注水区域配置 |
| options.defaultStrategy | `HydrationStrategy` | 默认注水策略 |

### HydrationRegion

```ts
interface HydrationRegion {
  /** 区域选择器 */
  selector: string
  /** 注水策略 */
  strategy: HydrationStrategy
  /** 优先级（数字越小越优先） */
  priority?: number
}

type HydrationStrategy =
  | 'immediate'    // 立即注水
  | 'idle'         // 空闲时注水
  | 'visible'      // 可见时注水
  | 'interaction'  // 首次交互时注水
  | 'media'        // 媒体查询匹配时注水
  | 'manual'       // 手动触发注水
```

### 使用示例

```ts
import { createApp } from 'lyt'
import { hydratePartial } from 'lyt/ssr'
import App from './App'

const app = createApp(App)

const result = await hydratePartial(app, document.getElementById('app'), {
  // 默认策略：空闲时注水
  defaultStrategy: 'idle',

  regions: [
    // 导航栏：立即注水（用户首屏交互）
    {
      selector: '[data-region="nav"]',
      strategy: 'immediate',
      priority: 1
    },
    // 主内容区：可见时注水
    {
      selector: '[data-region="content"]',
      strategy: 'visible',
      priority: 2
    },
    // 评论区：首次交互时注水
    {
      selector: '[data-region="comments"]',
      strategy: 'interaction',
      priority: 3
    },
    // 侧边栏：匹配暗色模式时注水
    {
      selector: '[data-region="sidebar"]',
      strategy: 'media',
      priority: 4
    }
  ]
})

console.log(result)
// {
//   success: true,
//   regions: {
//     nav: { hydrated: true, duration: 12 },
//     content: { hydrated: true, duration: 45 },
//     comments: { hydrated: false, pending: true },
//     sidebar: { hydrated: false, pending: true }
//   }
// }
```

### 手动触发注水

对于 `manual` 策略的区域，可以手动触发注水：

```ts
import { triggerHydration } from 'lyt/ssr'

// 手动触发评论区注水
triggerHydration('[data-region="comments"]')
```

### 服务端标记区域

在服务端渲染时，使用 `data-region` 属性标记注水区域：

```ts
// 组件模板
template: `
  <div>
    <nav data-region="nav">...</nav>
    <main data-region="content">...</main>
    <section data-region="comments">...</section>
    <aside data-region="sidebar">...</aside>
  </div>
`
```

### PartialHydrateResult

```ts
interface PartialHydrateResult {
  /** 是否全部成功 */
  success: boolean
  /** 各区域注水结果 */
  regions: Record<string, RegionResult>
}

interface RegionResult {
  /** 是否已注水 */
  hydrated: boolean
  /** 是否等待中 */
  pending: boolean
  /** 注水耗时（ms） */
  duration?: number
  /** 错误信息 */
  error?: Error
}
```

## 完整 SSR 示例

```ts
// server.js
import { createApp } from 'lyt'
import { renderToString } from 'lyt/renderer'
import App from './App'

function render(url) {
  const app = createApp(App)
  const html = renderToString(app._component)

  return `
    <!DOCTYPE html>
    <html>
      <head><title>Lyt.js SSR</title></head>
      <body>
        <div id="app">${html}</div>
        <script src="/client.js"></script>
      </body>
    </html>
  `
}

// client.js — 传统全量注水
import { createApp, hydrate } from 'lyt/renderer'
import App from './App'

hydrate(createApp(App), document.getElementById('app'))
```

### Islands + Partial Hydration 示例

```ts
// server.js
import { createApp } from 'lyt'
import { renderToString } from 'lyt/renderer'
import { defineIsland } from 'lyt/ssr'
import App from './App'

function render(url) {
  const app = createApp(App)
  const html = renderToString(app._component)

  return `
    <!DOCTYPE html>
    <html>
      <head><title>Lyt.js SSR + Islands</title></head>
      <body>
        <div id="app">${html}</div>
        <script type="module" src="/client-islands.js"></script>
      </body>
    </html>
  `
}

// client-islands.js — 仅注水 Island 组件
import { hydrateIslands } from 'lyt/ssr'

hydrateIslands({
  defaultStrategy: 'visible'
})
```

::: tip 提示
Islands Architecture 和 Partial Hydration 可以组合使用，实现最大化的性能优化。静态内容零 JS 开销，交互组件按需注水。
:::
