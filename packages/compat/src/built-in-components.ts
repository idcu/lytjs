/**
 * 内置组件兼容层
 *
 * 提供与 Vue 3 兼容的内置组件
 */

import { defineComponent } from '@lytjs/component'
import { h } from '@lytjs/core'

// defineComponent 在 Lyt.js 中返回 ComponentDefine 而非 Vue 3 风格的可调用组件，
// 这里使用 as any 进行兼容层适配
const defineCompatComponent = defineComponent as any

/**
 * KeepAlive 组件
 * @see https://vuejs.org/api/built-in-components.html#keepalive
 */
export const KeepAlive = defineCompatComponent({
  name: 'KeepAlive',
  setup(props: any, { slots }: any) {
    return () => slots.default?.()
  },
})

/**
 * Teleport 组件
 * @see https://vuejs.org/api/built-in-components.html#teleport
 */
export const Teleport = defineCompatComponent({
  name: 'Teleport',
  props: {
    to: { type: [String, Object], required: true },
    disabled: Boolean,
  },
  setup(props: any, { slots }: any) {
    return () => slots.default?.()
  },
})

/**
 * Transition 组件
 * @see https://vuejs.org/api/built-in-components.html#transition
 */
export const Transition = defineCompatComponent({
  name: 'Transition',
  props: {
    name: { type: String, default: 'v' },
  },
  setup(props: any, { slots }: any) {
    return () => slots.default?.()
  },
})

/**
 * TransitionGroup 组件
 * @see https://vuejs.org/api/built-in-components.html#transitiongroup
 */
export const TransitionGroup = defineCompatComponent({
  name: 'TransitionGroup',
  props: {
    tag: { type: String, default: 'span' },
    name: { type: String, default: 'v' },
  },
  setup(props: any, { slots }: any) {
    return () => h(props.tag as any, null, slots.default?.())
  },
})

/**
 * Suspense 组件
 * @see https://vuejs.org/api/built-in-components.html#suspense
 */
export const Suspense = defineCompatComponent({
  name: 'Suspense',
  setup(props: any, { slots }: any) {
    return () => slots.default?.()
  },
})
