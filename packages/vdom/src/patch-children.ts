/**
 * @lytjs/vdom - patch-children
 *
 * 子节点的 diff 和挂载/卸载逻辑。
 * 包含 patchChildren、patchBlockChildren、mountChildren、unmountChildren、
 * diffChildren、diffChildrenInternal 函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { ShapeFlags, isSameVNodeType } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';
import {
  patchKeyedChildren as listDiffPatchKeyedChildren,
} from './list-diff';

// ============================================================
// Children patch factory
// ============================================================

export interface ChildrenPatchAPI<HN, _HE extends HN> {
  patchChildren: (
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  patchBlockChildren: (
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  mountChildren: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;
  unmountChildren: (
    children: VNode[],
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;
  diffChildren: (
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  diffChildrenInternal: (
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    fallbackAnchor: HN | null,
  ) => void;
}

/**
 * 创建 children 相关的 patch 函数集合。
 */
export function createChildrenPatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): ChildrenPatchAPI<HN, HE> {
  const {
    setElementText,
    patch,
    unmount,
  } = ctx;

  // ============================================================
  // patchBlockChildren — Block Tree 快速路径
  // ============================================================

  /**
   * FIX: P2-5 VDOM-NEW-12 - 静态提升优化
   * 检查 vnode 是否为静态节点（无需 diff 的节点）
   */
  function isStaticVNode(vnode: VNode | null | undefined): boolean {
    if (!vnode) return false;
    // 检查静态标记
    return !!(vnode.isStatic || vnode.isStaticRoot);
  }

  /**
   * FIX: P2-5 VDOM-NEW-12 - 静态提升优化
   * 直接复用静态 vnode，跳过 diff 过程
   */
  function patchStaticVNode(
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): boolean {
    // 如果两个节点都是静态节点且类型相同，直接复用
    if (isStaticVNode(n1) && isStaticVNode(n2) && isSameVNodeType(n1, n2)) {
      // 静态节点：复用 DOM 元素，只更新 vnode 引用
      n2.el = n1.el;
      n2.anchor = n1.anchor;
      return true; // 表示已处理，跳过 diff
    }
    return false; // 需要正常 diff
  }

  /**
   * 仅遍历 dynamicChildren 进行 patch。
   * dynamicChildren 中的每个节点按索引一一对应（顺序稳定），
   * 跳过所有静态子树的 diff。
   */
  function patchBlockChildren(
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // FIX: P1-08 dynamicChildren 非空断言改为条件检查，
    // 避免在 dynamicChildren 为 null/undefined 时抛出运行时错误
    const oldDynamicChildren = n1.dynamicChildren;
    const newDynamicChildren = n2.dynamicChildren;

    if (!oldDynamicChildren || !newDynamicChildren) return;

    for (let i = 0; i < newDynamicChildren.length; i++) {
      const oldVNode = oldDynamicChildren[i];
      const newVNode = newDynamicChildren[i]!;

      // FIX: P2-5 VDOM-NEW-12 - 静态提升优化：检查是否可以直接复用静态节点
      if (oldVNode && patchStaticVNode(oldVNode, newVNode, container, parentComponent, parentSuspense, isSVG)) {
        continue; // 静态节点已复用，跳过 diff
      }

      if (oldVNode && isSameVNodeType(oldVNode, newVNode)) {
        // 同类型节点：走 patch 更新路径
        patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG);
      } else {
        // 类型不同或旧节点不存在：卸载旧的，挂载新的
        if (oldVNode) {
          unmount(oldVNode, parentComponent, parentSuspense, true);
        }
        patch(null, newVNode, container, null, parentComponent, parentSuspense, isSVG);
      }
    }

    // 卸载多余的旧 dynamicChildren
    if (oldDynamicChildren.length > newDynamicChildren.length) {
      for (let i = newDynamicChildren.length; i < oldDynamicChildren.length; i++) {
        unmount(oldDynamicChildren[i]!, parentComponent, parentSuspense, true);
      }
    }
  }

  // ============================================================
  // patchChildren
  // ============================================================

  function patchChildren(
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    const c1 = n1.children as VNode[] | string | null;
    const c2 = n2.children as VNode[] | string | null;
    const { shapeFlag: prevShapeFlag } = n1;
    const { shapeFlag: nextShapeFlag } = n2;

    if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // New children are text
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // Old children were array - unmount all
        unmountChildren(c1 as VNode[], parentComponent, parentSuspense);
      }
      // Always set new text (DOM was potentially cleared by unmountChildren above)
      // FIX: P2-11 添加运行时类型检查，避免不安全的类型断言。
      // container 的实际类型为 HN，而 setElementText 期望 HE（HN 的子类型）。
      // 使用运行时检查确保 container 是元素类型，如果不是则跳过操作。
      if (container && typeof container === 'object' && 'nodeType' in container) {
        setElementText(container as HE, String(c2 ?? ''));
      } else if (__DEV__) {
        warn(`[lytjs/patch-children] setElementText called with invalid container: ${String(container)}`);
      }
    } else {
      // New children are array (or null)
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // Old children were text - clear it
        // FIX: P2-11 添加运行时类型检查
        if (container && typeof container === 'object' && 'nodeType' in container) {
          setElementText(container as HE, '');
        }
      }

      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // Both are arrays - diff
          diffChildren(
            c1 as VNode[],
            c2 as VNode[],
            container,
            parentComponent,
            parentSuspense,
            isSVG,
          );
        } else {
          // New children are null - unmount all old
          unmountChildren(c1 as VNode[], parentComponent, parentSuspense);
        }
      } else if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // Old children were null/none - mount new array
        mountChildren(n2, container, null, isSVG, parentComponent, parentSuspense);
      }
    }
  }

  // ============================================================
  // mountChildren
  // ============================================================

  function mountChildren(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
    parentComponent: ComponentInternalInstance | null = null,
    parentSuspense: SuspenseBoundary | null = null,
  ): void {
    const children = vnode.children;
    if (!isArray(children)) return;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG);
      }
    }
  }

  // ============================================================
  // unmountChildren
  // ============================================================

  function unmountChildren(
    children: VNode[],
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ): void {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]!, parentComponent, parentSuspense, true);
    }
  }

  // ============================================================
  // diffChildrenInternal - 委托给 list-diff 模块
  // ============================================================

  function diffChildrenInternal(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    fallbackAnchor: HN | null,
  ): void {
    // FIX: P0-04 传递 opsId 以支持多渲染器场景下的 DOM 操作隔离
    listDiffPatchKeyedChildren(
      c1,
      c2,
      container,
      parentComponent,
      parentSuspense,
      isSVG,
      fallbackAnchor,
      undefined,
      ctx.opsId,
    );
  }

  // ============================================================
  // diffChildren - keyed diff with LIS optimization
  // ============================================================

  function diffChildren(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    diffChildrenInternal(c1, c2, container, parentComponent, parentSuspense, isSVG, null);
  }

  return {
    patchChildren,
    patchBlockChildren,
    mountChildren,
    unmountChildren,
    diffChildren,
    diffChildrenInternal,
  };
}
