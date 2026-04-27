# Proxy 基础用法

本示例展示 Lyt.js Proxy 模式响应式系统的核心用法，包括 `reactive`、`ref`、`computed`、`watch` 和 `watchEffect`。

## 基础响应式对象

```ts
import { reactive, effect } from 'lyt'

// 创建深层响应式对象
const state = reactive({
  count: 0,
  message: 'Hello Lyt.js',
  nested: {
    value: 42,
    items: ['a', 'b', 'c']
  }
})

// 创建副作用自动追踪依赖
const runner = effect(() => {
  console.log(`count = ${state.count}, message = ${state.message}`)
})
// 输出: count = 0, message = Hello Lyt.js

// 修改属性会自动触发副作用
state.count++
// 输出: count = 1, message = Hello Lyt.js

// 深层修改也会触发
state.nested.value = 100
// 输出: count = 1, message = Hello Lyt.js

// 数组操作
state.nested.items.push('d')
// 输出: count = 1, message = Hello Lyt.js

// 停止副作用
runner.stop()
state.count++  // 不再触发
```

## Ref 基本用法

```ts
import { ref, effect } from 'lyt'

// 包装基本类型
const count = ref(0)
const name = ref('张三')

effect(() => {
  console.log(`${name.value}: ${count.value}`)
})
// 输出: 张三: 0

count.value++
// 输出: 张三: 1

// Ref 包装对象（自动深层响应式）
const user = ref({
  profile: {
    age: 25
  }
})

effect(() => {
  console.log(`年龄: ${user.value.profile.age}`)
})
// 输出: 年龄: 25

user.value.profile.age++
// 输出: 年龄: 26
```

## 计算属性

```ts
import { ref, computed, effect } from 'lyt'

const firstName = ref('张')
const lastName = ref('三')

// 只读计算属性
const fullName = computed(() => `${firstName.value}${lastName.value}`)

effect(() => {
  console.log(`姓名: ${fullName.value}`)
})
// 输出: 姓名: 张三

firstName.value = '李'
// 输出: 姓名: 李三

// 可写计算属性
const name = computed({
  get: () => `${firstName.value}${lastName.value}`,
  set: (val: string) => {
    firstName.value = val[0]
    lastName.value = val.slice(1)
  }
})

name.value = '王五'
console.log(firstName.value)  // '王'
console.log(lastName.value)   // '五'
```

## 侦听器

```ts
import { ref, reactive, watch, watchEffect } from 'lyt'

// watch：侦听 ref
const count = ref(0)
const stopWatch = watch(count, (newVal, oldVal) => {
  console.log(`count 从 ${oldVal} 变为 ${newVal}`)
})

count.value++  // 输出: count 从 0 变为 1
stopWatch()

// watch：侦听 getter
const state = reactive({ x: 0, y: 0 })
watch(
  () => state.x + state.y,
  (sum) => console.log(`x + y = ${sum}`)
)

state.x = 3  // 输出: x + y = 3
state.y = 7  // 输出: x + y = 10

// watch：侦听多个源
watch(
  [() => state.x, () => state.y],
  ([x, y]) => console.log(`坐标: (${x}, ${y})`)
)

// watchEffect：自动追踪依赖
const stopEffect = watchEffect(() => {
  console.log(`当前状态: x=${state.x}, y=${state.y}`)
})
// 立即输出: 当前状态: x=3, y=7

state.x = 5  // 输出: 当前状态: x=5, y=7
stopEffect()
```

## 工具函数

```ts
import { reactive, ref, isRef, unref, toRef, toRefs, shallowRef, triggerRef } from 'lyt'

// isRef：判断是否为 Ref
const count = ref(0)
console.log(isRef(count))   // true
console.log(isRef(42))      // false

// unref：自动解包
console.log(unref(count))   // 0
console.log(unref(42))      // 42

// toRef：为属性创建 Ref
const state = reactive({ name: '张三', age: 25 })
const nameRef = toRef(state, 'name')
console.log(nameRef.value)  // '张三'

nameRef.value = '李四'
console.log(state.name)     // '李四'（双向同步）

state.name = '王五'
console.log(nameRef.value)  // '王五'

// toRefs：将所有属性转为 Ref
const refs = toRefs(state)
console.log(refs.name.value)  // '王五'
console.log(refs.age.value)   // 25

refs.age.value = 30
console.log(state.age)        // 30

// shallowRef：浅层 Ref
const shallow = shallowRef({ count: 0 })
// 内部对象不会被深层代理
shallow.value.count++  // 不会触发更新
shallow.value = { count: 1 }  // 替换整个 value 才会触发

// triggerRef：手动触发更新
const data = shallowRef({ items: [1, 2, 3] })
data.value.items.push(4)  // 不会自动触发
triggerRef(data)           // 手动触发
```

## 完整示例：Todo 应用

```ts
import { reactive, computed, watchEffect } from 'lyt'

interface Todo {
  id: number
  text: string
  done: boolean
}

const state = reactive<{
  todos: Todo[]
  newTodo: string
  filter: 'all' | 'active' | 'done'
}>({
  todos: [],
  newTodo: '',
  filter: 'all'
})

const filteredTodos = computed(() => {
  switch (state.filter) {
    case 'active':
      return state.todos.filter(t => !t.done)
    case 'done':
      return state.todos.filter(t => t.done)
    default:
      return state.todos
  }
})

const remaining = computed(() => {
  return state.todos.filter(t => !t.done).length
})

function addTodo() {
  const text = state.newTodo.trim()
  if (!text) return
  state.todos.push({
    id: Date.now(),
    text,
    done: false
  })
  state.newTodo = ''
}

function toggleTodo(id: number) {
  const todo = state.todos.find(t => t.id === id)
  if (todo) todo.done = !todo.done
}

function removeTodo(id: number) {
  const index = state.todos.findIndex(t => t.id === id)
  if (index !== -1) state.todos.splice(index, 1)
}

// 自动打印状态
watchEffect(() => {
  console.log(`共 ${state.todos.length} 项，${remaining.value} 项未完成`)
  console.log(`当前筛选: ${state.filter}，显示 ${filteredTodos.value.length} 项`)
})

// 使用
addTodo()
state.newTodo = '学习 Lyt.js'
addTodo()
toggleTodo(state.todos[0].id)
console.log(filteredTodos.value)
```
