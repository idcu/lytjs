// @lytjs/shared-types - 组件公共类型

import type { VNode } from '@lytjs/vdom'

/** 插槽函数类型 */
export type SlotFunction = (props?: Record<string, unknown>) => VNode[]

/** 内部插槽映射类型 */
export type InternalSlots = Record<string, SlotFunction | undefined>

/** 组件公共实例接口 */
export interface ComponentPublicInstance {
  $data: Record<string, unknown>
  $props: Record<string, unknown>
  $el: Element | null
  $options: Record<string, unknown>
  $refs: Record<string, Element | ComponentPublicInstance | null>
  $slots: InternalSlots
  $emit: (event: string, ...args: unknown[]) => void
  $forceUpdate: () => void
  $nextTick: () => Promise<void>
}
