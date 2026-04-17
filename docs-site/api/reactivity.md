# 响应式 API

响应式系统是 Lyt.js 的核心，提供基于 ES6 Proxy 的响应式数据追踪和更新机制。

## reactive()

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

```ts
const state = reactive({ count: 0, nested: { value: 1 } })
state.count++           // 触发更新
state.nested.value++    // 深层响应式
```

**相关 API：** [`readonly()`](#readonly)、[`shallowReactive()`](#shallowreactive)、[`isReactive()`](#工具函数)

---

## readonly()

创建只读的响应式代理。

```ts
function readonly<T extends object>(target: T): Readonly<T>
```

```ts
const state = reactive({ count: 0 })
const copy = readonly(state)
copy.count = 1  // 警告：无法修改只读对象
```

---

## shallowReactive()

创建浅层响应式代理（仅第一层响应式）。

```ts
function shallowReactive<T extends object>(target: T): T
```

```ts
const state = shallowReactive({ count: 0, nested: { value: 1 } })
state.count++           // 触发更新
state.nested.value = 2  // 不触发更新
```

---

## ref()

创建 Ref 引用，用于包装基本类型值。

```ts
function ref<T>(value: T): Ref<T>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| value | `T` | 初始值 |

**返回值：** `Ref<T>`

```ts
const count = ref(0)
count.value++  // 触发更新
```

**相关 API：** [`shallowRef()`](#shallowref)、[`isRef()`](#工具函数)、[`toRef()`](#工具函数)、[`toRefs()`](#工具函数)

---

## shallowRef()

创建浅层 Ref（不自动深层代理）。

```ts
function shallowRef<T>(value: T): Ref<T>
```

```ts
const state = shallowRef({ count: 0 })
state.value.count++       // 不触发更新
state.value = { count: 1 } // 触发更新
```

---

## computed()

创建计算属性（基于依赖自动缓存）。

```ts
function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>
function computed<T>(options: WritableComputedOptions<T>): WritableComputedRef<T>
```

```ts
const count = ref(0)
const double = computed(() => count.value * 2)
console.log(double.value)  // 0

// 可写计算属性
const sum = computed({
  get: () => count.value * 2,
  set: (val) => { count.value = val / 2 }
})
```

---

## watch()

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

```ts
const count = ref(0)
const stop = watch(count, (n, o) => console.log(n, o))
stop()  // 停止侦听
```

---

## watchEffect()

自动追踪依赖的副作用函数。

```ts
function watchEffect(
  effect: EffectFn,
  options?: WatchEffectOptions
): WatchStopHandle
```

```ts
const count = ref(0)
const stop = watchEffect(() => console.log(count.value))  // 立即执行
stop()
```

---

## nextTick()

在下一个微任务中执行回调。

```ts
function nextTick(fn?: () => void): Promise<void>
```

```ts
await nextTick()  // 等待 DOM 更新
```

---

## 工具函数

### isReactive()

```ts
function isReactive(value: unknown): boolean
```

判断值是否为 reactive 代理对象。

### isReadonly()

```ts
function isReadonly(value: unknown): boolean
```

判断值是否为 readonly 代理对象。

### isRef()

```ts
function isRef<T>(value: unknown): value is Ref<T>
```

判断值是否为 Ref 对象。

### unref()

```ts
function unref<T>(value: T | Ref<T>): T
```

如果是 Ref 返回 `.value`，否则返回原值。

### toRef()

```ts
function toRef<T extends object, K extends keyof T>(obj: T, key: K): Ref<T[K]>
```

为 reactive 对象的某个属性创建 Ref。

### toRefs()

```ts
function toRefs<T extends object>(obj: T): { [K in keyof T]: Ref<T[K]> }
```

将 reactive 对象的所有属性转为 Ref。

### triggerRef()

```ts
function triggerRef(ref: Ref): void
```

手动触发 Ref 更新。

### toRaw()

```ts
function toRaw<T>(observed: T): T
```

获取响应式对象的原始对象。

---

## effect() / stop()

底层副作用系统 API。

```ts
function effect(fn: EffectFn, options?: ReactiveEffectOptions): ReactiveEffect
function stop(effect: ReactiveEffect): void
```

::: warning 注意
`effect` 和 `stop` 是底层 API，通常推荐使用 `watch` / `watchEffect` 代替。
:::
