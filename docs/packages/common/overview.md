# @lytjs/common

> LytJS 框架的公共工具库 monorepo，包含 30 个子包 + 1 个聚合包
>
> ⚠️ **其中 16 个已弃用**（仓内零生产引用，保留已发布 API，**目标 8.0.0 删除**）：
> 见下方「已弃用」表与 [ADR 0023](../../../keel/decisions/pending/0023-common-dead-packages-deprecation.md)。新代码请勿使用。

## 子包列表

### 核心工具

| 包名                      | 说明                                   |
| ------------------------- | -------------------------------------- |
| `@lytjs/common-env`       | 环境检测（浏览器/Node/SSR）            |
| `@lytjs/common-is`        | 类型检查工具函数                       |
| `@lytjs/common-string`    | 字符串处理工具                         |
| `@lytjs/common-path`      | 路径处理工具                           |
| `@lytjs/common-object`    | 对象操作工具                           |
| `@lytjs/common-events`    | 事件发射器与订阅管理                   |
| `@lytjs/common-cache`     | 缓存策略（LRU/Memoize/Expiring）       |
| `@lytjs/common-timing`    | 定时工具（debounce/throttle/delay 等） |
| `@lytjs/common-algorithm` | 算法（最长递增子序列等）               |
| `@lytjs/common-error`     | 错误处理与错误码                       |

### VNode 与渲染

| 包名                            | 说明                 |
| ------------------------------- | -------------------- |
| `@lytjs/common-vnode`           | VNode 类型定义与常量 |
| `@lytjs/common-scheduler`       | 任务调度器           |
| `@lytjs/common-async-scheduler` | 异步任务调度器       |
| `@lytjs/common-render-queue`    | 渲染队列管理         |

### DOM 与事件

| 包名                             | 说明                       |
| -------------------------------- | -------------------------- |
| `@lytjs/common-dom`              | DOM 工具函数               |
| `@lytjs/common-dom-helpers`      | DOM 辅助函数               |
| `@lytjs/common-event-normalizer` | 事件规范化                 |
| `@lytjs/common-raf`              | requestAnimationFrame 封装 |
| `@lytjs/common-keyboard`         | 键盘事件处理               |
| `@lytjs/common-query`            | 查询选择器工具             |

### 性能与存储

| 包名                        | 说明                                    |
| --------------------------- | --------------------------------------- |
| `@lytjs/common-performance` | 性能监控工具                            |
| `@lytjs/common-node-cache`  | 节点缓存                                |
| `@lytjs/common-storage`     | 存储工具（localStorage/sessionStorage） |

### 安全与验证

| 包名                     | 说明     |
| ------------------------ | -------- |
| `@lytjs/common-security` | 安全工具 |
| `@lytjs/common-validate` | 数据验证 |

### 常量与过渡

| 包名                              | 说明         |
| --------------------------------- | ------------ |
| `@lytjs/common-constants`         | 框架常量定义 |
| `@lytjs/common-transition-engine` | 过渡动画引擎 |

### 网络与无障碍

| 包名                 | 说明           |
| -------------------- | -------------- |
| `@lytjs/common-http` | HTTP 工具      |
| `@lytjs/common-a11y` | 无障碍访问工具 |

### 聚合包

| 包名            | 说明                                  |
| --------------- | ------------------------------------- |
| `@lytjs/common` | 聚合包（re-export 所有子包）⚠️ 已弃用 |

### 已弃用（deprecated）

以下 16 个包在仓内零生产引用，仅为已发布 API 保留，**目标 8.0.0 删除**。新代码请勿使用；
替代与删除条件见 [ADR 0023](../../../keel/decisions/pending/0023-common-dead-packages-deprecation.md)。

| 包名                             | 替代 / 说明                                |
| -------------------------------- | ------------------------------------------ |
| `@lytjs/common`                  | 按需安装子包（如 `@lytjs/common-is`）      |
| `@lytjs/common-async-scheduler`  | `@lytjs/common-scheduler`                  |
| `@lytjs/common-dom-helpers`      | adapter-web 自带的 DOM 操作                |
| `@lytjs/common-event-normalizer` | adapter-web 的 `web-patch-events`          |
| `@lytjs/common-keyboard`         | 无内置替代                                 |
| `@lytjs/common-memory`           | 无内置替代                                 |
| `@lytjs/common-node-cache`       | 无内置替代                                 |
| `@lytjs/common-performance`      | 无内置替代                                 |
| `@lytjs/common-raf`              | `@lytjs/common-timing` 或原生 RAF          |
| `@lytjs/common-render-queue`     | `@lytjs/common-scheduler`                  |
| `@lytjs/common-storage`          | 无内置替代                                 |
| `@lytjs/common-validate`         | 无内置替代                                 |
| `@lytjs/common-warn`             | `@lytjs/common-error`（`warn`/`warnOnce`） |
| `@lytjs/common-env`              | 无内置替代（直接判断 `typeof window`）     |
| `@lytjs/common-path`             | 无内置替代                                 |
| `@lytjs/common-timing`           | 无内置替代（防抖/节流可在应用内实现）      |

## 安装

```bash
# ⚠️ 聚合包 @lytjs/common 已弃用（目标 8.0.0 删除），请改为按需安装单个子包
pnpm add @lytjs/common-is
pnpm add @lytjs/common-string
pnpm add @lytjs/common-vnode
```

## 开发

```bash
# 安装依赖
pnpm install

# 运行所有测试
pnpm test

# 运行所有 lint
pnpm lint

# 构建所有包
pnpm build

# 类型检查
pnpm type-check
```

## API 概览

### 环境检测

```typescript
import { isBrowser, isNode, isSSR, getEnvInfo } from '@lytjs/common-env';

if (isBrowser()) {
  // 浏览器环境
}

if (isSSR()) {
  // 服务端渲染环境
}
```

### 类型检查

```typescript
import {
  isString,
  isNumber,
  isObject,
  isArray,
  isFunction,
  isNullish,
  isPlainObject,
  isPromise,
  hasChanged,
} from '@lytjs/common-is';

if (isObject(value)) {
  // 处理对象
}

if (hasChanged(newValue, oldValue)) {
  // 值已改变
}
```

### 字符串处理

```typescript
import {
  capitalize,
  kebabCase,
  camelCase,
  escapeHTML,
  normalizeClass,
  normalizeStyleObject,
} from '@lytjs/common-string';

capitalize('hello'); // 'Hello'
kebabCase('helloWorld'); // 'hello-world'
camelCase('hello-world'); // 'helloWorld'
escapeHTML('<script>'); // '&lt;script&gt;'
```

### 路径处理

```typescript
import { normalizePath, joinPath, resolvePath } from '@lytjs/common-path';
// ⚠️ 下列 API 在 @lytjs/common-path 尚未实现（文档曾承诺）：isAbsolutePath
```

### 对象操作

```typescript
// ⚠️ 下列 API 在 @lytjs/common-object 尚未实现（文档曾承诺）：extend, hasOwn, def, toRawType, makeMap
```

### 事件发射器

```typescript
import { EventEmitter } from '@lytjs/common-events';

const emitter = new EventEmitter();
emitter.on('event', (data) => console.log(data));
emitter.emit('event', { message: 'Hello' });
```

### 缓存策略

```typescript
import { LRUCache, ExpiringCache } from '@lytjs/common-cache';
// ⚠️ 下列 API 在 @lytjs/common-cache 尚未实现（文档曾承诺）：MemoizeCache

// LRU 缓存
const lru = new LRUCache<string, any>({ max: 100 });
lru.set('key', value);
const cached = lru.get('key');

// 带过期时间的缓存
const expiring = new ExpiringCache({ ttl: 60000 });
```

### 定时工具

```typescript
import { debounce, throttle, delay, timeout } from '@lytjs/common-timing';
// ⚠️ 下列 API 在 @lytjs/common-timing 尚未实现（文档曾承诺）：sleep

// 防抖
const debounced = debounce(fn, 300);

// 节流
const throttled = throttle(fn, 100);

// 延迟
await sleep(1000);
```

### 算法

```typescript
import { getSequence } from '@lytjs/common-algorithm';
// ⚠️ 下列 API 在 @lytjs/common-algorithm 尚未实现（文档曾承诺）：longestIncreasingSubsequence

// 最长递增子序列（用于 diff 算法）
const indices = getSequence([2, 3, 1, 5, 6, 4]);
```

### VNode 类型

```typescript
import {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
  isVNode,
  isSameVNodeType,
  hasPatchFlag,
} from '@lytjs/common-vnode';
```

### 错误处理

```typescript
import { warn, error } from '@lytjs/common-error';
// ⚠️ 下列 API 在 @lytjs/common-error 尚未实现（文档曾承诺）：handleError, ErrorCode, errorMessages

if (__DEV__) {
  warn('This is a warning');
}
```

### 任务调度

```typescript
import { queueJob, queuePostFlushCb, nextTick, flushJobs } from '@lytjs/common-scheduler';

queueJob(() => {
  // 执行任务
});
```

### 常量包

```typescript
import {} from // ...更多常量,
'@lytjs/common-constants';
// ⚠️ 下列 API 在 @lytjs/common-constants 尚未实现（文档曾承诺）：SLOT_DEFAULT_NAME, ON_SHOW, ON_HIDE;
```

### 性能监控

```typescript
// ⚠️ 下列 API 在 @lytjs/common-performance 尚未实现（文档曾承诺）：measureStart, measureEnd, getPerformanceMetrics

measureStart('render');
// ...渲染操作
const duration = measureEnd('render');
```

### 安全工具

```typescript
import { sanitizeHTML } from '@lytjs/common-security';
// ⚠️ 下列 API 在 @lytjs/common-security 尚未实现（文档曾承诺）：escapeRegExp, isValidURL
```

### 数据验证

```typescript
import { createValidator, required, minLength, maxLength } from '@lytjs/common-validate';
// ⚠️ 下列 API 在 @lytjs/common-validate 尚未实现（文档曾承诺）：validateProps;
```

## 相关包

- [@lytjs/core](../core/) - 框架核心入口
- [@lytjs/reactivity](../reactivity/) - 响应式系统
- [@lytjs/vdom](../vdom/) - 虚拟 DOM 实现
- [@lytjs/compiler](../vdom/compiler.md) - 模板编译器
- [@lytjs/renderer](../vdom/renderer.md) - 渲染后端
- [@lytjs/component](../component/) - 组件系统
