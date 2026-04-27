# @lytjs/common

Lyt.js 公共工具库 - 提供类型检查、对象操作、事件发射器、缓存等基础功能。

## 安装

```bash
npm install @lytjs/common

# 或使用 pnpm
pnpm add @lytjs/common
```

## 特性

- 📦 类型检查工具
- 🔧 对象操作工具
- 📡 事件发射器
- 💾 缓存工具
- 🎯 零运行时依赖

## 快速开始

### 类型检查

```javascript
import { isString, isNumber, isObject, isFunction } from '@lytjs/common';

isString('hello');      // true
isNumber(123);          // true
isObject({ a: 1 });     // true
isFunction(() => {});   // true
```

### 对象操作

```javascript
import { deepClone, deepMerge, get, set, omit, pick } from '@lytjs/common';

// 深拷贝
const obj = { a: { b: 1 } };
const clone = deepClone(obj);

// 深合并
const merged = deepMerge({ a: 1 }, { b: 2 });

// 获取对象属性
const value = get(obj, 'a.b'); // 1

// 设置对象属性
set(obj, 'a.c', 2);

// 省略属性
const newObj = omit(obj, ['b']);

// 选择属性
const selected = pick(obj, ['a']);
```

### 事件发射器

```javascript
import { EventEmitter } from '@lytjs/common';

const emitter = new EventEmitter();

// 监听事件
emitter.on('event', (data) => {
  console.log('Event received:', data);
});

// 触发事件
emitter.emit('event', { hello: 'world' });

// 移除监听
emitter.off('event');
```

### 缓存工具

```javascript
import { Cache } from '@lytjs/common';

const cache = new Cache({ maxSize: 100, ttl: 5000 });

// 设置缓存
cache.set('key', 'value');

// 获取缓存
const value = cache.get('key');

// 检查缓存是否存在
const exists = cache.has('key');

// 删除缓存
cache.delete('key');

// 清空缓存
cache.clear();
```

## API 参考

### 类型检查

| 方法 | 说明 |
|------|------|
| `isString(v)` | 是否为字符串 |
| `isNumber(v)` | 是否为数字 |
| `isBoolean(v)` | 是否为布尔值 |
| `isObject(v)` | 是否为对象 |
| `isArray(v)` | 是否为数组 |
| `isFunction(v)` | 是否为函数 |
| `isUndefined(v)` | 是否为 undefined |
| `isNull(v)` | 是否为 null |
| `isNullOrUndefined(v)` | 是否为 null 或 undefined |
| `isPrimitive(v)` | 是否为原始值 |
| `isPlainObject(v)` | 是否为纯对象 |
| `isDate(v)` | 是否为日期 |
| `isRegExp(v)` | 是否为正则表达式 |
| `isError(v)` | 是否为错误 |
| `isSymbol(v)` | 是否为 Symbol |
| `isBigInt(v)` | 是否为 BigInt |

### 对象操作

| 方法 | 说明 |
|------|------|
| `deepClone(obj)` | 深拷贝对象 |
| `deepMerge(...objs)` | 深合并对象 |
| `get(obj, path, defaultValue)` | 获取对象属性 |
| `set(obj, path, value)` | 设置对象属性 |
| `has(obj, path)` | 检查对象是否有属性 |
| `omit(obj, keys)` | 省略对象属性 |
| `pick(obj, keys)` | 选择对象属性 |
| `mergeObjects(...objs)` | 合并对象 |
| `extend(target, ...sources)` | 扩展对象 |
| `freeze(obj)` | 冻结对象 |
| `isFrozen(obj)` | 检查对象是否被冻结 |
| `clone(obj)` | 浅拷贝对象 |

### 事件发射器

| 方法 | 说明 |
|------|------|
| `on(event, listener)` | 监听事件 |
| `off(event, listener)` | 移除事件监听 |
| `emit(event, ...args)` | 触发事件 |
| `once(event, listener)` | 监听一次事件 |
| `removeAllListeners(event)` | 移除所有事件监听 |
| `listeners(event)` | 获取事件监听器 |
| `listenerCount(event)` | 获取监听器数量 |

### 缓存

| 方法 | 说明 |
|------|------|
| `set(key, value, ttl?)` | 设置缓存 |
| `get(key)` | 获取缓存 |
| `has(key)` | 检查缓存是否存在 |
| `delete(key)` | 删除缓存 |
| `clear()` | 清空缓存 |
| `size()` | 获取缓存数量 |
| `keys()` | 获取所有缓存键 |
| `values()` | 获取所有缓存值 |
| `entries()` | 获取所有缓存条目 |

## 示例

### 完整示例

```javascript
import { isString, deepClone, EventEmitter, Cache } from '@lytjs/common';

// 类型检查
const value = 'hello';
if (isString(value)) {
  console.log('It is a string');
}

// 深拷贝
const original = { a: { b: [1, 2, 3] } };
const copied = deepClone(original);

// 事件发射器
const emitter = new EventEmitter();
emitter.on('data', (data) => {
  console.log('Received data:', data);
});
emitter.emit('data', { message: 'Hello' });

// 缓存
const cache = new Cache({ ttl: 60000 });
cache.set('key', 'value');
console.log(cache.get('key')); // 'value'
```

### 自定义事件发射器

```javascript
import { EventEmitter } from '@lytjs/common';

class MyClass extends EventEmitter {
  constructor() {
    super();
  }

  doSomething() {
    // ...
    this.emit('done', { result: 'success' });
  }
}

const obj = new MyClass();
obj.on('done', (data) => {
  console.log('Something done:', data);
});
obj.doSomething();
```

### LRU 缓存

```javascript
import { LRUCache } from '@lytjs/common';

const cache = new LRUCache({ maxSize: 100, ttl: 5000 });

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);

// 访问 'a'，使其变为最近使用
cache.get('a');

// 添加 'd'，删除最久未使用的 'b'
cache.set('d', 4);
```

## 性能

- 轻量级工具库
- 高效的深拷贝实现
- 优化的 LRU 缓存算法
- 快速的类型检查

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
