/**
 * Lyt.js 错误处理系统
 *
 * 纯原生零依赖 TypeScript 实现。
 * 提供统一的错误码、错误类、错误边界、警告系统和友好提示。
 *
 * 错误码和 LytError 类统一使用 @lytjs/common 中的定义。
 */

import { LytError, LytErrorCodes, getErrorMessage, getCategory } from '@lytjs/common'

// ============================================================
//  1. 错误边界（Error Boundary）
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
    // 生产模式：可以在此处添加错误上报逻辑
    // 例如：reportError(err)
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
