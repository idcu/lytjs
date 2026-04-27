/**
 * Lyt.js 渲染器 — createRenderer 工厂函数
 *
 * 接收一个 LytRenderer 实现，返回包含 mount/patch/unmount 方法的渲染器实例。
 * 渲染器实例内部实现了完整的 patch 算法，包括：
 *   - 元素挂载与更新
 *   - 文本节点处理
 *   - 注释节点处理
 *   - Fragment 多根节点处理
 *   - 组件挂载与更新（简化版）
 *   - 基于 PatchFlag 的精确更新
 *   - Block Tree 优化
 *   - 列表 diff（keyed / unkeyed）
 *
 * @param renderer 平台渲染器实现
 * @returns 渲染器实例
 */

import { patchKeyedChildren, patchUnkeyedChildren, getSequence, registerDOMOperations, type DOMOperations } from '@lytjs/vdom'
import type { LytRenderer, RendererInstance } from './renderer-interfaces'
import type { VNode } from './vnode'
import { patch, createPatchFn } from './patch'
import { unmount as unmountVNode, unmountChildren } from './unmount'

export function createRenderer(renderer: LytRenderer): RendererInstance {
  /* ---- 创建绑定上下文的 unmount 函数 ---- */

  function unmount(vnode: VNode, container?: unknown): void {
    unmountVNode(renderer, unmount, vnode, container)
  }

  /* ---- 注册 DOM 操作到 @lytjs/vdom ---- */

  // 将渲染器的内部操作注册到 @lytjs/vdom，使导入的 diff 函数可以使用
  const domOps: DOMOperations = {
    insert(child: unknown, parent: unknown, anchor: unknown): void {
      renderer.insert(parent, child, anchor)
    },
    createElement(tag: string): unknown {
      return renderer.createElement(tag)
    },
    createText(text: string): unknown {
      return renderer.createText(text)
    },
    setText(node: unknown, text: string): void {
      (node as Text).nodeValue = text
    },
    setElementText(el: unknown, text: string): void {
      (el as Element).textContent = text
    },
    remove(child: unknown): void {
      renderer.remove(child)
    },
    createComment(text: string): unknown {
      return renderer.createComment(text)
    },
    mount(vnode: VNode, container: unknown, anchor: unknown, parentComponent: unknown, _parentSuspense: unknown, _isSVG: boolean, _optimized: boolean): void {
      patchFn(null, vnode, container, anchor, parentComponent)
    },
    patch(oldVNode: VNode, newVNode: VNode, container: unknown, anchor: unknown, parentComponent: unknown, _parentSuspense: unknown, _isSVG: boolean, _optimized: boolean): void {
      patchFn(oldVNode, newVNode, container, anchor, parentComponent)
    },
    unmount(vnode: VNode, _parentComponent: unknown, _parentSuspense: unknown, _doRemove?: boolean): void {
      unmount(vnode)
    },
    move(vnode: VNode, container: unknown, anchor: unknown): void {
      renderer.insert(container, vnode.el, anchor)
    },
  }
  registerDOMOperations(domOps)

  /* ---- 创建绑定上下文的 patch 函数 ---- */

  function patchFn(
    n1: VNode | null,
    n2: VNode,
    container: unknown,
    anchor: unknown,
    parentComponent: unknown,
  ): void {
    patch(renderer, unmount, n1, n2, container, anchor, parentComponent)
  }

  /* ---- 返回渲染器实例 ---- */

  return {
    /**
     * 挂载 VNode 到容器
     */
    mount(vnode: VNode, container: unknown): void {
      // 清空容器
      if ((container as Node).nodeType === 1) {
        (container as Element).textContent = ''
      }
      // 挂载
      patchFn(null, vnode, container, null, null)
    },

    /**
     * 对比更新新旧 VNode
     */
    patch(oldVNode: VNode, newVNode: VNode, container?: unknown): void {
      patchFn(oldVNode, newVNode, container || (oldVNode.el as Node)?.parentNode, null, null)
    },

    /**
     * 卸载 VNode
     */
    unmount(vnode: VNode, container?: unknown): void {
      unmount(vnode, container)
    },
  }
}
