/**
 * 内置组件兼容层
 *
 * 提供与 Vue 3 兼容的内置组件
 */

// 重新导出 Lyt.js 的内置组件
import {
  KeepAlive as LytKeepAlive,
  Teleport as LytTeleport,
  Transition as LytTransition,
  TransitionGroup as LytTransitionGroup,
  Suspense as LytSuspense,
} from '@lytjs/component'

/**
 * KeepAlive 组件
 * @see https://vuejs.org/api/built-in-components.html#keepalive
 */
export const KeepAlive = LytKeepAlive

/**
 * Teleport 组件
 * @see https://vuejs.org/api/built-in-components.html#teleport
 */
export const Teleport = LytTeleport

/**
 * Transition 组件
 * @see https://vuejs.org/api/built-in-components.html#transition
 */
export const Transition = LytTransition

/**
 * TransitionGroup 组件
 * @see https://vuejs.org/api/built-in-components.html#transitiongroup
 */
export const TransitionGroup = LytTransitionGroup

/**
 * Suspense 组件
 * @see https://vuejs.org/api/built-in-components.html#suspense
 */
export const Suspense = LytSuspense
