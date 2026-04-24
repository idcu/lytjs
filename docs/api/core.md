# @lytjs/core — 核心 API

Lyt.js 核心入口提供应用创建（createApp）、渲染函数（h）、Fragment 支持和插件系统。纯原生零依赖实现。

## 安装与导入

```typescript
import {
  createApp,
  h,
  Fragment,
  ShapeFlags,
  createProvidesContext,
  installPlugin,
} from '@lytjs/core'
```

---

## createApp

创建应用实例。支持模板字符串编译和渲染函数两种方式。

### 签名

```typescript
function createApp(
  rootComponent: ComponentOptions | (() => VNode),
  rootProps?: Record<string, any>
): App
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `rootComponent` | `ComponentOptions \| (() => VNode)` | 根组件（组件选项对象或渲染函数） |
| `rootProps` | `Record<string, any>` | 传递给根组件的 props（可选） |

### 返回值

`App` 实例。

### 示例

```typescript
import { createApp, h } from '@lytjs/core'

const app = createApp({
  name: 'App',
  state: () => ({
    count: 0,
    message: 'Hello Lyt.js',
  }),
  render() {
    return h('div', { class: 'app' }, [
      h('h1', null, this.message),
      h('p', null, `Count: ${this.count}`),
      h('button', { onClick: () => this.count++ }, 'Increment'),
    ])
  },
})

app.use(myPlugin)
app.provide('config', { theme: 'dark' })
app.component('MyButton', MyButtonComponent)
app.mount('#app')
```

---

## App 实例

### 方法

#### mount

将根组件渲染为真实 DOM 并挂载到指定容器。

```typescript
app.mount(container: string | Element): App
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `container` | `string \| Element` | 挂载目标（CSS 选择器或 DOM 元素） |

返回 `App` 实例（支持链式调用）。

#### unmount

卸载应用。清理根组件、移除 DOM、销毁响应式依赖。

```typescript
app.unmount(): void
```

#### use

安装插件。

```typescript
app.use(plugin: Plugin, ...options: any[]): App
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `plugin` | `Plugin` | 插件（对象或函数） |
| `options` | `any[]` | 插件选项 |

#### provide

在应用级别提供值，所有后代组件都可以通过 inject 注入。

```typescript
app.provide<T = any>(key: string | symbol, value: T): App
```

#### inject

获取祖先组件通过 provide 提供的值。

```typescript
app.inject<T = any>(key: string | symbol, defaultValue?: T): T | undefined
```

#### component

注册/获取全局组件。

```typescript
// 注册
app.component(name: string, component: ComponentOptions): App

// 获取
app.component(name: string): ComponentOptions | undefined
```

#### directive

注册/获取全局指令。

```typescript
// 注册
app.directive(name: string, directive: DirectiveHooks): App

// 获取
app.directive(name: string): DirectiveHooks | undefined
```

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `config` | `AppConfig` | 全局配置 |
| `globalProperties` | `Record<string, any>` | 全局属性 |
| `_instance` | `any` | 根组件实例引用 |

---

## h

渲染函数。用于在渲染函数中创建虚拟节点（VNode）。

### 签名

```typescript
function h(
  type: string | object | symbol,
  props?: Props,
  children?: Children
): VNode
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | `string \| object \| symbol` | 节点类型（HTML 标签字符串、组件对象或 Fragment） |
| `props` | `Record<string, any> \| null` | 节点属性（可选） |
| `children` | `string \| number \| VNode \| Children[]` | 子节点（可选） |

### 返回值

`VNode`

### 示例

```typescript
import { h, Fragment } from '@lytjs/core'

// 创建元素
h('div', { class: 'container', id: 'app' }, [
  h('h1', null, 'Hello Lyt.js'),
  h('p', { style: { color: 'red' } }, 'This is a paragraph'),
  h('button', { onClick: () => console.log('clicked') }, 'Click me'),
])

// 创建组件
h(MyComponent, { title: 'Props', onCustom: handleEvent }, [
  h('span', null, 'Slot content'),
])

// 使用 Fragment
h(Fragment, null, [h('li', null, 'Item 1'), h('li', null, 'Item 2')])

// 带事件绑定
h('input', {
  class: 'input',
  onInput: (e) => console.log(e.target.value),
  onFocus: () => console.log('focused'),
})

// 带 ref
h('div', { ref: (el) => console.log('mounted:', el) }, 'Content')
```

---

## Fragment

Fragment 类型标识符，用于表示一组没有父容器的子节点（多根节点支持）。

```typescript
const Fragment = Symbol('Fragment')
```

### 示例

```typescript
// 组件返回多个根节点
render() {
  return h(Fragment, null, [
    h('header', null, 'Header'),
    h('main', null, 'Content'),
    h('footer', null, 'Footer'),
  ])
}
```

---

## ShapeFlags

VNode 形状标记，使用位标记描述 VNode 的类型和子节点形态。

| 常量 | 值 | 说明 |
|------|-----|------|
| `ELEMENT` | 1 | 普通 HTML/SVG 元素 |
| `FUNCTIONAL_COMPONENT` | 2 | 函数式组件 |
| `STATEFUL_COMPONENT` | 4 | 有状态组件 |
| `TEXT_CHILDREN` | 8 | 子节点是纯文本 |
| `ARRAY_CHILDREN` | 16 | 子节点是数组 |
| `SLOTS_CHILDREN` | 32 | 子节点是插槽 |

---

## VNode 接口

```typescript
interface VNode {
  type: string | object | symbol    // 节点类型
  props: Record<string, any> | null  // 节点属性
  children: string | VNode[] | Record<string, any> | null  // 子节点
  key: string | number | null        // 节点唯一标识
  ref: ((el: any) => void) | { current: any } | null  // ref
  shapeFlag: number                   // 形状标记
  el: any                             // 真实 DOM 元素引用
  component: any                      // 关联的组件实例
}
```

---

## 插件系统

### Plugin 类型

插件可以是对象（带 install 方法）或函数。

```typescript
type Plugin = PluginObject | ((app: AppAPI, ...options: any[]) => void)

interface PluginObject {
  install: (app: AppAPI, ...options: any[]) => void
}
```

### installPlugin

安装插件到应用。

```typescript
function installPlugin(app: AppAPI, plugin: Plugin, ...options: any[]): void
```

### createProvidesContext

创建依赖注入容器。使用原型链实现层级查找。

```typescript
function createProvidesContext(parent?: Record<string | symbol, any>): Record<string | symbol, any>
```

### AppConfig

```typescript
interface AppConfig {
  [key: string]: any
  errorHandler?: (err: any, instance: any, info: string) => void
  warnHandler?: (msg: string, instance: any, trace: string) => void
}
```

### 插件示例

```typescript
// 对象形式
const myPlugin = {
  install(app, options) {
    app.provide('config', options)
    app.globalProperties.$myMethod = () => console.log('hello')
  }
}
app.use(myPlugin, { theme: 'dark' })

// 函数形式
const myPluginFn = (app, options) => {
  app.provide('config', options)
}
app.use(myPluginFn)
```

---

## DirectiveHooks

全局指令钩子。

```typescript
interface DirectiveHooks {
  created?(el: any, binding: DirectiveBinding): void
  beforeMount?(el: any, binding: DirectiveBinding): void
  mounted?(el: any, binding: DirectiveBinding): void
  beforeUpdate?(el: any, binding: DirectiveBinding): void
  updated?(el: any, binding: DirectiveBinding): void
  beforeUnmount?(el: any, binding: DirectiveBinding): void
  unmounted?(el: any, binding: DirectiveBinding): void
}

interface DirectiveBinding {
  value: any
  oldValue: any
  arg?: string
  modifiers: Record<string, boolean>
  instance: any
}
```

### 指令示例

```typescript
app.directive('focus', {
  mounted(el) {
    el.focus()
  },
  unmounted(el) {
    console.log('focus directive unmounted')
  }
})
```
