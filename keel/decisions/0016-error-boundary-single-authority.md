---
scope: component
status: active
last-verified: 2026-11-07
keywords: [ErrorBoundary, 单一权威, 破坏性变更, 错误边界, ADR 0011]
type: decision
created: 2026-11-07
superseded-by:
---

# 0016 ErrorBoundary 单一权威：富实现下沉 component，契约以 core 为准

## 背景：两份公开实现、两套契约

ADR 0011 要求同名 API 只许一份权威实现。`ErrorBoundary` 当时仍是两份：

| 入口 | `onError` 第二参数 | `fallback` 语义 | 独有能力 |
|---|---|---|---|
| `@lytjs/component` | `string`（组件栈信息） | 组件 / 插槽，收到 `{ error }` | `capturePromiseRejections` |
| `@lytjs/core` | `ErrorInfo`（`{ componentStack?, timestamp }`） | 完整 `FallbackProps` | `fallbackRender / maxRetries / retryDelay / onRetry / onMaxRetriesReached`、reporter、日志 |

两份都有文档背书（`component/README.md`、`docs/guide/error-boundary.md`），
`@lytjs/core-vnode` 转发 component 版。函数身份在两条入口间为假。

`ErrorBoundary ===` 同一性要求只保留一个运行时实现，因此 `onError` 第二参数
只能有一种类型；两份契约不可能同时原样保留。这是本 ADR 需要裁决的冲突。

## 决定

1. **权威位置**：唯一实现在 `@lytjs/component`（`src/error-boundary.ts`）。
   `@lytjs/core` 与 `@lytjs/core-vnode` 只转发，不得保留副本。
2. **契约以原 core 版为准**：`onError(error, errorInfo: ErrorInfo)`，
   `fallbackRender / maxRetries / retryDelay / onRetry / onMaxRetriesReached`、
   `FallbackProps`、`setGlobalErrorReporter / getGlobalErrorReporter / errorLogManager`
   全部保留。
3. **合并保留** component 版独有能力 `capturePromiseRejections`。
4. **守卫**：`packages/core/tests/error-boundary-identity.test.ts` 断言
   `core.ErrorBoundary === component.ErrorBoundary`（模块入口与 runtime 入口）。
5. **删除条件**：core 侧文件只允许保留转发语句；出现实现逻辑或第二份导出即红。

## 为什么选 core 契约（而不用 component 契约）

- core 契约能力更全（重试、上报、错误日志），文档也更完整；
- 权威必须放在 component（L2）：component 不能依赖 core（L3），
  因此只能「富实现下沉 + core 转发」，不能反向搬移；
- 若选 component 的 `string` 契约，会删除 core 已公开的重试/上报 API。

## 破坏点与受影响入口

- 破坏点：`@lytjs/component` 与 `@lytjs/core-vnode` 的
  `onError(error, info: string)` 改为 `onError(error, errorInfo: ErrorInfo)`；
  `fallback` prop 由 `{ error }` 扩展为完整 `FallbackProps`。
- 受影响：直接使用这两个入口且把 `onError` 第二参数当字符串读取的代码。
- 不受影响：`@lytjs/core` 用户（契约未变）；`capturePromiseRejections`、
  `#fallback` 插槽、`useErrorHandler / useErrorBoundaryReset` 等公开名字全部保留。

## 迁移

```ts
// 迁移前（@lytjs/component / @lytjs/core-vnode）
onError(err, info: string) { console.error(info) }

// 迁移后（全入口统一）
onError(err, errorInfo: ErrorInfo) { console.error(errorInfo.componentStack) }
```

需要重试/上报时使用 `fallbackRender(error, errorInfo, reset)` 或
`fallbackRender / maxRetries / onRetry / onMaxRetriesReached`；`fallback` 组件可读取
`errorInfo / reset / retry / retryCount / maxRetries / hasRetries`。

## 验证

- `packages/component/tests/error-boundary-battery.test.ts`：24 例行为测试；
- `packages/core/tests/error-boundary-identity.test.ts`：3 例身份/契约测试；
- `gate --tier fast` 50/50 通过。
