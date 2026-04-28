/**
 * Lyt.js 渲染器 — 挂载逻辑
 *
 * 本模块包含 VNode 挂载相关的函数。
 */

import type { LytRenderer } from './renderer-interfaces'
import type { VNode } from './vnode'
import { ShapeFlags, isFragment, isTextVNode, isCommentVNode } from './vnode'
import { mountProp } from './props'

// ================================================================
//  首次渲染优化
// ================================================================

/** 是否处于首次渲染模式 */
let isFirstRenderPass = false

/** 首次渲染期间跳过的 effect 收集计数 */
let skippedTrackingCount = 0

/**
 * 启用首次渲染优化模式
 *
 * 在首次渲染时暂时禁用响应式追踪，减少 effect 注册数量。
 * 渲染完成后自动恢复追踪。
 *
 * @param fn  首次渲染函数
 * @returns 渲染函数的返回值
 */
export function withFirstRenderOptimization<T>(fn: () => T): T {
  const wasFirstRender = isFirstRenderPass
  isFirstRenderPass = true
  try {
    return fn()
  } finally {
    if (!wasFirstRender) {
      isFirstRenderPass = false
    }
  }
}

/**
 * 检查是否应跳过依赖收集（首次渲染优化）
 *
 * @returns 是否应跳过
 */
export function shouldSkipTracking(): boolean {
  return isFirstRenderPass
}

/**
 * 获取跳过的追踪计数（用于调试）
 */
export function getSkippedTrackingCount(): number {
  return skippedTrackingCount
}

/**
 * 重置跳过的追踪计数
 */
export function resetSkippedTrackingCount(): void {
  skippedTrackingCount = 0
}

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
    const el = renderer.createText(vnode.children as string) as Text
    vnode.el = el
    renderer.insert(container, el, anchor)
    return
  }

  // 注释节点挂载
  if (isCommentVNode(vnode)) {
    const el = renderer.createComment(vnode.children as string) as any
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
  const el = renderer.createElement(tag) as Element
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
  const fragmentStartAnchor = renderer.createComment('') as any
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
