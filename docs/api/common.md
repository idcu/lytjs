# @lytjs/common-\* API 参考

`@lytjs/common-*` 是 LytJS 的 L0 基础层，包含 30+ 个零外部依赖的工具包。所有 common-\* 包仅相互依赖，构成框架的最小依赖集。

---

## @lytjs/common-is

类型判断工具集。

```ts
import {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isFunction,
  isPromise,
  isDate,
  isRegExp,
  isError,
  isSymbol,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isPlainObject,
  isNil,
  isNull,
  isUndefined,
  isEmpty,
  isPrimitive,
  hasOwnProperty,
} from '@lytjs/common-is';
```

| 函数                       | 说明                                                                   |
| -------------------------- | ---------------------------------------------------------------------- |
| `isString(val)`            | 判断是否为字符串                                                       |
| `isNumber(val)`            | 判断是否为数字                                                         |
| `isBoolean(val)`           | 判断是否为布尔值                                                       |
| `isArray(val)`             | 判断是否为数组                                                         |
| `isObject(val)`            | 判断是否为对象（非 null 的引用类型）                                   |
| `isFunction(val)`          | 判断是否为函数                                                         |
| `isPromise(val)`           | 判断是否为 Promise                                                     |
| `isDate(val)`              | 判断是否为 Date 对象                                                   |
| `isRegExp(val)`            | 判断是否为正则表达式                                                   |
| `isError(val)`             | 判断是否为 Error 对象                                                  |
| `isSymbol(val)`            | 判断是否为 Symbol                                                      |
| `isMap(val)`               | 判断是否为 Map                                                         |
| `isSet(val)`               | 判断是否为 Set                                                         |
| `isWeakMap(val)`           | 判断是否为 WeakMap                                                     |
| `isWeakSet(val)`           | 判断是否为 WeakSet                                                     |
| `isPlainObject(val)`       | 判断是否为普通对象（`{}` 或 `new Object()`）                           |
| `isNil(val)`               | 判断是否为 null 或 undefined                                           |
| `isNull(val)`              | 判断是否为 null                                                        |
| `isUndefined(val)`         | 判断是否为 undefined                                                   |
| `isEmpty(val)`             | 判断是否为空（null, undefined, '', [], {}）                            |
| `isPrimitive(val)`         | 判断是否为原始值（string/number/boolean/symbol/bigint/null/undefined） |
| `hasOwnProperty(obj, key)` | 安全获取 hasOwnProperty                                                |

---

## @lytjs/common-string

字符串处理工具集。

```ts
import {
  camelToKebab,
  kebabToCamel,
  snakeToCamel,
  upperFirst,
  lowerFirst,
  trim,
  trimStart,
  trimEnd,
  truncate,
  padStart,
  padEnd,
  escapeHtml,
  unescapeHtml,
  escapeRegExp,
  capitalize,
} from '@lytjs/common-string';
```

| 函数                              | 说明                                 |
| --------------------------------- | ------------------------------------ |
| `camelToKebab(str)`               | 驼峰转连字符（`fooBar` → `foo-bar`） |
| `kebabToCamel(str)`               | 连字符转驼峰（`foo-bar` → `fooBar`） |
| `snakeToCamel(str)`               | 下划线转驼峰（`foo_bar` → `fooBar`） |
| `upperFirst(str)`                 | 首字母大写                           |
| `lowerFirst(str)`                 | 首字母小写                           |
| `trim(str)`                       | 去除首尾空白                         |
| `trimStart(str)`                  | 去除开头空白                         |
| `trimEnd(str)`                    | 去除末尾空白                         |
| `truncate(str, length, omission)` | 截断字符串                           |
| `padStart(str, length, chars)`    | 头部填充                             |
| `padEnd(str, length, chars)`      | 尾部填充                             |
| `escapeHtml(str)`                 | HTML 转义（防 XSS）                  |
| `unescapeHtml(str)`               | HTML 反转义                          |
| `escapeRegExp(str)`               | 转义正则特殊字符                     |
| `capitalize(str)`                 | 首字母大写（同 `upperFirst`）        |

---

## @lytjs/common-object

对象操作工具集。

```ts
import {
  deepClone,
  shallowClone,
  merge,
  pick,
  omit,
  get,
  set,
  del,
  has,
  keys,
  values,
  entries,
  freeze,
  seal,
  isFrozen,
  isSealed,
  deepFreeze,
  isEqual,
  isDeepEqual,
} from '@lytjs/common-object';
```

| 函数                        | 说明                                        |
| --------------------------- | ------------------------------------------- |
| `deepClone(obj)`            | 深拷贝                                      |
| `shallowClone(obj)`         | 浅拷贝                                      |
| `merge(target, ...sources)` | 深合并对象                                  |
| `pick(obj, keys)`           | 选取指定键（`pick(user, ['name', 'age'])`） |
| `omit(obj, keys)`           | 排除指定键                                  |
| `get(obj, path)`            | 安全获取嵌套属性（`'a.b.c'`）               |
| `set(obj, path, value)`     | 安全设置嵌套属性                            |
| `del(obj, path)`            | 安全删除嵌套属性                            |
| `has(obj, path)`            | 检查嵌套属性是否存在                        |
| `keys(obj)`                 | 获取对象键（包含 Symbol）                   |
| `values(obj)`               | 获取对象值                                  |
| `entries(obj)`              | 获取键值对                                  |
| `freeze(obj)`               | 冻结对象                                    |
| `seal(obj)`                 | 密封对象                                    |
| `isFrozen(obj)`             | 判断是否已冻结                              |
| `isSealed(obj)`             | 判断是否已密封                              |
| `deepFreeze(obj)`           | 深度冻结（递归）                            |
| `isEqual(a, b)`             | 严格相等比较                                |
| `isDeepEqual(a, b)`         | 深度相等比较                                |

---

## @lytjs/common-array

数组操作工具集。

```ts
import {
  unique,
  uniqueBy,
  flatten,
  flattenDeep,
  groupBy,
  chunk,
  difference,
  intersection,
  union,
  sortBy,
  sum,
  mean,
  min,
  max,
  partition,
  zip,
  unzip,
} from '@lytjs/common-array';
```

| 函数                           | 说明           |
| ------------------------------ | -------------- |
| `unique(arr)`                  | 去重           |
| `uniqueBy(arr, key)`           | 按键去重       |
| `flatten(arr)`                 | 展平一层       |
| `flattenDeep(arr)`             | 深度展平       |
| `groupBy(arr, key)`            | 分组           |
| `chunk(arr, size)`             | 分块           |
| `difference(arr, ...others)`   | 差集           |
| `intersection(arr, ...others)` | 交集           |
| `union(arr, ...others)`        | 并集           |
| `sortBy(arr, key)`             | 按键排序       |
| `sum(arr)`                     | 求和           |
| `mean(arr)`                    | 平均值         |
| `min(arr)`                     | 最小值         |
| `max(arr)`                     | 最大值         |
| `partition(arr, predicate)`    | 分区           |
| `zip(...arrays)`               | 合并为元组数组 |
| `unzip(arr)`                   | 解压元组数组   |

---

## @lytjs/common-function

函数工具集。

```ts
import {
  debounce,
  throttle,
  memoize,
  curry,
  compose,
  pipe,
  once,
  before,
  after,
  wrap,
} from '@lytjs/common-function';
```

| 函数                     | 说明             |
| ------------------------ | ---------------- |
| `debounce(fn, ms)`       | 防抖             |
| `throttle(fn, ms)`       | 节流             |
| `memoize(fn, resolver?)` | 记忆化           |
| `curry(fn)`              | 柯里化           |
| `compose(...fns)`        | 组合（从右到左） |
| `pipe(...fns)`           | 管道（从左到右） |
| `once(fn)`               | 只执行一次       |
| `before(n, fn)`          | 执行前 n 次      |
| `after(n, fn)`           | 第 n 次后执行    |
| `wrap(fn, wrapper)`      | 包装函数         |

---

## @lytjs/common-error

错误处理工具集。

```ts
import {
  warn,
  error,
  assert,
  assertCondition,
  createError,
  formatComponentTrace,
  formatTrace,
} from '@lytjs/common-error';
```

| 函数                              | 说明            |
| --------------------------------- | --------------- |
| `warn(msg, ...args)`              | 输出警告        |
| `error(msg, ...args)`             | 输出错误        |
| `assert(condition, msg)`          | 断言            |
| `assertCondition(condition, msg)` | 条件断言        |
| `createError(msg, opts)`          | 创建 Error 对象 |
| `formatComponentTrace(instance)`  | 格式化组件堆栈  |
| `formatTrace(trace)`              | 格式化堆栈      |

---

## @lytjs/common-events

事件系统工具集。

```ts
import { EventEmitter, EventBus, createEventBus } from '@lytjs/common-events';
```

**EventEmitter：**

```ts
class EventEmitter {
  on(event: string, handler: Function): this;
  once(event: string, handler: Function): this;
  off(event: string, handler: Function): this;
  emit(event: string, ...args: unknown[]): boolean;
  removeAllListeners(event?: string): this;
}
```

**EventBus：**

```ts
class EventBus {
  $on(event: string, handler: Function): this;
  $once(event: string, handler: Function): this;
  $off(event: string, handler?: Function): this;
  $emit(event: string, ...args: unknown[]): boolean;
}
```

---

## @lytjs/common-scheduler

任务调度器，控制异步任务执行顺序。

```ts
import {
  queueJob,
  queuePostFlushCb,
  queuePreFlushCb,
  queueFlush,
  flushAll,
  nextTick,
  isInsideFlush,
} from '@lytjs/common-scheduler';
```

| 函数                   | 说明                                           |
| ---------------------- | ---------------------------------------------- |
| `queueJob(job)`        | 添加任务到队列（异步执行，去重）               |
| `queuePostFlushCb(cb)` | 添加到微任务队列末尾                           |
| `queuePreFlushCb(cb)`  | 添加到微任务队列开头                           |
| `queueFlush()`         | 触发队列刷新                                   |
| `flushAll()`           | 刷新所有队列                                   |
| `nextTick(fn)`         | 下一微任务执行（`Promise.resolve().then(fn)`） |
| `isInsideFlush()`      | 判断是否在 flush 中                            |

---

## @lytjs/common-raf

requestAnimationFrame 封装。

```ts
import { raf, caf, rafList, rafLoop, nextFrame } from '@lytjs/common-raf';
```

| 函数           | 说明                                  |
| -------------- | ------------------------------------- |
| `raf(fn)`      | 下一帧执行（`requestAnimationFrame`） |
| `caf(id)`      | 取消动画帧                            |
| `rafList(fns)` | 批量 RAF                              |
| `rafLoop(fn)`  | RAF 循环                              |
| `nextFrame()`  | Promise 化的下一帧                    |

---

## @lytjs/common-cache

缓存工具集。

```ts
import { createCache, memoize } from '@lytjs/common-cache';
```

**createCache：**

```ts
function createCache<K, V>(options?: {
  max?: number; // 最大缓存数（默认 100）
  onEvict?: (key, value) => void; // 驱逐回调
}): Map<K, V>;

const cache = createCache<string, object>({ max: 50 });
cache.set('key', value);
cache.get('key');
```

---

## @lytjs/common-storage

存储封装（localStorage / sessionStorage）。

```ts
import {
  getStorage,
  setStorage,
  removeStorage,
  clearStorage,
  createStorage,
  isStorageAvailable,
} from '@lytjs/common-storage';
```

| 函数                           | 说明                 |
| ------------------------------ | -------------------- |
| `getStorage(type)`             | 获取存储实例         |
| `setStorage(type, key, value)` | 设置值               |
| `getStorage(type, key)`        | 获取值               |
| `removeStorage(type, key)`     | 移除值               |
| `clearStorage(type)`           | 清空存储             |
| `createStorage(type, options)` | 创建带过期时间的存储 |
| `isStorageAvailable()`         | 检测存储是否可用     |

---

## @lytjs/common-http

HTTP 客户端封装。

```ts
import {
  createHttpClient,
  createFetchAdapter,
  http,
  get,
  post,
  put,
  patch,
  del,
  getJson,
  postJson,
  putJson,
  patchJson,
  deleteJson,
  requestJson,
} from '@lytjs/common-http';
```

**基础便捷方法：**

```ts
// 直接使用便捷方法
const data = await getJson('/api/users');
const newUser = await postJson('/api/users', { name: 'test' });
```

**createHttpClient：**

```ts
function createHttpClient(options?: {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}): HttpClient;

interface HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  getJson<T>(url: string, config?: RequestConfig): Promise<T>;
  postJson<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  putJson<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  patchJson<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  deleteJson<T>(url: string, config?: RequestConfig): Promise<T>;
  requestJson<T>(method: string, url: string, data?: unknown, config?: RequestConfig): Promise<T>;
}
```

**全局 http 实例：**

```ts
// 使用全局 http 实例
const response = await http.get('/api/users', {
  params: {
    ids: [1, 2, 3],
    tags: ['admin', 'user'],
    active: true,
    page: 1,
  },
});
```

---

## @lytjs/common-validate

数据验证工具集。

```ts
import {
  isEmail,
  isUrl,
  isPhone,
  isIdCard,
  isIP,
  isNumber,
  isInteger,
  isLength,
  isIn,
  isRequired,
  isPattern,
  isRange,
  validate,
} from '@lytjs/common-validate';
```

| 函数                      | 说明             |
| ------------------------- | ---------------- |
| `isEmail(val)`            | 验证邮箱         |
| `isUrl(val)`              | 验证 URL         |
| `isPhone(val)`            | 验证手机号       |
| `isIdCard(val)`           | 验证身份证       |
| `isIP(val)`               | 验证 IP 地址     |
| `isNumber(val, options?)` | 验证数字         |
| `isInteger(val)`          | 验证整数         |
| `isLength(val, min, max)` | 验证长度         |
| `isIn(val, array)`        | 验证是否在数组中 |
| `isRequired(val)`         | 验证非空         |
| `isPattern(val, regex)`   | 验证正则         |
| `isRange(val, min, max)`  | 验证范围         |
| `validate(rules, data)`   | 批量验证         |

---

## @lytjs/common-security

安全工具集。

```ts
import {
  escapeHtml,
  escapeAttribute,
  escapeUrl,
  sanitizeHtml,
  generateNonce,
  hashPassword,
} from '@lytjs/common-security';
```

| 函数                         | 说明                |
| ---------------------------- | ------------------- |
| `escapeHtml(str)`            | HTML 转义           |
| `escapeAttribute(str)`       | 属性值转义          |
| `escapeUrl(str)`             | URL 转义            |
| `sanitizeHtml(html, config)` | HTML 净化（白名单） |
| `generateNonce()`            | 生成 CSP nonce      |
| `hashPassword(password)`     | 密码哈希            |

---

## @lytjs/common-env

环境检测工具集。

```ts
import {
  isBrowser,
  isNode,
  isWeex,
  isWebKit,
  isIOS,
  isAndroid,
  isWindows,
  isMac,
  isLinux,
} from '@lytjs/common-env';
```

| 函数        | 说明              |
| ----------- | ----------------- |
| `isBrowser` | 是否浏览器环境    |
| `isNode`    | 是否 Node.js 环境 |
| `isWeex`    | 是否 Weex 环境    |
| `isWebKit`  | 是否 WebKit 内核  |
| `isIOS`     | 是否 iOS          |
| `isAndroid` | 是否 Android      |
| `isWindows` | 是否 Windows      |
| `isMac`     | 是否 macOS        |
| `isLinux`   | 是否 Linux        |

---

## @lytjs/common-query

URL 查询字符串解析。

```ts
import {
  parseQuery,
  stringifyQuery,
  parseUrl,
  buildUrl,
  parseQueryStringWithArrays,
  stringifyQueryString,
} from '@lytjs/common-query';
```

| 函数                                   | 说明                                             |
| -------------------------------------- | ------------------------------------------------ |
| `parseQuery(query)`                    | 解析查询字符串为对象                             |
| `stringifyQuery(query)`                | 对象序列化为查询字符串                           |
| `parseUrl(url)`                        | 解析 URL                                         |
| `buildUrl(url, params)`                | 构建 URL                                         |
| `parseQueryStringWithArrays(query)`    | 解析查询字符串，支持数组参数                     |
| `stringifyQueryString(query, options)` | 对象序列化为查询字符串，支持数组、布尔值、数字等 |

**数组参数支持：**

```ts
// 解析数组查询参数
const query = parseQueryStringWithArrays('?ids=1&ids=2&ids=3&tags=admin&tags=user');
// { ids: ['1', '2', '3'], tags: ['admin', 'user'] }

// 生成查询字符串
const url = stringifyQueryString({
  page: 1,
  limit: 10,
  filters: ['active', 'verified'],
  ids: [1, 2, 3],
});
```

---

## @lytjs/common-path

路径操作工具。

```ts
import {
  join,
  resolve,
  normalize,
  relative,
  dirname,
  basename,
  extname,
  isAbsolute,
} from '@lytjs/common-path';
```

| 函数                   | 说明           |
| ---------------------- | -------------- |
| `join(...paths)`       | 拼接路径       |
| `resolve(...paths)`    | 解析为绝对路径 |
| `normalize(path)`      | 规范化路径     |
| `relative(from, to)`   | 计算相对路径   |
| `dirname(path)`        | 获取目录名     |
| `basename(path, ext?)` | 获取文件名     |
| `extname(path)`        | 获取扩展名     |
| `isAbsolute(path)`     | 是否绝对路径   |

---

## @lytjs/common-keyboard

键盘事件工具。

```ts
import { isModifierKey, getKeyName, isHotkey, parseHotkey } from '@lytjs/common-keyboard';
```

| 函数                      | 说明                              |
| ------------------------- | --------------------------------- |
| `isModifierKey(event)`    | 是否修饰键（Ctrl/Shift/Alt/Meta） |
| `getKeyName(event)`       | 获取按键名（`Ctrl+A`）            |
| `isHotkey(hotkey, event)` | 判断是否匹配快捷键                |
| `parseHotkey(hotkey)`     | 解析快捷键字符串                  |

---

## @lytjs/common-a11y

无障碍（Accessibility）工具。

```ts
import {
  announce,
  getRole,
  getLabel,
  isFocusable,
  trapFocus,
  restoreFocus,
} from '@lytjs/common-a11y';
```

| 函数                            | 说明           |
| ------------------------------- | -------------- |
| `announce(message, politeness)` | 通知屏幕阅读器 |
| `getRole(element)`              | 获取 ARIA role |
| `getLabel(element)`             | 获取无障碍标签 |
| `isFocusable(element)`          | 是否可聚焦     |
| `trapFocus(container)`          | 焦点陷阱       |
| `restoreFocus()`                | 恢复焦点       |

---

## @lytjs/common-algorithm

常用算法实现。

```ts
import {
  binarySearch,
  bubbleSort,
  quickSort,
  mergeSort,
  deepEqual,
  levenshtein,
  fibonacci,
} from '@lytjs/common-algorithm';
```

---

## @lytjs/common-timing

时间相关工具。

```ts
import {
  now,
  sleep,
  formatDate,
  formatDuration,
  getTimestamp,
  parseDate,
} from '@lytjs/common-timing';
```

| 函数                       | 说明                                |
| -------------------------- | ----------------------------------- |
| `now()`                    | 高精度时间戳（`performance.now()`） |
| `sleep(ms)`                | 延迟 Promise                        |
| `formatDate(date, format)` | 格式化日期                          |
| `formatDuration(ms)`       | 格式化时长                          |
| `getTimestamp()`           | 获取 Unix 时间戳                    |
| `parseDate(str)`           | 解析日期字符串                      |

---

## @lytjs/common-constants

框架内部常量定义。

```ts
import {
  COMPILER_MAX_INPUT_LENGTH,
  VDOM_MAX_LIST_DIFF_SIZE,
  REACTIVITY_MAX_TRIGGER_DEPTH,
  ERROR_MAX_WARNED_MESSAGES,
  SCHEDULER_MAX_ITERATIONS,
  DOM_DEBOUNCE_DELAY_MS,
  PROTO_POLLUTION_KEYS,
} from '@lytjs/common-constants';
```

| 常量                              | 值                                          | 说明                 |
| --------------------------------- | ------------------------------------------- | -------------------- |
| `COMPILER_MAX_INPUT_LENGTH`       | 10000                                       | 编译器最大输入长度   |
| `COMPILER_MAX_REGEX_INPUT_LENGTH` | 5000                                        | 正则输入最大长度     |
| `COMPILER_MAX_ATTRIBUTES`         | 1000                                        | 最大属性数           |
| `VDOM_MAX_LIST_DIFF_SIZE`         | 1000                                        | 列表 diff 最大节点数 |
| `VDOM_MAX_RECURSION_DEPTH`        | 100                                         | 最大递归深度         |
| `REACTIVITY_MAX_TRIGGER_DEPTH`    | 100                                         | 响应式最大触发深度   |
| `REACTIVITY_MAX_TRACK_DEPTH`      | 100                                         | 响应式最大追踪深度   |
| `ERROR_MAX_WARNED_MESSAGES`       | 1000                                        | 最大警告消息数       |
| `SCHEDULER_MAX_ITERATIONS`        | 1000                                        | 调度器最大迭代次数   |
| `DOM_DEBOUNCE_DELAY_MS`           | 16                                          | DOM 防抖延迟         |
| `PROTO_POLLUTION_KEYS`            | `['__proto__', 'constructor', 'prototype']` | 原型污染关键键       |

---

## @lytjs/common-performance

性能监控 API。

```ts
import {
  PerformanceMonitor,
  getPerformanceMonitor,
  initPerformanceMonitor,
  startRenderTiming,
  recordRenderEntry,
  withPerformanceTracking,
  generatePerformanceReport,
} from '@lytjs/common-performance';
```

**PerformanceMonitor：**

```ts
class PerformanceMonitor {
  constructor(options?: { maxHistorySize?: number; enabled?: boolean });
  startTiming(componentName: string, operation: string): () => RenderPerformanceEntry | null;
  recordEntry(entry: RenderPerformanceEntry): void;
  getStats(componentName?: string): ComponentPerformanceStats | undefined;
  getHistory(componentName?: string): RenderPerformanceEntry[];
  getSlowestRenders(n: number): RenderPerformanceEntry[];
  clear(): void;
  generateReport(): PerformanceReport;
}
```

---

## @lytjs/common-dom-helpers

DOM 操作辅助函数。

```ts
import {
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  setStyle,
  getStyle,
  removeStyle,
  getOffset,
  getScrollPosition,
  scrollTo,
} from '@lytjs/common-dom-helpers';
```

---

## @lytjs/common-render-queue

渲染队列管理。

```ts
import { RenderQueue, createRenderQueue } from '@lytjs/common-render-queue';
```

---

## @lytjs/common-transition-engine

过渡动画引擎。

```ts
import {
  TransitionEngine,
  createTransitionEngine,
  FLIPAnimator,
} from '@lytjs/common-transition-engine';
```

---

## @lytjs/common-event-normalizer

事件归一化处理。

```ts
import {
  EventNormalizer,
  normalizeEvent,
  shouldDelegate,
  getEventDelegationHandler,
} from '@lytjs/common-event-normalizer';
```

---

## @lytjs/common-vnode

VNode 基础类型和常量（内部使用）。

```ts
import {
  VNode,
  VNodeData,
  VNodeChildren,
  VNodeTypes,
  PatchFlags,
  ShapeFlags,
} from '@lytjs/common-vnode';
```

---

## 依赖关系图

```
@lytjs/common-*
     │
     ├── @lytjs/common-is (无依赖)
     ├── @lytjs/common-string (依赖 common-is)
     ├── @lytjs/common-object (依赖 common-is)
     ├── @lytjs/common-array (依赖 common-is)
     ├── @lytjs/common-function (依赖 common-is)
     ├── @lytjs/common-error (依赖 common-string)
     ├── @lytjs/common-events (依赖 common-is)
     ├── @lytjs/common-scheduler (依赖 common-is)
     ├── @lytjs/common-raf (依赖 common-is)
     ├── @lytjs/common-cache (依赖 common-is)
     ├── @lytjs/common-storage (依赖 common-is, common-object)
     ├── @lytjs/common-http (依赖 common-is, common-string)
     ├── @lytjs/common-validate (依赖 common-is, common-string)
     ├── @lytjs/common-security (依赖 common-string)
     ├── @lytjs/common-env (无依赖)
     ├── @lytjs/common-query (依赖 common-string, common-object)
     ├── @lytjs/common-path (无依赖)
     ├── @lytjs/common-keyboard (依赖 common-is)
     ├── @lytjs/common-a11y (依赖 common-is, common-dom)
     ├── @lytjs/common-algorithm (依赖 common-is)
     ├── @lytjs/common-timing (无依赖)
     ├── @lytjs/common-constants (无依赖)
     ├── @lytjs/common-performance (依赖 common-is, common-timing)
     ├── @lytjs/common-dom-helpers (依赖 common-is, common-object)
     ├── @lytjs/common-render-queue (依赖 common-is, common-scheduler)
     ├── @lytjs/common-transition-engine (依赖 common-is, common-raf)
     ├── @lytjs/common-event-normalizer (依赖 common-is, common-string)
     ├── @lytjs/common-vnode (依赖 common-is)
     ├── @lytjs/common-dom (无依赖)
     ├── @lytjs/common-node-cache (无依赖)
     ├── @lytjs/common-async-scheduler (依赖 common-is)
     └── @lytjs/common (聚合包，导出全部)
```

---

## 包体积参考

| 包名                      | gzip 预估  | 说明       |
| ------------------------- | ---------- | ---------- |
| `@lytjs/common-is`        | ~1 KB      | 类型判断   |
| `@lytjs/common-string`    | ~2 KB      | 字符串处理 |
| `@lytjs/common-object`    | ~3 KB      | 对象操作   |
| `@lytjs/common-array`     | ~2 KB      | 数组操作   |
| `@lytjs/common-function`  | ~2 KB      | 函数工具   |
| `@lytjs/common-error`     | ~1 KB      | 错误处理   |
| `@lytjs/common-scheduler` | ~2 KB      | 调度器     |
| `@lytjs/common-validate`  | ~3 KB      | 数据验证   |
| `@lytjs/common-security`  | ~2 KB      | 安全工具   |
| 其他子包                  | 各 ~1-3 KB | 各司其职   |
