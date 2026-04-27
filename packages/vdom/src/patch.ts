/**
 * Lyt.js 虚拟 DOM 引擎 — Patch 主流程
 *
 * Patch 是虚拟 DOM 的核心调度器，负责对比新旧 VNode 并将差异应用到真实 DOM。
 *
 * 主要职责：
 *   1. 根据新旧 VNode 的类型分发到不同的处理函数
 *   2. 处理元素的精确更新（利用 patchFlag 跳过不必要的 diff）
 *   3. 处理 Fragment 多根节点的挂载和更新
 *   4. 处理文本节点和注释节点
 *   5. 处理组件的挂载和更新
 *
 * DOM 操作通过注册函数模式注入，保持本模块的平台无关性。
 */

import type { VNode } from './vnode'
import {
  ShapeFlags,
  isSameVNodeType,
  isTextVNode,
  isCommentVNode,
} from './vnode'
import { PatchFlags, hasPatchFlag } from './patch-flag'
import { Fragment, isFragment } from './fragment'
import { isBlock } from './block'
import {
  patchKeyedChildren,
  patchUnkeyedChildren,
  registerDOMOperations,
  type DOMOperations,
} from './list-diff'

/* ================================================================
 *  DOM 操作注册
 * ================================================================ */

/**
 * Patch 模块需要的 DOM 操作函数集合
 *
 * 继承 list-diff 的 DOMOperations，并扩展 patch 特有的操作。
 */
export interface PatchDOMOperations extends DOMOperations {
  /** 设置元素的 class */
  setClass(el: unknown, value: unknown, oldValue: unknown): void

  /** 设置元素的 style */
  setStyle(el: unknown, value: unknown, oldValue: unknown): void

  /** 设置元素的 DOM 属性（如 id, src, href 等） */
  setAttribute(el: unknown, key: string, value: unknown, oldValue: unknown): void

  /** 移除元素的 DOM 属性 */
  removeAttribute(el: unknown, key: string): void

  /** 添加事件监听器 */
  addEventListener(el: unknown, event: string, handler: unknown): void

  /** 移除事件监听器 */
  removeEventListener(el: unknown, event: string, handler: unknown): void

  /** 将元素插入到容器中 */
  insertBefore(parent: unknown, child: unknown, anchor: unknown): void

  /** 从父容器中移除元素 */
  removeChild(parent: unknown, child: unknown): void

  /** 设置节点锚点（Fragment 使用） */
  setAnchor(vnode: VNode, anchor: unknown): void

  /** 获取下一个兄弟节点 */
  nextSibling(node: unknown): unknown
}

/** 已注册的 Patch DOM 操作 */
let patchDOMOps: PatchDOMOperations | null = null
const opsStack: (PatchDOMOperations | null)[] = []

/**
 * 注册 Patch 模块的 DOM 操作
 *
 * @param ops DOM 操作函数集合
 */
export function registerPatchDOMOperations(ops: PatchDOMOperations): void {
  opsStack.push(patchDOMOps)
  patchDOMOps = ops
  // 同时注册给 list-diff 模块
  registerDOMOperations(ops)
}

/**
 * 恢复上一次注册的 DOM 操作
 */
export function restorePatchDOMOperations(): void {
  patchDOMOps = opsStack.pop() ?? null
  if (patchDOMOps) {
    registerDOMOperations(patchDOMOps)
  }
}

/**
 * 获取已注册的 DOM 操作
 */
function getOps(): PatchDOMOperations {
  if (!patchDOMOps) {
    throw new Error(
      '[Lyt VDOM] Patch DOM 操作未注册。请先调用 registerPatchDOMOperations()。'
    )
  }
  return patchDOMOps
}

/* ================================================================
 *  Patch 主入口
 * ================================================================ */

/**
 * Patch 主函数 — 对比新旧 VNode 并更新 DOM
 *
 * 根据新旧 VNode 的类型分发到不同的处理逻辑：
 * - 新节点不存在 → 卸载旧节点
 * - 类型不同 → 卸载旧节点，挂载新节点
 * - 类型相同 → 复用 DOM，进行精确更新
 *
 * @param oldVNode         旧 VNode（可以为 null，表示首次挂载）
 * @param newVNode         新 VNode
 * @param container        父容器 DOM 元素
 * @param anchor           插入锚点
 * @param parentComponent  父组件实例
 * @param parentSuspense   父 Suspense 实例
 * @param isSVG            是否 SVG 命名空间
 * @param optimized        是否启用 Block 优化
 */
export function patch(
  oldVNode: VNode | null,
  newVNode: VNode,
  container: any,
  anchor: any = null,
  parentComponent: any = null,
  parentSuspense: any = null,
  isSVG: boolean = false,
  optimized: boolean = false,
): void {
  const ops = getOps()

  // 处理旧节点为 null 的情况（首次挂载）
  if (oldVNode === null) {
    mountVNode(newVNode, container, anchor, parentComponent, parentSuspense, isSVG)
    return
  }

  // 如果启用了 Block 优化，且新节点是 Block
  // 则直接 patch dynamicChildren，跳过静态子节点
  if (optimized && isBlock(newVNode) && isBlock(oldVNode)) {
    patchBlockChildren(oldVNode, newVNode, container, parentComponent, parentSuspense, isSVG)
    return
  }

  // 类型不同 → 卸载旧节点，挂载新节点
  if (!isSameVNodeType(oldVNode, newVNode)) {
    unmountVNode(oldVNode, parentComponent, parentSuspense)
    mountVNode(newVNode, container, anchor, parentComponent, parentSuspense, isSVG)
    return
  }

  // 类型相同 → 复用 DOM 元素
  newVNode.el = oldVNode.el
  newVNode.anchor = oldVNode.anchor

  // 根据 shapeFlag 分发处理
  const { shapeFlag } = newVNode

  // Fragment 处理
  if (isFragment(newVNode)) {
    processFragment(
      oldVNode,
      newVNode,
      container,
      anchor,
      parentComponent,
      parentSuspense,
      isSVG,
      optimized,
    )
    return
  }

  // 文本节点处理
  if (isTextVNode(newVNode)) {
    if (newVNode.children !== oldVNode.children) {
      ops.setText(newVNode.el, newVNode.children as string)
    }
    return
  }

  // 注释节点处理
  if (isCommentVNode(newVNode)) {
    if (newVNode.children !== oldVNode.children) {
      ops.setText(newVNode.el, newVNode.children as string)
    }
    return
  }

  // 元素节点处理
  if (shapeFlag & ShapeFlags.ELEMENT) {
    patchElement(oldVNode, newVNode, parentComponent, parentSuspense, isSVG, optimized)
    return
  }

  // 组件节点处理
  if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) {
    patchComponent(oldVNode, newVNode, parentComponent, parentSuspense, isSVG, optimized)
    return
  }
}

/* ================================================================
 *  挂载逻辑
 * ================================================================ */

/**
 * 挂载 VNode 到容器
 */
function mountVNode(
  vnode: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
): void {
  const ops = getOps()
  const { shapeFlag, type } = vnode

  // Fragment 挂载
  if (isFragment(vnode)) {
    mountFragment(vnode, container, anchor, parentComponent, parentSuspense, isSVG)
    return
  }

  // 文本节点挂载
  if (isTextVNode(vnode)) {
    const el = ops.createText(vnode.children as string)
    vnode.el = el
    ops.insertBefore(container, el, anchor)
    return
  }

  // 注释节点挂载
  if (isCommentVNode(vnode)) {
    const el = ops.createComment(vnode.children as string)
    vnode.el = el
    ops.insertBefore(container, el, anchor)
    return
  }

  // 元素节点挂载
  if (shapeFlag & ShapeFlags.ELEMENT) {
    mountElement(vnode, container, anchor, parentComponent, parentSuspense, isSVG)
    return
  }

  // 组件节点挂载
  if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) {
    mountComponent(vnode, container, anchor, parentComponent, parentSuspense, isSVG)
    return
  }
}

/**
 * 挂载元素节点
 */
function mountElement(
  vnode: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
): void {
  const ops = getOps()
  const tag = vnode.type as string
  const el = ops.createElement(tag)

  vnode.el = el

  // 处理 props（class, style, 事件, 属性等）
  if (vnode.props) {
    for (const key in vnode.props) {
      const value = vnode.props[key]
      if (key === 'class') {
        ops.setClass(el, value, null)
      } else if (key === 'style') {
        ops.setStyle(el, value, null)
      } else if (key.startsWith('on') || key.startsWith('@')) {
        // 事件处理
        const eventName = key.startsWith('@')
          ? key.slice(1)
          : key.slice(2).toLowerCase()
        ops.addEventListener(el, eventName, value)
      } else {
        // 普通 DOM 属性
        ops.setAttribute(el, key, value, null)
      }
    }
  }

  // 处理子节点
  const { shapeFlag, children } = vnode

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 文本子节点
    ops.setElementText(el, children as string)
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 数组子节点，逐个挂载
    mountChildren(
      children as VNode[],
      el,
      null,
      parentComponent,
      parentSuspense,
      isSVG,
    )
  }

  // 插入到容器
  ops.insertBefore(container, el, anchor)
}

/**
 * 批量挂载子节点
 */
function mountChildren(
  children: VNode[],
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
): void {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG, false)
  }
}

/**
 * 挂载 Fragment
 */
function mountFragment(
  vnode: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
): void {
  const ops = getOps()
  const { children } = vnode

  // Fragment 的锚点是第一个子节点的 DOM 元素
  // 如果没有子节点，创建一个空注释节点作为锚点
  const fragmentStartAnchor = ops.createComment('')
  ops.insertBefore(container, fragmentStartAnchor, anchor)

  // 挂载所有子节点
  if (Array.isArray(children) && children.length > 0) {
    mountChildren(children, container, fragmentStartAnchor, parentComponent, parentSuspense, isSVG)
  }

  // Fragment 的 el 指向起始锚点
  vnode.el = fragmentStartAnchor
  vnode.anchor = fragmentStartAnchor
}

/**
 * 挂载组件（简化版）
 */
function mountComponent(
  vnode: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
): void {
  const ops = getOps()

  // 组件挂载的实际逻辑由运行时提供
  // 此处提供基本框架
  const component = vnode.component

  if (component && component.update) {
    // 如果组件已有实例，调用更新
    component.update()
  }

  // 组件挂载后，其 subTree 需要挂载到容器
  if (component && component.subTree) {
    patch(
      null,
      component.subTree,
      container,
      anchor,
      component,
      parentSuspense,
      isSVG,
      false,
    )
    // 组件的 el 指向其 subTree 的 el
    vnode.el = component.subTree.el
  }
}

/* ================================================================
 *  卸载逻辑
 * ================================================================ */

/**
 * 卸载 VNode
 */
function unmountVNode(
  vnode: VNode,
  parentComponent: any,
  parentSuspense: any,
): void {
  const ops = getOps()
  const { shapeFlag, children } = vnode

  // Fragment 卸载：卸载所有子节点
  if (isFragment(vnode)) {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        unmountVNode(children[i], parentComponent, parentSuspense)
      }
    }
    // 移除 Fragment 的锚点注释节点
    if (vnode.anchor) {
      ops.removeChild(vnode.anchor.parentNode, vnode.anchor)
    }
    return
  }

  // 组件卸载
  if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) {
    unmountComponent(vnode, parentComponent, parentSuspense)
    return
  }

  // 元素/文本/注释节点：直接从 DOM 移除
  if (vnode.el) {
    ops.removeChild(vnode.el.parentNode, vnode.el)
  }
}

/**
 * 卸载组件（简化版）
 */
function unmountComponent(
  vnode: VNode,
  parentComponent: any,
  parentSuspense: any,
): void {
  // 如果组件有 subTree，先卸载 subTree
  if (vnode.component && vnode.component.subTree) {
    unmountVNode(vnode.component.subTree, parentComponent, parentSuspense)
  }
}

/* ================================================================
 *  更新逻辑
 * ================================================================ */

/**
 * 更新元素节点
 *
 * 利用 patchFlag 进行精确更新：
 * - TEXT: 只更新文本内容
 * - CLASS: 只更新 class
 * - STYLE: 只更新 style
 * - PROPS: 只更新指定的 props
 * - FULL_PROPS: 遍历所有 props 进行对比
 * - 无 patchFlag: 全量 diff
 *
 * @param n1   旧 VNode
 * @param n2   新 VNode
 * @param parentComponent 父组件
 * @param parentSuspense  父 Suspense
 * @param isSVG       是否 SVG
 * @param optimized   是否优化模式
 */
export function patchElement(
  n1: VNode,
  n2: VNode,
  parentComponent: any = null,
  parentSuspense: any = null,
  isSVG: boolean = false,
  optimized: boolean = false,
): void {
  const ops = getOps()
  const el = (n2.el = n1.el!)
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  const { patchFlag, dynamicProps } = n2

  // ---- 精确更新 props（利用 patchFlag） ----

  if (patchFlag > 0) {
    // 有 patchFlag，进行精确更新

    // TEXT 标记：只更新文本内容
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        ops.setElementText(el, n2.children as string)
      }
    }

    // CLASS 标记：只更新 class
    if (patchFlag & PatchFlags.CLASS) {
      if (oldProps.class !== newProps.class) {
        ops.setClass(el, newProps.class, oldProps.class)
      }
    }

    // STYLE 标记：只更新 style
    if (patchFlag & PatchFlags.STYLE) {
      if (oldProps.style !== newProps.style) {
        ops.setStyle(el, newProps.style, oldProps.style)
      }
    }

    // PROPS 标记：只更新 dynamicProps 中指定的属性
    if (patchFlag & PatchFlags.PROPS) {
      if (dynamicProps) {
        for (let i = 0; i < dynamicProps.length; i++) {
          const key = dynamicProps[i]
          const oldValue = oldProps[key]
          const newValue = newProps[key]

          if (newValue !== oldValue) {
            patchProp(el, key, oldValue, newValue)
          }
        }
      }
    }

    // FULL_PROPS 标记：遍历所有 props 进行对比
    if (patchFlag & PatchFlags.FULL_PROPS) {
      patchAllProps(el, oldProps, newProps)
    }
  } else {
    // 无 patchFlag，全量 diff props
    patchAllProps(el, oldProps, newProps)

    // 全量 diff 子节点
    patchChildren(
      n1,
      n2,
      el,
      null,
      parentComponent,
      parentSuspense,
      isSVG,
      optimized,
    )
    return
  }

  // ---- 子节点更新 ----
  // 如果有 patchFlag 但不是 TEXT，需要单独处理子节点
  if (!(patchFlag & PatchFlags.TEXT)) {
    patchChildren(
      n1,
      n2,
      el,
      null,
      parentComponent,
      parentSuspense,
      isSVG,
      optimized,
    )
  }
}

/**
 * 更新单个 prop
 */
function patchProp(
  el: any,
  key: string,
  oldValue: any,
  newValue: any,
): void {
  const ops = getOps()

  if (key === 'class') {
    ops.setClass(el, newValue, oldValue)
  } else if (key === 'style') {
    ops.setStyle(el, newValue, oldValue)
  } else if (key.startsWith('on') || key.startsWith('@')) {
    // 事件更新：先移除旧监听器，再添加新监听器
    const eventName = key.startsWith('@')
      ? key.slice(1)
      : key.slice(2).toLowerCase()
    if (oldValue) {
      ops.removeEventListener(el, eventName, oldValue)
    }
    if (newValue) {
      ops.addEventListener(el, eventName, newValue)
    }
  } else {
    ops.setAttribute(el, key, newValue, oldValue)
  }
}

/**
 * 全量对比并更新所有 props
 */
function patchAllProps(
  el: any,
  oldProps: Record<string, any>,
  newProps: Record<string, any>,
): void {
  const ops = getOps()

  // 遍历新 props，更新变化的属性
  for (const key in newProps) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]

    if (newValue !== oldValue) {
      patchProp(el, key, oldValue, newValue)
    }
  }

  // 遍历旧 props，移除在新 props 中不存在的属性
  for (const key in oldProps) {
    if (!(key in newProps)) {
      if (key === 'class') {
        ops.setClass(el, null, oldProps[key])
      } else if (key === 'style') {
        ops.setStyle(el, null, oldProps[key])
      } else if (key.startsWith('on') || key.startsWith('@')) {
        const eventName = key.startsWith('@')
          ? key.slice(1)
          : key.slice(2).toLowerCase()
        ops.removeEventListener(el, eventName, oldProps[key])
      } else {
        ops.removeAttribute(el, key)
      }
    }
  }
}

/**
 * 更新子节点
 */
function patchChildren(
  n1: VNode,
  n2: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
  optimized: boolean,
): void {
  const oldShapeFlag = n1.shapeFlag
  const newShapeFlag = n2.shapeFlag
  const oldChildren = n1.children
  const newChildren = n2.children

  // 新子节点是文本
  if (newShapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 旧子节点是数组 → 卸载所有旧子节点
      unmountChildren(oldChildren as VNode[], parentComponent, parentSuspense)
    }
    if (oldChildren !== newChildren) {
      // 设置新文本
      const ops = getOps()
      ops.setElementText(container, newChildren as string)
    }
    return
  }

  // 新子节点是数组
  if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 旧子节点也是数组 → 进行列表 diff
      patchArrayChildren(
        n1,
        n2,
        oldChildren as VNode[],
        newChildren as VNode[],
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        optimized,
      )
    } else {
      // 旧子节点不是数组 → 卸载旧子节点，挂载新子节点
      if (oldShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        const ops = getOps()
        ops.setElementText(container, '')
      }
      mountChildren(
        newChildren as VNode[],
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
      )
    }
    return
  }

  // 新子节点为空
  if (newChildren === null || newChildren === undefined) {
    if (oldShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      const ops = getOps()
      ops.setElementText(container, '')
    } else if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(oldChildren as VNode[], parentComponent, parentSuspense)
    }
  }
}

/**
 * 更新数组子节点
 *
 * 根据是否有 key 选择不同的 diff 策略：
 * - 所有子节点都有 key → 使用 keyed diff（五步比较 + LIS）
 * - 否则 → 使用 unkeyed diff（简单逐个对比）
 */
function patchArrayChildren(
  n1: VNode,
  n2: VNode,
  oldChildren: VNode[],
  newChildren: VNode[],
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
  optimized: boolean,
): void {
  // 检查是否所有子节点都有 key
  const hasKeys = newChildren.every(child => child.key !== null && child.key !== undefined) &&
                  oldChildren.every(child => child.key !== null && child.key !== undefined)

  if (hasKeys) {
    // keyed diff
    patchKeyedChildren(
      oldChildren,
      newChildren,
      container,
      anchor,
      parentComponent,
      parentSuspense,
      isSVG,
    )
  } else {
    // unkeyed diff
    patchUnkeyedChildren(
      oldChildren,
      newChildren,
      container,
      anchor,
      parentComponent,
      parentSuspense,
      isSVG,
    )
  }
}

/**
 * 批量卸载子节点
 */
function unmountChildren(
  children: VNode[],
  parentComponent: any,
  parentSuspense: any,
): void {
  for (let i = 0; i < children.length; i++) {
    unmountVNode(children[i], parentComponent, parentSuspense)
  }
}

/* ================================================================
 *  Fragment 处理
 * ================================================================ */

/**
 * 处理 Fragment 更新
 *
 * Fragment 没有对应的真实 DOM 节点，其子节点直接操作容器。
 * 更新时需要：
 *   1. 对比新旧子节点
 *   2. 更新 Fragment 的锚点引用
 *
 * @param n1   旧 VNode
 * @param n2   新 VNode
 * @param container   父容器
 * @param anchor      锚点
 * @param parentComponent 父组件
 * @param parentSuspense  父 Suspense
 * @param isSVG       是否 SVG
 * @param optimized   是否优化
 */
export function processFragment(
  n1: VNode,
  n2: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
  optimized: boolean,
): void {
  const ops = getOps()
  const oldChildren = n1.children as VNode[] | null
  const newChildren = n2.children as VNode[] | null

  // Fragment 的 el 指向第一个子节点的 el（或锚点注释节点）
  if (Array.isArray(newChildren) && newChildren.length > 0) {
    // 先 patch 所有子节点
    patchChildren(
      n1,
      n2,
      container,
      anchor,
      parentComponent,
      parentSuspense,
      isSVG,
      optimized,
    )

    // 更新 Fragment 的 el 和 anchor
    n2.el = newChildren[0].el
    n2.anchor = newChildren[newChildren.length - 1].el
      ? ops.nextSibling(newChildren[newChildren.length - 1].el)
      : anchor
  } else if (Array.isArray(oldChildren) && oldChildren.length > 0 && newChildren === null) {
    // 旧有子节点，新无子节点 → 卸载所有旧子节点
    unmountChildren(oldChildren, parentComponent, parentSuspense)
    n2.el = n1.el
    n2.anchor = n1.anchor
  } else {
    // 都没有子节点
    n2.el = n1.el
    n2.anchor = n1.anchor
  }
}

/* ================================================================
 *  Block Tree 优化
 * ================================================================ */

/**
 * Patch Block 的动态子节点
 *
 * Block 优化模式下，只遍历 dynamicChildren 列表进行更新，
 * 跳过所有静态子节点，大幅减少 diff 的工作量。
 *
 * @param oldBlock 旧 Block
 * @param newBlock 新 Block
 * @param container   父容器
 * @param parentComponent 父组件
 * @param parentSuspense  父 Suspense
 * @param isSVG       是否 SVG
 */
function patchBlockChildren(
  oldBlock: VNode,
  newBlock: VNode,
  container: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
): void {
  const oldDynamicChildren = oldBlock.dynamicChildren!
  const newDynamicChildren = newBlock.dynamicChildren!

  for (let i = 0; i < newDynamicChildren.length; i++) {
    const oldVNode = oldDynamicChildren[i]
    const newVNode = newDynamicChildren[i]

    // Block 的动态子节点仍然需要完整的 patch 流程
    patch(
      oldVNode,
      newVNode,
      container,
      null,
      parentComponent,
      parentSuspense,
      isSVG,
      true,
    )
  }
}

/* ================================================================
 *  组件更新（简化版）
 * ================================================================ */

/**
 * 更新组件节点
 */
function patchComponent(
  n1: VNode,
  n2: VNode,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
  optimized: boolean,
): void {
  // 复用组件实例
  n2.component = n1.component
  n2.el = n1.el

  // 如果组件有更新函数，调用它
  if (n2.component && n2.component.update) {
    n2.component.update()
  }
}
