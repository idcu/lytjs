/**
 * @lytjs/vdom - internal props storage
 * Since VNode interface from common-vnode doesn't have a props field,
 * we use a WeakMap to associate props with vnodes.
 */

import type { VNode } from '@lytjs/common-vnode'

const vnodePropsMap = new WeakMap<VNode, Record<string, any>>()

/**
 * Set props for a vnode (called by createVNode)
 */
export function setVNodeProps(vnode: VNode, props: Record<string, any>): void {
  vnodePropsMap.set(vnode, props)
}

/**
 * Get props for a vnode
 */
export function getVNodeProps(vnode: VNode): Record<string, any> | null {
  return vnodePropsMap.get(vnode) ?? null
}
