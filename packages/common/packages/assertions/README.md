# @lytjs/common-assertions

类型断言工具包，提供安全的类型转换、类型守卫与断言函数，替代不安全的 `as unknown as` 双重断言。

## 安装

```bash
pnpm add @lytjs/common-assertions
```

## 使用示例

### 核心断言与类型转换

```typescript
import { unsafeCast, safeCast, assertType, nullishCoalesce } from '@lytjs/common-assertions';

// 安全断言为指定类型（不做运行时检查）
const el = unsafeCast<HTMLElement>(vnode.el);

// 结合类型守卫的安全转换
const str = safeCast(value, isString, 'fallback');

// 开发模式下进行验证的类型断言
assertType(value, (v) => typeof v === 'string', 'expected a string');

// nullish 值的默认值
const name = nullishCoalesce(maybeName, 'unknown');
```

### 对象属性守卫

```typescript
import { hasProperty, hasProperties, hasTypedProperty, isArrayOf } from '@lytjs/common-assertions';

hasProperty(obj, 'id'); // 是否具有 id 属性
hasProperties(obj, ['id', 'name']); // 是否同时具有多个属性
hasTypedProperty(obj, 'fn', isFunction); // 是否具有指定类型的属性
isArrayOf(value, isNumber); // 是否为元素全部通过守卫的数组
```

### 开发模式断言与警告

```typescript
import { invariant, warning } from '@lytjs/common-assertions';

// 仅在开发模式下生效，条件为 false 时抛错
invariant(props !== null, 'props 不能为 null');

// 仅在开发模式下生效，条件为 true 时发出警告
warning(slowCondition, '存在性能隐患');
```

## API 说明

### 核心类型断言函数

| 函数                                     | 作用                                                |
| ---------------------------------------- | --------------------------------------------------- |
| `unsafeCast<T>(value)`                   | 将值安全断言为指定类型（不做运行时检查）            |
| `assertType<T>(value, validator?, msg?)` | 类型断言，开发模式下验证，失败抛 `TypeError`        |
| `safeCast<T>(value, guard, default?)`    | 结合类型守卫 + 断言的安全类型转换，返回原值或默认值 |
| `nullishCoalesce<T>(value, default)`     | 将 nullish 值转换为默认值                           |

### 类型守卫组合

| 函数                                  | 作用                       |
| ------------------------------------- | -------------------------- |
| `hasProperty(value, key)`             | 值是否是具有指定属性的对象 |
| `hasProperties(value, keys)`          | 值是否同时具有多个属性     |
| `hasTypedProperty(value, key, guard)` | 值是否具有指定类型的属性   |
| `isInstanceOf<T>(value, constructor)` | 值是否为目标类的实例       |
| `isArrayOf<T>(value, elementGuard)`   | 值是否是通过守卫的数组     |

### 安全属性访问

| 函数                        | 作用                                          |
| --------------------------- | --------------------------------------------- |
| `safeGetString(obj, key)`   | 安全访问字符串属性，否则返回 `undefined`      |
| `safeGetFunction(obj, key)` | 安全访问函数属性，否则返回 `undefined`        |
| `safeGetProperty(obj, key)` | 安全获取任意属性值                            |
| `safeGetNested(obj, path)`  | 安全访问嵌套属性（如 `'a.b.c'`）              |
| `asRecord(value)`           | 将对象转换为 `Record`，非对象返回 `undefined` |

### 其他辅助函数

| 函数                         | 作用                                         |
| ---------------------------- | -------------------------------------------- |
| `isRendererHost(value)`      | 值是否带有 `__isRendererHost` 标记的渲染宿主 |
| `isFiniteNumber(value)`      | 值是否为有限数字                             |
| `isNonEmptyString(value)`    | 值是否为非空字符串                           |
| `isNonEmptyArray(value)`     | 值是否为非空数组                             |
| `isNonEmptyObject(value)`    | 值是否为非空对象（排除 null 和数组）         |
| `invariant(condition, msg?)` | 开发模式下，条件为 false 时抛错              |
| `warning(condition, msg?)`   | 开发模式下，条件为 true 时发出警告           |

> 说明：`invariant` 与 `warning` 仅在 `__DEV__` 为 true 时生效，生产构建中会被移除或无副作用。

## 相关包

- 依赖 [`@lytjs/common-is`](../is/README.md) 提供基础类型守卫
- [`@lytjs/common`](https://www.npmjs.com/package/@lytjs/common) 聚合包，统一导出各模块 API

## License

[MIT](../../../../LICENSE)
