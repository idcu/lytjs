# @lytjs/common-scheduler

任务调度器，管理异步任务队列，支持 pre-flush 与 post-flush 两种队列。

## 安装

```bash
pnpm add @lytjs/common-scheduler
```

## 使用示例

```typescript
import {
  queueJob,
  queueJobWithPriority,
  queuePreFlushCb,
  queuePostFlushCb,
  nextTick,
  Priority,
  flushJobs,
} from '@lytjs/common-scheduler';

// 加入普通任务
queueJob(() => console.log('job'));

// 加入带优先级的任务
queueJobWithPriority(() => console.log('critical'), { priority: Priority.CRITICAL });

// 在所有 job 之前执行
queuePreFlushCb(() => console.log('pre'));

// 在所有 job 之后执行
queuePostFlushCb(() => console.log('post'));

// 在下一个 tick 执行
await nextTick();

// 手动刷新所有待执行任务
flushJobs();
```

## API

### 类型

| 类型                       | 说明                                                       |
| -------------------------- | ---------------------------------------------------------- |
| `SchedulerJob`             | 调度器任务类型，即 `() => void`                            |
| `SchedulerJobWithPriority` | 带优先级的任务，可含 `priority` 字段（数值越小优先级越高） |

### 优先级常量 `Priority`

| 常量                | 值      | 说明               |
| ------------------- | ------- | ------------------ |
| `Priority.IDLE`     | `1000`  | 空闲任务           |
| `Priority.LOW`      | `500`   | 低优先级           |
| `Priority.NORMAL`   | `0`     | 普通优先级（默认） |
| `Priority.HIGH`     | `-500`  | 高优先级           |
| `Priority.CRITICAL` | `-1000` | 关键任务           |

### 队列 API

| 函数                        | 说明                                                     |
| --------------------------- | -------------------------------------------------------- |
| `queueJob(job)`             | 将任务加入队列，同一引用只会加入一次                     |
| `queueJobWithPriority(job)` | 按优先级插入队列（高优先级在前，相同优先级保持插入顺序） |
| `queuePreFlushCb(cb)`       | 将回调加入 pre-flush 队列，在主 job 队列之前执行         |
| `queuePostFlushCb(cb)`      | 将回调加入 post-flush 队列，在所有 job 执行完毕后执行    |

### 刷新 API

| 函数                   | 说明                                             |
| ---------------------- | ------------------------------------------------ |
| `nextTick(cb?)`        | 在下一个 tick 执行回调，返回 `Promise<void>`     |
| `flushJobs()`          | 刷新所有待执行任务，支持循环处理与优先级分组执行 |
| `flushSync()`          | 同步刷新所有任务（若正在刷新则跳过）             |
| `hasPendingJobs()`     | 检查是否有待执行任务                             |
| `getPendingJobCount()` | 获取待执行的 job 数量                            |

### 配置与错误处理

| 函数                       | 说明                                                    |
| -------------------------- | ------------------------------------------------------- |
| `setErrorHandler(handler)` | 设置全局错误处理函数（接收 `error` 与 `info` 两个参数） |
| `setMaxIterations(n)`      | 设置 `flushJobs` 的最大迭代次数，用于防止无限更新循环   |
| `resetSchedulerState()`    | 重置调度器状态（主要用于测试）                          |

### 执行顺序

`flushJobs()` 的执行顺序为：**pre-flush 回调 → 主 job 队列（按优先级） → post-flush 回调**。主队列中每轮先执行 `CRITICAL/HIGH`，再 `NORMAL`，最后 `LOW/IDLE`。

## 相关包

- [@lytjs/common](../../README.md) - LytJS 通用工具聚合包

## 许可证

[MIT](../../../../LICENSE)
