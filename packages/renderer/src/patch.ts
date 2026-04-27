/**
 * Lyt.js 渲染器 — Patch 逻辑
 *
 * 本模块包含 VNode 对比更新的核心函数。
 */

import type { LytRenderer } from './renderer-interfaces'
import type { VNode } from './vnode'
import { ShapeFlags, PatchFlags, isFragment, isTextVNode, isCommentVNode, isSameVNodeType, isBlock } from './vnode'
import { patchSingleProp, patchAllProps } from './props'
import { mountVNode, mountChildren, type PatchFn } from './mount'
import { unmount, unmountChildren } from './unmount'
import { patchKeyedChildren, patchUnkeyedChildren } from '@lytjs/vdom'

/**
 * Patch 主函数 — 对比新旧 VNode 并更新
 *
 * @param n1    旧 VNode（null 表示首次挂载）
 * @param n2    新 VNode
 * @param container 父容器
 * @param anchor    插入锚点
 * @param parentComponent 父组件实例
 */
export function patch(
  renderer: LytRenderer,
  unmountFn: (vnode: VNode, container?: any) => void,
  n1: VNode | null,
  n2: VNode,
  container: any,
  anchor: any = null,
  parentComponent: any = null,
): void {
  // 新节点不存在 → 卸载旧节点
  if (n2 === null || n2 === undefined) {
    if (n1) {
      unmountFn(n1, container)
    }
    return
  }

  // 旧节点为 null → 首次挂载
  if (n1 === null) {
    mountVNode(renderer, createPatchFn(renderer, unmountFn), n2, container, anchor, parentComponent)
    return
  }

  // Block 优化：如果新旧都是 Block，只 patch dynamicChildren
  if (isBlock(n2) && isBlock(n1)) {
    patchBlockChildren(renderer, unmountFn, n1, n2, container, parentComponent)
    return
  }

  // 类型不同 → 卸载旧节点，挂载新节点
  if (!isSameVNodeType(n1, n2)) {
    unmountFn(n1, container)
    mountVNode(renderer, createPatchFn(renderer, unmountFn), n2, container, anchor, parentComponent)
    return
  }

  // 类型相同 → 复用 DOM 元素
  n2.el = n1.el
  n2.anchor = n1.anchor

  const { shapeFlag } = n2

  // Fragment 处理
  if (isFragment(n2)) {
    processFragment(renderer, unmountFn, n1, n2, container, anchor, parentComponent)
    return
  }

  // 文本节点处理
  if (isTextVNode(n2)) {
    if (n2.children !== n1.children) {
      n2.el!.nodeValue = n2.children as string
    }
    return
  }

  // 注释节点处理
  if (isCommentVNode(n2)) {
    if (n2.children !== n1.children) {
      n2.el!.nodeValue = n2.children as string
    }
    return
  }

  // 元素节点处理
  if (shapeFlag & ShapeFlags.ELEMENT) {
    patchElement(renderer, unmountFn, n1, n2, parentComponent)
    return
  }

  // 组件节点处理
  if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) {
    patchComponent(n1, n2, parentComponent)
    return
  }
}

/**
 * 创建一个绑定 renderer 和 unmountFn 的 patch 函数
 */
export function createPatchFn(
  renderer: LytRenderer,
  unmountFn: (vnode: VNode, container?: any) => void,
): PatchFn {
  return (n1: VNode | null, n2: VNode, container: any, anchor: any, parentComponent: any) => {
    patch(renderer, unmountFn, n1, n2, container, anchor, parentComponent)
  }
}

/**
 * 更新元素节点
 */
function patchElement(
  renderer: LytRenderer,
  unmountFn: (vnode: VNode, container?: any) => void,
  n1: VNode,
  n2: VNode,
  parentComponent: any = null,
): void {
  const el = (n2.el = n1.el!)
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  const { patchFlag, dynamicProps } = n2

  // 基于 patchFlag 精确更新
  if (patchFlag && patchFlag > 0) {
    // TEXT 标记
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        el.textContent = n2.children as string
      }
    }

    // CLASS 标记
    if (patchFlag & PatchFlags.CLASS) {
      if (oldProps.class !== newProps.class) {
        renderer.setClass(el, newProps.class as string | object)
      }
    }

    // STYLE 标记
    if (patchFlag & PatchFlags.STYLE) {
      if (oldProps.style !== newProps.style) {
        renderer.setStyle(el, (newProps.style || {}) as object)
      }
    }

    // PROPS 标记
    if (patchFlag & PatchFlags.PROPS) {
      if (dynamicProps) {
        for (let i = 0; i < dynamicProps.length; i++) {
          const key = dynamicProps[i]
          const oldValue = oldProps[key]
          const newValue = newProps[key]
          if (newValue !== oldValue) {
            patchSingleProp(renderer, el, key, newValue, oldValue)
          }
        }
      }
    }

    // FULL_PROPS 标记
    if (patchFlag & PatchFlags.FULL_PROPS) {
      patchAllProps(renderer, el, oldProps, newProps)
    }
  } else {
    // 无 patchFlag，全量 diff
    patchAllProps(renderer, el, oldProps, newProps)
  }

  // 子节点更新（如果 patchFlag 不包含 TEXT）
  if (!patchFlag || !(patchFlag & PatchFlags.TEXT)) {
    patchChildren(renderer, unmountFn, n1, n2, el, null, parentComponent)
  }
}

/**
 * 更新子节点
 */
function patchChildren(
  renderer: LytRenderer,
  unmountFn: (vnode: VNode, container?: any) => void,
  n1: VNode,
  n2: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
): void {
  const oldShapeFlag = n1.shapeFlag
  const newShapeFlag = n2.shapeFlag
  const oldChildren = n1.children
  const newChildren = n2.children

  // 新子节点是文本
  if (newShapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 旧子节点是数组 → 卸载所有旧子节点
      unmountChildren(unmountFn, oldChildren as VNode[])
    }
    if (oldChildren !== newChildren) {
      container.textContent = newChildren as string
    }
    return
  }

  // 新子节点是数组
  if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 旧子节点也是数组 → 列表 diff
      patchArrayChildren(
        renderer,
        unmountFn,
        oldChildren as VNode[],
        newChildren as VNode[],
        container,
        anchor,
        parentComponent,
      )
    } else {
      // 旧子节点不是数组 → 卸载旧子节点，挂载新子节点
      if (oldShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = ''
      }
      mountChildren(createPatchFn(renderer, unmountFn), newChildren as VNode[], container, anchor, parentComponent)
    }
    return
  }

  // 新子节点为空
  if (newChildren === null || newChildren === undefined) {
    if (oldShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      container.textContent = ''
    } else if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(unmountFn, oldChildren as VNode[])
    }
  }
}

/**
 * 更新数组子节点
 */
function patchArrayChildren(
  renderer: LytRenderer,
  unmountFn: (vnode: VNode, container?: any) => void,
  oldChildren: VNode[],
  newChildren: VNode[],
  container: any,
  anchor: any,
  parentComponent: any,
): void {
  // 检查是否所有子节点都有 key
  const hasKeys = newChildren.every(child => child.key !== null && child.key !== undefined) &&
                  oldChildren.every(child => child.key !== null && child.key !== undefined)

  if (hasKeys) {
    patchKeyedChildren(oldChildren, newChildren, container, anchor, parentComponent, null, false)
  } else {
    patchUnkeyedChildren(oldChildren, newChildren, container, anchor, parentComponent, null, false)
  }
}

/**
 * 处理 Fragment 更新
 */
function processFragment(
  renderer: LytRenderer,
  unmountFn: (vnode: VNode, container?: any) => void,
  n1: VNode,
  n2: VNode,
  container: any,
  anchor: any,
  parentComponent: any,
): void {
  const oldChildren = n1.children as VNode[] | null
  const newChildren = n2.children as VNode[] | null

  if (Array.isArray(newChildren) && newChildren.length > 0) {
    patchChildren(renderer, unmountFn, n1, n2, container, anchor, parentComponent)
    n2.el = newChildren[0].el
    n2.anchor = newChildren[newChildren.length - 1].el
      ? renderer.nextSibling(newChildren[newChildren.length - 1].el)
      : anchor
  } else if (Array.isArray(oldChildren) && oldChildren.length > 0 && newChildren === null) {
    unmountChildren(unmountFn, oldChildren)
    n2.el = n1.el
    n2.anchor = n1.anchor
  } else {
    n2.el = n1.el
    n2.anchor = n1.anchor
  }
}

/**
 * Patch Block 的动态子节点
 */
function patchBlockChildren(
  renderer: LytRenderer,
  unmountFn: (vnode: VNode, container?: any) => void,
  oldBlock: VNode,
  newBlock: VNode,
  container: any,
  parentComponent: any,
): void {
  const oldDynamicChildren = oldBlock.dynamicChildren!
  const newDynamicChildren = newBlock.dynamicChildren!

  for (let i = 0; i < newDynamicChildren.length; i++) {
    patch(
      renderer,
      unmountFn,
      oldDynamicChildren[i],
      newDynamicChildren[i],
      container,
      null,
      parentComponent,
    )
  }
}

/**
 * 更新组件节点
 */
function patchComponent(
  n1: VNode,
  n2: VNode,
  parentComponent: any,
): void {
  n2.component = n1.component
  n2.el = n1.el

  if (n2.component && n2.component.update) {
    n2.component.update()
  }
}
