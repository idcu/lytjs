# 响应式 API

响应式系统是 Lyt.js 的核心，提供基于 ES6 Proxy 的响应式数据追踪和更新机制。它允许你创建响应式数据，当数据变化时自动更新相关的 UI 或执行副作用函数。

## 核心 API

### reactive()

创建深层响应式代理对象。

```ts
function reactive<T extends object>(target: T, options?: ReactiveOptions): T
```

| 参数 | 类型 | 说明 |
|------|------|------|
| target | `object` | 要代理的对象 |
| options.deep | `boolean` | 是否深层响应式，默认 `true` |
| options.readonly | `boolean` | 是否只读，默认 `false` |

**返回值：** `T` — 响应式代理对象

**使用场景：**
- 管理复杂的状态对象
- 当你需要深层响应式时（默认行为）
- 适合作为组件的状态管理

**示例：**
```ts
const state = reactive({ 
  count: 0, 
  user: { 
    name: 'John',
    age: 30,
    address: { 
      city: 'Beijing',
      district: 'Haidian'
    }
  }
})

// 触发更新
state.count++           
// 深层响应式 - 同样触发更新
state.user.address.city = 'Shanghai'
```

**相关 API：** [`readonly()`](#readonly)、[`shallowReactive()`](#shallowreactive)、[`isReactive()`](#工具函数)

---

### readonly()

创建只读的响应式代理。

```ts
function readonly<T extends object>(target: T): Readonly<T>
```

**使用场景：**
- 保护状态不被修改
- 传递不可变数据给子组件
- 防止意外修改全局状态

**示例：**
```ts
const state = reactive({ count: 0 })
const copy = readonly(state)

// 尝试修改会产生警告
copy.count = 1  // 警告：无法修改只读对象

// 但原始对象仍然可以修改
state.count = 1 // 正常执行
console.log(copy.count) // 1（自动更新）
```

---

### shallowReactive()

创建浅层响应式代理（仅第一层响应式）。

```ts
function shallowReactive<T extends object>(target: T): T
```

**使用场景：**
- 当你只关心对象的第一层属性变化时
- 提高性能，避免深层代理的开销
- 处理大型对象时

**示例：**
```ts
const state = shallowReactive({ 
  count: 0, 
  nested: { value: 1 } 
})

state.count++           // 触发更新
state.nested.value = 2  // 不触发更新

// 但直接替换 nested 对象会触发更新
state.nested = { value: 3 } // 触发更新
```

---

### ref()

创建 Ref 引用，用于包装基本类型值。

```ts
function ref<T>(value: T): Ref<T>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| value | `T` | 初始值 |

**返回值：** `Ref<T>`

**使用场景：**
- 管理基本类型的响应式数据
- 在组合式 API 中管理状态
- 作为 computed 属性的返回值

**示例：**
```ts
const count = ref(0)
const message = ref('Hello')
const user = ref({ name: 'John' })

// 修改值
count.value++  // 触发更新
message.value = 'Hello Lyt.js'  // 触发更新
user.value.name = 'Jane'  // 触发更新（ref 会自动深层代理对象）
```

**相关 API：** [`shallowRef()`](#shallowref)、[`isRef()`](#工具函数)、[`toRef()`](#工具函数)、[`toRefs()`](#工具函数)

---

### shallowRef()

创建浅层 Ref（不自动深层代理）。

```ts
function shallowRef<T>(value: T): Ref<T>
```

**使用场景：**
- 当你不需要深层响应式时
- 处理大型对象或第三方库对象
- 提高性能

**示例：**
```ts
const state = shallowRef({ count: 0 })

// 不触发更新
state.value.count++       

// 触发更新
state.value = { count: 1 } 
```

---

### computed()

创建计算属性（基于依赖自动缓存）。

```ts
function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>
function computed<T>(options: WritableComputedOptions<T>): WritableComputedRef<T>
```

**使用场景：**
- 基于其他响应式数据派生值
- 需要缓存计算结果
- 创建可写的计算属性

**示例：**
```ts
const count = ref(0)

// 基本计算属性
const double = computed(() => count.value * 2)
console.log(double.value)  // 0
count.value = 1
console.log(double.value)  // 2（自动更新）

// 可写计算属性
const sum = computed({
  get: () => count.value * 2,
  set: (val) => { count.value = val / 2 }
})

sum.value = 4  // 自动设置 count.value = 2
console.log(count.value)  // 2
```

---

### watch()

侦听响应式数据变化。

```ts
function watch<T>(
  source: WatchSource<T> | WatchSource<T>[],
  callback: WatchCallback<T>,
  options?: WatchOptions
): WatchStopHandle
```

| 参数 | 类型 | 说明 |
|------|------|------|
| source | `WatchSource \| WatchSource[]` | 侦听源 |
| callback | `WatchCallback` | 回调函数 `(newVal, oldVal, onCleanup) => void` |
| options.immediate | `boolean` | 是否立即执行，默认 `false` |
| options.deep | `boolean` | 是否深度侦听，默认 `true` |
| options.flush | `'pre' \| 'post' \| 'sync'` | 刷新时机 |

**返回值：** `WatchStopHandle` — 停止侦听的函数

**使用场景：**
- 当数据变化时执行副作用
- 需要比较新旧值
- 监听多个数据源
- 需要清理副作用

**示例：**
```ts
const count = ref(0)
const user = reactive({ name: 'John' })

// 监听单个 ref
const stop1 = watch(count, (newVal, oldVal) => {
  console.log(`Count changed: ${oldVal} -> ${newVal}`)
})

// 监听 reactive 对象
const stop2 = watch(
  () => user.name,
  (newName, oldName) => {
    console.log(`Name changed: ${oldName} -> ${newName}`)
  }
)

// 监听多个源
const stop3 = watch([count, () => user.name], ([newCount, newName], [oldCount, oldName]) => {
  console.log('Multiple sources changed')
})

// 清理副作用
const stop4 = watch(count, (newVal, oldVal, onCleanup) => {
  const timer = setTimeout(() => {
    console.log(`Delayed: ${newVal}`)
  }, 1000)
  
  onCleanup(() => {
    clearTimeout(timer)
  })
})

// 停止监听
stop1()
```

---

### watchEffect()

自动追踪依赖的副作用函数。

```ts
function watchEffect(
  effect: EffectFn,
  options?: WatchEffectOptions
): WatchStopHandle
```

**使用场景：**
- 自动追踪所有依赖
- 不需要比较新旧值
- 只关心副作用的执行

**示例：**
```ts
const count = ref(0)
const message = ref('Hello')

// 自动追踪依赖
const stop = watchEffect(() => {
  console.log(`Count: ${count.value}, Message: ${message.value}`)
}) // 立即执行: Count: 0, Message: Hello

// 触发更新
count.value++ // 输出: Count: 1, Message: Hello
message.value = 'Hello Lyt.js' // 输出: Count: 1, Message: Hello Lyt.js

// 停止监听
stop()
```

---

## 工具函数

### isReactive()

```ts
function isReactive(value: unknown): boolean
```

判断值是否为 reactive 代理对象。

**示例：**
```ts
const state = reactive({ count: 0 })
const normalObj = { count: 0 }

console.log(isReactive(state)) // true
console.log(isReactive(normalObj)) // false
```

### isReadonly()

```ts
function isReadonly(value: unknown): boolean
```

判断值是否为 readonly 代理对象。

**示例：**
```ts
const state = readonly({ count: 0 })
console.log(isReadonly(state)) // true
```

### isRef()

```ts
function isRef<T>(value: unknown): value is Ref<T>
```

判断值是否为 Ref 对象。

**示例：**
```ts
const count = ref(0)
const normalValue = 0

console.log(isRef(count)) // true
console.log(isRef(normalValue)) // false
```

### unref()

```ts
function unref<T>(value: T | Ref<T>): T
```

如果是 Ref 返回 `.value`，否则返回原值。

**示例：**
```ts
const count = ref(0)
const normalValue = 10

console.log(unref(count)) // 0
console.log(unref(normalValue)) // 10
```

### toRef()

```ts
function toRef<T extends object, K extends keyof T>(obj: T, key: K): Ref<T[K]>
```

为 reactive 对象的某个属性创建 Ref。

**使用场景：**
- 当你需要将 reactive 对象的某个属性作为 ref 传递时
- 保持与原始对象的响应式连接

**示例：**
```ts
const state = reactive({ count: 0, name: 'John' })
const countRef = toRef(state, 'count')

countRef.value++ // 同时修改 state.count
console.log(state.count) // 1

state.count = 5 // 同时更新 countRef.value
console.log(countRef.value) // 5
```

### toRefs()

```ts
function toRefs<T extends object>(obj: T): { [K in keyof T]: Ref<T[K]> }
```

将 reactive 对象的所有属性转为 Ref。

**使用场景：**
- 在组合式 API 中返回多个响应式状态
- 保持与原始对象的响应式连接

**示例：**
```ts
const state = reactive({ 
  count: 0, 
  name: 'John',
  age: 30 
})

const refs = toRefs(state)

// 所有属性都变成了 ref
refs.count.value++
console.log(state.count) // 1

state.name = 'Jane'
console.log(refs.name.value) // Jane

// 解构后仍然保持响应式
const { count, name, age } = toRefs(state)
```

### triggerRef()

```ts
function triggerRef(ref: Ref): void
```

手动触发 Ref 更新。

**使用场景：**
- 当使用 shallowRef 时，修改深层属性后需要手动触发更新
- 强制触发依赖于该 ref 的副作用

**示例：**
```ts
const state = shallowRef({ count: 0 })

watchEffect(() => {
  console.log(`Count: ${state.value.count}`)
}) // 输出: Count: 0

// 修改深层属性，不会自动触发更新
state.value.count++

// 手动触发更新
triggerRef(state) // 输出: Count: 1
```

### toRaw()

```ts
function toRaw<T>(observed: T): T
```

获取响应式对象的原始对象。

**使用场景：**
- 当你需要绕过响应式系统，直接操作原始对象时
- 提高性能，避免响应式代理的开销
- 与第三方库集成时

**示例：**
```ts
const state = reactive({ count: 0 })
const rawState = toRaw(state)

// 直接修改原始对象，不会触发响应式更新
rawState.count++
console.log(state.count) // 1（值会同步，但不会触发响应式更新）

// 修改响应式对象，会触发更新
state.count++ // 触发更新
```

## 高级使用

### 1. 自定义响应式逻辑

**示例：创建可重置的状态**
```ts
function useResettableState(initialState) {
  const state = reactive({ ...initialState })
  const reset = () => {
    Object.assign(state, { ...initialState })
  }
  return { state, reset }
}

// 使用
const { state, reset } = useResettableState({ count: 0, name: 'John' })
state.count++
reset() // 重置为初始状态
```

### 2. 响应式工具函数

**示例：防抖响应式**
```ts
function useDebouncedRef(value, delay = 300) {
  const debouncedValue = ref(value)
  let timeout

  watch(
    () => value,
    (newValue) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        debouncedValue.value = newValue
      }, delay)
    },
    { immediate: true }
  )

  return debouncedValue
}

// 使用
const searchQuery = ref('')
const debouncedQuery = useDebouncedRef(searchQuery, 500)

watch(debouncedQuery, (query) => {
  // 执行搜索
  console.log('Searching for:', query)
})
```

### 3. 组合式 API 中的响应式

**示例：表单状态管理**
```ts
function useForm(initialValues = {}) {
  const values = reactive({ ...initialValues })
  const errors = reactive({})
  const touched = reactive({})

  const validate = () => {
    // 验证逻辑
    Object.keys(values).forEach(key => {
      if (!values[key]) {
        errors[key] = 'This field is required'
      } else {
        delete errors[key]
      }
    })
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (callback) => {
    if (validate()) {
      callback({ ...values })
    }
  }

  return { values, errors, touched, validate, handleSubmit }
}

// 使用
const { values, errors, handleSubmit } = useForm({
  name: '',
  email: ''
})

function onSubmit(data) {
  console.log('Form submitted:', data)
}
```

## 最佳实践

### 1. 选择合适的响应式 API

- **基本类型**：使用 `ref()`
- **复杂对象**：使用 `reactive()`
- **只关心第一层**：使用 `shallowRef()` 或 `shallowReactive()`
- **派生值**：使用 `computed()`

### 2. 性能优化

- **大型对象**：使用 `shallowReactive()` 或 `shallowRef()`
- **频繁访问**：使用 `toRefs()` 解构后直接访问
- **避免深层监听**：使用 `watch` 的 `deep: false` 选项
- **批量更新**：使用 `nextTick()` 或 `effect` 的调度器

### 3. 代码组织

- **组合函数**：将相关的响应式逻辑封装到组合函数中
- **单一职责**：每个组合函数只负责一个功能
- **清晰命名**：使用描述性的函数和变量名
- **类型标注**：使用 TypeScript 类型提高代码可读性

### 4. 常见陷阱

- **直接修改 ref 的值**：记得使用 `.value`
- **深层对象的响应式**：`reactive` 会自动深层代理，`shallowReactive` 不会
- **数组操作**：数组的变异方法（如 push、splice）会触发更新
- **对象替换**：替换整个 reactive 对象会失去响应式
- **循环依赖**：避免 computed 属性之间的循环依赖

## 示例：完整的响应式应用

```javascript
import { createApp, ref, computed, watch, watchEffect, onMounted } from '@lytjs/core'

const app = createApp({
  setup() {
    // 响应式状态
    const count = ref(0)
    const name = ref('Lyt.js')
    const todos = ref([
      { id: 1, text: '学习响应式 API', done: false },
      { id: 2, text: '构建应用', done: false }
    ])

    // 计算属性
    const doubleCount = computed(() => count.value * 2)
    const remainingTodos = computed(() => 
      todos.value.filter(todo => !todo.done).length
    )

    // 监听器
    watch(count, (newVal, oldVal) => {
      console.log(`Count changed: ${oldVal} -> ${newVal}`)
    })

    // 副作用
    watchEffect(() => {
      console.log(`Current count: ${count.value}, Name: ${name.value}`)
    })

    // 方法
    function increment() {
      count.value++
    }

    function addTodo() {
      const newTodo = {
        id: Date.now(),
        text: `任务 ${todos.value.length + 1}`,
        done: false
      }
      todos.value.push(newTodo)
    }

    function toggleTodo(id) {
      const todo = todos.value.find(t => t.id === id)
      if (todo) {
        todo.done = !todo.done
      }
    }

    // 生命周期
    onMounted(() => {
      console.log('Component mounted')
    })

    return {
      count,
      name,
      todos,
      doubleCount,
      remainingTodos,
      increment,
      addTodo,
      toggleTodo
    }
  },
  template: `
    <div class="app">
      <h1>{{ name }}</h1>
      
      <div class="counter">
        <p>Count: {{ count }}</p>
        <p>Double count: {{ doubleCount }}</p>
        <button @click="increment">Increment</button>
      </div>
      
      <div class="todos">
        <h2>待办事项</h2>
        <p>剩余: {{ remainingTodos }}</p>
        <button @click="addTodo">添加任务</button>
        <ul>
          <li v-for="todo in todos" :key="todo.id">
            <input 
              type="checkbox" 
              :checked="todo.done" 
              @change="toggleTodo(todo.id)"
            />
            <span :style="{ textDecoration: todo.done ? 'line-through' : 'none' }">
              {{ todo.text }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  `
})

app.mount('#app')
```

## 总结

Lyt.js 的响应式系统提供了丰富的 API，使你能够以声明式的方式管理应用状态。通过合理使用 `reactive`、`ref`、`computed`、`watch` 等 API，你可以创建高效、可维护的响应式应用。

响应式系统的核心优势：

- **自动追踪**：无需手动管理依赖
- **高效更新**：只更新受影响的部分
- **灵活组合**：通过组合函数复用逻辑
- **类型安全**：与 TypeScript 良好集成

掌握响应式 API 是使用 Lyt.js 的关键，它将帮助你构建更加健壮和可维护的前端应用。
