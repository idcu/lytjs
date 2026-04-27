/**
 * Lyt.js 渲染器 — 卸载逻辑
 *
 * 本模块包含 VNode 卸载相关的函数。
 */

import type { LytRenderer } from './renderer-interfaces'
import type { VNode } from './vnode'
import { ShapeFlags, isFragment } from './vnode'

/**
 * 卸载 VNode
 */
export function unmount(
  renderer: LytRenderer,
  unmountFn: (vnode: VNode, container?: any) => void,
  vnode: VNode,
  container?: any,
): void {
  const { shapeFlag, children } = vnode

  // Fragment 卸载
  if (isFragment(vnode)) {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        unmountFn(children[i], container)
      }
    }
    if (vnode.anchor && vnode.anchor.parentNode) {
      renderer.remove(vnode.anchor)
    }
    return
  }

  // 组件卸载
  if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) {
    if (vnode.component && vnode.component.subTree) {
      unmountFn(vnode.component.subTree, container)
    }
    return
  }

  // 元素/文本/注释节点：直接移除
  if (vnode.el) {
    renderer.remove(vnode.el)
  }
}

/**
 * 批量卸载子节点
 */
export function unmountChildren(
  unmountFn: (vnode: VNode, container?: any) => void,
  children: VNode[],
): void {
  for (let i = 0; i < children.length; i++) {
    unmountFn(children[i])
  }
}
