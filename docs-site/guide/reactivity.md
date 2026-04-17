# 响应式系统

Lyt.js 的响应式系统基于 ES6 Proxy 实现，提供完整的响应式数据追踪和更新机制。

## reactive()

创建深层响应式对象：

```ts
import { reactive } from 'lyt'

const state = reactive({
  count: 0,
  message: 'Hello',
  nested: {
    value: 42
  }
})

// 直接访问和修改
state.count++          // 触发更新
state.nested.value++   // 深层响应式
```

::: code-group

```ts [类型签名]
function reactive<T extends object>(target: T, options?: ReactiveOptions): T

interface ReactiveOptions {
  deep?: boolean    // 是否深层响应式（默认 true）
  readonly?: boolean // 是否只读（默认 false）
}
```

:::

## readonly()

创建只读的响应式代理：

```ts
import { reactive, readonly } from 'lyt'

const state = reactive({ count: 0 })
const readonlyState = readonly(state)

readonlyState.count = 1  // 警告：无法修改只读对象
```

## shallowReactive()

创建浅层响应式对象（仅第一层响应式）：

```ts
import { shallowReactive } from 'lyt'

const state = shallowReactive({
  count: 0,
  nested: { value: 42 }
})

state.count++           // 触发更新
state.nested.value = 1  // 不会触发更新（浅层）
```

## ref()

创建 Ref 引用，用于包装基本类型值：

```ts
import { ref } from 'lyt'

const count = ref(0)
console.log(count.value)  // 0

count.value++
console.log(count.value)  // 1
```

Ref 也可以包装对象（内部使用 reactive 深层代理）：

```ts
const user = ref({ name: '张三', age: 25 })
user.value.name = '李四'  // 触发更新
```

## shallowRef()

创建浅层 Ref（不自动深层代理）：

```ts
const state = shallowRef({ count: 0 })
state.value.count++  // 不会触发更新
state.value = { count: 1 }  // 替换整个 value 才会触发更新
```

## 工具函数

```ts
import { isRef, unref, toRef, toRefs, triggerRef } from 'lyt'

const count = ref(0)

isRef(count)     // true
unref(count)     // 0（如果是 Ref 返回 .value，否则返回原值）

const state = reactive({ name: '张三', age: 25 })
const nameRef = toRef(state, 'name')   // 创建对 state.name 的 Ref
const { name, age } = toRefs(state)    // 将所有属性转为 Ref

triggerRef(count)  // 手动触发 Ref 更新
```

## computed()

创建计算属性（基于依赖自动缓存）：

```ts
import { ref, computed } from 'lyt'

const firstName = ref('张')
const lastName = ref('三')

// 只读计算属性
const fullName = computed(() => firstName.value + lastName.value)
console.log(fullName.value)  // '张三'

// 可写计算属性
const name = computed({
  get: () => firstName.value + lastName.value,
  set: (val) => {
    firstName.value = val[0]
    lastName.value = val.slice(1)
  }
})
```

::: info 原理
计算属性使用 dirty 标记实现惰性求值和缓存。只有当依赖变化时才重新计算，否则返回缓存值。
:::

## watch()

侦听响应式数据变化：

```ts
import { ref, reactive, watch } from 'lyt'

// 侦听 Ref
const count = ref(0)
watch(count, (newVal, oldVal) => {
  console.log(`从 ${oldVal} 变为 ${newVal}`)
})

// 侦听 getter 函数
const state = reactive({ count: 0 })
watch(
  () => state.count,
  (newVal, oldVal) => {
    console.log(`count 变为 ${newVal}`)
  },
  { immediate: true, deep: true }
)

// 侦听多个源
watch([count, () => state.count], ([c1, c2]) => {
  console.log(c1, c2)
})
```

## watchEffect()

自动追踪依赖的副作用函数：

```ts
import { ref, watchEffect } from 'lyt'

const count = ref(0)

const stop = watchEffect(() => {
  console.log(`当前计数: ${count.value}`)
})  // 立即执行一次

// 停止侦听
stop()
```

## nextTick()

在下一个微任务中执行回调，等待 DOM 更新完成后执行：

```ts
import { ref, nextTick } from 'lyt'

const count = ref(0)

async function increment() {
  count.value++
  await nextTick()
  // DOM 已更新
  console.log('DOM 更新完成')
}
```
