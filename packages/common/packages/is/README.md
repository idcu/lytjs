# @lytjs/common-is

类型检查工具函数集合，提供一组类型守卫（type guard）与常用值检查函数。

## 安装

```bash
pnpm add @lytjs/common-is
```

## 使用示例

```typescript
import {
  isString,
  isNumber,
  isObject,
  isPlainObject,
  isArray,
  isFunction,
  isNullish,
  isEmpty,
  hasOwn,
  hasChanged,
} from '@lytjs/common-is';

isString('hello'); // true
isNumber(NaN); // false（排除 NaN）
isPlainObject(obj); // true（仅 [object Object]）
isEmpty([]); // true
hasChanged(value, oldValue); // 使用 Object.is 比较是否发生变化
```

## API 说明

### 基础类型守卫

| 函数                 | 作用                                |
| -------------------- | ----------------------------------- |
| `isString(val)`      | 值是否为字符串                      |
| `isNumber(val)`      | 值是否为数字（排除 NaN）            |
| `isBoolean(val)`     | 值是否为布尔值                      |
| `isSymbol(val)`      | 值是否为 Symbol                     |
| `isBigInt(val)`      | 值是否为 BigInt                     |
| `isObject(val)`      | 值是否为对象（非 null，含函数）     |
| `isPlainObject(val)` | 值是否为纯对象（`[object Object]`） |
| `isArray(val)`       | 值是否为数组                        |
| `isFunction(val)`    | 值是否为函数                        |
| `isPromise(val)`     | 值是否为 Promise                    |
| `isNullish(val)`     | 值是否为 null 或 undefined          |

### 常用值检查

| 函数                     | 作用                                     |
| ------------------------ | ---------------------------------------- |
| `isEmpty(val)`           | 值是否为空（null、空串、空数组、空对象） |
| `isStringOrNumber(val)`  | 值是否为字符串或数字                     |
| `hasOwn(obj, key)`       | 对象是否拥有指定的自身属性               |
| `hasChanged(value, old)` | 值是否发生变化（使用 `Object.is` 比较）  |

### 类型检测辅助

| 函数                | 作用                          |
| ------------------- | ----------------------------- |
| `toTypeString(val)` | 获取值的内部 `[[Class]]` 标签 |
| `isMap(val)`        | 值是否为 Map                  |
| `isSet(val)`        | 值是否为 Set                  |
| `isWeakMap(val)`    | 值是否为 WeakMap              |
| `isWeakSet(val)`    | 值是否为 WeakSet              |
| `isDate(val)`       | 值是否为 Date                 |
| `isRegExp(val)`     | 值是否为 RegExp               |

### 常量

| 常量        | 说明                 |
| ----------- | -------------------- |
| `NOOP`      | 空函数，用于占位     |
| `EMPTY_FN`  | 空函数别名（兼容性） |
| `EMPTY_OBJ` | 冻结的空对象         |
| `EMPTY_ARR` | 空数组常量（冻结）   |

所有类型守卫均返回 TypeScript 类型谓词（`val is T`），可用于类型收窄。

## 相关包

- 被 [`@lytjs/common-assertions`](../assertions/README.md) 等包依赖
- [`@lytjs/common`](https://www.npmjs.com/package/@lytjs/common) 聚合包，统一导出各模块 API

## License

[MIT](../../../../LICENSE)
