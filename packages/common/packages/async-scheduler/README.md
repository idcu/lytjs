# @lytjs/common-async-scheduler

异步调度器，统一异步时序操作，通过 host 注入的定时器执行，支持优先级排序、任务合并与同步插队刷新。

## 安装

```bash
pnpm add @lytjs/common-async-scheduler
```

## 使用示例

```typescript
import { AsyncScheduler } from '@lytjs/common-async-scheduler';

const scheduler = new AsyncScheduler(rendererHost, {
  defaultPriority: 'normal',
  enableFlushSync: true,
});

// 调度一个异步任务，返回任务 ID
const jobId = scheduler.schedule(() => updateDOM());

// 调度高优先级任务
scheduler.schedule(flushLayout, 'high');

// 同步插队执行队列中的全部任务
scheduler.flushSync();

// 在下一次动画帧执行回调
scheduler.nextFrame(() => draw());

// 延迟/取消
const timerId = scheduler.setTimeout(doLater, 1000);
scheduler.clearTimeout(timerId);

// 队列状态与清理
scheduler.size; // 当前队列任务数量
scheduler.clear(); // 清空队列（不执行）
scheduler.dispose(); // 销毁调度器
```

## API 说明

### `AsyncScheduler<HN, HE>` 类

需传入一个 [`RendererHost`](../../../host-contract/README.md) 实例，由它提供 `setTimeout` / `clearTimeout` / `nextFrame` 等平台无关的时序能力。

构造选项（`AsyncSchedulerOptions`）：

| 选项              | 类型                | 默认值     | 说明                 |
| ----------------- | ------------------- | ---------- | -------------------- |
| `defaultPriority` | `SchedulerPriority` | `'normal'` | 默认任务优先级       |
| `enableFlushSync` | `boolean`           | `true`     | 是否启用同步插队刷新 |

### 方法

| 方法                                      | 作用                                    |
| ----------------------------------------- | --------------------------------------- |
| `schedule(fn, priority?, allowMerge?)`    | 调度一个任务，支持优先级，返回任务 ID   |
| `scheduleSync(fn)`                        | 调度同步任务（立即在当前 tick 执行）    |
| `flushSync()`                             | 同步插队刷新，立即执行队列中所有任务    |
| `nextFrame(fn)`                           | 在下一帧执行回调（经由 host.nextFrame） |
| `setTimeout(fn, ms)` / `clearTimeout(id)` | 延迟执行 / 取消延迟执行（经由 host）    |
| `size`                                    | 获取当前队列中的任务数量                |
| `clear()`                                 | 清空队列（不执行任务）                  |
| `dispose()`                               | 销毁调度器，清理所有状态                |

### 类型与常量

- `SchedulerPriority`：`'sync' | 'high' | 'normal' | 'low'`，数值越小优先级越高
- `SchedulerJob`：调度任务接口（`id` / `fn` / `priority` / `allowMerge`）
- `AsyncSchedulerOptions`：构造配置项

### 说明

- 任务按优先级排序，同优先级保持插入顺序（稳定排序）。
- `allowMerge` 为 `true` 时，同一 tick 内同 ID 的任务仅执行一次。
- 单个任务执行报错不会影响后续任务（开发模式会在控制台输出警告）。
- 关闭 `enableFlushSync` 时，`scheduleSync` 会回退为异步调度。

## 相关包

- 依赖 `@lytjs/host-contract` 提供 RendererHost 接口
- [`@lytjs/common`](https://www.npmjs.com/package/@lytjs/common) 聚合包，统一导出各模块 API

## License

[MIT](../../../../LICENSE)
