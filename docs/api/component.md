# @lytjs/component — 组件 API

Lyt.js 组件系统提供选项式组件定义、Props 系统、事件发射、生命周期钩子和插槽系统。纯原生零依赖实现。

## 安装与导入

```typescript
import {
  defineComponent,
  createComponentInstance,
  setupComponent,
  setupStatefulComponent,
  setupFunctionComponent,
  mountComponent,
  updateComponent,
  unmountComponent,
  // Props
  normalizePropsOptions,
  validateProp,
  initProps,
  getPropDefaultValue,
  // 事件
  emit,
  normalizeEmits,
  camelizeToHyphen,
  hyphenToCamel,
  // 生命周期
  LifecycleHook,
  createLifecycleHook,
  callLifecycleHook,
  setCurrentInstance,
  onInit,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  currentInstance,
  // 插槽
  initSlots,
  normalizeSlotValue,
  renderSlot,
  hasSlot,
} from '@lytjs/component'
```

---

## defineComponent

定义选项式组件。接收组件选项对象，返回标准化的组件定义。

### 签名

```typescript
function defineComponent(options: ComponentOptions): ComponentDefine
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `options` | `ComponentOptions` | 组件选项 |

### ComponentOptions

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 组件名称 |
| `props` | `string[] \| Record<string, PropOptions>` | Props 声明 |
| `state` | `() => Record<string, any>` | 响应式数据工厂函数 |
| `computed` | `Record<string, { get, set? }>` | 计算属性 |
| `watch` | `Record<string, { handler, immediate?, deep? }>` | 侦听器 |
| `methods` | `Record<string, Function>` | 方法 |
| `template` | `string` | 模板字符串 |
| `render` | `RenderFunction` | 渲染函数（优先于 template） |
| `init` | `(this, props, state) => void \| Record<string, any>` | 初始化函数 |
| `emits` | `string[] \| Record<string, Function>` | 事件声明 |
| `slots` | `SlotChildren` | 默认插槽内容 |

### 返回值

`ComponentDefine` — 标准化的组件定义对象。

### 示例

```typescript
const MyComponent = defineComponent({
  name: 'MyComponent',
  props: {
    title: { type: String, default: 'Hello' },
    count: { type: Number, required: true }
  },
  state() {
    return { inner: 0 }
  },
  methods: {
    increment() {
      this.$setState({ inner: this.$state.inner + 1 })
    }
  },
  init(props, state) {
    console.log('组件初始化', props.title)
  }
})
```

---

## 组件实例管理

### createComponentInstance

根据组件定义创建内部实例对象（不执行初始化）。

```typescript
function createComponentInstance(component: ComponentDefine): ComponentInternalInstance
```

### setupComponent

初始化组件，根据组件类型执行不同的初始化流程。

```typescript
function setupComponent(
  instance: ComponentInternalInstance,
  rawProps?: Record<string, any> | null,
  children?: SlotChildren | null
): void
```

### setupStatefulComponent

有状态组件初始化。执行 state 初始化、computed 初始化、methods 绑定、init 调用。

```typescript
function setupStatefulComponent(instance: ComponentInternalInstance): void
```

### setupFunctionComponent

函数组件初始化。直接将 props 和 slots 传递给渲染函数。

```typescript
function setupFunctionComponent(instance: ComponentInternalInstance): void
```

### mountComponent

挂载组件。调用渲染函数生成子树，标记为已挂载，触发 onMounted 钩子。

```typescript
function mountComponent(instance: ComponentInternalInstance, h?: CreateElement): void
```

### updateComponent

更新组件。触发 beforeUpdate -> 重新渲染 -> updated 生命周期。

```typescript
function updateComponent(
  instance: ComponentInternalInstance,
  h?: CreateElement,
  newProps?: Record<string, any>
): void
```

### unmountComponent

卸载组件。触发 beforeUnmount -> 标记已卸载 -> unmounted 生命周期。

```typescript
function unmountComponent(instance: ComponentInternalInstance): void
```

---

## Props 系统

### PropOptions

单个 prop 的声明选项。

```typescript
interface PropOptions {
  type?: PropType | PropType[]   // 期望类型
  required?: boolean              // 是否必传，默认 false
  default?: any                   // 默认值（值或工厂函数）
  validator?: (value: any) => boolean  // 自定义验证函数
}
```

### normalizePropsOptions

标准化 props 声明。

```typescript
function normalizePropsOptions(
  propsOptions?: string[] | Record<string, PropOptions | PropType | PropType[]>
): NormalizedProps
```

### validateProp

验证 prop 值是否符合声明。

```typescript
function validateProp(
  name: string,
  value: any,
  propOptions: PropOptions
): boolean
```

### initProps

初始化组件 props。

```typescript
function initProps(
  instance: ComponentInternalInstance,
  rawProps: Record<string, any> | null
): void
```

### getPropDefaultValue

获取 prop 的默认值。

```typescript
function getPropDefaultValue(propOptions: PropOptions, props: Record<string, any>): any
```

---

## 事件系统

### emit

触发组件自定义事件。

```typescript
function emit(
  instance: EmitInstance,
  event: string,
  ...args: any[]
): boolean
```

### normalizeEmits

标准化 emits 声明。

```typescript
function normalizeEmits(
  emitsOptions?: EmitsOptions
): NormalizedEmitsOptions
```

### camelizeToHyphen / hyphenToCamel

命名转换工具。

```typescript
function camelizeToHyphen(str: string): string  // handleChange -> change-handle
function hyphenToCamel(str: string): string      // change-handle -> changeHandle
```

---

## 生命周期钩子

### LifecycleHook 枚举

```typescript
enum LifecycleHook {
  INIT = 'init',
  MOUNTED = 'mounted',
  BEFORE_UPDATE = 'beforeUpdate',
  UPDATED = 'updated',
  BEFORE_UNMOUNT = 'beforeUnmount',
  UNMOUNTED = 'unmounted',
}
```

### 注册生命周期钩子

在组件 `init` 或 `setup` 阶段调用，自动注册到当前组件实例。

```typescript
import { onMounted, onUnmounted } from '@lytjs/component'

// 在 init 函数中使用
init() {
  onMounted(() => {
    console.log('组件已挂载')
  })
  onUnmounted(() => {
    console.log('组件已卸载')
  })
}
```

### 钩子函数

| 函数 | 说明 |
|------|------|
| `onInit(fn)` | 组件初始化时调用 |
| `onMounted(fn)` | 组件首次渲染到 DOM 后调用 |
| `onBeforeUpdate(fn)` | 响应式数据变化后，DOM 更新前调用 |
| `onUpdated(fn)` | DOM 更新后调用 |
| `onBeforeUnmount(fn)` | 组件从 DOM 移除前调用 |
| `onUnmounted(fn)` | 组件从 DOM 移除后调用 |

### 内部 API

```typescript
function createLifecycleHook(hook: LifecycleHook): (fn: LifecycleHookCallback) => void
function callLifecycleHook(instance: LifecycleInstance, hook: LifecycleHook): void
function setCurrentInstance(instance: LifecycleInstance | null): LifecycleInstance | null
const currentInstance: LifecycleInstance | null
```

---

## 插槽系统

### initSlots

初始化组件插槽。

```typescript
function initSlots(
  instance: SlotsInstance,
  children: SlotChildren | null
): void
```

### normalizeSlotValue

标准化插槽内容。

```typescript
function normalizeSlotValue(value: SlotValue): SlotValue
```

### renderSlot

渲染指定插槽。

```typescript
function renderSlot(
  slots: Slots,
  name: string,
  props?: Record<string, any>,
  fallback?: SlotValue
): any
```

### hasSlot

判断是否存在指定插槽。

```typescript
function hasSlot(slots: Slots, name: string): boolean
```

### 类型

```typescript
type SlotValue = any | ((...args: any[]) => any) | null | undefined
type Slots = Record<string, SlotValue>
interface SlotChildren {
  default?: SlotValue
  [name: string]: SlotValue | undefined
}
```

---

## 公共实例接口

组件的 `this`（renderProxy）提供以下公共 API：

| 属性/方法 | 说明 |
|-----------|------|
| `$name` | 组件名称 |
| `$props` | 组件 props（只读） |
| `$state` | 组件内部状态 |
| `$slots` | 组件插槽 |
| `$isMounted` | 组件是否已挂载 |
| `$emit(event, ...args)` | 触发事件 |
| `$forceUpdate()` | 强制更新 |
| `$unmount()` | 卸载组件 |
| `$setState(partial)` | 设置状态 |
