/**
 * defineComponent 兼容层
 *
 * 提供与 Vue 3 兼容的 defineComponent API
 */

import { defineComponent as lytDefineComponent } from '@lytjs/component'
import type { ComponentOptions, DefineComponent, SetupContext } from './types'

/**
 * 定义组件
 * @see https://vuejs.org/api/general.html#definecomponent
 */
export function defineComponent<
  Props = any,
  RawBindings = any,
  D = any,
  C extends Record<string, any> = any,
  M extends Record<string, any> = any,
  Mixin extends ComponentOptions = any,
  Extends extends ComponentOptions = any,
  E extends Record<string, any> = any,
  EE extends string = string,
  I extends Record<string, any> = any,
  II extends string = string,
  S extends Record<string, any> = any,
  PP = Props
>(options: any): DefineComponent {
  // 如果是 Options API 风格，转换为 Lyt.js 风格
  if (options && typeof options === 'object') {
    return lytDefineComponent(options)
  }

  // 如果是函数（setup 函数），包装为组件
  if (typeof options === 'function') {
    return lytDefineComponent({
      setup: options,
    })
  }

  return lytDefineComponent(options)
}
