# 组件 API

Lyt.js 组件系统提供组件定义、Props、事件发射、生命周期、插槽和内置组件等完整功能，是构建复杂应用的基础。

## 组件定义

### defineComponent()

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

**使用场景：**
- 定义可复用的组件
- 组织应用的 UI 结构
- 封装业务逻辑和 UI 表现

**示例：**
```ts
import { defineComponent, ref } from '@lytjs/core'

const Counter = defineComponent({
  name: 'Counter',
  props: {
    title: {
      type: String,
      default: '计数器'
    },
    initialCount: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const count = ref(props.initialCount)
    
    function increment() {
      count.value++
    }
    
    function decrement() {
      count.value--
    }
    
    return {
      count,
      increment,
      decrement
    }
  },
  template: `
    <div class="counter">
      <h2>{{ title }}</h2>
      <div class="controls">
        <button @click="decrement">-</button>
        <span>{{ count }}</span>
        <button @click="increment">+</button>
      </div>
    </div>
  `
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

**示例：**
```ts
props: {
  // 基本类型
  name: String,
  age: Number,
  
  // 带默认值
  title: {
    type: String,
    default: '默认标题'
  },
  
  // 必需属性
  id: {
    type: String,
    required: true
  },
  
  // 自定义验证
  score: {
    type: Number,
    validator: (value) => {
      return value >= 0 && value <= 100
    }
  },
  
  // 多种类型
  value: {
    type: [String, Number],
    default: ''
  }
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

## 事件系统

### emit()

```ts
function emit(instance: ComponentInternalInstance, event: string, ...args: any[]): boolean
```

触发组件事件，返回是否有监听器。

**使用场景：**
- 子组件向父组件传递数据
- 组件内部状态变化通知
- 自定义事件触发

**示例：**
```ts
import { defineComponent, ref, getCurrentInstance } from '@lytjs/core'

const ChildComponent = defineComponent({
  name: 'ChildComponent',
  emits: ['update:count', 'custom-event'],
  setup(props, { emit }) {
    const count = ref(0)
    
    function increment() {
      count.value++
      emit('update:count', count.value)
      emit('custom-event', { count: count.value, message: 'Count updated' })
    }
    
    return {
      count,
      increment
    }
  },
  template: `
    <button @click="increment">Increment</button>
    <p>Child count: {{ count }}</p>
  `
})

// 父组件使用
const ParentComponent = defineComponent({
  components: {
    ChildComponent
  },
  setup() {
    const parentCount = ref(0)
    
    function handleCountUpdate(newCount) {
      parentCount.value = newCount
    }
    
    function handleCustomEvent(data) {
      console.log('Custom event:', data)
    }
    
    return {
      parentCount,
      handleCountUpdate,
      handleCustomEvent
    }
  },
  template: `
    <div>
      <p>Parent count: {{ parentCount }}</p>
      <ChildComponent 
        @update:count="handleCountUpdate"
        @custom-event="handleCustomEvent"
      />
    </div>
  `
})
```

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

### 生命周期阶段

Lyt.js 提供以下生命周期钩子：

| 生命周期钩子 | 调用时机 | 说明 |
|-------------|----------|------|
| `onInit` | 组件初始化时 | 组件实例创建后，props 初始化前 |
| `onMounted` | 组件挂载后 | DOM 已挂载，可进行 DOM 操作 |
| `onBeforeUpdate` | 组件更新前 | 数据变化后，DOM 更新前 |
| `onUpdated` | 组件更新后 | DOM 已更新，可获取最新 DOM 状态 |
| `onBeforeUnmount` | 组件卸载前 | 组件即将卸载，可清理资源 |
| `onUnmounted` | 组件卸载后 | 组件已卸载，可执行最终清理 |
| `onErrorCaptured` | 子组件错误时 | 捕获子组件的错误 |

### 组合式 API 中的生命周期

在 `setup()` 函数中注册生命周期钩子：

```ts
import { defineComponent, onMounted, onUnmounted, onBeforeUpdate, onUpdated } from '@lytjs/core'

defineComponent({
  setup() {
    // 组件挂载后
    onMounted(() => {
      console.log('Component mounted')
      // 可以进行 DOM 操作
    })
    
    // 组件更新前
    onBeforeUpdate(() => {
      console.log('Before update')
    })
    
    // 组件更新后
    onUpdated(() => {
      console.log('Updated')
      // 可以获取更新后的 DOM 状态
    })
    
    // 组件卸载前
    onBeforeUnmount(() => {
      console.log('Before unmount')
      // 可以清理资源
    })
    
    // 组件卸载后
    onUnmounted(() => {
      console.log('Unmounted')
      // 执行最终清理
    })
    
    return {}
  }
})
```

### 选项式 API 中的生命周期

在选项式 API 中使用生命周期钩子：

```ts
defineComponent({
  // 组件初始化
  init() {
    console.log('Component initialized')
  },
  
  // 组件挂载后
  mounted() {
    console.log('Component mounted')
  },
  
  // 组件更新前
  beforeUpdate() {
    console.log('Before update')
  },
  
  // 组件更新后
  updated() {
    console.log('Updated')
  },
  
  // 组件卸载前
  beforeUnmount() {
    console.log('Before unmount')
  },
  
  // 组件卸载后
  unmounted() {
    console.log('Unmounted')
  }
})
```

### 生命周期最佳实践

- **onMounted**：用于初始化 DOM 相关的操作，如第三方库初始化
- **onUnmounted**：用于清理资源，如定时器、事件监听器
- **onBeforeUpdate**：用于在更新前获取 DOM 状态
- **onUpdated**：用于在更新后获取最新 DOM 状态
- **onErrorCaptured**：用于捕获和处理子组件错误

---

## 插槽系统

### 基本插槽

```ts
// 父组件
const Parent = defineComponent({
  template: `
    <Child>
      <p>这是默认插槽内容</p>
    </Child>
  `
})

// 子组件
const Child = defineComponent({
  template: `
    <div>
      <h2>子组件</h2>
      <slot></slot> <!-- 渲染默认插槽 -->
    </div>
  `
})
```

### 具名插槽

```ts
// 父组件
const Parent = defineComponent({
  template: `
    <Child>
      <template #header>
        <h1>页面标题</h1>
      </template>
      <template #content>
        <p>页面内容</p>
      </template>
      <template #footer>
        <p>页面 footer</p>
      </template>
    </Child>
  `
})

// 子组件
const Child = defineComponent({
  template: `
    <div>
      <header>
        <slot name="header"></slot>
      </header>
      <main>
        <slot name="content"></slot>
      </main>
      <footer>
        <slot name="footer"></slot>
      </footer>
    </div>
  `
})
```

### 作用域插槽

```ts
// 父组件
const Parent = defineComponent({
  template: `
    <Child>
      <template #item="{ todo }">
        <li>
          <input type="checkbox" :checked="todo.done" />
          <span>{{ todo.text }}</span>
        </li>
      </template>
    </Child>
  `
})

// 子组件
const Child = defineComponent({
  setup() {
    const todos = ref([
      { id: 1, text: '学习 Lyt.js', done: false },
      { id: 2, text: '构建应用', done: true }
    ])
    return { todos }
  },
  template: `
    <ul>
      <li v-for="todo in todos" :key="todo.id">
        <slot name="item" :todo="todo"></slot>
      </li>
    </ul>
  `
})
```

### 插槽 API

#### initSlots()

```ts
function initSlots(instance: ComponentInternalInstance, children: any): void
```

初始化组件实例的插槽。

#### renderSlot()

```ts
function renderSlot(slots: Slots, name: string, props?: Record<string, any>, fallback?: SlotValue): any
```

渲染指定名称的插槽。

#### hasSlot()

```ts
function hasSlot(slots: Slots, name: string): boolean
```

判断是否存在指定名称的插槽。

#### normalizeSlotValue()

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

**使用场景：**
- 跨多个组件层级传递数据
- 提供全局服务或配置
- 避免 props 逐层传递

**示例：**
```ts
// 祖先组件
import { defineComponent, provide, ref } from '@lytjs/core'

const Grandparent = defineComponent({
  setup() {
    const theme = ref('light')
    const user = ref({ name: 'John', role: 'admin' })
    
    // 提供依赖
    provide('theme', theme)
    provide('user', user)
    
    function toggleTheme() {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
    }
    
    return {
      theme,
      toggleTheme
    }
  },
  template: `
    <div :class="theme">
      <button @click="toggleTheme">Toggle Theme</button>
      <Parent />
    </div>
  `
})

// 子组件
const Parent = defineComponent({
  template: `<Child />`
})

// 孙子组件
const Child = defineComponent({
  setup() {
    // 注入依赖
    const theme = inject('theme')
    const user = inject('user')
    
    return {
      theme,
      user
    }
  },
  template: `
    <div>
      <p>Theme: {{ theme.value }}</p>
      <p>User: {{ user.value.name }}</p>
    </div>
  `
})
```

### getCurrentInstance()

```ts
function getCurrentInstance(): ComponentInternalInstance | null
```

获取当前组件实例（仅在 setup 中可用）。

**使用场景：**
- 在组合函数中获取组件实例
- 访问组件的内部状态和方法
- 高级插件开发

**示例：**
```ts
import { defineComponent, getCurrentInstance } from '@lytjs/core'

defineComponent({
  setup() {
    const instance = getCurrentInstance()
    
    if (instance) {
      console.log('Component instance:', instance)
      console.log('Component props:', instance.props)
    }
    
    return {}
  }
})
```

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

过渡动画组件，用于元素进入/离开时的动画效果。

**示例：**
```ts
<Transition name="fade">
  <div v-if="show">Hello</div>
</Transition>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### TransitionGroup

```ts
const TransitionGroup: ComponentDefine
```

列表过渡动画组件，用于列表项的添加/删除/移动动画。

**示例：**
```ts
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">
    {{ item.text }}
  </li>
</TransitionGroup>
```

### KeepAlive

```ts
const KeepAlive: ComponentDefine
```

组件缓存组件，用于缓存不活跃的组件实例。

**示例：**
```ts
<KeepAlive>
  <component :is="currentComponent" />
</KeepAlive>
```

### Suspense

```ts
const Suspense: ComponentDefine
```

异步等待组件，用于处理异步组件的加载状态。

**示例：**
```ts
<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  <template #fallback>
    <div>Loading...</div>
  </template>
</Suspense>
```

### defineAsyncComponent()

```ts
function defineAsyncComponent(options: AsyncComponentOptions): ComponentDefine
```

定义异步加载的组件。

**示例：**
```ts
import { defineAsyncComponent } from '@lytjs/core'

const AsyncComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 3000
})
```

---

## 高级组件模式

### 1. 动态组件

```ts
const DynamicComponent = defineComponent({
  setup() {
    const currentComponent = ref('ComponentA')
    
    const components = {
      ComponentA: defineComponent({
        template: '<div>Component A</div>'
      }),
      ComponentB: defineComponent({
        template: '<div>Component B</div>'
      })
    }
    
    function switchComponent() {
      currentComponent.value = currentComponent.value === 'ComponentA' ? 'ComponentB' : 'ComponentA'
    }
    
    return {
      currentComponent,
      components,
      switchComponent
    }
  },
  template: `
    <div>
      <button @click="switchComponent">Switch Component</button>
      <component :is="components[currentComponent]" />
    </div>
  `
})
```

### 2. 递归组件

```ts
const Tree = defineComponent({
  name: 'Tree', // 必须指定名称
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  template: `
    <div class="tree-node">
      <span>{{ data.name }}</span>
      <div v-if="data.children && data.children.length" class="tree-children">
        <Tree 
          v-for="child in data.children" 
          :key="child.id" 
          :data="child" 
        />
      </div>
    </div>
  `
})
```

### 3. 高阶组件

```ts
function withLogging(Component) {
  return defineComponent({
    setup(props, { slots, attrs }) {
      console.log('Component mounted')
      
      return () => h(Component, props, slots)
    }
  })
}

// 使用
const LoggedComponent = withLogging(MyComponent)
```

### 4. 函数式组件

```ts
const FunctionalComponent = defineComponent({
  functional: true,
  props: {
    message: String
  },
  render(h, { props }) {
    return h('div', null, props.message)
  }
})
```

---

## 组件通信方式

### 1. Props / Events

适用于父子组件通信：

```ts
// 父组件
<ChildComponent 
  :message="parentMessage" 
  @update:message="parentMessage = $event"
/>

// 子组件
props: { message: String },
methods: {
  updateMessage() {
    this.$emit('update:message', 'New message')
  }
}
```

### 2. provide / inject

适用于跨层级组件通信：

```ts
// 祖先组件
provide('key', value)

// 后代组件
const value = inject('key')
```

### 3. Event Bus

适用于任意组件间通信：

```ts
// eventBus.js
import { createApp } from '@lytjs/core'
const eventBus = createApp({})

export default eventBus

// 组件 A
eventBus.emit('event', data)

// 组件 B
eventBus.on('event', (data) => {
  // 处理事件
})
```

### 4. 状态管理

适用于全局状态管理：

```ts
// store.js
import { createStore } from '@lytjs/store'

export const store = createStore({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  }
})

// 组件中使用
import { store } from './store'

store.commit('increment')
console.log(store.state.count)
```

---

## 组件最佳实践

### 1. 组件设计

- **单一职责**：每个组件只负责一个功能
- **合理拆分**：将复杂组件拆分为多个子组件
- **命名规范**：使用 PascalCase 命名组件，kebab-case 使用组件
- **Props 设计**：使用 TypeScript 类型，提供默认值和验证

### 2. 性能优化

- **使用 v-if 和 v-show**：根据场景选择合适的条件渲染
- **使用 key**：在 v-for 中使用唯一 key
- **避免不必要的更新**：使用 computed 和 watch 优化
- **使用 KeepAlive**：缓存不活跃的组件
- **异步组件**：对大型组件使用异步加载

### 3. 代码组织

- **文件夹结构**：按功能组织组件
- **样式管理**：使用 scoped 样式或 CSS Modules
- **逻辑分离**：将业务逻辑提取到组合函数中
- **类型定义**：使用 TypeScript 类型提高代码质量

### 4. 调试技巧

- **使用 getCurrentInstance()**：获取组件实例进行调试
- **添加 name 属性**：便于在 Vue DevTools 中识别组件
- **使用生命周期钩子**：在关键节点添加日志
- **错误处理**：使用 onErrorCaptured 捕获子组件错误

---

## 示例：完整的组件应用

```javascript
import { createApp, defineComponent, ref, computed, onMounted } from '@lytjs/core'

// 子组件：TodoItem
const TodoItem = defineComponent({
  name: 'TodoItem',
  props: {
    todo: {
      type: Object,
      required: true
    }
  },
  emits: ['toggle', 'remove'],
  template: `
    <li :class="{ completed: todo.done }">
      <input 
        type="checkbox" 
        :checked="todo.done" 
        @change="$emit('toggle', todo.id)"
      />
      <span>{{ todo.text }}</span>
      <button @click="$emit('remove', todo.id)">删除</button>
    </li>
  `
})

// 子组件：TodoInput
const TodoInput = defineComponent({
  name: 'TodoInput',
  emits: ['add'],
  setup(props, { emit }) {
    const newTodo = ref('')
    
    function addTodo() {
      if (newTodo.value.trim()) {
        emit('add', newTodo.value)
        newTodo.value = ''
      }
    }
    
    return {
      newTodo,
      addTodo
    }
  },
  template: `
    <form @submit.prevent="addTodo">
      <input 
        v-model="newTodo" 
        placeholder="添加新任务..." 
        class="todo-input"
      />
      <button type="submit" class="add-button">添加</button>
    </form>
  `
})

// 父组件：TodoList
const TodoList = defineComponent({
  name: 'TodoList',
  components: {
    TodoItem,
    TodoInput
  },
  setup() {
    const todos = ref([
      { id: 1, text: '学习组件 API', done: false },
      { id: 2, text: '构建 Todo 应用', done: false }
    ])
    
    const remaining = computed(() => 
      todos.value.filter(todo => !todo.done).length
    )
    
    function addTodo(text) {
      todos.value.push({
        id: Date.now(),
        text,
        done: false
      })
    }
    
    function toggleTodo(id) {
      const todo = todos.value.find(t => t.id === id)
      if (todo) {
        todo.done = !todo.done
      }
    }
    
    function removeTodo(id) {
      todos.value = todos.value.filter(t => t.id !== id)
    }
    
    onMounted(() => {
      console.log('TodoList mounted')
    })
    
    return {
      todos,
      remaining,
      addTodo,
      toggleTodo,
      removeTodo
    }
  },
  template: `
    <div class="todo-app">
      <h1>📝 Todo List</h1>
      <p>剩余 {{ remaining }} 项</p>
      
      <TodoInput @add="addTodo" />
      
      <ul class="todo-list">
        <TodoItem 
          v-for="todo in todos" 
          :key="todo.id"
          :todo="todo"
          @toggle="toggleTodo"
          @remove="removeTodo"
        />
      </ul>
    </div>
  `
})

// 根应用
const app = createApp({
  components: {
    TodoList
  },
  template: `
    <div class="app">
      <h1>Lyt.js 组件示例</h1>
      <TodoList />
    </div>
  `
})

app.mount('#app')
```

## 总结

Lyt.js 的组件系统提供了丰富的 API 和功能，使你能够创建复杂、可维护的前端应用。通过合理使用组件定义、Props、事件、生命周期、插槽等功能，你可以构建出结构清晰、性能优异的应用。

组件系统的核心优势：

- **模块化**：将 UI 拆分为可复用的组件
- **封装性**：组件内部逻辑和状态的封装
- **组合性**：通过组件组合构建复杂 UI
- **响应式**：与响应式系统深度集成
- **灵活性**：支持多种组件模式和通信方式

掌握组件 API 是使用 Lyt.js 构建现代前端应用的关键，它将帮助你创建更加健壮、可维护的代码结构。
