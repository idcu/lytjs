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

- `v-html`（使用 `dangerouslySetInnerHTML` 替代）
- 运行时模板编译（`compile()` 函数）
- `$refs`（使用 `ref()` + template ref 替代）
- 递归组件（编译时需已知最大深度）

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
