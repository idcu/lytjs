# @lytjs/common-render-queue

渲染队列，收集同一 tick 内的渲染操作、合并重复操作，并支持同步插队刷新。

## 安装

```bash
pnpm add @lytjs/common-render-queue
```

## 使用示例

```typescript
import { RenderQueue, RENDER_PRIORITY_WEIGHT } from '@lytjs/common-render-queue';

const queue = new RenderQueue(host);

// 入队一个自定义渲染操作（实际 DOM 操作由 custom 包装）
queue.enqueue({
  type: 'custom',
  fn: () => renderToDOM(),
  priority: 'high',
});

// 关键场景：需要立即更新 DOM 时同步插队刷新
queue.flushSync();

console.log(queue.size); // 当前待处理操作数

// 清空 / 销毁
queue.clear();
queue.dispose();
```

## API 说明

### `RenderQueue<HN, HE>`

渲染队列，内部通过 `host.setTimeout(fn, 0)` 调度异步批量执行，并支持优先级排序（`sync > high > normal > low`）。

实例成员：

| 成员           | 说明                                       |
| -------------- | ------------------------------------------ |
| `enqueue(op)`  | 将渲染操作加入队列，自动调度刷新           |
| `flushSync()`  | 同步插队刷新，立即执行队列中所有待处理操作 |
| `clear()`      | 清空队列（不执行操作）                     |
| `size`（属性） | 当前队列中的操作数量                       |
| `dispose()`    | 销毁队列，清理所有状态                     |

### 类型定义

`RenderOperation` 为联合类型，支持的取值为：

| 类型     | 说明                                                                      |
| -------- | ------------------------------------------------------------------------- |
| `insert` | 插入操作（`{ type, vnode, container, anchor?, priority? }`）              |
| `remove` | 移除操作（`{ type, vnode, priority? }`）                                  |
| `move`   | 移动操作（`{ type, vnode, container, anchor?, priority? }`）              |
| `patch`  | 更新操作（`{ type, oldVNode, newVNode, container, anchor?, priority? }`） |
| `custom` | 自定义操作（`{ type, fn, priority? }`），实际执行通过回调 `fn` 完成       |

> 注意：`insert` / `remove` / `move` / `patch` 在 `RenderQueue` 中仅用于合并与排序调度，**不会**直接执行 DOM 操作，需由上层 renderer 通过 `custom` 类型包装后传入实际执行逻辑。

`RenderQueueOptions` 配置：

| 配置项            | 默认值     | 说明             |
| ----------------- | ---------- | ---------------- |
| `enableMerge`     | `true`     | 是否启用操作合并 |
| `defaultPriority` | `'normal'` | 默认优先级       |

`RenderPriority` 为 `'sync' | 'high' | 'normal' | 'low'`，对应的权重常量 `RENDER_PRIORITY_WEIGHT`（数值越小优先级越高）：`sync: 0`、`high: 1`、`normal: 2`、`low: 3`。

### 操作合并规则

启用 `enableMerge` 时，`enqueue` 会尝试合并同一元素的重复操作：

- 同一元素的 `remove` 操作只保留最后一个
- 同一元素的 `patch` 操作只保留最新的 patch
- `custom` 操作不做去重合并

## 相关包

本包为 [`@lytjs/common`](../common/) 聚合包的成员，依赖 `@lytjs/host-contract`。

## 许可证

[MIT](../../../../LICENSE)
