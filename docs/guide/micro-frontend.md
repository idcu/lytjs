# 微前端支持

Lyt.js 提供了完善的微前端支持，使 Lyt.js 应用可以作为子应用接入主流微前端框架（qiankun、micro-app 等），也可以作为基座应用加载其他框架的子应用。

## 概述

Lyt.js 的微前端支持包含以下核心能力：

| 能力 | 说明 | 包 |
|------|------|-----|
| Web Component 适配器 | 将 Lyt.js 组件封装为标准 Custom Element | `@lytjs/core/web-component` |
| JS 沙箱 | 使用 Proxy 拦截 window 访问，隔离全局变量 | `@lytjs/micro-frontend` |
| CSS 沙箱 | 通过 scope 前缀隔离样式 | `@lytjs/micro-frontend` |
| 事件总线 | 跨应用的事件通信 | `@lytjs/micro-frontend` |
| 共享状态 | 跨应用的响应式状态共享 | `@lytjs/micro-frontend` |
| 生命周期管理 | 统一管理子应用的挂载/卸载/更新 | `@lytjs/micro-frontend` |
| qiankun 适配 | 生成 qiankun 标准生命周期 | `@lytjs/micro-frontend/adapters` |
| micro-app 适配 | 生成 micro-app 入口 | `@lytjs/micro-frontend/adapters` |

## Web Component 模式

Web Component 是最简单的微前端接入方式。通过 `defineCustomElement` 将 Lyt.js 组件注册为 Custom Element，即可在任何框架中使用。

### 基本用法

```ts
import { defineCustomElement } from '@lytjs/core/web-component'

// 定义 Lyt.js 组件
const CounterComponent = {
  state: () => ({ count: 0 }),
  methods: {
    increment() { this.count++ },
  },
  render() {
    return h('div', null, [
      h('p', null, `Count: ${this.count}`),
      h('button', { onClick: () => this.increment() }, '+'),
    ])
  },
}

// 注册为 Web Component
defineCustomElement('lyt-counter', CounterComponent, {
  observedAttributes: ['initial-count'],
  shadowMode: 'open',
  styles: ':host { display: block; padding: 16px; }',
})
```

注册后，可以在任何 HTML 中直接使用：

```html
<lyt-counter initial-count="10"></lyt-counter>
```

### Props 到 Attributes 的映射

使用 `propsToAttributes` 自动将 Props 定义转换为 observedAttributes：

```ts
import { propsToAttributes } from '@lytjs/core/web-component'

const props = {
  title: { type: String, default: 'Hello' },
  maxCount: { type: Number, default: 100 },
  isVisible: { type: Boolean },
}

const attrs = propsToAttributes(props)
// ['title', 'max-count', 'is-visible']

defineCustomElement('my-component', MyComponent, {
  observedAttributes: attrs,
})
```

### Attributes 到 Props 的转换

使用 `attributesToProps` 从 DOM 元素读取属性并转换为 Props：

```ts
import { attributesToProps } from '@lytjs/core/web-component'

const el = document.querySelector('lyt-counter')
const props = attributesToProps(el.attributes)
// { initialCount: 10 }
```

### 事件转发

Lyt.js 组件的 `emit` 调用会自动转换为 CustomEvent：

```ts
const MyComponent = {
  methods: {
    handleClick() {
      this.emit('change', { value: 42 })
    },
  },
  render() { /* ... */ },
}

defineCustomElement('my-component', MyComponent)

// 监听事件
document.querySelector('my-component').addEventListener('change', (e) => {
  console.log(e.detail) // { value: 42 }
})
```

使用 `eventsToCustomEvents` 获取事件配置：

```ts
import { eventsToCustomEvents } from '@lytjs/core/web-component'

const events = eventsToCustomEvents(['click', 'change', 'update:modelValue'])
// {
//   click: { name: 'click', options: { bubbles: true, composed: true, cancelable: true } },
//   change: { name: 'change', options: { bubbles: true, composed: true, cancelable: true } },
//   'update:modelValue': { name: 'update:modelValue', options: { ... } },
// }
```

### 样式封装

#### Shadow DOM 样式注入

使用 `injectStyles` 向 Shadow DOM 注入样式：

```ts
import { injectStyles } from '@lytjs/core/web-component'

// 在 Custom Element 内部使用
injectStyles(':host { display: block; } .inner { color: red; }', this.shadowRoot)

// 追加模式
injectStyles('.additional { font-size: 14px; }', this.shadowRoot, { append: true })

// 使用 ID 管理（更新时自动替换）
injectStyles('.dynamic { color: blue; }', this.shadowRoot, { id: 'dynamic-styles' })
```

#### Scoped CSS

使用 `scopedCSS` 为 CSS 添加 scoped 标识：

```ts
import { scopedCSS, generateScopeId } from '@lytjs/core/web-component'

const scopeId = generateScopeId()
// 'data-v-a1b2c3d4'

const scoped = scopedCSS(
  '.container { color: red; } .title { font-size: 16px; }',
  scopeId
)
// '.container[data-v-a1b2c3d4] { color: red; } .title[data-v-a1b2c3d4] { font-size: 16px; }'
```

### SFC 转 Web Component

使用 `defineCustomElementFromSFC` 直接从 SFC 源码创建 Web Component：

```ts
import { defineCustomElementFromSFC } from '@lytjs/core/web-component'

await defineCustomElementFromSFC('my-counter', `
  <template>
    <div>{{ count }}</div>
    <button @click="count++">+</button>
  </template>
  <script>
  export default {
    state: () => ({ count: 0 }),
  }
  </script>
  <style>
  :host { display: block; padding: 16px; }
  </style>
`)
```

## qiankun 集成

使用 `createQiankunLifeCycle` 将 Lyt.js 应用适配为 qiankun 子应用。

### 子应用配置

```ts
// child-app/src/main.ts
import { createQiankunLifeCycle } from '@lytjs/micro-frontend/adapters'
import { MyComponent } from './MyComponent'

const { bootstrap, mount, unmount, update } = createQiankunLifeCycle({
  name: 'child-app',
  component: MyComponent,
  styles: ':host { display: block; }',
})

export { bootstrap, mount, unmount, update }

// 支持独立运行
if (!(window as any).__POWERED_BY_QIANKUN__) {
  mount({ container: document.getElementById('app')!, name: 'child-app' })
}
```

### 主应用注册

```ts
// main-app/src/main.ts
import { registerMicroApps, start } from 'qiankun'

registerMicroApps([
  {
    name: 'child-app',
    entry: '//localhost:3001',
    container: '#sub-app-container',
    activeRule: '/child',
  },
])

start()
```

### 全局状态桥接

qiankun 的全局状态会自动桥接到 SharedState：

```ts
const { bootstrap, mount, unmount } = createQiankunLifeCycle({
  name: 'child-app',
  component: MyComponent,
  sharedState: new SharedState(), // 自动同步 qiankun 全局状态
})
```

## micro-app 集成

使用 `createMicroAppEntry` 将 Lyt.js 应用适配为 micro-app 子应用。

### 子应用配置

```ts
// child-app/src/main.ts
import { createMicroAppEntry } from '@lytjs/micro-frontend/adapters'
import { MyComponent } from './MyComponent'

const entry = createMicroAppEntry({
  name: 'child-app',
  component: MyComponent,
  styles: ':host { display: block; }',
})

// 注册为 Custom Element
entry.register()
```

### 主应用使用

```html
<!-- main-app/index.html -->
<micro-app name="child-app" url="http://localhost:3001"></micro-app>
```

## 沙箱和通信

### JS 沙箱

使用 `createSandbox` 创建 JS 沙箱，隔离子应用的全局变量：

```ts
import { createSandbox } from '@lytjs/micro-frontend'

const sandbox = createSandbox({
  name: 'child-app',
  trackGlobals: true, // 记录新增的全局变量
})

// 激活沙箱
sandbox.activate()

// 在沙箱中执行代码
sandbox.proxyWindow.myGlobalVar = 'hello' // 写入 fakeWindow，不影响真实 window

// 停用沙箱（自动清理新增的全局变量）
sandbox.deactivate()

// 销毁沙箱
sandbox.destroy()
```

### CSS 沙箱

使用 `createStyleSandbox` 创建 CSS 沙箱，隔离子应用的样式：

```ts
import { createStyleSandbox } from '@lytjs/micro-frontend'

const cssSandbox = createStyleSandbox({
  container: document.getElementById('app-container')!,
  useShadowDOM: false, // 是否使用 Shadow DOM
})

// 注入样式（自动添加 scope 前缀）
cssSandbox.inject('.button { color: red; }')
// 实际注入: .mf-abc123 .button { color: red; }

// 清理所有样式
cssSandbox.removeAll()

// 销毁
cssSandbox.destroy()
```

### 事件总线

使用 `EventBus` 进行跨应用的事件通信：

```ts
import { EventBus } from '@lytjs/micro-frontend'

// 创建事件总线（建议在主应用中创建，通过 props 传递给子应用）
const bus = new EventBus()

// 订阅事件
const unsubscribe = bus.on('user:login', (data) => {
  console.log('User logged in:', data)
})

// 通配符订阅
bus.on('user:*', (data, eventName) => {
  console.log(`User event: ${eventName}`, data)
})

// 发布事件
bus.emit('user:login', { id: 1, name: 'Alice' })

// 只触发一次
bus.once('app:init', () => { /* ... */ })

// 取消订阅
unsubscribe()

// 清除所有监听
bus.clear()
```

### 共享状态

使用 `SharedState` 进行跨应用的响应式状态共享：

```ts
import { SharedState } from '@lytjs/micro-frontend'

// 创建共享状态（建议在主应用中创建）
const state = new SharedState()

// 设置值
state.set('user', { id: 1, name: 'Alice' })
state.set('theme', 'dark')

// 获取值
const user = state.get('user')

// 监听变化
const unwatch = state.watch('user', (newUser, oldUser) => {
  console.log('User changed:', newUser)
})

// 监听所有变化
const unwatchAll = state.watchAll((key, newValue, oldValue) => {
  console.log(`${key} changed:`, oldValue, '->', newValue)
})

// 批量设置
state.batchSet({ theme: 'light', lang: 'zh' })

// 删除
state.remove('user')

// 取消监听
unwatch()
unwatchAll()
```

### 生命周期管理

使用 `MicroApp` 类统一管理子应用：

```ts
import { MicroApp, createSandbox, createStyleSandbox, EventBus, SharedState } from '@lytjs/micro-frontend'

const app = new MicroApp({
  name: 'child-app',
  entry: MyComponent,
  container: '#app-container',
  sandbox: createSandbox({ name: 'child-app' }),
  styleSandbox: createStyleSandbox({ container: document.getElementById('app-container')! }),
  eventBus: new EventBus(),
  sharedState: new SharedState(),
  props: { theme: 'dark' },
  lifecycle: {
    beforeLoad: async () => { console.log('Loading...') },
    afterMount: async (props) => { console.log('Mounted!', props) },
    beforeUnmount: async () => { console.log('Unmounting...') },
  },
})

// 挂载
await app.mount()

// 更新 Props
await app.update({ theme: 'light', lang: 'en' })

// 获取状态
console.log(app.getStatus()) // 'mounted'
console.log(app.getInfo())

// 卸载
await app.unmount()

// 销毁（卸载 + 清理所有资源）
await app.destroy()
```

## 最佳实践

### 1. 沙箱配置

- 始终为子应用创建独立的 JS 沙箱和 CSS 沙箱
- 在 `beforeUnmount` 钩子中清理定时器和事件监听器
- 使用 `destroy()` 而非 `unmount()` 来完全释放资源

### 2. 通信设计

- 优先使用 SharedState 共享数据，EventBus 用于事件通知
- 事件名使用命名空间（如 `app:mounted`、`user:login`）
- 避免在事件回调中执行耗时操作

### 3. 样式隔离

- 优先使用 Shadow DOM 进行样式隔离
- 如果不使用 Shadow DOM，务必使用 CSS 沙箱
- 避免使用全局样式选择器（如 `body`、`html`）

### 4. 性能优化

- 按需加载子应用资源
- 使用 `update()` 而非 `unmount()` + `mount()` 来更新子应用
- 合理设置 EventBus 的 `maxListeners` 防止内存泄漏

### 5. 错误处理

- 为每个子应用配置 `load_error` 和 `mount_error` 的处理逻辑
- 使用 EventBus 的 `app:error` 事件统一处理错误
- 在开发环境中启用沙箱的 `trackGlobals` 以便调试

### 6. 调试技巧

- 使用 `app.getInfo()` 查看子应用状态
- 使用 EventBus 的通配符监听 `app:*` 来追踪所有应用事件
- 在沙箱配置中设置 `name` 以便在 DevTools 中识别
