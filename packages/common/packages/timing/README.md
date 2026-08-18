# @lytjs/common-timing

定时与调度工具函数。

## 安装

```bash
pnpm add @lytjs/common-timing
```

## 使用示例

```typescript
import {
  debounce,
  throttle,
  delay,
  retry,
  timeout,
  poll,
  TaskQueue,
  once,
} from '@lytjs/common-timing';

// 防抖
const log = debounce(() => console.log('hi'), 100);

// 节流
const throttled = throttle(() => console.log('hit'), 200);

// 延迟
await delay(1000);

// 重试
const data = await retry(() => fetchJSON(url), 3, 500);

// 超时包装
const result = await timeout(fetchData(), 5000);

// 轮询直到条件满足
const status = await poll(
  () => getStatus(),
  (s) => s === 'done',
  1000,
  30000,
);

// 只执行一次
const init = once(() => console.log('initialized'));
init(); // 'initialized'
init(); // 无输出
```

## API

### 防抖与节流

| 函数                               | 说明                                              |
| ---------------------------------- | ------------------------------------------------- |
| `debounce(fn, waitMs)`             | 防抖，在最后一次调用后等待指定时间执行            |
| `debounceImmediate(fn, waitMs)`    | 立即防抖，先立即执行一次，等待期间不再执行        |
| `throttle(fn, waitMs)`             | 节流，在指定时间内最多执行一次                    |
| `throttleWithTrailing(fn, waitMs)` | 带尾调的节流，立即执行 + 等待结束后再执行最后一次 |

`DebouncedFn` 与 `ThrottledFn` 均附带 `cancel()` 方法用于取消。浏览器 `setTimeout` 存在最小延迟，节流实际间隔可能略大于 `waitMs`，高精度定时建议使用 `requestAnimationFrame` 或 Web Worker。

### 异步时序

| 函数                                                   | 说明                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `delay<T>(ms, value?)`                                 | 延迟指定时间，可携带返回值                                        |
| `retry(fn, maxRetries?, retryDelay?, retryCondition?)` | 重试函数，默认重试 3 次、间隔 1000ms                              |
| `timeout(promise, ms, message?)`                       | 为 Promise 增加超时包装                                           |
| `poll(fn, condition, interval?, timeoutMs?)`           | 轮询直到条件满足，默认间隔 1000ms、超时 30s，连续错误 10 次会中止 |

### 任务队列

#### `TaskQueue`

控制并发执行的任务队列。

```typescript
const queue = new TaskQueue(2); // 并发数 2
queue.add(() => doWork());
await queue.wait(); // 等待所有任务完成
queue.clear(); // 清空待执行队列
```

| 成员                           | 说明                                 |
| ------------------------------ | ------------------------------------ |
| `constructor(concurrency = 1)` | 创建队列，concurrency 必须大于等于 1 |
| `size`                         | 获取待执行任务数量                   |
| `add(task)`                    | 加入任务并触发执行                   |
| `wait()`                       | 等待所有任务完成                     |
| `clear()`                      | 清空待执行的任务队列                 |

### 函数工具

| 函数                 | 说明                                                   |
| -------------------- | ------------------------------------------------------ |
| `identity<T>(value)` | 返回自身的恒等函数                                     |
| `constant<T>(value)` | 创建始终返回指定值的函数                               |
| `once<T>(fn)`        | 只执行一次的函数，支持异步场景（执行期间阻止重复调用） |

## 相关包

- [@lytjs/common](../../README.md) - LytJS 通用工具聚合包

## 许可证

[MIT](../../../../LICENSE)
