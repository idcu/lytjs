/**
 * 兼容模式工具
 *
 * 提供 Vue 3 兼容模式的相关工具
 */

import * as Vue3Api from './vue3-api'

/**
 * 兼容模式标志
 */
let compatModeEnabled = false

/**
 * 启用 Vue 3 兼容模式
 */
export function useCompatMode(enabled: boolean = true): void {
  compatModeEnabled = enabled
}

/**
 * 检查是否在 Vue 3 兼容模式下
 */
export function isCompatMode(): boolean {
  return compatModeEnabled
}

/**
 * 创建兼容的 Vue 3 风格对象
 */
export function createCompatVue(): any {
  return {
    ...Vue3Api,
    version: '3.x (Compat)',
  }
}
