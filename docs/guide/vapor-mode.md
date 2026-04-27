# Vapor Mode

Vapor Mode 是 Lyt.js v3.1.0 引入的全新编译策略，通过消除虚拟 DOM（Virtual DOM）开销，实现接近原生 JavaScript 的渲染性能。

## 概述

传统模式下，Lyt.js 通过编译模板生成 VNode 树，再由渲染器对比新旧 VNode 进行 DOM 更新（Diff 算法）。Vapor Mode 则直接将模板编译为精确的 DOM 操作指令，跳过 VNode 创建和 Diff 过程。

### 性能对比

| 指标 | 传统模式 | Vapor Mode |
|------|---------|------------|
| 内存占用 | 较高（VNode 树） | 极低（无 VNode） |
| 首次渲染 | 正常 | 快 30%-50% |
| 更新性能 | 依赖 Diff 优化 | 精确更新，无 Diff |
| 包体积 | 基准 | 减少约 2-3KB |

## 启用 Vapor Mode

### 编译时启用

在 Vite 配置中启用 Vapor Mode 编译：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import lyt from '@lytjs/vite-plugin'

export default defineConfig({
  plugins: [
    lyt({
      vapor: true  // 启用 Vapor Mode
    })
  ]
})
```

### 按组件启用

使用 `vapor` 编译提示标记特定组件：

```ts
import { defineComponent } from 'lyt'

export default defineComponent({
  vapor: true,  // 仅此组件使用 Vapor Mode

  setup() {
    const count = ref(0)
    return { count }
  },

  template: `
    <div>
      <span>计数: {{ count }}</span>
      <button @click="count++">+1</button>
    </div>
  `
})
```

### 运行时切换

```ts
import { createApp } from 'lyt'

const app = createApp(App)
app.config.vaporMode = true
app.mount('#app')
```

::: warning 注意
运行时切换仅影响未经过 Vapor 编译的组件。推荐在编译时启用以获得最佳性能。
:::

## 工作原理

Vapor Mode 的编译输出与传统模式截然不同：

### 传统模式编译输出

```ts
// 传统模式：生成 VNode 创建函数
function render(_ctx) {
  return h('div', null, [
    h('span', null, '计数: ' + _ctx.count),
    h('button', { onClick: () => _ctx.count++ }, '+1')
  ])
}
```

### Vapor Mode 编译输出

```ts
// Vapor Mode：生成精确的 DOM 操作指令
import { insert, setText, listen, createText, createElement } from 'lyt/vapor'

export function render(_ctx, container) {
  const div = createElement('div')
  insert(div, container)

  const span = createElement('span')
  const text = createText('计数: ' + _ctx.count)
  insert(span, div)
  insert(text, span)

  const btn = createElement('button')
  const btnText = createText('+1')
  insert(btn, div)
  insert(btnText, btn)

  listen(btn, 'click', () => _ctx.count++)

  // 精确更新函数
  return (prevCtx, nextCtx) => {
    if (prevCtx.count !== nextCtx.count) {
      setText(text, '计数: ' + nextCtx.count)
    }
  }
}
```

## 支持的特性

### 完全支持

- 文本插值 `{{ }}`
- 属性绑定 `v-bind` / `:`
- 事件绑定 `v-on` / `@`
- 条件渲染 `v-if` / `v-else`
- 列表渲染 `v-each`
- 双向绑定 `v-bind:model`
- 计算属性 `computed()`
- `ref()` 响应式引用

### 部分支持

| 特性 | 支持程度 | 说明 |
|------|---------|------|
| `<slot>` 插槽 | 支持 | 编译时确定插槽结构 |
| `<component>` 动态组件 | 支持 | 需要编译时类型推断 |
| `v-once` | 支持 | 编译为静态内容 |
| `v-memo` | 支持 | 编译为条件更新 |

### 不支持

- 运行时模板编译（`compile()` 函数）
- `$refs`（使用 `ref()` + template ref 替代）
- 递归组件（编译时需已知最大深度）

## Vapor Mode 响应式绑定 API

Vapor Mode 提供了一组细粒度的响应式绑定 API，基于 Signal 实现精确的 DOM 更新。

### bindText(el, sig)

将 Signal 的值绑定到元素的文本内容。

```ts
import { bindText } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const count = signal(0)
const el = document.querySelector('#count')
bindText(el, count)
// count 变化时，el.textContent 自动更新
```

### bindProp(el, key, sig)

将 Signal 的值绑定到元素的属性。

```ts
import { bindProp } from '@lytjs/renderer/vapor'

const placeholder = signal('请输入')
bindProp(inputEl, 'placeholder', placeholder)
```

### bindClass(el, sig)

将 Signal 的值绑定到元素的 class。

```ts
import { bindClass } from '@lytjs/renderer/vapor'

const activeClass = signal('active highlighted')
bindClass(el, activeClass)
```

### bindStyle(el, sig) {#bindstyle}

将 Signal 的值绑定到元素的 style，支持字符串和对象两种形式。

**字符串形式：**

```ts
import { bindStyle } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const styleSig = signal('color: red; font-size: 16px')
bindStyle(el, styleSig)
// Signal 更新时，el.style.cssText 自动同步
```

**对象形式：**

```ts
const styleSig = signal({
  color: 'red',
  fontSize: '16px',
  display: 'flex'
})
bindStyle(el, styleSig)
// 仅更新发生变化的样式属性，性能更优
```

### bindHTML(el, sig) {#bindhtml}

将 Signal 的值绑定到元素的 innerHTML。

```ts
import { bindHTML } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const htmlSig = signal('<strong>加粗文本</strong>')
bindHTML(el, htmlSig)
// Signal 更新时，el.innerHTML 自动同步
```

::: warning 安全提示
`bindHTML` 会直接设置 `innerHTML`，请确保 Signal 的值来自可信来源，避免 XSS 攻击。
:::

### bindIf(el, parentSig, anchor?) {#bindif}

根据 Signal 的值控制元素的 DOM 插入/移除（非 display:none 切换）。

```ts
import { bindIf } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const visible = signal(true)
bindIf(el, visible)
// visible 为 true 时，el 被插入到 DOM
// visible 为 false 时，el 从 DOM 中移除
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| el | `Element` | 要控制的 DOM 元素 |
| parentSig | `Signal<boolean>` | 控制可见性的 Signal |
| anchor | `Node`（可选） | 插入位置的锚点节点 |

::: tip 与旧版区别
旧版 `bindIf` 使用 `display:none` 切换可见性，元素始终保留在 DOM 中。新版改为真正的 DOM 插入/移除，性能更优，且不会留下隐藏的 DOM 节点。
:::

### bindEach(container, sig, keyFn, renderFn) {#bindeach}

基于 Signal 驱动的 keyed diff 列表渲染。

```ts
import { bindEach } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const items = signal([
  { id: 1, name: '项目 A' },
  { id: 2, name: '项目 B' },
  { id: 3, name: '项目 C' }
])

bindEach(
  container,           // 父容器元素
  items,               // Signal<Array<T>>
  item => item.id,     // key 函数，用于标识每个列表项
  (item, index) => {   // 渲染函数，返回 DOM 元素
    const div = document.createElement('div')
    div.textContent = item.name
    return div
  }
)
```

::: tip 与旧版区别
旧版 `bindEach` 在 Signal 变化时全量重建所有 DOM 节点。新版使用真正的 keyed diff 算法，仅对新增、删除和移动的节点进行 DOM 操作，大幅提升列表更新性能。
:::

### bindEvent(el, event, handler)

绑定事件监听器。

```ts
import { bindEvent } from '@lytjs/renderer/vapor'

bindEvent(button, 'click', () => {
  console.log('clicked!')
})
```

## 响应式模板编译

Vapor Mode 的模板编译器现已支持基于 Signal 的响应式指令，编译后的代码会自动创建 Signal 绑定并在数据变化时更新 DOM。

### 响应式 v-if

模板中的 `v-if` 指令会自动编译为 `bindIf` 调用：

```html
<!-- 模板 -->
<div v-if="show">条件内容</div>
```

```ts
// 编译输出（伪代码）
const show = signal(true)
const el = createElement('div')
el.textContent = '条件内容'
bindIf(el, show)
```

### 响应式 v-each

模板中的 `v-each` 指令会自动编译为 `bindEach` 调用（使用 keyed diff）：

```html
<!-- 模板 -->
<ul>
  <li v-each="item in items">{{ item.name }}</li>
</ul>
```

```ts
// 编译输出（伪代码）
const items = signal([...])
bindEach(ul, items, item => item.id, (item) => {
  const li = createElement('li')
  bindText(li, computed(() => item.name))
  return li
})
```

### 响应式文本插值

`{{ }}` 插值会自动编译为 `bindText` 调用：

```html
<span>{{ message }}</span>
```

```ts
// 编译输出
const message = signal('Hello')
bindText(span, message)
```

### 响应式动态属性绑定

动态属性绑定会自动编译为对应的 `bindProp` / `bindClass` / `bindStyle` 调用：

```html
<div :class="activeClass" :style="styleObj" :data-id="id">
```

```ts
// 编译输出
bindClass(div, activeClass)
bindStyle(div, styleObj)
bindProp(div, 'data-id', id)
```

## renderVaporComponent() {#renderVaporComponent}

`renderVaporComponent()` 用于将 Vapor 组件渲染到指定容器，现已支持 `props` 参数。

```ts
import { renderVaporComponent, defineVaporComponent } from '@lytjs/renderer/vapor'

const MyComponent = defineVaporComponent({
  props: ['title', 'count'],
  setup(props) {
    // props 是响应式的
    return {}
  },
  template: `<div><h1>{{ title }}</h1><span>{{ count }}</span></div>`
})

// 渲染组件，传入 props
renderVaporComponent(
  MyComponent,
  document.querySelector('#app'),
  {
    props: {
      title: 'Hello Vapor',
      count: signal(42)
    }
  }
)
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| component | `VaporComponent` | Vapor 组件定义 |
| container | `Element` | 挂载容器 |
| options.props | `Record<string, any>` | 传入组件的 props，值可以是 Signal |

::: tip 提示
props 中的值如果是 Signal，组件内部会自动解包。非 Signal 值会保持原样传递。
:::

## 与传统模式混合使用

Vapor Mode 组件可以与传统模式组件共存：

```ts
// 传统模式组件
const ParentComponent = defineComponent({
  components: { VaporChild },
  template: `
    <div>
      <h1>传统模式父组件</h1>
      <VaporChild />  <!-- Vapor Mode 子组件 -->
    </div>
  `
})

// Vapor Mode 子组件
const VaporChild = defineComponent({
  vapor: true,
  setup() {
    const msg = ref('来自 Vapor Mode')
    return { msg }
  },
  template: `<p>{{ msg }}</p>`
})
```

## 最佳实践

### 1. 优先对性能关键组件启用

```ts
// 列表项组件 — Vapor Mode 收益最大
const ListItem = defineComponent({
  vapor: true,
  props: ['item'],
  template: `
    <div class="item">
      <span>{{ item.name }}</span>
      <span>{{ item.price }}</span>
    </div>
  `
})
```

### 2. 避免在 Vapor 组件中使用复杂表达式

```ts
// 推荐：简单绑定
template: `<span>{{ count }}</span>`

// 不推荐：复杂表达式（Vapor Mode 无法优化）
template: `<span>{{ items.filter(i => i.active).map(i => i.name).join(', ') }}</span>`
```

### 3. 使用 `v-memo` 优化列表渲染

```ts
template: `
  <div v-each="item in items" v-memo="[item.id]">
    <span>{{ item.name }}</span>
  </div>
`
```

### 4. 利用 `v-once` 标记静态内容

```ts
template: `
  <div>
    <header v-once>
      <h1>{{ title }}</h1>  <!-- 仅渲染一次 -->
    </header>
    <main>
      <p>{{ dynamicContent }}</p>
    </main>
  </div>
`
```

## 调试

Vapor Mode 提供了专用的调试工具：

```ts
import { isVaporComponent, getVaporBlock } from 'lyt/vapor'

isVaporComponent(component)  // 判断组件是否使用 Vapor Mode
getVaporBlock(component)     // 获取编译后的操作块
```

::: tip 提示
Vapor Mode 是一个渐进式增强特性。你可以逐步将性能关键组件迁移到 Vapor Mode，无需一次性重写整个应用。
:::
