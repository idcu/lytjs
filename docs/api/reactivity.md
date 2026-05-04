# @lytjs/reactivity API 参考

`@lytjs/reactivity` 是 LytJS 的响应式系统核心包，提供了 Ref、Reactive、Computed、Watch、Effect、Signal 等响应式原语。

---

## Ref 系列

### ref()

创建一个响应式引用，可以包装任意类型的值。

#### 签名

```ts
function ref<T>(value: T): Ref<T>
function ref<T = unknown>(): Ref<T | undefined>
```

#### 返回值

```ts
interface Ref<T = unknown> {
  value: T
  readonly __v_isRef: true
}
```

#### 示例

```ts
import { ref } from '@lytjs/reactivity'

const count = ref(0)
console.log(count.value) // 0
count.value++
console.log(count.value) // 1
```

---

### shallowRef()

创建一个浅层响应式引用。只有对 `.value` 的替换会触发更新，不会深层转换对象。

#### 签名

```ts
function shallowRef<T>(value: T): ShallowRef<T>
```

#### 返回值

```ts
interface ShallowRef<T = unknown> extends Ref<T> {
  readonly __v_isShallow: true
}
```

#### 示例

```ts
import { shallowRef } from '@lytjs/reactivity'

const state = shallowRef({ count: 0 })
// 修改内部属性不会触发更新
state.value.count++
// 替换整个值才会触发更新
state.value = { count: 1 }
```

---

### customRef()

创建一个自定义的 ref，可以显式控制依赖追踪和触发更新。

#### 签名

```ts
function customRef<T>(factory: (track: () => void, trigger: () => void) => {
  get(): T
  set(value: T): void
}): Ref<T>
```

#### 示例

```ts
import { customRef } from '@lytjs/reactivity'

function useDebouncedRef<T>(value: T, delay = 200) {
  let timeout: number
  return customRef((track, trigger) => ({
    get() {
      track()
      return value
    },
    set(newValue: T) {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        value = newValue
        trigger()
      }, delay)
    }
  }))
}
```

---

### triggerRef()

强制触发与 `shallowRef` 关联的所有副作用。

#### 签名

```ts
function triggerRef(ref: ShallowRef): void
```

#### 示例

```ts
import { shallowRef, triggerRef, watchEffect } from '@lytjs/reactivity'

const foo = shallowRef({ count: 0 })
watchEffect(() => console.log(foo.value.count)) // 0
foo.value.count++
triggerRef(foo) // 控制台输出: 1
```

---

### isRef()

判断一个值是否为 ref 对象。

#### 签名

```ts
function isRef<T>(value: unknown): value is Ref<T>
```

---

### unref()

如果参数是 ref，则返回 `.value`；否则返回参数本身。这是 `val = isRef(val) ? val.value : val` 的语法糖。

#### 签名

```ts
function unref<T>(ref: T | Ref<T>): T
```

---

### toRef()

基于响应式对象上的某个属性创建一个 ref。创建的 ref 与源属性保持同步。

#### 签名

```ts
function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K,
): Ref<T[K]>
```

#### 示例

```ts
import { reactive, toRef } from '@lytjs/reactivity'

const state = reactive({ count: 0 })
const countRef = toRef(state, 'count')
countRef.value++ // state.count 也变为 1
```

---

### toRefs()

将响应式对象转换为普通对象，其中每个属性都是指向原始对象对应属性的 ref。

#### 签名

```ts
function toRefs<T extends object>(object: T): ToRefs<T>
```

#### 示例

```ts
import { reactive, toRefs } from '@lytjs/reactivity'

const state = reactive({ count: 0, name: 'LytJS' })
const { count, name } = toRefs(state)
```

---

## Reactive 系列

### reactive()

创建一个深层响应式的 Proxy 对象。

#### 签名

```ts
function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
```

#### 示例

```ts
import { reactive, watchEffect } from '@lytjs/reactivity'

const state = reactive({ count: 0, nested: { value: 'hello' } })
watchEffect(() => console.log(state.count))
state.count++ // 触发 watchEffect
```

---

### shallowReactive()

创建一个浅层响应式的 Proxy 对象。只有根级别的属性是响应式的。

#### 签名

```ts
function shallowReactive<T extends object>(target: T): T
```

---

### readonly()

创建一个深层只读的响应式代理。任何嵌套属性也是只读的。

#### 签名

```ts
function readonly<T extends object>(target: T): DeepReadonly<UnwrapNestedRefs<T>>
```

---

### shallowReadonly()

创建一个浅层只读的响应式代理。只有根级别的属性是只读的。

#### 签名

```ts
function shallowReadonly<T extends object>(target: T): Readonly<T>
```

---

### isReactive()

判断一个对象是否是由 `reactive()` 或 `shallowReactive()` 创建的响应式代理。

#### 签名

```ts
function isReactive(value: unknown): boolean
```

---

### isReadonly()

判断一个对象是否是由 `readonly()` 创建的只读代理。

#### 签名

```ts
function isReadonly(value: unknown): boolean
```

---

### isProxy()

判断一个对象是否是由 `reactive()`、`readonly()`、`shallowReactive()` 或 `shallowReadonly()` 创建的代理。

#### 签名

```ts
function isProxy(value: unknown): boolean
```

---

### toRaw()

获取响应式对象的原始（非代理）对象。

#### 签名

```ts
function toRaw<T>(observed: T): T
```

---

### markRaw()

将一个对象标记为"永远不会被转换为响应式代理"，返回该对象本身。

#### 签名

```ts
function markRaw<T extends object>(value: T): T
```

---

## Computed

### computed()

创建一个计算属性 ref。

#### 签名

```ts
// 只读计算属性
function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>

// 可写计算属性
function computed<T>(options: WritableComputedOptions<T>): WritableComputedRef<T>
```

#### 类型

```ts
type ComputedGetter<T> = () => T
type ComputedSetter<T> = (newValue: T) => void

interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}
```

#### 示例

```ts
import { ref, computed } from '@lytjs/reactivity'

const count = ref(1)
const doubled = computed(() => count.value * 2)
console.log(doubled.value) // 2

// 可写计算属性
const plusOne = computed({
  get: () => count.value + 1,
  set: (val) => { count.value = val - 1 }
})
plusOne.value = 5 // count.value 变为 4
```

---

## Watch 系列

### watch()

侦听一个或多个响应式数据源，在数据变化时执行回调。

#### 签名

```ts
function watch<T>(
  source: WatchSource<T> | WatchSource<T>[],
  callback: WatchCallback<T>,
  options?: WatchOptions<false>,
): WatchHandle

// immediate 模式
function watch<T>(
  source: WatchSource<T> | WatchSource<T>[],
  callback: WatchCallbackWithImmediate<T, true>,
  options: WatchOptions<true>,
): WatchHandle
```

#### WatchOptions

```ts
interface WatchOptions<Immediate = boolean> {
  /** 是否在创建时立即执行回调，默认 false */
  immediate?: Immediate
  /** 是否深度侦听，默认 false */
  deep?: boolean
  /** 回调执行时机：'pre'（更新前）、'post'（更新后）、'sync'（同步），默认 'pre' */
  flush?: 'pre' | 'post' | 'sync'
  /** 是否只触发一次，默认 false */
  once?: boolean
}
```

#### 示例

```ts
import { ref, watch } from '@lytjs/reactivity'

const count = ref(0)

watch(count, (newVal, oldVal) => {
  console.log(`count 从 ${oldVal} 变为 ${newVal}`)
})

// 侦听多个源
watch([count, anotherRef], ([newCount, newAnother], [oldCount, oldAnother]) => {
  // ...
})

// 带选项
watch(count, callback, { immediate: true, deep: true, flush: 'post' })
```

---

### watchEffect()

立即运行一个函数，同时响应式地追踪其依赖，并在依赖变化时重新执行。

#### 签名

```ts
function watchEffect(
  effect: OnCleanup => void,
  options?: WatchEffectOptions,
): WatchHandle
```

#### 示例

```ts
import { ref, watchEffect } from '@lytjs/reactivity'

const count = ref(0)

const stop = watchEffect((onCleanup) => {
  console.log(count.value)
  onCleanup(() => {
    console.log('清理副作用')
  })
})

count.value++ // 触发重新执行

stop() // 停止侦听
```

---

### watchPostEffect()

`watchEffect` 的别名，使用 `flush: 'post'` 选项。回调在 DOM 更新之后执行。

#### 签名

```ts
function watchPostEffect(
  effect: OnCleanup => void,
  options?: WatchEffectOptions,
): WatchHandle
```

---

### watchSyncEffect()

`watchEffect` 的别名，使用 `flush: 'sync'` 选项。回调在响应式数据变化时同步执行。

#### 签名

```ts
function watchSyncEffect(
  effect: OnCleanup => void,
  options?: WatchEffectOptions,
): WatchHandle
```

---

## Effect 系列

### effect()

创建一个响应式副作用函数。返回一个 runner 函数，调用 runner 会重新执行副作用。

#### 签名

```ts
function effect<T = unknown>(
  fn: () => T,
  options?: ReactiveEffectOptions,
): ReactiveEffectRunner<T>
```

#### ReactiveEffectOptions

```ts
interface ReactiveEffectOptions {
  /** 是否懒执行（创建时不立即执行），默认 false */
  lazy?: boolean
  /** 自定义调度器 */
  scheduler?: EffectScheduler
  /** 是否允许递归触发，默认 false */
  allowRecurse?: boolean
  /** 停止时的回调 */
  onStop?: () => void
  /** 依赖被追踪时的调试回调 */
  onTrack?: (event: DebuggerEvent) => void
  /** 依赖被触发时的调试回调 */
  onTrigger?: (event: DebuggerEvent) => void
}
```

#### 示例

```ts
import { effect, ref } from '@lytjs/reactivity'

const count = ref(0)
const runner = effect(() => {
  console.log(count.value)
})
// 输出: 0
count.value++
// 输出: 1

runner.effect.stop() // 停止副作用
```

---

### stop()

停止一个由 `effect()` 创建的副作用。

#### 签名

```ts
function stop(runner: ReactiveEffectRunner): void
```

---

### pauseTracking() / enableTracking() / resetTracking()

暂停、启用和重置响应式依赖追踪。

#### 签名

```ts
function pauseTracking(): void
function enableTracking(): void
function resetTracking(): void
```

---

### batch() / batchAsync()

批量执行函数，期间所有响应式更新会被合并，只在最后统一触发一次。

#### 签名

```ts
function batch<T>(fn: () => T): T
function batchAsync<T>(fn: () => T | Promise<T>): Promise<T>
```

#### 示例

```ts
import { ref, effect, batch } from '@lytjs/reactivity'

const a = ref(0)
const b = ref(0)
let runCount = 0

effect(() => {
  runCount++
  console.log(a.value, b.value)
})

batch(() => {
  a.value = 1
  b.value = 2
})
// effect 只执行一次，输出: 1 2
```

---

### untrack()

在不追踪依赖的情况下执行函数。

#### 签名

```ts
function untrack<T>(fn: () => T): T
```

---

### onEffectCleanup()

注册一个清理回调，在副作用重新执行或停止时调用。

#### 签名

```ts
function onEffectCleanup(cleanupFn: () => void): void
```

---

### 首次渲染优化 API

以下 API 用于优化首次渲染性能，在首次渲染期间跳过响应式依赖收集。

#### withFirstRenderOptimization()

```ts
function withFirstRenderOptimization<T>(fn: () => T): T
```

#### shouldSkipTracking()

```ts
function shouldSkipTracking(): boolean
```

#### getSkippedTrackingCount() / resetSkippedTrackingCount()

```ts
function getSkippedTrackingCount(): number
function resetSkippedTrackingCount(): void
```

---

## Signal 系列

Signal 是一种独立的响应式原语，拥有独立的订阅/通知机制，同时桥接 effect 系统保持互操作性。

### signal()

创建一个可写信号。

#### 签名

```ts
function signal<T>(initialValue: T): WritableSignal<T>
```

#### WritableSignal

```ts
interface WritableSignal<T = unknown> extends Signal<T> {
  /** 设置新值 */
  set(newValue: T): void
  /** 通过 updater 函数更新值 */
  update(updater: (prev: T) => T): void
  /** 停止所有订阅通知，释放资源 */
  dispose(): void
}
```

#### 示例

```ts
import { signal, effect } from '@lytjs/reactivity'

const count = signal(0)
count.set(1)
count.update(prev => prev + 1) // 2

effect(() => {
  console.log(count()) // 2
})
```

---

### computedSignal() / signalComputed()

创建一个计算信号（只读）。`signalComputed` 是 `computed` 的别名导出。

#### 签名

```ts
function computedSignal<T>(getter: () => T): ComputedSignal<T>
```

#### ComputedSignal

```ts
interface ComputedSignal<T = unknown> extends Signal<T> {
  /** 停止计算信号的依赖追踪和更新 */
  dispose(): void
}
```

---

### readonlySignal()

创建一个只读信号。

#### 签名

```ts
function readonlySignal<T>(signal: WritableSignal<T>): ReadonlySignal<T>
```

#### ReadonlySignal

```ts
interface ReadonlySignal<T = unknown> {
  /** 读取当前值 */
  (): T
  readonly [SignalSymbol]: true
}
```

---

### set() / update() / valueOf()

Signal 的辅助操作函数。

#### 签名

```ts
function set<T>(signal: WritableSignal<T>, newValue: T): void
function update<T>(signal: WritableSignal<T>, updater: (prev: T) => T): void
function valueOf<T>(signal: Signal<T>): T
```

---

### signalBatch() / signalUntrack()

Signal 的批量更新和取消追踪。

#### 签名

```ts
function signalBatch<T>(fn: () => T): T
function signalUntrack<T>(fn: () => T): T
```

---

## EffectScope 系列

### effectScope()

创建一个 effect scope，用于批量管理响应式副作用的创建和销毁。

#### 签名

```ts
function effectScope(options?: boolean | EffectScopeOptions): EffectScope
```

#### EffectScope

```ts
interface EffectScope {
  /** 当前 scope 是否活跃 */
  active: boolean
  /** 在 scope 上下文中执行 fn，期间创建的 effect 会被自动收集 */
  run<T>(fn: () => T): T | undefined
  /** 停止 scope，清理所有收集的 effects 和 cleanups */
  stop(): void
}
```

#### 示例

```ts
import { effectScope, ref, watch, computed } from '@lytjs/reactivity'

const scope = effectScope()
scope.run(() => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)
  watch(count, (val) => console.log(val))
})

// 不再需要时一次性停止所有副作用
scope.stop()
```

---

### getCurrentScope()

获取当前活跃的 effectScope。

#### 签名

```ts
function getCurrentScope(): EffectScope | undefined
```

---

### onScopeDispose()

在当前 effectScope 被停止时注册一个清理回调。

#### 签名

```ts
function onScopeDispose(fn: () => void): boolean
```

---

## Async Computed

### asyncComputed()

创建一个异步计算属性，支持 `loading` 和 `error` 状态。

#### 签名

```ts
function asyncComputed<T>(
  getter: () => Promise<T>,
  initialValue?: T,
  lazy?: boolean,
): AsyncComputedRef<T>
```

#### AsyncComputedRef

```ts
interface AsyncComputedRef<T = unknown> extends Ref<T | undefined> {
  /** 异步计算是否正在进行 */
  readonly loading: boolean
  /** 上一次异步计算的错误 */
  readonly error: unknown
}
```

#### 示例

```ts
import { asyncComputed } from '@lytjs/reactivity'

const user = asyncComputed(async () => {
  const res = await fetch('/api/user')
  return res.json()
}, null)

// 在模板中使用
// {{ user.loading ? '加载中...' : user.value?.name }}
```

---

### useAsyncState()

异步状态管理的简化封装。

#### 签名

```ts
function useAsyncState<T>(
  promise: () => Promise<T>,
  initialValue?: T,
): AsyncComputedRef<T>
```

---

## 类型导出

| 类型 | 说明 |
|------|------|
| `Ref<T>` | 响应式引用 |
| `ShallowRef<T>` | 浅层响应式引用 |
| `ComputedRef<T>` | 计算属性引用 |
| `WritableComputedRef<T>` | 可写计算属性引用 |
| `Signal<T>` | 只读信号 |
| `WritableSignal<T>` | 可写信号 |
| `ComputedSignal<T>` | 计算信号 |
| `ReadonlySignal<T>` | 只读信号 |
| `ReactiveEffectRunner<T>` | effect runner 函数 |
| `EffectScope` | effect scope 实例 |
| `WatchOptions` | watch 选项 |
| `WatchEffectOptions` | watchEffect 选项 |
| `WatchSource<T>` | watch 数据源类型 |
| `UnwrapRef<T>` | 解包 Ref 类型 |
| `UnwrapNestedRefs<T>` | 深层解包嵌套 Ref 类型 |
| `DeepReadonly<T>` | 深层只读类型 |
| `ToRefs<T>` | toRefs 返回类型 |
