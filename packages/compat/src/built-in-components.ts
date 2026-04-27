/**
 * 内置组件兼容层
 *
 * 提供与 Vue 3 兼容的内置组件
 */

import { defineComponent } from '@lytjs/component'
import { h } from '@lytjs/core'

/**
 * KeepAlive 组件
 * @see https://vuejs.org/api/built-in-components.html#keepalive
 */
export const KeepAlive = defineComponent({
  name: 'KeepAlive',
  setup(props, { slots }) {
    return () => slots.default?.()
  },
})

/**
 * Teleport 组件
 * @see https://vuejs.org/api/built-in-components.html#teleport
 */
export const Teleport = defineComponent({
  name: 'Teleport',
  props: {
    to: { type: [String, Object], required: true },
    disabled: Boolean,
  },
  setup(props, { slots }) {
    return () => slots.default?.()
  },
})

/**
 * Transition 组件
 * @see https://vuejs.org/api/built-in-components.html#transition
 */
export const Transition = defineComponent({
  name: 'Transition',
  props: {
    name: { type: String, default: 'v' },
  },
  setup(props, { slots }) {
    return () => slots.default?.()
  },
})

/**
 * TransitionGroup 组件
 * @see https://vuejs.org/api/built-in-components.html#transitiongroup
 */
export const TransitionGroup = defineComponent({
  name: 'TransitionGroup',
  props: {
    tag: { type: String, default: 'span' },
    name: { type: String, default: 'v' },
  },
  setup(props, { slots }) {
    return () => h(props.tag as any, null, slots.default?.())
  },
})

/**
 * Suspense 组件
 * @see https://vuejs.org/api/built-in-components.html#suspense
 */
export const Suspense = defineComponent({
  name: 'Suspense',
  setup(props, { slots }) {
    return () => slots.default?.()
  },
})
