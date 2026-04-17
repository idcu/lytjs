# 组件 API

Lyt.js 组件系统提供组件定义、Props、事件发射、生命周期、插槽和内置组件等完整功能。

## defineComponent()

定义一个组件。

```ts
function defineComponent(options: ComponentOptions): ComponentDefine
```

| 选项 | 类型 | 说明 |
|------|------|------|
| name | `string` | 组件名称 |
| props | `string[] \| Record<string, PropOptions>` | Props 声明 |
| state | `() => Record<string, any>` | 响应式状态工厂函数 |
| computed | `ComputedOptions` | 计算属性 |
| watch | `WatchOptions` | 侦听器 |
| methods | `Record<string, Function>` | 方法 |
| template | `string` | 模板字符串 |
| render | `RenderFunction` | 渲染函数（优先于 template） |
| init | `Function` | 初始化函数 |
| setup | `SetupFunction` | Composition API setup 函数 |
| emits | `EmitsOptions` | 事件声明 |
| slots | `SlotChildren` | 默认插槽内容 |

```ts
const MyComp = defineComponent({
  name: 'MyComp',
  props: { title: String },
  state() { return { count: ref(0) } },
  methods: { increment() { this.count.value++ } },
  template: `<div><h1>{{ title }}</h1><button @click="increment">{{ count }}</button></div>`
})
```

**相关 API：** [`createComponentInstance()`](#组件实例管理)、[`mountComponent()`](#组件实例管理)

---

## Props 系统

### PropOptions

```ts
interface PropOptions {
  type?: PropType | PropType[]
  default?: any
  required?: boolean
  validator?: (value: any) => boolean
}
```

### normalizePropsOptions()

```ts
function normalizePropsOptions(props: ComponentOptions['props']): NormalizedPropsOptions
```

标准化 Props 选项。

### validateProp()

```ts
function validateProp(prop: NormalizedProps, value: any): boolean
```

验证 Prop 值是否符合类型约束。

### initProps()

```ts
function initProps(instance: ComponentInternalInstance, rawProps: Record<string, any>): void
```

初始化组件实例的 Props。

---

## 事件发射

### emit()

```ts
function emit(instance: ComponentInternalInstance, event: string, ...args: any[]): boolean
```

触发组件事件，返回是否有监听器。

### normalizeEmits()

```ts
function normalizeEmits(emits: EmitsOptions | undefined): NormalizedEmitsOptions
```

标准化 emits 声明。

### camelizeToHyphen()

```ts
function camelizeToHyphen(str: string): string
```

驼峰转连字符：`myEvent` → `my-event`

### hyphenToCamel()

```ts
function hyphenToCamel(str: string): string
```

连字符转驼峰：`my-event` → `myEvent`

---

## 生命周期钩子

在 `setup()` 函数中注册生命周期钩子：

```ts
function onInit(hook: LifecycleHookCallback): void
function onMounted(hook: LifecycleHookCallback): void
function onBeforeUpdate(hook: LifecycleHookCallback): void
function onUpdated(hook: LifecycleHookCallback): void
function onBeforeUnmount(hook: LifecycleHookCallback): void
function onUnmounted(hook: LifecycleHookCallback): void
```

```ts
import { defineComponent, onMounted, onUnmounted } from 'lyt'

defineComponent({
  setup() {
    onMounted(() => console.log('已挂载'))
    onUnmounted(() => console.log('已卸载'))
    return {}
  }
})
```

### 其他生命周期 API

```ts
function createLifecycleHook(name: string): LifecycleHook
function callLifecycleHook(instance: LifecycleInstance, hook: LifecycleHook): void
function setCurrentInstance(instance: ComponentInternalInstance | null): void
```

---

## 插槽系统

### initSlots()

```ts
function initSlots(instance: ComponentInternalInstance, children: any): void
```

初始化组件实例的插槽。

### renderSlot()

```ts
function renderSlot(slots: Slots, name: string, props?: Record<string, any>, fallback?: SlotValue): any
```

渲染指定名称的插槽。

### hasSlot()

```ts
function hasSlot(slots: Slots, name: string): boolean
```

判断是否存在指定名称的插槽。

### normalizeSlotValue()

```ts
function normalizeSlotValue(value: any): SlotValue
```

标准化插槽值。

---

## 组件实例管理

### createComponentInstance()

```ts
function createComponentInstance(vnode: VNode, parent: ComponentInternalInstance | null): ComponentInternalInstance
```

创建组件内部实例。

### setupComponent()

```ts
function setupComponent(instance: ComponentInternalInstance): void
```

设置组件（处理 props、slots、setup）。

### mountComponent()

```ts
function mountComponent(instance: ComponentInternalInstance, container: Element, anchor?: Element): void
```

挂载组件到 DOM。

### updateComponent()

```ts
function updateComponent(instance: ComponentInternalInstance): void
```

更新组件。

### unmountComponent()

```ts
function unmountComponent(instance: ComponentInternalInstance): void
```

卸载组件。

---

## Composition API

### provide() / inject()

```ts
function provide<T>(key: string | symbol, value: T): void
function inject<T>(key: string | symbol, defaultValue?: T): T | undefined
```

依赖注入，用于跨层级组件通信。

### getCurrentInstance()

```ts
function getCurrentInstance(): ComponentInternalInstance | null
```

获取当前组件实例（仅在 setup 中可用）。

### runSetup()

```ts
function runSetup(instance: ComponentInternalInstance): void
```

执行组件的 setup 函数。

---

## 内置组件

### Transition

```ts
const Transition: ComponentDefine
```

过渡动画组件。

### TransitionGroup

```ts
const TransitionGroup: ComponentDefine
```

列表过渡动画组件。

### KeepAlive

```ts
const KeepAlive: ComponentDefine
```

组件缓存组件。

### Suspense

```ts
const Suspense: ComponentDefine
```

异步等待组件。

### defineAsyncComponent()

```ts
function defineAsyncComponent(options: AsyncComponentOptions): ComponentDefine
```

定义异步加载的组件。
