/**
 * Lyt.js 错误处理系统
 *
 * 纯原生零依赖 TypeScript 实现。
 * 提供统一的错误码、错误类、错误边界、警告系统和友好提示。
 */

// ============================================================
//  1. 错误码枚举
// ============================================================

export enum LytErrorCodes {
  // 通用错误 1xxx
  INVALID_ARGUMENT = 1001,
  NOT_FOUND = 1002,
  ALREADY_EXISTS = 1003,
  OPERATION_FAILED = 1004,

  // 响应式错误 2xxx
  REACTIVE_READONLY = 2001,
  REACTIVE_EFFECT_DISPOSED = 2002,
  COMPUTED_CYCLE = 2003,

  // 编译器错误 3xxx
  PARSE_ERROR = 3001,
  INVALID_EXPRESSION = 3002,
  INVALID_DIRECTIVE = 3003,
  INVALID_TEMPLATE = 3004,

  // 渲染器错误 4xxx
  RENDER_ERROR = 4001,
  HYDRATION_MISMATCH = 4002,
  INVALID_VNODE = 4003,

  // 组件错误 5xxx
  COMPONENT_INVALID_PROPS = 5001,
  COMPONENT_MISSING_TEMPLATE = 5002,
  COMPONENT_LIFECYCLE_ERROR = 5003,

  // 路由错误 6xxx
  ROUTE_NOT_FOUND = 6001,
  ROUTE_DUPLICATE = 6002,
  NAVIGATION_ABORTED = 6003,
  NAVIGATION_FAILED = 6004,

  // Store 错误 7xxx
  STORE_NOT_FOUND = 7001,
  STORE_DUPLICATE = 7002,
}

// ============================================================
//  1.1 扩展错误码常量（覆盖所有模块）
// ============================================================

/**
 * 扩展错误码常量，使用简短命名覆盖所有模块。
 * 与 LytErrorCodes 枚举互补，提供更细粒度的错误分类。
 */
export const ErrorCodes = {
  // 核心错误 (1xx)
  APP_MOUNT_FAILED: 100,
  APP_UNMOUNT_FAILED: 101,
  APP_PLUGIN_INVALID: 102,
  APP_PROVIDE_INVALID: 103,

  // 组件错误 (2xx)
  COMPONENT_INVALID: 200,
  COMPONENT_PROPS_INVALID: 201,
  COMPONENT_EMIT_INVALID: 202,
  COMPONENT_LIFECYCLE_ERROR: 203,
  COMPONENT_RENDER_ERROR: 204,

  // 响应式错误 (3xx)
  REACTIVE_SET_READONLY: 300,
  REACTIVE_EFFECT_ERROR: 301,
  COMPUTED_GETTER_ERROR: 302,
  WATCH_CALLBACK_ERROR: 303,

  // 编译器错误 (4xx)
  COMPILER_PARSE_ERROR: 400,
  COMPILER_TRANSFORM_ERROR: 401,
  COMPILER_CODEGEN_ERROR: 402,
  SFC_PARSE_ERROR: 403,

  // 渲染器错误 (5xx)
  RENDERER_HYDRATE_ERROR: 500,
  RENDERER_HYDRATE_MISMATCH: 501,

  // 路由错误 (6xx)
  ROUTER_DUPLICATE_ROUTE: 600,
  ROUTER_NAVIGATION_ABORTED: 601,
  ROUTE_NOT_FOUND: 602,

  // Store 错误 (7xx)
  STORE_DUPLICATE_ID: 700,
  STORE_DISPOSED: 701,
  STORE_PATCH_ERROR: 702,
} as const

/** ErrorCodes 的值类型 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ============================================================
//  2. LytError 类
// ============================================================

export class LytError extends Error {
  code: LytErrorCodes
  details?: any

  constructor(code: LytErrorCodes, message: string, details?: any) {
    const formatted = `[Lyt ${code}] ${message}`
    super(formatted)
    this.name = 'LytError'
    this.code = code
    this.details = details
  }
}

// ============================================================
//  2.1 createLytError 工厂函数
// ============================================================

/**
 * 快速创建 LytError 实例的工厂函数
 *
 * @param code    LytErrorCodes 枚举值
 * @param message 错误消息
 * @param details 附加详情（可选）
 * @returns LytError 实例
 */
export function createLytError(
  code: LytErrorCodes,
  message: string,
  details?: any,
): LytError {
  return new LytError(code, message, details)
}

// ============================================================
//  3. 错误边界（Error Boundary）
// ============================================================

export interface ErrorBoundaryOptions {
  onError?: (error: LytError, vm: any) => void
  onErrorCaptured?: (error: LytError, vm: any, info: string) => boolean | void
  /** 最大错误记录数，超过后自动丢弃最早的错误，默认 100 */
  maxErrors?: number
  /** 降级 UI 回调，当捕获到错误时调用，返回降级内容 */
  fallback?: (error: Error, vm: any, info: string) => any
}

export class ErrorBoundary {
  private errors: Array<{ error: Error; vm: any; info: string; timestamp: number }>
  private options: ErrorBoundaryOptions
  /** 是否处于错误状态 */
  private _hasError: boolean

  /** 全局错误处理器 */
  static globalHandler: ((error: Error, vm: any, info: string) => void) | null = null

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
  static setGlobalHandler(handler: (error: Error, vm: any, info: string) => void): void {
    ErrorBoundary.globalHandler = handler
  }

  /**
   * 捕获错误
   */
  capture(error: Error, vm: any, info?: string): void {
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
        error instanceof LytError ? error : new LytError(LytErrorCodes.OPERATION_FAILED, error.message),
        vm,
        entry.info,
      )
      // 如果返回 true，阻止错误继续传播
      if (result === true) return
    }

    // 调用 onError 回调
    if (this.options.onError) {
      this.options.onError(
        error instanceof LytError ? error : new LytError(LytErrorCodes.OPERATION_FAILED, error.message),
        vm,
      )
    }
  }

  /**
   * 获取降级 UI 内容
   * 当配置了 fallback 回调时，使用最后捕获的错误生成降级内容
   */
  getFallback(vm?: any): any {
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
//  4. 警告系统
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
//  5. 友好的错误提示
// ============================================================

/** 错误码到中文提示模板的映射 */
const errorMessages: Record<number, (...args: any[]) => string> = {
  // 通用错误 1xxx
  [LytErrorCodes.INVALID_ARGUMENT]:
    (argName) => `参数 "${argName}" 无效。请检查传入的值类型和范围。`,
  [LytErrorCodes.NOT_FOUND]:
    (target) => `"${target}" 未找到。请确认资源名称或路径是否正确。`,
  [LytErrorCodes.ALREADY_EXISTS]:
    (target) => `"${target}" 已存在。请使用不同的名称。`,
  [LytErrorCodes.OPERATION_FAILED]:
    (op) => `操作 "${op}" 执行失败。请检查相关配置和状态。`,

  // 响应式错误 2xxx
  [LytErrorCodes.REACTIVE_READONLY]:
    (prop) => `无法修改只读响应式属性 "${prop}"。只读对象不允许直接赋值。`,
  [LytErrorCodes.REACTIVE_EFFECT_DISPOSED]:
    () => `副作用函数已被销毁，无法再次执行。请创建新的副作用。`,
  [LytErrorCodes.COMPUTED_CYCLE]:
    () => `计算属性检测到循环依赖。请检查 computed 函数是否引用了自身。`,

  // 编译器错误 3xxx
  [LytErrorCodes.PARSE_ERROR]:
    (detail) => `模板解析错误：${detail}。请检查模板语法是否正确。`,
  [LytErrorCodes.INVALID_EXPRESSION]:
    (expr) => `无效的表达式 "${expr}"。请检查表达式语法。`,
  [LytErrorCodes.INVALID_DIRECTIVE]:
    (dir) => `无效的指令 "${dir}"。请确认指令名称是否正确。`,
  [LytErrorCodes.INVALID_TEMPLATE]:
    (detail) => `无效的模板：${detail}。请检查模板内容。`,

  // 渲染器错误 4xxx
  [LytErrorCodes.RENDER_ERROR]:
    (detail) => `渲染错误：${detail}。请检查组件的 render 函数或模板。`,
  [LytErrorCodes.HYDRATION_MISMATCH]:
    (detail) => `水合不匹配：${detail}。服务端渲染与客户端渲染结果不一致。`,
  [LytErrorCodes.INVALID_VNODE]:
    (detail) => `无效的虚拟节点：${detail}。VNode 缺少必要的 type 或其他属性。`,

  // 组件错误 5xxx
  [LytErrorCodes.COMPONENT_INVALID_PROPS]:
    (detail) => `组件属性无效：${detail}。请检查传入的 props 是否符合组件定义。`,
  [LytErrorCodes.COMPONENT_MISSING_TEMPLATE]:
    (name) => `组件 "${name}" 缺少 template 或 render 函数。请确保组件定义中包含 template 字符串或 render 方法。`,
  [LytErrorCodes.COMPONENT_LIFECYCLE_ERROR]:
    (detail) => `组件生命周期错误：${detail}。请检查生命周期钩子函数。`,

  // 路由错误 6xxx
  [LytErrorCodes.ROUTE_NOT_FOUND]:
    (path) => `路由 "${path}" 未找到。请确认路由路径是否已注册。`,
  [LytErrorCodes.ROUTE_DUPLICATE]:
    (path) => `路由 "${path}" 已存在。请避免重复注册相同的路由路径。`,
  [LytErrorCodes.NAVIGATION_ABORTED]:
    (detail) => `导航被中止：${detail}。可能被导航守卫拦截。`,
  [LytErrorCodes.NAVIGATION_FAILED]:
    (detail) => `导航失败：${detail}。请检查目标路由是否有效。`,

  // Store 错误 7xxx
  [LytErrorCodes.STORE_NOT_FOUND]:
    (id) => `Store "${id}" 未找到。请确认 store 是否已注册。`,
  [LytErrorCodes.STORE_DUPLICATE]:
    (id) => `Store "${id}" 已存在。请避免重复创建相同 ID 的 store。`,
}

/**
 * 根据错误码生成友好的中文提示信息
 *
 * @param code  错误码
 * @param args  提示模板的参数
 * @returns 格式化的提示字符串
 */
export function createMessage(code: LytErrorCodes, ...args: any[]): string {
  const template = errorMessages[code]
  if (template) {
    const detail = template(...args)
    return `[Lyt ${code}] ${detail}`
  }
  return `[Lyt ${code}] 未知错误。`
}

// ============================================================
//  6. 全局错误捕获
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
    // 生产模式：可以在此处添加错误上报逻辑
    // 例如：reportError(err)
  }
}

// ============================================================
//  7. try-catch 包装器
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
