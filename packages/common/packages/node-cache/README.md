# @lytjs/common-node-cache

节点缓存，管理 container → VNode 映射、组件实例 → 资源注册表映射，并提供统一的资源清理能力。

## 安装

```bash
pnpm add @lytjs/common-node-cache
```

## 使用示例

创建一个节点缓存实例，需要传入一个 `RendererHost`：

```typescript
import { NodeCache } from '@lytjs/common-node-cache';

const cache = new NodeCache(host);

// 记录 container → VNode 映射
cache.setVNode(container, vnode);
const current = cache.getVNode(container); // VNode | null

// 注册组件资源
cache.registerEventListener(instance, el, 'click', handler);
cache.registerEffectSubscription(instance, disposer);
cache.registerCleanup(instance, () => cleanup());
```

## API 说明

主类为 `NodeCache<HN, HE>`，内部维护两个 `WeakMap`：

- **VNode 映射**：`container → VNode`，记录宿主容器关联的虚拟节点。
- **资源注册表**：`ComponentInstance → ResourceEntry`，按组件实例汇总其事件监听器、effect 订阅与清理钩子。

实例方法：

| 方法                                                            | 说明                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `getVNode(container)`                                           | 获取 container 对应的 VNode（未开启或不存在时返回 `null`） |
| `setVNode(container, vnode)`                                    | 设置 container → VNode 映射                                |
| `deleteVNode(container)`                                        | 删除 container 的 VNode 映射                               |
| `registerEventListener(instance, el, event, handler, options?)` | 注册事件监听器到组件资源注册表                             |
| `registerEffectSubscription(instance, disposer)`                | 注册 effect 订阅的 dispose 回调                            |
| `registerCleanup(instance, cleanup)`                            | 注册通用清理钩子                                           |
| `cleanupComponentResources(instance)`                           | 统一清理组件实例的所有已注册资源                           |
| `cleanupContainer(container)`                                   | 清理指定 container 的 VNode 映射                           |
| `dispose()`                                                     | 销毁缓存，重置所有内部状态                                 |

### `cleanupComponentResources` 清理顺序

`cleanupComponentResources` 按以下顺序统一清理注册资源：

1. **cleanup 钩子**（可能依赖 effect 仍活跃）
2. **effect 订阅**（停止响应式追踪）
3. **事件监听器**（DOM 操作，最后执行）

每个清理操作均通过 `try/catch` 保护，单个失败不影响其余流程。注意 `dispose()` 不会自动清理组件资源，需提前手动调用 `cleanupComponentResources`。

### 配置

通过 `NodeCacheOptions` 可控制功能开关：

| 配置项                   | 默认值 | 说明                |
| ------------------------ | ------ | ------------------- |
| `enableVNodeMap`         | `true` | 是否启用 VNode 映射 |
| `enableResourceRegistry` | `true` | 是否启用资源注册表  |

## 相关包

本包为 [`@lytjs/common`](../common/) 聚合包的成员。

## 许可证

[MIT](../../../../LICENSE)
