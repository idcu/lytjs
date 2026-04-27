/**
 * Lyt.js 错误处理系统
 *
 * 纯原生零依赖 TypeScript 实现。
 * 提供统一的错误码、错误类、错误边界、警告系统和友好提示。
 *
 * 错误码和 LytError 类统一使用 @lytjs/common 中的定义。
 */

import { LytError, LytErrorCodes as CommonLytErrorCodes, getErrorMessage, getCategory } from '@lytjs/common'

// 重新导出 LytError 以便外部使用
export { LytError }

// ============================================================
//  0. 兼容性错误码枚举（旧 API 向后兼容）
// ============================================================

/**
 * 兼容性 LytErrorCodes 枚举
 *
 * 提供旧版简短命名（NOT_FOUND, OPERATION_FAILED 等），
 * 同时也包含新版 LYT_* 前缀命名。
 */
export enum LytErrorCodes {
  // ---- 旧版通用错误码 1xxx ----
  INVALID_ARGUMENT = 1001,
  NOT_FOUND = 1002,
  ALREADY_EXISTS = 1003,
  OPERATION_FAILED = 1004,

  // ---- 旧版响应式错误码 2xxx ----
  REACTIVE_READONLY = 2001,
  REACTIVE_EFFECT_DISPOSED = 2002,
  COMPUTED_CYCLE = 2003,

  // ---- 旧版编译器错误码 3xxx ----
  PARSE_ERROR = 3001,
  INVALID_EXPRESSION = 3002,
  INVALID_DIRECTIVE = 3003,
  INVALID_TEMPLATE = 3004,

  // ---- 旧版渲染器错误码 4xxx ----
  RENDER_ERROR = 4001,
  HYDRATION_MISMATCH = 4002,
  INVALID_VNODE = 4003,

  // ---- 旧版组件错误码 5xxx ----
  COMPONENT_INVALID_PROPS = 5001,
  COMPONENT_MISSING_TEMPLATE = 5002,
  COMPONENT_LIFECYCLE_ERROR = 5003,

  // ---- 旧版路由错误码 6xxx ----
  ROUTE_NOT_FOUND = 6001,
  ROUTE_DUPLICATE = 6002,
  NAVIGATION_ABORTED = 6003,
  NAVIGATION_FAILED = 6004,

  // ---- 旧版 Store 错误码 7xxx ----
  STORE_NOT_FOUND = 7001,
  STORE_DUPLICATE = 7002,

  // ---- 新版 LYT_* 前缀错误码（从 common 透传） ----
  LYT_COMPILER_PARSE_ERROR = CommonLytErrorCodes.LYT_COMPILER_PARSE_ERROR,
  LYT_COMPILER_INVALID_EXPRESSION = CommonLytErrorCodes.LYT_COMPILER_INVALID_EXPRESSION,
  LYT_COMPILER_INVALID_TEMPLATE = CommonLytErrorCodes.LYT_COMPILER_INVALID_TEMPLATE,
  LYT_COMPILER_INVALID_DIRECTIVE = CommonLytErrorCodes.LYT_COMPILER_INVALID_DIRECTIVE,
  LYT_COMPILER_CODEGEN_ERROR = CommonLytErrorCodes.LYT_COMPILER_CODEGEN_ERROR,
  LYT_COMPILER_SFC_PARSE_ERROR = CommonLytErrorCodes.LYT_COMPILER_SFC_PARSE_ERROR,
  LYT_COMPILER_TRANSFORM_ERROR = CommonLytErrorCodes.LYT_COMPILER_TRANSFORM_ERROR,
  LYT_RENDERER_MOUNT_FAILED = CommonLytErrorCodes.LYT_RENDERER_MOUNT_FAILED,
  LYT_RENDERER_PATCH_FAILED = CommonLytErrorCodes.LYT_RENDERER_PATCH_FAILED,
  LYT_RENDERER_HYDRATION_MISMATCH = CommonLytErrorCodes.LYT_RENDERER_HYDRATION_MISMATCH,
  LYT_RENDERER_INVALID_VNODE = CommonLytErrorCodes.LYT_RENDERER_INVALID_VNODE,
  LYT_RENDERER_UNMOUNT_FAILED = CommonLytErrorCodes.LYT_RENDERER_UNMOUNT_FAILED,
  LYT_COMPONENT_INVALID_PROPS = CommonLytErrorCodes.LYT_COMPONENT_INVALID_PROPS,
  LYT_COMPONENT_MISSING_RENDER = CommonLytErrorCodes.LYT_COMPONENT_MISSING_RENDER,
  LYT_COMPONENT_LIFECYCLE_ERROR = CommonLytErrorCodes.LYT_COMPONENT_LIFECYCLE_ERROR,
  LYT_COMPONENT_INVALID = CommonLytErrorCodes.LYT_COMPONENT_INVALID,
  LYT_COMPONENT_EMIT_INVALID = CommonLytErrorCodes.LYT_COMPONENT_EMIT_INVALID,
  LYT_COMPONENT_RENDER_ERROR = CommonLytErrorCodes.LYT_COMPONENT_RENDER_ERROR,
  LYT_ROUTER_INVALID_ROUTE = CommonLytErrorCodes.LYT_ROUTER_INVALID_ROUTE,
  LYT_ROUTER_NAVIGATION_FAILED = CommonLytErrorCodes.LYT_ROUTER_NAVIGATION_FAILED,
  LYT_ROUTER_DUPLICATE_ROUTE = CommonLytErrorCodes.LYT_ROUTER_DUPLICATE_ROUTE,
  LYT_ROUTER_NAVIGATION_ABORTED = CommonLytErrorCodes.LYT_ROUTER_NAVIGATION_ABORTED,
  LYT_ROUTER_GUARD_ERROR = CommonLytErrorCodes.LYT_ROUTER_GUARD_ERROR,
  LYT_STORE_ALREADY_EXISTS = CommonLytErrorCodes.LYT_STORE_ALREADY_EXISTS,
  LYT_STORE_NOT_FOUND = CommonLytErrorCodes.LYT_STORE_NOT_FOUND,
  LYT_STORE_DISPOSED = CommonLytErrorCodes.LYT_STORE_DISPOSED,
  LYT_STORE_PATCH_ERROR = CommonLytErrorCodes.LYT_STORE_PATCH_ERROR,
  LYT_REACTIVITY_READONLY_SET = CommonLytErrorCodes.LYT_REACTIVITY_READONLY_SET,
  LYT_REACTIVITY_READONLY_DELETE = CommonLytErrorCodes.LYT_REACTIVITY_READONLY_DELETE,
  LYT_REACTIVITY_EFFECT_ERROR = CommonLytErrorCodes.LYT_REACTIVITY_EFFECT_ERROR,
  LYT_REACTIVITY_COMPUTED_CYCLE = CommonLytErrorCodes.LYT_REACTIVITY_COMPUTED_CYCLE,
  LYT_REACTIVITY_EFFECT_DISPOSED = CommonLytErrorCodes.LYT_REACTIVITY_EFFECT_DISPOSED,
  LYT_REACTIVITY_CIRCULAR_DEPENDENCY = CommonLytErrorCodes.LYT_REACTIVITY_CIRCULAR_DEPENDENCY,
  LYT_REACTIVITY_SIGNAL_DISPOSED = CommonLytErrorCodes.LYT_REACTIVITY_SIGNAL_DISPOSED,
  LYT_CORE_PLUGIN_ERROR = CommonLytErrorCodes.LYT_CORE_PLUGIN_ERROR,
  LYT_CORE_MOUNT_NO_CONTAINER = CommonLytErrorCodes.LYT_CORE_MOUNT_NO_CONTAINER,
  LYT_CORE_ALREADY_MOUNTED = CommonLytErrorCodes.LYT_CORE_ALREADY_MOUNTED,
  LYT_CORE_INVALID_ARGUMENT = CommonLytErrorCodes.LYT_CORE_INVALID_ARGUMENT,
  LYT_CORE_NOT_FOUND = CommonLytErrorCodes.LYT_CORE_NOT_FOUND,
  LYT_CORE_ALREADY_EXISTS = CommonLytErrorCodes.LYT_CORE_ALREADY_EXISTS,
  LYT_CORE_OPERATION_FAILED = CommonLytErrorCodes.LYT_CORE_OPERATION_FAILED,
  LYT_CLI_SCAFFOLD_FAILED = CommonLytErrorCodes.LYT_CLI_SCAFFOLD_FAILED,
  LYT_CLI_BUILD_FAILED = CommonLytErrorCodes.LYT_CLI_BUILD_FAILED,
  LYT_CLI_DEV_SERVER_ERROR = CommonLytErrorCodes.LYT_CLI_DEV_SERVER_ERROR,
  LYT_CLI_CONFIG_INVALID = CommonLytErrorCodes.LYT_CLI_CONFIG_INVALID,
  LYT_CLI_HMR_CONNECTION_FAILED = CommonLytErrorCodes.LYT_CLI_HMR_CONNECTION_FAILED,
  LYT_DEVTOOLS_CONNECTION_FAILED = CommonLytErrorCodes.LYT_DEVTOOLS_CONNECTION_FAILED,
  LYT_DEVTOOLS_PANEL_ERROR = CommonLytErrorCodes.LYT_DEVTOOLS_PANEL_ERROR,
  LYT_DEVTOOLS_PERF_OVERFLOW = CommonLytErrorCodes.LYT_DEVTOOLS_PERF_OVERFLOW,
  LYT_DEVTOOLS_COMPONENT_TREE_ERROR = CommonLytErrorCodes.LYT_DEVTOOLS_COMPONENT_TREE_ERROR,
  LYT_PLUGIN_INSTALL_FAILED = CommonLytErrorCodes.LYT_PLUGIN_INSTALL_FAILED,
  LYT_PLUGIN_ALREADY_INSTALLED = CommonLytErrorCodes.LYT_PLUGIN_ALREADY_INSTALLED,
  LYT_PLUGIN_INVALID = CommonLytErrorCodes.LYT_PLUGIN_INVALID,
  LYT_PLUGIN_UNINSTALL_FAILED = CommonLytErrorCodes.LYT_PLUGIN_UNINSTALL_FAILED,
  LYT_RENDERER_VAPOR_ERROR = CommonLytErrorCodes.LYT_RENDERER_VAPOR_ERROR,
  LYT_RENDERER_VAPOR_COMPILER_ERROR = CommonLytErrorCodes.LYT_RENDERER_VAPOR_COMPILER_ERROR,
  LYT_RENDERER_VAPOR_COMPONENT_ERROR = CommonLytErrorCodes.LYT_RENDERER_VAPOR_COMPONENT_ERROR,
  LYT_SSR_STREAM_ERROR = CommonLytErrorCodes.LYT_SSR_STREAM_ERROR,
  LYT_SSR_SUSPENSE_TIMEOUT = CommonLytErrorCodes.LYT_SSR_SUSPENSE_TIMEOUT,
  LYT_SSR_HYDRATION_ERROR = CommonLytErrorCodes.LYT_SSR_HYDRATION_ERROR,
  LYT_SSR_ISLAND_ERROR = CommonLytErrorCodes.LYT_SSR_ISLAND_ERROR,
}

// ============================================================
//  扩展错误码常量 ErrorCodes
// ============================================================

/**
 * 扩展错误码常量
 *
 * 使用简短编号范围（1xx-7xx），用于内部模块。
 */
export const ErrorCodes = {
  // 核心错误码 1xx
  APP_MOUNT_FAILED: 100,
  APP_UNMOUNT_FAILED: 101,
  APP_PLUGIN_INVALID: 102,
  APP_PROVIDE_INVALID: 103,

  // 组件错误码 2xx
  COMPONENT_INVALID: 200,
  COMPONENT_PROPS_INVALID: 201,
  COMPONENT_EMIT_INVALID: 202,
  COMPONENT_LIFECYCLE_ERROR: 203,
  COMPONENT_RENDER_ERROR: 204,

  // 响应式错误码 3xx
  REACTIVE_SET_READONLY: 300,
  REACTIVE_EFFECT_ERROR: 301,
  COMPUTED_GETTER_ERROR: 302,
  WATCH_CALLBACK_ERROR: 303,

  // 编译器错误码 4xx
  COMPILER_PARSE_ERROR: 400,
  COMPILER_TRANSFORM_ERROR: 401,
  COMPILER_CODEGEN_ERROR: 402,
  SFC_PARSE_ERROR: 403,

  // 渲染器错误码 5xx
  RENDERER_HYDRATE_ERROR: 500,
  RENDERER_HYDRATE_MISMATCH: 501,

  // 路由错误码 6xx
  ROUTER_DUPLICATE_ROUTE: 600,
  ROUTER_NAVIGATION_ABORTED: 601,
  ROUTE_NOT_FOUND: 602,

  // Store 错误码 7xx
  STORE_DUPLICATE_ID: 700,
  STORE_DISPOSED: 701,
  STORE_PATCH_ERROR: 702,
} as const

// ============================================================
//  createLytError 工厂函数
// ============================================================

/**
 * 创建 LytError 实例的工厂函数
 *
 * @param code    错误码
 * @param message 自定义消息
 * @param details 附加详情
 * @returns LytError 实例
 */
export function createLytError(code: number, message: string, details?: any): LytError {
  return new LytError(code as any, message, details)
}

// ============================================================
//  1. 错误边界（Error Boundary）
// ============================================================

/** 组件实例接口（最小化） */
interface ComponentInstance {
  $options?: Record<string, unknown>
  $parent?: ComponentInstance | null
  [key: string]: unknown
}

export interface ErrorBoundaryOptions {
  onError?: (error: LytError, vm: ComponentInstance) => void
  onErrorCaptured?: (error: LytError, vm: ComponentInstance, info: string) => boolean | void
  /** 最大错误记录数，超过后自动丢弃最早的错误，默认 100 */
  maxErrors?: number
  /** 降级 UI 回调，当捕获到错误时调用，返回降级内容 */
  fallback?: (error: Error, vm: ComponentInstance, info: string) => unknown
}

export class ErrorBoundary {
  private errors: Array<{ error: Error; vm: ComponentInstance; info: string; timestamp: number }>
  private options: ErrorBoundaryOptions
  /** 是否处于错误状态 */
  private _hasError: boolean

  /** 全局错误处理器 */
  static globalHandler: ((error: Error, vm: ComponentInstance, info: string) => void) | null = null

  constructor(options?: ErrorBoundaryOptions) {
    this.errors = []
    this.options = options || {}
    this._hasError = false
  }

  /** 是否处于错误状态 */
  get hasError(): boolean {
    return this._hasError
  }

  /**
   * 设置全局错误处理器
   */
  static setGlobalHandler(handler: (error: Error, vm: ComponentInstance, info: string) => void): void {
    ErrorBoundary.globalHandler = handler
  }

  /**
   * 捕获错误
   */
  capture(error: Error, vm: ComponentInstance, info?: string): void {
    const entry = {
      error,
      vm,
      info: info || '',
      timestamp: Date.now(),
    }
    this.errors.push(entry)
    this._hasError = true

    // 限制最大错误记录数
    const maxErrors = this.options.maxErrors ?? 100
    if (this.errors.length > maxErrors) {
      this.errors.splice(0, this.errors.length - maxErrors)
    }

    // 调用 onErrorCaptured 回调
    if (this.options.onErrorCaptured) {
      const result = this.options.onErrorCaptured(
        error instanceof LytError ? error : new LytError(LytErrorCodes.LYT_CORE_OPERATION_FAILED, error.message),
        vm,
        entry.info,
      )
      // 如果返回 true，阻止错误继续传播
      if (result === true) return
    }

    // 调用 onError 回调
    if (this.options.onError) {
      this.options.onError(
        error instanceof LytError ? error : new LytError(LytErrorCodes.LYT_CORE_OPERATION_FAILED, error.message),
        vm,
      )
    }
  }

  /**
   * 获取降级 UI 内容
   * 当配置了 fallback 回调时，使用最后捕获的错误生成降级内容
   */
  getFallback(vm?: ComponentInstance): unknown {
    if (!this.options.fallback || this.errors.length === 0) return null
    const lastError = this.errors[this.errors.length - 1]
    return this.options.fallback(lastError.error, lastError.vm, lastError.info)
  }

  /**
   * 获取所有错误
   */
  getErrors(): Array<{ error: Error; vm: any; info: string; timestamp: number }> {
    return this.errors.slice()
  }

  /**
   * 获取错误数量
   */
  getErrorCount(): number {
    return this.errors.length
  }

  /**
   * 获取最后一次错误
   */
  getLastErrors(): { error: Error; vm: any; info: string; timestamp: number } | null {
    if (this.errors.length === 0) return null
    return { ...this.errors[this.errors.length - 1] }
  }

  /**
   * 清除错误并重置错误状态
   */
  clear(): void {
    this.errors = []
    this._hasError = false
  }
}

// ============================================================
//  2. 警告系统
// ============================================================

let isDevMode = true

/** 已警告过的消息集合（warnOnce 去重） */
const warnedMessages: Set<string> = new Set()

/**
 * 设置开发/生产模式
 */
export function setDevMode(mode: boolean): void {
  isDevMode = mode
}

/**
 * 获取当前是否为开发模式
 */
export function getDevMode(): boolean {
  return isDevMode
}

/**
 * 仅开发模式输出警告
 */
export function warn(msg: string): void {
  if (!isDevMode) return
  const warnFn = console.warn
  if (typeof warnFn === 'function') {
    warnFn(`[Lyt warn] ${msg}`)
  }
}

/**
 * 每条消息只警告一次
 */
export function warnOnce(msg: string): void {
  if (!isDevMode) return
  if (warnedMessages.has(msg)) return
  warnedMessages.add(msg)
  const warnFn = console.warn
  if (typeof warnFn === 'function') {
    warnFn(`[Lyt warn] ${msg}`)
  }
}

/**
 * 重置已警告消息集合（仅用于测试）
 */
export function resetWarnedMessages(): void {
  warnedMessages.clear()
}

/**
 * 始终输出错误信息（不受开发/生产模式限制）
 */
export function error(msg: string): void {
  const errorFn = console.error
  if (typeof errorFn === 'function') {
    errorFn(`[Lyt error] ${msg}`)
  }
}

// ============================================================
//  3. 友好的错误提示
// ============================================================

/**
 * 根据错误码生成友好的中文提示信息
 *
 * @param code  错误码
 * @param args  提示模板的参数（可选）
 * @returns 格式化的提示字符串
 */
export function createMessage(code: LytErrorCodes, ...args: any[]): string {
  const detail = getErrorMessage(code)
  return `[Lyt ${code}] ${detail}`
}

// ============================================================
//  4. 全局错误捕获
// ============================================================

/**
 * 统一错误处理入口
 *
 * 1. 如果有 ErrorBoundary.globalHandler，调用它
 * 2. 如果是开发模式，console.error 详细信息
 * 3. 如果是生产模式，可以上报错误（预留）
 */
export function handleError(err: Error, vm?: any, info?: string): void {
  // 调用全局错误处理器
  if (ErrorBoundary.globalHandler) {
    ErrorBoundary.globalHandler(err, vm, info || '')
  }

  if (isDevMode) {
    // 开发模式：输出详细错误信息
    if (err instanceof LytError) {
      console.error(err.message)
      if (err.details) {
        console.error('详细信息:', err.details)
      }
    } else {
      console.error(`[Lyt Error] ${err.message}`)
    }
    if (vm) {
      console.error('组件实例:', vm)
    }
    if (info) {
      console.error('错误来源:', info)
    }
  } else {
    // 生产模式：上报错误
    if (typeof reportError === 'function') {
      reportError(err)
    }
  }
}

// ============================================================
//  5. try-catch 包装器
// ============================================================

/**
 * 安全执行函数，捕获错误并交给 handleError 处理
 *
 * @param fn       要执行的函数
 * @param instance 组件实例（可选）
 * @returns 函数返回值，出错时返回 undefined
 */
export function callWithErrorHandling<T>(fn: () => T, instance?: any): T | undefined {
  try {
    return fn()
  } catch (err) {
    handleError(err instanceof Error ? err : new Error(String(err)), instance)
    return undefined
  }
}

/**
 * 安全执行异步函数，捕获错误并交给 handleError 处理
 *
 * @param fn       要执行的异步函数
 * @param instance 组件实例（可选）
 * @returns Promise，出错时 resolve undefined
 */
export async function callWithErrorHandlingAsync<T>(fn: () => Promise<T>, instance?: any): Promise<T | undefined> {
  try {
    return await fn()
  } catch (err) {
    handleError(err instanceof Error ? err : new Error(String(err)), instance)
    return undefined
  }
}
