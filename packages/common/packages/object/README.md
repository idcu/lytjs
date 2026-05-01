# @lytjs/common-object

对象操作工具函数集合，提供合并、克隆、比较、路径访问等功能。

## 安装

```bash
pnpm add @lytjs/common-object
```

## API

### `mergeObjects<T>(...sources: Partial<T>[]): T`

浅合并多个对象，自动过滤原型污染 key。

```typescript
import { mergeObjects } from '@lytjs/common-object'

const result = mergeObjects({ a: 1 }, { b: 2 })
// result = { a: 1, b: 2 }
```

### `deepMerge<T>(target: T, source: Partial<T>): T`

深度合并两个对象，自动过滤原型污染 key。

```typescript
import { deepMerge } from '@lytjs/common-object'

const result = deepMerge({ a: { x: 1 } }, { a: { y: 2 } })
// result = { a: { x: 1, y: 2 } }
```

### `createSnapshot<T>(obj: T): T`

创建对象的浅快照。

### `diffObjects<T>(oldObj: T, newObj: T): ObjectDiff`

比较两个对象的差异，返回新增、删除和变更的属性。

### `pick<T, K>(obj: T, keys: K[]): Pick<T, K>`

从对象中选取指定的属性。

### `omit<T, K>(obj: T, keys: K[]): Omit<T, K>`

从对象中排除指定的属性。

### `deepClone<T>(source: T): T`

深度克隆对象，支持循环引用、Date、RegExp、Map、Set 等类型。

```typescript
import { deepClone } from '@lytjs/common-object'

const original = { a: { b: 1 }, c: [1, 2, 3] }
const cloned = deepClone(original)
```

### `shallowEqual<T>(a: T, b: T): boolean`

浅比较两个对象是否相等。

### `deepEqual<T>(a: T, b: T): boolean`

深度比较两个值是否相等，支持 NaN、Date、RegExp、Map、Set 等特殊类型。

```typescript
import { deepEqual } from '@lytjs/common-object'

deepEqual({ a: [1, 2] }, { a: [1, 2] }) // true
deepEqual(NaN, NaN) // true
```

### `get<T>(obj: Record<string, unknown>, path: string, defaultValue?: T): T | undefined`

通过点分隔路径获取对象中的值。

```typescript
import { get } from '@lytjs/common-object'

get({ a: { b: 1 } }, 'a.b') // 1
get({ a: { b: 1 } }, 'a.c', 'default') // 'default'
```

### `set<T>(obj: T, path: string, value: unknown): T`

通过点分隔路径设置对象中的值（不修改原对象，返回新对象）。

```typescript
import { set } from '@lytjs/common-object'

const result = set({ a: { b: 1 } }, 'a.c', 2)
// result = { a: { b: 1, c: 2 } }
```

## 边界行为与已知限制

### `set()` 原型污染防护

`set()` 函数会对路径中的每一个 key 进行原型污染检测。以下 key 会被拦截，导致整个操作被跳过（返回原对象）：

| 被拦截的 key | 说明 |
|---|---|
| `__proto__` | 原型链污染 |
| `constructor` | 构造函数覆盖 |
| `prototype` | 原型属性覆盖 |

**注意**：拦截作用于路径中的所有层级，包括最后一个 key。例如 `set(obj, 'a.__proto__.x', 1)` 和 `set(obj, 'a.prototype', 1)` 都会直接返回原对象，不做任何修改。

### `deepClone()` Symbol 键支持

`deepClone()` 使用 `Reflect.ownKeys()` 遍历对象键，因此会克隆 Symbol 类型的键，这与 `Object.keys()` 或 `for...in` 不同。

```typescript
const sym = Symbol('key')
const obj = { [sym]: 'value', a: 1 }
const cloned = deepClone(obj)
cloned[sym] // 'value'
```

### `deepClone()` 循环引用处理

`deepClone()` 内部使用 `WeakMap` 检测循环引用。当遇到已克隆过的对象时，直接返回之前的克隆结果，避免无限递归。

```typescript
const obj: any = { a: 1 }
obj.self = obj
const cloned = deepClone(obj)
cloned.self === cloned // true
```

### `deepEqual()` 特殊类型支持范围

`deepEqual()` 支持以下特殊类型的比较：

| 类型 | 比较方式 |
|---|---|
| `NaN` | 视为相等（`Number.isNaN` 判断） |
| `Date` | 比较时间戳（`getTime()`） |
| `RegExp` | 比较 `source` 和 `flags` |
| `Map` | 递归比较每个键值对 |
| `Set` | 递归比较每个元素 |

**不支持的特殊类型**：`WeakMap`、`WeakSet`、`ArrayBuffer`、`TypedArray`、`Function`、`Promise` 等类型会直接返回 `false`（除非是同一引用）。

## License

MIT
