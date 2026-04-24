/**
 * Lyt.js ErrorBoundary 内置错误边界组件
 *
 * 捕获子组件渲染错误，显示降级 UI（fallback slot），
 * 支持 onError 回调和错误状态管理。
 * 支持同步和异步错误捕获、错误计数自动禁用、开发模式错误详情。
 * 纯原生实现，零外部依赖。
 */

import {
  defineComponent,
  type ComponentDefine,
} from '../define-component'

// ============================================================
// 类型定义
// ============================================================

/** ErrorBoundary 组件的 Props 接口 */
export interface ErrorBoundaryProps {
  /** 降级 UI 内容（错误时显示） */
  fallback?: any
  /** 最大错误记录数，默认 100 */
  maxErrors?: number
  /** 错误回调 */
  onError?: (error: Error, vm: any, info: string) => void
  /** 错误捕获回调，返回 true 阻止传播 */
  onErrorCaptured?: (error: Error, vm: any, info: string) => boolean | void
  /** 错误状态变化回调 */
  onErrorChange?: (hasError: boolean, error: Error | null) => void
  /** 重置回调（用户触发重置时调用） */
  onReset?: () => void
  /** 自动禁用的最大错误次数，默认 Infinity（不自动禁用） */
  maxErrorCount?: number
}

/** 错误记录条目 */
interface ErrorEntry {
  error: Error
  vm: any
  info: string
  timestamp: number
}

// ============================================================
// 组件实现
// ============================================================

export const ErrorBoundaryComponent: ComponentDefine = defineComponent({
  name: 'ErrorBoundary',

  props: {
    fallback: { type: [Object, Function, Array, String], default: null },
    maxErrors: { type: Number, default: 100 },
    maxErrorCount: { type: Number, default: Infinity },
  },

  setup(props: ErrorBoundaryProps, { slots, emit }: any) {
    // 内部错误列表
    const errors: ErrorEntry[] = []
    let hasError = false
    /** 累计错误计数（用于自动禁用） */
    let totalErrorCount = 0
    /** 是否已自动禁用 */
    let disabled = false

    /**
     * 捕获子组件渲染错误（同步）
     *
     * @param error 错误对象
     * @param vm    组件实例
     * @param info  错误来源信息
     */
    function captureError(error: Error, vm: any, info: string): void {
      if (disabled) return

      const entry: ErrorEntry = {
        error,
        vm,
        info: info || '',
        timestamp: Date.now(),
      }
      errors.push(entry)
      hasError = true
      totalErrorCount++

      // 限制最大错误记录数
      const maxErrors = props.maxErrors ?? 100
      if (errors.length > maxErrors) {
        errors.splice(0, errors.length - maxErrors)
      }

      // 检查是否超过自动禁用阈值
      const maxCount = props.maxErrorCount ?? Infinity
      if (totalErrorCount >= maxCount) {
        disabled = true
      }

      // 调用 onErrorCaptured 回调（通过 props）
      if (props.onErrorCaptured) {
        const result = props.onErrorCaptured(error, vm, info)
        if (result === true) return
      }

      // 调用 onError 回调
      if (props.onError) {
        props.onError(error, vm, info)
      }

      // 通知错误状态变化
      if (props.onErrorChange) {
        props.onErrorChange(true, error)
      }

      // 触发事件
      if (emit) {
        emit('error', error, vm, info)
      }
    }

    /**
     * 捕获异步错误（Promise rejection）
     *
     * @param promise 可能产生错误的 Promise
     * @param vm      组件实例
     * @param info    错误来源信息
     */
    function captureAsyncError(promise: Promise<any>, vm: any, info: string): void {
      if (disabled) return

      promise.catch((error: any) => {
        const err = error instanceof Error ? error : new Error(String(error))
        captureError(err, vm, info)
      })
    }

    /**
     * 重置错误状态
     */
    function resetError(): void {
      errors.length = 0
      hasError = false
      // 注意：totalErrorCount 不重置，防止无限循环
      // disabled 状态也不重置

      if (props.onErrorChange) {
        props.onErrorChange(false, null)
      }
      if (props.onReset) {
        props.onReset()
      }
      if (emit) {
        emit('reset')
      }
    }

    /**
     * 完全重置（包括禁用状态），用于测试
     */
    function fullReset(): void {
      errors.length = 0
      hasError = false
      totalErrorCount = 0
      disabled = false

      if (props.onErrorChange) {
        props.onErrorChange(false, null)
      }
      if (emit) {
        emit('reset')
      }
    }

    /**
     * 获取所有错误
     */
    function getErrors(): ErrorEntry[] {
      return errors.slice()
    }

    /**
     * 获取最后一次错误
     */
    function getLastErrors(): ErrorEntry | null {
      if (errors.length === 0) return null
      return { ...errors[errors.length - 1] }
    }

    /**
     * 获取错误数量
     */
    function getErrorCount(): number {
      return errors.length
    }

    /**
     * 获取累计错误计数
     */
    function getTotalErrorCount(): number {
      return totalErrorCount
    }

    /**
     * 是否已自动禁用
     */
    function isDisabled(): boolean {
      return disabled
    }

    /**
     * 渲染函数
     * - 无错误时渲染默认 slot
     * - 有错误时渲染 fallback slot 或 fallback prop
     * - 自动禁用时渲染禁用提示
     */
    function render(): any {
      if (disabled) {
        // 自动禁用状态：显示禁用提示
        if (slots && slots.fallback) {
          return slots.fallback({
            errors: getErrors(),
            resetError,
            disabled: true,
          })
        }
        return 'ErrorBoundary has been disabled due to too many errors.'
      }

      if (hasError) {
        // 优先使用 fallback slot
        if (slots && slots.fallback) {
          return slots.fallback({ errors: getErrors(), resetError, disabled: false })
        }
        // 其次使用 fallback prop
        if (props.fallback) {
          return props.fallback
        }
        // 默认降级内容
        return 'Something went wrong.'
      }

      // 正常渲染默认 slot
      if (slots && slots.default) {
        return slots.default()
      }

      return null
    }

    return {
      hasError,
      captureError,
      captureAsyncError,
      resetError,
      fullReset,
      getErrors,
      getLastErrors,
      getErrorCount,
      getTotalErrorCount,
      isDisabled,
      render,
    }
  },
})
