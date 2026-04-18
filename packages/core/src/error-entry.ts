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
} from '../index'

export type {
  ErrorBoundaryOptions,
} from '../index'

export {
  LytErrorCodes as NewLytErrorCodes,
  ErrorCategory,
  getErrorMessage,
  getCategory,
} from '../index'

export type {
  ErrorCategoryType,
} from '../index'

export {
  LytError as NewLytError,
  createCompilerError,
  createRendererError,
  createComponentError,
} from '../index'

export type {
  SourceLocation,
} from '../index'

export {
  warn as warnUtil,
  warnOnce as warnOnceUtil,
  error,
  getDevMode,
  resetWarnedMessages,
} from '../index'

export {
  formatError,
  getComponentStack,
  createErrorOverlay,
} from '../index'
