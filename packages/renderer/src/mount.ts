/**
 * Lyt.js 渲染器 — 挂载逻辑
 *
 * 本模块包含 VNode 挂载相关的函数。
 */

import type { LytRenderer } from './renderer-interfaces'
import type { VNode } from './vnode'
import { ShapeFlags, isFragment, isTextVNode, isCommentVNode } from './vnode'
import { mountProp } from './props'

/**
 * 挂载 VNode
 */
export function mountVNode(
  renderer: LytRenderer,
  patchFn: PatchFn,
  vnode: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
): void {
  const { shapeFlag } = vnode

  // Fragment 挂载
  if (isFragment(vnode)) {
    mountFragment(renderer, patchFn, vnode, container, anchor, parentComponent)
    return
  }

  // 文本节点挂载
  if (isTextVNode(vnode)) {
    const el = renderer.createText(vnode.children as string)
    vnode.el = el
    renderer.insert(container, el, anchor)
    return
  }

  // 注释节点挂载
  if (isCommentVNode(vnode)) {
    const el = renderer.createComment(vnode.children as string)
    vnode.el = el
    renderer.insert(container, el, anchor)
    return
  }

  // 元素节点挂载
  if (shapeFlag & ShapeFlags.ELEMENT) {
    mountElement(renderer, patchFn, vnode, container, anchor, parentComponent)
    return
  }

  // 组件节点挂载
  if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) {
    mountComponent(patchFn, vnode, container, anchor, parentComponent)
    return
  }
}

/**
 * 挂载元素节点
 */
export function mountElement(
  renderer: LytRenderer,
  patchFn: PatchFn,
  vnode: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
): void {
  const tag = vnode.type as string
  const el = renderer.createElement(tag)
  vnode.el = el

  // 处理 props
  if (vnode.props) {
    for (const key in vnode.props) {
      const value = vnode.props[key]
      mountProp(renderer, el, key, value)
    }
  }

  // 处理子节点
  const { shapeFlag, children } = vnode

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 文本子节点
    el.textContent = children as string
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 数组子节点，逐个挂载
    mountChildren(patchFn, children as VNode[], el, null, parentComponent)
  }

  // 插入到容器
  renderer.insert(container, el, anchor)
}

/**
 * 批量挂载子节点
 */
export function mountChildren(
  patchFn: PatchFn,
  children: VNode[],
  container: any,
  anchor: any,
  parentComponent: any,
): void {
  for (let i = 0; i < children.length; i++) {
    patchFn(null, children[i], container, anchor, parentComponent)
  }
}

/**
 * 挂载 Fragment
 */
export function mountFragment(
  renderer: LytRenderer,
  patchFn: PatchFn,
  vnode: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
): void {
  const { children } = vnode

  // 创建起始锚点注释节点
  const fragmentStartAnchor = renderer.createComment('')
  renderer.insert(container, fragmentStartAnchor, anchor)

  // 挂载所有子节点
  if (Array.isArray(children) && children.length > 0) {
    mountChildren(patchFn, children, container, fragmentStartAnchor, parentComponent)
  }

  vnode.el = fragmentStartAnchor
  vnode.anchor = fragmentStartAnchor
}

/**
 * 挂载组件（简化版）
 */
export function mountComponent(
  patchFn: PatchFn,
  vnode: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
): void {
  const component = vnode.component

  if (component && component.update) {
    component.update()
  }

  if (component && component.subTree) {
    patchFn(null, component.subTree, container, anchor, component)
    vnode.el = component.subTree.el
  }
}

/**
 * Patch 函数类型签名
 */
export type PatchFn = (
  n1: VNode | null,
  n2: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
) => void
