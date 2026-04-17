# @lytjs/reactivity — 响应式 API

Lyt.js 响应式系统提供了一套完整的响应式原语，基于 ES6 Proxy 实现深层响应式代理。纯原生零依赖实现。

## 安装与导入

```typescript
import {
  reactive, readonly, shallowReactive, toRaw, isReactive, isReadonly,
  ref, shallowRef, isRef, unref, toRef, toRefs, triggerRef,
  computed,
  watch, watchEffect, nextTick,
  effect, stop,
  queueJob, queuePostFlushCb, hasPendingJob, clearQueue,
} from '@lytjs/reactivity'
```

---

## reactive

创建深层响应式代理。对嵌套对象递归代理，拦截 get/set/deleteProperty 进行依赖收集和触发更新。

### 签名

```typescript
function reactive<T extends object>(
  target: T,
  options?: ReactiveOptions
): T
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `target` | `T extends object` | 要代理的目标对象（必须是对象类型） |
| `options` | `ReactiveOptions` | 配置选项（可选） |

### ReactiveOptions

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `deep` | `boolean` | `true` | 是否深层响应式 |
| `readonly` | `boolean` | `false` | 是否只读 |

### 返回值

响应式代理对象，类型与 `target` 相同。

### 示例

```typescript
const state = reactive({ count: 0, nested: { foo: 'bar' } })
effect(() => console.log(state.count))  // 0
state.count++  // 触发 effect，输出 1
state.nested.foo = 'baz'  // 触发 effect（深层响应式）
```

---

## readonly

创建只读响应式代理。所有修改操作会被阻止并发出警告。

### 签名

```typescript
function readonly<T extends object>(target: T): T
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `target` | `T extends object` | 要代理的目标对象 |

### 返回值

只读代理对象。

### 示例

```typescript
const state = readonly({ count: 0 })
state.count = 1  // 控制台警告: Set operation on key "count" failed: target is readonly.
```

---

## shallowReactive

创建浅层响应式代理。只有第一层属性是响应式的，嵌套对象不会被代理。

### 签名

```typescript
function shallowReactive<T extends object>(target: T): T
```

### 示例

```typescript
const state = shallowReactive({ nested: { count: 0 } })
// state.nested 本身不是响应式代理
state.nested = { count: 1 }  // 触发更新（第一层替换）
state.nested.count++          // 不会触发更新（嵌套对象未代理）
```

---

## toRaw

获取代理对象对应的原始对象。如果传入的不是代理对象，则原样返回。

### 签名

```typescript
function toRaw<T>(observed: T): T
```

### 示例

```typescript
const raw = { count: 0 }
const proxy = reactive(raw)
toRaw(proxy) === raw  // true
```

---

## isReactive / isReadonly

判断一个值是否是响应式代理 / 只读代理。

### 签名

```typescript
function isReactive(value: unknown): boolean
function isReadonly(value: unknown): boolean
```

---

## markReadOnly / markSkip

标记对象为只读 / 跳过代理。

### 签名

```typescript
function markReadOnly(obj: object): object
function markSkip(obj: object): object
```

---

## ref

创建一个 Ref，用于将基本类型值变为响应式。当值是对象时，自动用 reactive 包装。

### 签名

```typescript
function ref<T = any>(value: T): Ref<T>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `value` | `T` | 初始值 |

### 返回值

`Ref<T>` 对象，包含 `value` 属性。

### 示例

```typescript
const count = ref(0)
effect(() => console.log(count.value))  // 0
count.value++  // 触发 effect，输出 1

const obj = ref({ name: 'lyt' })
obj.value.name = 'new'  // 触发 effect（深层响应式）
```

---

## shallowRef

创建浅层 Ref。当值是对象时，不会用 reactive 包装，只有 `.value` 本身的替换会触发更新。

### 签名

```typescript
function shallowRef<T = any>(value: T): Ref<T>
```

### 示例

```typescript
const state = shallowRef({ count: 0 })
state.value.count++       // 不会触发 effect（浅层）
state.value = { count: 1 } // 触发 effect（替换了 .value）
```

---

## isRef

判断一个值是否是 Ref。

### 签名

```typescript
function isRef(value: unknown): value is Ref
```

---

## unref

如果值是 Ref，返回 `.value`；否则返回值本身。用于自动解包 Ref。

### 签名

```typescript
function unref<T>(value: T | Ref<T>): T
```

### 示例

```typescript
const count = ref(5)
unref(count)  // 5
unref(10)     // 10
```

---

## toRef

为响应式对象的某个属性创建一个 Ref，与原始属性保持双向同步。

### 签名

```typescript
function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): Ref<T[K]>
```

### 示例

```typescript
const state = reactive({ count: 0 })
const countRef = toRef(state, 'count')
countRef.value++  // state.count 也变为 1
state.count++     // countRef.value 也变为 2
```

---

## toRefs

将响应式对象的所有属性转换为 Ref，返回一个与原始对象结构相同的普通对象。

### 签名

```typescript
function toRefs<T extends object>(object: T): { [K in keyof T]: Ref<T[K]> }
```

### 示例

```typescript
const state = reactive({ count: 0, name: 'lyt' })
const refs = toRefs(state)
refs.count.value++   // state.count 也变为 1
refs.name.value = 'new'  // state.name 也变为 'new'
```

---

## triggerRef

手动触发 Ref 的更新。主要用于 shallowRef 中修改对象内部属性后手动触发。

### 签名

```typescript
function triggerRef(ref: Ref): void
```

---

## computed

创建计算属性。支持只读和可写两种模式。基于 dirty 标记实现惰性求值和缓存。

### 签名

```typescript
function computed<T = any>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
): ComputedRef<T> | WritableComputedRef<T>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `getterOrOptions` | `ComputedGetter<T>` 或 `WritableComputedOptions<T>` | getter 函数或 `{ get, set }` 选项对象 |

### 返回值

计算属性 Ref（只读或可写）。

### 示例

```typescript
// 只读计算属性
const count = ref(1)
const double = computed(() => count.value * 2)
console.log(double.value)  // 2
count.value = 5
console.log(double.value)  // 10

// 可写计算属性
const firstName = ref('Lyt')
const lastName = ref('JS')
const fullName = computed({
  get: () => firstName.value + ' ' + lastName.value,
  set: (val) => {
    const [first, last] = val.split(' ')
    firstName.value = first
    lastName.value = last
  }
})
fullName.value = 'Hello World'  // firstName = 'Hello', lastName = 'World'
```

---

## watch

侦听一个或多个响应式数据源，并在数据变化时执行回调。

### 签名

```typescript
function watch<T = any>(
  source: WatchSource<T> | WatchSource<T>[],
  cb: WatchCallback<T>,
  options?: WatchOptions
): WatchStopHandle
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `source` | `WatchSource` 或 `WatchSource[]` | 侦听源（ref / reactive / getter / 数组） |
| `cb` | `WatchCallback` | 变化回调，接收 `(newValue, oldValue, onCleanup)` |
| `options` | `WatchOptions` | 配置选项 |

### WatchOptions

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `immediate` | `boolean` | `false` | 是否立即执行回调 |
| `deep` | `boolean` | `true`（reactive 对象自动开启） | 是否深度侦听 |
| `flush` | `'pre' \| 'post' \| 'sync'` | - | 刷新时机 |

### 返回值

`WatchStopHandle` — 调用可停止侦听。

### 示例

```typescript
const count = ref(0)
const stop = watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} -> ${newVal}`)
})
count.value++  // 输出: count: 0 -> 1
stop()         // 停止侦听

// 侦听 getter
watch(() => state.count + state.name, (newVal, oldVal) => console.log(newVal))

// 侦听多个源
watch([count, name], ([newCount, newName], [oldCount, oldName]) => {
  console.log(newCount, newName)
})

// 立即执行
watch(count, (val) => console.log(val), { immediate: true })
```

---

## watchEffect

立即运行一个函数，同时响应式地追踪其依赖。当依赖变化时自动重新执行。

### 签名

```typescript
function watchEffect(
  fn: (onCleanup: (cleanupFn: () => void) => void) => void,
  options?: WatchEffectOptions
): WatchStopHandle
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `fn` | `(onCleanup) => void` | 副作用函数，接收清理回调 |
| `options` | `WatchEffectOptions` | 配置选项 |

### 返回值

`WatchStopHandle` — 调用可停止侦听。

### 示例

```typescript
const count = ref(0)
const stop = watchEffect(() => {
  console.log(`count is: ${count.value}`)
})
// 立即输出: count is: 0
count.value++  // 输出: count is: 1
stop()

// 带清理函数
watchEffect((onCleanup) => {
  const timer = setInterval(() => console.log('tick'), 1000)
  onCleanup(() => clearInterval(timer))
})
```

---

## nextTick

在下一个微任务中执行回调，等待当前所有响应式更新完成后再执行。

### 签名

```typescript
function nextTick(): Promise<void>
```

### 返回值

`Promise<void>`

### 示例

```typescript
await nextTick()
// 此时 DOM 已更新完毕

nextTick().then(() => {
  console.log('更新完成')
})
```

---

## effect / stop

创建响应式副作用并手动管理其生命周期。

### 签名

```typescript
function effect(
  fn: EffectFn,
  options?: ReactiveEffectOptions
): { effect: ReactiveEffect; (): any }

function stop(runner: any): void
```

### ReactiveEffectOptions

| 属性 | 类型 | 说明 |
|------|------|------|
| `scheduler` | `(effect: ReactiveEffect) => void` | 自定义执行时机 |
| `lazy` | `boolean` | 是否惰性执行（首次不自动执行） |
| `beforeRun` | `() => void` | 执行前回调 |
| `afterRun` | `() => void` | 执行后回调 |
| `allowRecurse` | `boolean` | 是否允许递归 |
| `id` | `number` | 唯一标识（用于排序和调试） |

### 示例

```typescript
const obj = reactive({ count: 0 })
const runner = effect(() => {
  console.log(obj.count)
})
obj.count++  // 自动触发副作用重新执行
runner.stop()  // 停止副作用
```

---

## 调度器 API

### queueJob

将一个 job 加入调度队列，在下一个微任务中统一批量执行。

```typescript
function queueJob(job: SchedulerJob): void
```

### queuePostFlushCb

将回调加入 post-flush 队列，在主队列刷新完毕后执行。

```typescript
function queuePostFlushCb(cb: SchedulerJob): void
```

### hasPendingJob

查询队列中是否包含指定的 job。

```typescript
function hasPendingJob(job: SchedulerJob): boolean
```

### clearQueue

清空队列中的所有待执行 job（主要用于测试）。

```typescript
function clearQueue(): void
```

---

## 内部导出

以下为内部 API，一般不需要直接使用：

| 导出 | 说明 |
|------|------|
| `ReactiveEffect` | 副作用类 |
| `track` | 依赖收集 |
| `trigger` | 触发更新 |
| `ITERATE_KEY` | 迭代器依赖 key |
| `activeEffect` | 当前活跃的副作用 |
| `refSymbol` / `shallowRefSymbol` | Ref 标记 Symbol |
| `reactiveFlag` / `readonlyFlag` / `rawSymbol` | 代理标记 Symbol |
