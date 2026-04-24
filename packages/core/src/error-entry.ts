/**
 * @lytjs/core/error — 错误处理子路径入口
 *
 * 按需导入错误处理 API：
 *   import { LytError, ErrorBoundary, handleError } from '@lytjs/core/error'
 */

export {
  LytError,
  LytErrorCodes,
  ErrorBoundary,
  handleError,
  callWithErrorHandling,
  warn,
  warnOnce,
  setDevMode,
  createMessage,
} from './error-handling'

export type {
  ErrorBoundaryOptions,
} from './error-handling'

export {
  LytErrorCodes as NewLytErrorCodes,
  ErrorCategory,
  getErrorMessage,
  getCategory,
} from './error-codes'

export type {
  ErrorCategoryType,
} from './error-codes'

export {
  LytError as NewLytError,
  createCompilerError,
  createRendererError,
  createComponentError,
} from './lyt-error'

export type {
  SourceLocation,
} from './lyt-error'

export {
  warn as warnUtil,
  warnOnce as warnOnceUtil,
  getDevMode,
  resetWarnedMessages,
} from './error-handling'
