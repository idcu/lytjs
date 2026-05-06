/**
 * @lytjs/common-error
 * 错误处理工具
 */

import { ERROR_MAX_WARNED_MESSAGES } from '@lytjs/common-constants';

// ============================================================
// 错误码枚举
// ============================================================

export enum LytErrorCodes {
  // === 编译器错误 (1-999) ===
  INVALID_EXPRESSION = 1001,
  UNEXPECTED_TOKEN = 1002,
  UNEXPECTED_EOF = 1003,
  INVALID_IDENTIFIER = 1004,
  INVALID_DIRECTIVE = 1005,
  INVALID_TEMPLATE_REF = 1006,
  INVALID_VNODE_SLOT = 1007,
  X_INVALID_SLOT_CONTENT = 1008,
  X_V_FOR_MALFORMED_EXPRESSION = 1009,
  X_V_FOR_NESTED_ITERATION = 1010,
  X_V_IF_SAME_KEY = 1011,
  X_V_IF_NO_EXPRESSION = 1012,
  X_V_IF_SIBLING_IF = 1013,
  X_V_FOR_NO_EXPRESSION = 1014,
  X_V_FOR_MISSING_KEY = 1015,
  X_V_FOR_TEMPLATE_KEY_PLACEMENT = 1016,
  X_KEY_EXPECTED = 1017,
  X_INVALID_V_FOR = 1018,
  X_MISSING_END_TAG = 1019,
  X_INVALID_END_TAG = 1020,
  X_INTERPOLATION_NO_EXPRESSION = 1021,
  X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT = 1022,
  X_V_BIND_INVALID_SAME_NAME_ARGUMENT = 1023,
  X_V_BIND_INVALID_DYNAMIC_ARGUMENT = 1024,
  X_V_ON_INVALID_DYNAMIC_ARGUMENT = 1025,
  X_V_MODEL_INVALID_EXPRESSION = 1026,
  X_V_MODEL_ON_SCOPE_VARIABLE = 1027,
  X_INVALID_V_MODEL_MODIFIER = 1028,
  X_V_MODEL_MALFORMED_MODIFIER = 1029,
  X_V_MODEL_INVALID_MODIFIER_ON_INPUT = 1030,
  X_V_MODEL_PROP_CANNOT_BE_SET = 1031,
  X_V_MODEL_CANNOT_BE_USED_ON_PROPS = 1032,
  X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN = 1033,
  X_V_SLOT_DUPLICATE_SLOT_NAMES = 1034,
  X_V_SLOT_MISSING_SLOT_NAME = 1035,
  X_V_SLOT_MIXED_SLOT_USAGE = 1036,
  X_V_SLOT_DUPLICATE_SLOT_NAMES_IN_SAME_SCOPE = 1037,
  X_V_SLOT_EXPECTED_SLOT_NAME = 1038,
  X_V_SLOT_NAMED_EXPECTED_DEFAULT = 1039,
  X_V_SLOT_NAMED_NO_DEFAULT = 1040,
  X_V_SLOT_DEFAULT_DUPLICATE = 1041,
  X_V_SLOT_EXTRANEOUS_ATTRS_IN_SLOTS = 1042,

  // === 运行时错误 (2000-2999) ===
  SETUP_FUNCTION_ERROR = 2001,
  RENDER_ERROR = 2002,
  WATCH_CALLBACK_ERROR = 2003,
  WATCH_GETTER_ERROR = 2004,
  WATCH_CLEANUP_ERROR = 2005,
  LIFECYCLE_HOOK_ERROR = 2006,
  PROVIDE_INJECT_ERROR = 2007,
  NEXT_TICK_ERROR = 2008,
  DIRECTIVE_ERROR = 2009,
  TRANSITION_ERROR = 2010,
  KEEP_ALIVE_ERROR = 2011,
  TELEPORT_ERROR = 2012,
  SUSPENSE_ERROR = 2013,

  // === 渲染器错误 (3000-3999) ===
  INVALID_VNODE_TYPE = 3001,
  INVALID_VNODE_KEY = 3002,
  INVALID_DOM_NODE = 3003,
  INVALID_HYDRATION_NODE = 3004,
  INVALID_PATCH_FLAG = 3005,
  INVALID_REF = 3006,
  INVALID_SLOT = 3007,
  INVALID_CHILDREN = 3008,
  INVALID_PROPS = 3009,
  INVALID_EVENT = 3010,
  INVALID_ATTR = 3011,
  INVALID_CLASS = 3012,
  INVALID_STYLE = 3013,
  INVALID_DIRECTIVE_VALUE = 3014,
  INVALID_TEMPLATE = 3015,
  INVALID_MOUNT_TARGET = 3016,
  INVALID_UNMOUNT_TARGET = 3017,

  // === 组件错误 (4000-4999) ===
  INVALID_COMPONENT = 4001,
  INVALID_PROP_TYPE = 4002,
  MISSING_PROP = 4003,
  INVALID_EMIT_EVENT = 4004,
  INVALID_SETUP_RETURN = 4005,
  INVALID_INJECT_KEY = 4006,
  DUPLICATE_KEYS = 4007,
  CIRCULAR_REFERENCE = 4008,
  INVALID_COMPUTED = 4009,
  INVALID_WATCH_SOURCE = 4010,
  COMPONENT_IS_MISSING_TEMPLATE = 4011,
  COMPONENT_ASYNC_ERROR = 4012,
}

// ============================================================
// 错误分类
// ============================================================

export type ErrorCategoryType = 'compiler' | 'runtime' | 'renderer' | 'component';

export const ErrorCategory = {
  COMPILER: 'compiler' as const,
  RUNTIME: 'runtime' as const,
  RENDERER: 'renderer' as const,
  COMPONENT: 'component' as const,
};

// ============================================================
// 错误消息映射
// ============================================================

const errorMessages: Record<LytErrorCodes, string> = {
  [LytErrorCodes.INVALID_EXPRESSION]: 'Invalid expression.',
  [LytErrorCodes.UNEXPECTED_TOKEN]: 'Unexpected token.',
  [LytErrorCodes.UNEXPECTED_EOF]: 'Unexpected end of expression.',
  [LytErrorCodes.INVALID_IDENTIFIER]: 'Invalid identifier.',
  [LytErrorCodes.INVALID_DIRECTIVE]: 'Invalid directive.',
  [LytErrorCodes.INVALID_TEMPLATE_REF]: 'Invalid template ref.',
  [LytErrorCodes.INVALID_VNODE_SLOT]: 'Invalid vnode slot.',
  [LytErrorCodes.X_INVALID_SLOT_CONTENT]: 'Invalid slot content.',
  [LytErrorCodes.X_V_FOR_MALFORMED_EXPRESSION]: 'Malformed v-for expression.',
  [LytErrorCodes.X_V_FOR_NESTED_ITERATION]: 'Nested v-for iteration is not supported.',
  [LytErrorCodes.X_V_IF_SAME_KEY]: 'v-if/v-else-if/v-else must use unique keys.',
  [LytErrorCodes.X_V_IF_NO_EXPRESSION]: 'v-if/v-else-if requires an expression.',
  [LytErrorCodes.X_V_IF_SIBLING_IF]: 'v-if/v-else-if must be siblings.',
  [LytErrorCodes.X_V_FOR_NO_EXPRESSION]: 'v-for requires an expression.',
  [LytErrorCodes.X_V_FOR_MISSING_KEY]: 'v-for requires a key.',
  [LytErrorCodes.X_V_FOR_TEMPLATE_KEY_PLACEMENT]:
    '<template> key must be placed on <template> tag when using v-for.',
  [LytErrorCodes.X_KEY_EXPECTED]: 'Expected a key on v-for/v-if.',
  [LytErrorCodes.X_INVALID_V_FOR]: 'Invalid v-for usage.',
  [LytErrorCodes.X_MISSING_END_TAG]: 'Missing end tag.',
  [LytErrorCodes.X_INVALID_END_TAG]: 'Invalid end tag.',
  [LytErrorCodes.X_INTERPOLATION_NO_EXPRESSION]: 'Interpolation requires an expression.',
  [LytErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT]: 'Missing dynamic directive argument.',
  [LytErrorCodes.X_V_BIND_INVALID_SAME_NAME_ARGUMENT]:
    'v-bind cannot use same name as the directive argument.',
  [LytErrorCodes.X_V_BIND_INVALID_DYNAMIC_ARGUMENT]: 'Invalid dynamic argument for v-bind.',
  [LytErrorCodes.X_V_ON_INVALID_DYNAMIC_ARGUMENT]: 'Invalid dynamic argument for v-on.',
  [LytErrorCodes.X_V_MODEL_INVALID_EXPRESSION]: 'Invalid v-model expression.',
  [LytErrorCodes.X_V_MODEL_ON_SCOPE_VARIABLE]: 'v-model cannot be used on scope variable.',
  [LytErrorCodes.X_INVALID_V_MODEL_MODIFIER]: 'Invalid v-model modifier.',
  [LytErrorCodes.X_V_MODEL_MALFORMED_MODIFIER]: 'Malformed v-model modifier.',
  [LytErrorCodes.X_V_MODEL_INVALID_MODIFIER_ON_INPUT]: 'Invalid v-model modifier on input element.',
  [LytErrorCodes.X_V_MODEL_PROP_CANNOT_BE_SET]: 'v-model prop cannot be set.',
  [LytErrorCodes.X_V_MODEL_CANNOT_BE_USED_ON_PROPS]: 'v-model cannot be used on props.',
  [LytErrorCodes.X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN]:
    'Extraneous children found in default slot.',
  [LytErrorCodes.X_V_SLOT_DUPLICATE_SLOT_NAMES]: 'Duplicate slot names.',
  [LytErrorCodes.X_V_SLOT_MISSING_SLOT_NAME]: 'v-slot is missing slot name.',
  [LytErrorCodes.X_V_SLOT_MIXED_SLOT_USAGE]: 'Mixed slot usage is not allowed.',
  [LytErrorCodes.X_V_SLOT_DUPLICATE_SLOT_NAMES_IN_SAME_SCOPE]:
    'Duplicate slot names in the same scope.',
  [LytErrorCodes.X_V_SLOT_EXPECTED_SLOT_NAME]: 'Expected slot name for v-slot.',
  [LytErrorCodes.X_V_SLOT_NAMED_EXPECTED_DEFAULT]: 'Named slot expected default slot content.',
  [LytErrorCodes.X_V_SLOT_NAMED_NO_DEFAULT]: 'No default slot content for named slot.',
  [LytErrorCodes.X_V_SLOT_DEFAULT_DUPLICATE]: 'Duplicate default slot.',
  [LytErrorCodes.X_V_SLOT_EXTRANEOUS_ATTRS_IN_SLOTS]: 'Extraneous attributes in slot outlet.',
  [LytErrorCodes.SETUP_FUNCTION_ERROR]: 'Setup function error.',
  [LytErrorCodes.RENDER_ERROR]: 'Render function error.',
  [LytErrorCodes.WATCH_CALLBACK_ERROR]: 'Watch callback error.',
  [LytErrorCodes.WATCH_GETTER_ERROR]: 'Watch getter error.',
  [LytErrorCodes.WATCH_CLEANUP_ERROR]: 'Watch cleanup error.',
  [LytErrorCodes.LIFECYCLE_HOOK_ERROR]: 'Lifecycle hook error.',
  [LytErrorCodes.PROVIDE_INJECT_ERROR]: 'Provide/inject error.',
  [LytErrorCodes.NEXT_TICK_ERROR]: 'nextTick callback error.',
  [LytErrorCodes.DIRECTIVE_ERROR]: 'Directive error.',
  [LytErrorCodes.TRANSITION_ERROR]: 'Transition error.',
  [LytErrorCodes.KEEP_ALIVE_ERROR]: 'KeepAlive error.',
  [LytErrorCodes.TELEPORT_ERROR]: 'Teleport error.',
  [LytErrorCodes.SUSPENSE_ERROR]: 'Suspense error.',
  [LytErrorCodes.INVALID_VNODE_TYPE]: 'Invalid vnode type.',
  [LytErrorCodes.INVALID_VNODE_KEY]: 'Invalid vnode key.',
  [LytErrorCodes.INVALID_DOM_NODE]: 'Invalid DOM node.',
  [LytErrorCodes.INVALID_HYDRATION_NODE]: 'Invalid hydration node.',
  [LytErrorCodes.INVALID_PATCH_FLAG]: 'Invalid patch flag.',
  [LytErrorCodes.INVALID_REF]: 'Invalid ref.',
  [LytErrorCodes.INVALID_SLOT]: 'Invalid slot.',
  [LytErrorCodes.INVALID_CHILDREN]: 'Invalid children.',
  [LytErrorCodes.INVALID_PROPS]: 'Invalid props.',
  [LytErrorCodes.INVALID_EVENT]: 'Invalid event handler.',
  [LytErrorCodes.INVALID_ATTR]: 'Invalid attribute.',
  [LytErrorCodes.INVALID_CLASS]: 'Invalid class value.',
  [LytErrorCodes.INVALID_STYLE]: 'Invalid style value.',
  [LytErrorCodes.INVALID_DIRECTIVE_VALUE]: 'Invalid directive value.',
  [LytErrorCodes.INVALID_TEMPLATE]: 'Invalid template.',
  [LytErrorCodes.INVALID_MOUNT_TARGET]: 'Failed to mount app: target element not found.',
  [LytErrorCodes.INVALID_UNMOUNT_TARGET]: 'Failed to unmount app: target element not found.',
  [LytErrorCodes.INVALID_COMPONENT]: 'Invalid component.',
  [LytErrorCodes.INVALID_PROP_TYPE]: 'Invalid prop type.',
  [LytErrorCodes.MISSING_PROP]: 'Missing required prop.',
  [LytErrorCodes.INVALID_EMIT_EVENT]: 'Invalid emit event.',
  [LytErrorCodes.INVALID_SETUP_RETURN]: 'Invalid setup return value.',
  [LytErrorCodes.INVALID_INJECT_KEY]: 'Invalid inject key.',
  [LytErrorCodes.DUPLICATE_KEYS]: 'Duplicate keys detected.',
  [LytErrorCodes.CIRCULAR_REFERENCE]: 'Circular reference detected.',
  [LytErrorCodes.INVALID_COMPUTED]: 'Invalid computed property.',
  [LytErrorCodes.INVALID_WATCH_SOURCE]: 'Invalid watch source.',
  [LytErrorCodes.COMPONENT_IS_MISSING_TEMPLATE]:
    'Component is missing template or render function.',
  [LytErrorCodes.COMPONENT_ASYNC_ERROR]: 'Async component error.',
};

// ============================================================
// 错误工具函数
// ============================================================

/**
 * 源码位置
 */
export interface SourceLocation {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
  source: string;
}

/**
 * 获取错误码对应的错误消息
 */
export function getErrorMessage(code: number): string {
  return (errorMessages as Record<number, string>)[code] ?? `unknown error code: ${code}`;
}

/**
 * 获取错误码对应的分类
 */
export function getCategory(code: number): ErrorCategoryType {
  // RENDER_ERROR (2002) 属于渲染器错误，需在通用范围检查之前处理
  // 因为 2002 落在 [2000, 3000) 的 RUNTIME 范围内，需要特殊覆盖为 RENDERER
  if (code === LytErrorCodes.RENDER_ERROR) return ErrorCategory.RENDERER;
  if (code >= 1000 && code < 2000) return ErrorCategory.COMPILER;
  if (code >= 2000 && code < 3000) return ErrorCategory.RUNTIME;
  if (code >= 3000 && code < 4000) return ErrorCategory.RENDERER;
  if (code >= 4000 && code < 5000) return ErrorCategory.COMPONENT;
  return ErrorCategory.RUNTIME;
}

/**
 * LytJS 框架错误类
 */
export class LytError extends Error {
  code: number;
  loc?: SourceLocation;

  constructor(code: number, message?: string, loc?: SourceLocation) {
    super(message ?? getErrorMessage(code));
    this.name = 'LytError';
    this.code = code;
    this.loc = loc;
  }
}

/**
 * 通用错误创建函数
 */
function createLytError(
  kind: 'compiler' | 'renderer' | 'component',
  code: number,
  loc?: SourceLocation,
  additionalMessage?: string,
): LytError {
  const message = getErrorMessage(code) + (additionalMessage ? ` ${additionalMessage}` : '');
  const error = new LytError(code, message, loc);
  error.name = `${kind.charAt(0).toUpperCase() + kind.slice(1)}Error`;
  return error;
}

/**
 * 创建编译器错误
 */
export const createCompilerError = (
  code: number,
  loc?: SourceLocation,
  additionalMessage?: string,
): LytError => createLytError('compiler', code, loc, additionalMessage);

/**
 * 创建渲染器错误
 */
export const createRendererError = (
  code: number,
  loc?: SourceLocation,
  additionalMessage?: string,
): LytError => createLytError('renderer', code, loc, additionalMessage);

/**
 * 创建组件错误
 */
export const createComponentError = (
  code: number,
  loc?: SourceLocation,
  additionalMessage?: string,
): LytError => createLytError('component', code, loc, additionalMessage);

// ============================================================
// 开发模式与警告
// ============================================================

// 统一使用全局 __DEV__ 作为开发模式检测。
// devMode 作为设置函数（setDevMode）的兼容接口保留，但内部统一读写 __DEV__。
// 测试中通过 setDevMode(true/false) 切换即可。

declare const __DEV__: boolean;

/**
 * 设置开发模式（兼容接口，内部统一设置 globalThis.__DEV__）
 */
export function setDevMode(enabled: boolean): void {
  if (typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>).__DEV__ = enabled;
  }
}

/**
 * 获取当前开发模式状态
 */
export function getDevMode(): boolean {
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
}

/**
 * 输出警告信息（仅在开发模式下）
 */
export function warn(message: string): void {
  if (!__DEV__) return;
  console.warn(`[LytJS]: ${message}`);
}

// 已警告消息集合 - 使用 FIFO 策略避免内存无限增长
// 当达到上限时，删除最早添加的条目，而非清空全部
const warnedMessages = new Set<string>();

/**
 * 输出一次性警告信息（相同消息只输出一次）
 * 使用 FIFO 策略：达到上限时删除最早的条目，避免已抑制的警告重新出现
 */
export function warnOnce(message: string): void {
  if (!__DEV__) return;
  if (warnedMessages.has(message)) return;
  // FIFO eviction: 当达到上限时，删除最早添加的条目
  if (warnedMessages.size >= ERROR_MAX_WARNED_MESSAGES) {
    const first = warnedMessages.values().next().value;
    if (first !== undefined) {
      warnedMessages.delete(first);
    }
  }
  warnedMessages.add(message);
  console.warn(`[LytJS]: ${message}`);
}

/**
 * 输出错误信息
 * 在生产环境中仍然输出错误，开发模式下附加额外调试信息
 */
export function error(message: string): void {
  if (!__DEV__) {
    console.error(`[LytJS]: ${message}`);
    return;
  }
  console.error(`[LytJS] Error: ${message}\n  (dev mode - see stack trace above for details)`);
}

/**
 * 重置已警告消息集合（用于测试）
 */
export function resetWarnedMessages(): void {
  warnedMessages.clear();
}

// ============================================================
// 安全执行工具（从 @lytjs/shared 迁移）
// ============================================================

/**
 * 安全地执行函数，捕获错误并返回结果或默认值
 *
 * @param fn - 要执行的函数
 * @param defaultValue - 出错时的默认值
 * @param context - 可选的上下文信息，用于错误日志
 * @returns 函数结果或默认值
 * @example
 * ```ts
 * safeExec(() => JSON.parse('invalid'), null) // null
 * safeExec(() => JSON.parse('{}'), null) // {}
 * ```
 */
export function safeExec<T>(fn: () => T, defaultValue: T, context?: string): T {
  try {
    return fn();
  } catch (err) {
    // FIX: P2-41 错误日志不完整：添加上下文信息
    if (__DEV__ && context) {
      warn(`safeExec failed in "${context}": ${err instanceof Error ? err.message : String(err)}`);
    }
    return defaultValue;
  }
}

/**
 * 安全地解析 JSON
 *
 * @param str - JSON 字符串
 * @param defaultValue - 解析失败时的默认值
 * @param context - 可选的上下文信息，用于错误日志
 * @returns 解析结果或默认值
 * @example
 * ```ts
 * safeJsonParse('{"a":1}', {}) // { a: 1 }
 * safeJsonParse('invalid', {}) // {}
 * ```
 */
export function safeJsonParse<T>(str: string, defaultValue: T, context?: string): T {
  return safeExec(() => JSON.parse(str) as T, defaultValue, context ?? 'safeJsonParse');
}

// ============================================================
// 错误恢复机制（FIX: P2-43 错误恢复机制缺失）
// ============================================================

/**
 * 增强的错误对象，包含上下文信息和恢复建议
 */
export interface EnhancedError extends Error {
  code?: number;
  context?: Record<string, unknown>;
  recoverable?: boolean;
  recoverySuggestion?: string;
}

/**
 * 创建增强的错误对象
 *
 * @param message - 错误消息
 * @param options - 错误选项
 * @returns 增强的错误对象
 */
export function createEnhancedError(
  message: string,
  options?: {
    code?: number;
    cause?: unknown;
    context?: Record<string, unknown>;
    recoverable?: boolean;
    recoverySuggestion?: string;
  },
): EnhancedError {
  const error = new Error(message, { cause: options?.cause }) as EnhancedError;
  error.name = 'LytEnhancedError';
  if (options?.code !== undefined) error.code = options.code;
  if (options?.context !== undefined) error.context = options.context;
  if (options?.recoverable !== undefined) error.recoverable = options.recoverable;
  if (options?.recoverySuggestion !== undefined) error.recoverySuggestion = options.recoverySuggestion;
  return error;
}

/**
 * 错误恢复回调类型
 */
export type ErrorRecoveryHandler<T> = (error: EnhancedError) => T | undefined;

/**
 * 带恢复机制的安全执行函数
 * FIX: P2-43 错误恢复机制缺失
 *
 * @param fn - 要执行的函数
 * @param options - 执行选项
 * @returns 函数结果或恢复值
 * @example
 * ```ts
 * const result = safeExecWithRecovery(
 *   () => riskyOperation(),
 *   {
 *     defaultValue: 'fallback',
 *     onError: (err) => console.error(err),
 *     onRecover: (err) => 'recovered value',
 *     maxRetries: 3,
 *   }
 * );
 * ```
 */
export function safeExecWithRecovery<T>(
  fn: () => T,
  options: {
    defaultValue: T;
    context?: string;
    onError?: (error: EnhancedError) => void;
    onRecover?: ErrorRecoveryHandler<T>;
    maxRetries?: number;
    retryDelay?: number;
  },
): T {
  const { defaultValue, context, onError, onRecover, maxRetries = 0, retryDelay = 0 } = options;
  let lastError: EnhancedError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (err) {
      const enhancedError = createEnhancedError(
        err instanceof Error ? err.message : String(err),
        {
          cause: err,
          context: {
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            operation: context ?? 'safeExecWithRecovery',
          },
          recoverable: attempt < maxRetries,
          recoverySuggestion: attempt < maxRetries
            ? `Will retry in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
            : 'No more retries available, using default value',
        },
      );

      lastError = enhancedError;

      if (__DEV__) {
        warn(
          `safeExecWithRecovery failed (attempt ${attempt + 1}/${maxRetries + 1})` +
          `${context ? ` in "${context}"` : ''}: ${enhancedError.message}`,
        );
      }

      // 调用错误回调
      if (onError) {
        onError(enhancedError);
      }

      // 尝试恢复
      if (onRecover && enhancedError.recoverable) {
        const recoveredValue = onRecover(enhancedError);
        if (recoveredValue !== undefined) {
          return recoveredValue;
        }
      }

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries && retryDelay > 0) {
        // 注意：同步延迟，仅在必要时使用
        const start = Date.now();
        while (Date.now() - start < retryDelay) {
          // 忙等待
        }
      }
    }
  }

  // 所有尝试都失败了，返回默认值
  return defaultValue;
}

/**
 * 异步版本的带恢复机制的安全执行函数
 * FIX: P2-43 错误恢复机制缺失（异步版本）
 */
export async function safeExecWithRecoveryAsync<T>(
  fn: () => T | Promise<T>,
  options: {
    defaultValue: T;
    context?: string;
    onError?: (error: EnhancedError) => void | Promise<void>;
    onRecover?: (error: EnhancedError) => T | undefined | Promise<T | undefined>;
    maxRetries?: number;
    retryDelay?: number;
  },
): Promise<T> {
  const { defaultValue, context, onError, onRecover, maxRetries = 0, retryDelay = 0 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const enhancedError = createEnhancedError(
        err instanceof Error ? err.message : String(err),
        {
          cause: err,
          context: {
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            operation: context ?? 'safeExecWithRecoveryAsync',
          },
          recoverable: attempt < maxRetries,
          recoverySuggestion: attempt < maxRetries
            ? `Will retry in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
            : 'No more retries available, using default value',
        },
      );

      if (__DEV__) {
        warn(
          `safeExecWithRecoveryAsync failed (attempt ${attempt + 1}/${maxRetries + 1})` +
          `${context ? ` in "${context}"` : ''}: ${enhancedError.message}`,
        );
      }

      // 调用错误回调
      if (onError) {
        await onError(enhancedError);
      }

      // 尝试恢复
      if (onRecover && enhancedError.recoverable) {
        const recoveredValue = await onRecover(enhancedError);
        if (recoveredValue !== undefined) {
          return recoveredValue;
        }
      }

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries && retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // 所有尝试都失败了，返回默认值
  return defaultValue;
}
