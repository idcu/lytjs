/**
 * @lytjs/core - 错误边界入口（转发）
 *
 * 2026-11-07（S06 / ADR 0016）：权威实现已下沉到 `@lytjs/component`
 * （`component/src/error-boundary.ts`），本文件**只转发**，不得保留副本。
 * 契约以原 core 版为准：`onError(error, errorInfo: ErrorInfo)` 与
 * `fallbackRender / maxRetries / retryDelay / onRetry / onMaxRetriesReached`。
 *
 * 另保留 component 版独有字段 `capturePromiseRejections`（默认 false，
 * 见 `component/src/error-boundary.ts:47,263`）；它已通过 `ErrorBoundaryProps`
 * 类型转出，本处只补齐口径说明，不改变导出面（N08）。
 */

export {
  ErrorBoundary,
  useErrorHandler,
  useErrorBoundaryReset,
  setGlobalErrorReporter,
  getGlobalErrorReporter,
  errorLogManager,
  generateErrorId,
} from '@lytjs/component';
export type {
  ErrorBoundaryProps,
  FallbackProps,
  ErrorInfo,
  ErrorReporter,
  ErrorContext,
  ErrorLog,
} from '@lytjs/component';

/** 导出默认 ErrorBoundary 组件 */
export { ErrorBoundary as default } from '@lytjs/component';
