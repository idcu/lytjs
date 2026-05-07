/**
 * @lytjs/vdom - patch-suspense
 *
 * Suspense vnode 的挂载、更新和卸载逻辑。
 * 包含 mountSuspense、patchSuspense、unmountSuspense、resolveSuspenseChildren 函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { isSameVNodeType } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';

// FIX: P2-20 删除冗余 __DEV__ 局部声明（env.d.ts 已全局声明）

/** FIX: P2-14 fallback 层级限制，防止无限嵌套 suspense */
const MAX_SUSPENSE_DEPTH = 10;
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';

// ============================================================
// 跨包 linker 注册（避免循环依赖）
// ============================================================

type SuspenseLinkerFn = (
  asyncState: unknown,
  vnodeBoundary: SuspenseBoundary,
  domSwitch: (boundary: unknown, toFallback: boolean) => void,
) => void;

let suspenseLinker: SuspenseLinkerFn | null = null;

/**
 * 注册一个 linker 函数，连接 vdom 层的 SuspenseBoundary
 * 和 component 层的 SuspenseAsyncState。
 *
 * 由 @lytjs/component 在初始化时调用以避免循环导入。
 */
export function registerSuspenseLinker(linker: SuspenseLinkerFn): void {
  suspenseLinker = linker;
}

// ============================================================
// Suspense patch 工厂
// ============================================================

export interface SuspensePatchAPI<HN, _HE extends HN> {
  mountSuspense: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  patchSuspense: (
    n1: VNode,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  unmountSuspense: (
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ) => void;
  resolveSuspenseChildren: (
    children: VNode['children'],
  ) => { defaultBranch: VNode | null; fallbackBranch: VNode | null };
}

/**
 * 创建 suspense 相关的 patch 函数集合。
 */
export function createSuspensePatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): SuspensePatchAPI<HN, HE> {
  const {
    createComment,
    insert,
    remove: hostRemove,
    setVNodeEl,
    getVNodeEl,
    patch,
    unmount,
  } = ctx;

  // ============================================================
  // resolveSuspenseChildren
  // ============================================================

  /**
   * 从 vnode children 中提取 default 和 fallback 分支。
   * Children 可以是：
   * - VNode[]（仅 default slot，无 fallback）
   * - { default: VNode[], fallback?: VNode[] }（命名 slots）
   */
  function resolveSuspenseChildren(
    children: VNode['children'],
  ): { defaultBranch: VNode | null; fallbackBranch: VNode | null } {
    if (isArray(children)) {
      // VNode[]：视为 default slot，无 fallback
      return {
        defaultBranch: children[0] ?? null,
        fallbackBranch: null,
      };
    }

    if (children && typeof children === 'object' && !isArray(children)) {
      // Slot 对象：{ default: VNode[], fallback?: VNode[] }
      const slots = children as Record<string, VNode[]>;
      const defaultSlot = slots.default;
      const fallbackSlot = slots.fallback;
      return {
        defaultBranch: isArray(defaultSlot) ? (defaultSlot[0] ?? null) : null,
        fallbackBranch: isArray(fallbackSlot) ? (fallbackSlot[0] ?? null) : null,
      };
    }

    return { defaultBranch: null, fallbackBranch: null };
  }

  // ============================================================
  // mountSuspense
  // ============================================================

  function mountSuspense(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    _parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // FIX: P2-14 计算 suspense 嵌套深度，超过阈值时发出警告
    // FIX: P1-5 正确遍历组件祖先链查找 suspense boundary，
    // 而非使用 parent.parent.suspense（始终为 undefined）
    let depth = 0;
    let currentParent = parentComponent;
    while (currentParent) {
      // 检查当前组件的 vnode 是否关联了 suspense boundary
      if (currentParent.vnode?.suspense) {
        depth++;
      }
      currentParent = currentParent.parent;
    }
    if (__DEV__ && depth > MAX_SUSPENSE_DEPTH) {
      console.warn(
        `[lytjs/patch-suspense] Suspense 嵌套深度(${depth})超过阈值(${MAX_SUSPENSE_DEPTH})，` +
        `可能导致性能问题。建议减少嵌套层级或使用其他方式组织异步逻辑。`
      );
    }

    // 创建 SuspenseBoundary 并存储在 vnode 上
    const boundary: SuspenseBoundary = {
      vnode,
      parent: parentComponent,
      parentComponent,
      isSVG,
      container,
      anchor,
      activeBranch: null,
      pendingBranch: null,
      isInFallback: false,
      isHydrating: false,
      effects: [],
    };

    vnode.suspense = boundary;

    // 将 vdom 层的 SuspenseBoundary 与 component 层的 SuspenseAsyncState 关联
    // 如果 linker 已由 @lytjs/component 注册。
    if (suspenseLinker && vnode.component) {
      const setupState = (vnode.component as ComponentInternalInstance).setupState;
      if (setupState && typeof setupState === 'object' && 'boundary' in setupState) {
        const asyncState = setupState.boundary;
        if (asyncState && typeof asyncState === 'object') {
          suspenseLinker(asyncState, boundary, (_boundary: unknown, toFallback: boolean) => {
            // domSwitch：在 default 和 fallback 分支之间切换
            const b = _boundary as { vnodeBoundary?: SuspenseBoundary & { isInFallback: boolean } };
            const vb = b.vnodeBoundary;
            if (!vb) return;
            if (toFallback && !vb.isInFallback) {
              // 切换到 fallback：由下次更新的 patchSuspense 处理
              vb.isInFallback = true;
            } else if (!toFallback && vb.isInFallback) {
              // 切换回 default：由下次更新的 patchSuspense 处理
              vb.isInFallback = false;
            }
          });
        }
      }
    }

    // 从 children 中解析 default 和 fallback 分支
    const { defaultBranch, fallbackBranch } = resolveSuspenseChildren(vnode.children);

    // 检查 default 分支是否包含异步组件
    const isAsync = defaultBranch?.isAsyncPlaceholder === true;

    if (isAsync && fallbackBranch) {
      // 异步内容：将 fallback 作为 pendingBranch 挂载
      boundary.isInFallback = true;
      boundary.pendingBranch = defaultBranch;
      boundary.activeBranch = null;

      // 挂载 fallback 内容
      patch(null, fallbackBranch, container, anchor, parentComponent, boundary, isSVG);
      vnode.el = fallbackBranch.el;
    } else {
      // 同步内容：将 default 作为 activeBranch 挂载
      boundary.activeBranch = defaultBranch;

      if (defaultBranch) {
        patch(null, defaultBranch, container, anchor, parentComponent, boundary, isSVG);
        vnode.el = defaultBranch.el;
      }
    }

    // 如果没有设置 el，创建占位注释节点
    if (!vnode.el) {
      const placeholder = createComment('');
      setVNodeEl(vnode, placeholder);
      insert(placeholder, container, anchor);
    }
  }

  // ============================================================
  // patchSuspense
  // ============================================================

  function patchSuspense(
    n1: VNode,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // 复用已有的 boundary
    const boundary = n1.suspense as SuspenseBoundary | undefined;
    if (boundary) {
      n2.suspense = boundary;
      boundary.vnode = n2;
    }

    n2.el = n1.el;

    // 解析新的 children
    const { defaultBranch: newDefault, fallbackBranch: newFallback } =
      resolveSuspenseChildren(n2.children);

    // 检查是否需要从 pending 过渡到 resolved
    const wasInFallback = boundary?.isInFallback ?? false;
    const isAsync = newDefault?.isAsyncPlaceholder === true;

    if (wasInFallback && !isAsync) {
      // 过渡：pending -> resolved
      // 卸载 fallback（pendingBranch 显示）并挂载 active 内容
      if (boundary) {
        boundary.isInFallback = false;
        boundary.activeBranch = newDefault;
        boundary.pendingBranch = null;
      }

      // 卸载旧的 fallback 内容（作为 pending branch 显示）
      if (!isArray(n1.children) && n1.children && typeof n1.children === 'object') {
        const slots = n1.children as Record<string, VNode[]>;
        const fallbackSlot = slots.fallback;
        if (isArray(fallbackSlot) && fallbackSlot[0]) {
          unmount(fallbackSlot[0], parentComponent, parentSuspense, true);
        }
      }

      // 挂载新的 active 内容
      if (newDefault) {
        patch(null, newDefault, container, anchor, parentComponent, boundary ?? parentSuspense, isSVG);
        n2.el = newDefault.el;
      }
    } else if (!wasInFallback && isAsync && newFallback) {
      // 过渡：resolved -> pending
      // 卸载 active 内容并挂载 fallback
      if (boundary) {
        boundary.isInFallback = true;
        boundary.pendingBranch = newDefault;
      }

      // 卸载旧的 active 内容（清除前保存引用）
      const oldActive = boundary?.activeBranch ?? null;
      if (boundary) {
        boundary.activeBranch = null;
      }
      if (oldActive) {
        unmount(oldActive, parentComponent, parentSuspense, true);
      }

      // 挂载 fallback
      patch(null, newFallback, container, anchor, parentComponent, boundary ?? parentSuspense, isSVG);
      n2.el = newFallback.el;
    } else {
      // 无状态过渡：正常 patch active 分支
      const oldActive = n1.children as VNode[] | null;
      const newActive = n2.children as VNode[] | null;

      if (isArray(oldActive) && isArray(newActive)) {
        const oldBranch = oldActive[0] ?? null;
        const newBranch = newActive[0] ?? null;

        if (oldBranch && newBranch && isSameVNodeType(oldBranch, newBranch)) {
          patch(oldBranch, newBranch, container, anchor, parentComponent, parentSuspense, isSVG);
        } else {
          if (oldBranch) {
            unmount(oldBranch, parentComponent, parentSuspense, true);
          }
          if (newBranch) {
            patch(null, newBranch, container, anchor, parentComponent, parentSuspense, isSVG);
          }
        }

        if (boundary) {
          boundary.activeBranch = newBranch;
        }
      }
    }
  }

  // ============================================================
  // unmountSuspense
  // ============================================================

  function unmountSuspense(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ): void {
    // FIX: P1-14 添加 unmountedSet 防止重复卸载，
    // 避免在 activeBranch 和 fallbackBranch 指向同一 VNode 时重复卸载
    const unmountedSet = new Set<VNode>();

    const safeUnmount = (v: VNode) => {
      if (unmountedSet.has(v)) return;
      unmountedSet.add(v);
      unmount(v, parentComponent, parentSuspense, doRemove);
    };

    const boundary = vnode.suspense as SuspenseBoundary | undefined;

    // 卸载 active 分支
    if (boundary?.activeBranch) {
      safeUnmount(boundary.activeBranch);
    }

    // 卸载 pending 分支（如果仍然挂载）
    if (boundary?.pendingBranch) {
      safeUnmount(boundary.pendingBranch);
    }

    // 同时卸载 vnode.children 中剩余的 children
    // （可能已挂载的 fallback 内容）
    const { fallbackBranch: unmountFallback } = resolveSuspenseChildren(vnode.children);
    if (boundary?.isInFallback && unmountFallback) {
      // Fallback 已挂载，卸载它
      // （如果已通过上面的 activeBranch 跟踪，可能已被卸载）
      if (unmountFallback.el) {
        safeUnmount(unmountFallback);
      }
    }

    // 清理 boundary
    if (boundary) {
      boundary.activeBranch = null;
      boundary.pendingBranch = null;
      boundary.effects = [];
    }

    if (doRemove) {
      const vEl = getVNodeEl(vnode);
      if (vEl) hostRemove(vEl);
    }
  }

  return {
    mountSuspense,
    patchSuspense,
    unmountSuspense,
    resolveSuspenseChildren,
  };
}
