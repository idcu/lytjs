/**
 * @lytjs/vdom - patch-fragment
 *
 * Fragment vnode 的挂载、更新和卸载逻辑。
 * 包含 mountFragment、patchFragment、unmountFragment 以及
 * diffStableFragment、diffUnkeyedFragment、diffChildrenFragment 等 diff 策略函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { PatchFlags, isSameVNodeType } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';
import { cloneIfMounted } from './vnode';

// ============================================================
// Fragment patch 工厂
// ============================================================

export interface FragmentPatchAPI<HN, _HE extends HN> {
  mountFragment: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  patchFragment: (
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  unmountFragment: (
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ) => void;
}

/**
 * 创建 fragment 相关的 patch 函数集合。
 */
export function createFragmentPatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): FragmentPatchAPI<HN, HE> {
  const {
    createComment,
    insert,
    remove: hostRemove,
    setVNodeEl,
    getVNodeEl,
    patch,
    unmount,
    unmountChildren,
  } = ctx;

  // ============================================================
  // mountFragment
  // ============================================================

  function mountFragment(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    const fragmentStartAnchor = createComment('');
    const fragmentEndAnchor = createComment('');
    setVNodeEl(vnode, fragmentStartAnchor);
    vnode.anchor = fragmentEndAnchor as unknown as Node | null;

    // ⚠️ 2026-11-04 修（P1）：水合时锚点的**位置**与**登记**都要特殊处理。
    //
    //   旧行为：两个锚点都 `insert(..., anchor)` —— 水合时 `anchor` 是 `null`
    //   ⇒ 两个锚点被**追加到容器末尾**，落在所有既有子节点之后。于是
    //   `vnode.el`（= 起始锚点）指向片段的**末尾**，`unmountFragment` 按它往后走
    //   就一个子节点都摘不到；`patchFragment` 的插入点也错位。
    //   实测（2026-11-04，SSR 三个根 / 客户端两个根）：残留根删不掉、锚点停在末尾。
    //
    //   水合时：起始锚点插到**第一个既有子节点之前**（片段真正的起点），
    //   结束锚点用调用方给的 `anchor`（根片段即容器末尾）；并把两个锚点登记为
    //   「已认领」，否则会被「未认领节点清理」当成服务端残留删掉
    //   （删掉后片段的更新/卸载会失去定位基准）。
    if (ctx.hydrating) {
      const firstExisting = ctx.getChildNodes?.(container)[0] ?? anchor;
      insert(fragmentStartAnchor, container, firstExisting);
      insert(fragmentEndAnchor, container, anchor);
      ctx.hydrateUsed.add(fragmentStartAnchor);
      ctx.hydrateUsed.add(fragmentEndAnchor);
    } else {
      insert(fragmentStartAnchor, container, anchor);
      insert(fragmentEndAnchor, container, anchor);
    }

    // 在锚点之间挂载 children
    const children = isArray(vnode.children) ? vnode.children : [];
    for (let i = 0; i < children.length; i++) {
      const rawChild = children[i];
      if (rawChild != null) {
        // 同 mountChildren：提升子节点跨实例复用时先克隆，写回数组供卸载使用。
        const child = cloneIfMounted(rawChild);
        if (child !== rawChild) children[i] = child;
        patch(null, child, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG);
      }
    }

    // ⚠️ 2026-11-04 修（P1）：水合时把结束锚点**收到最后一个已认领子节点之后**。
    //
    //   挂载前它被放在容器末尾（或调用方给的 anchor），而容器里可能还有
    //   不属于本片段的服务端内容（`<script type="application/json">`、多出来的根）。
    //   锚点留在它们后面会带来两个后果：
    //     · 之后新建的子节点插到锚点之前 ⇒ 跑到那些内容**后面**，顺序错；
    //     · `unmountFragment` 从起始锚点走到结束锚点逐个删除 ⇒ 把那些内容一起删掉。
    //   挂载完成后，「第一个未认领节点」正是片段的**右边界**。
    if (ctx.hydrating) {
      const childNodes = ctx.getChildNodes?.(container) ?? [];
      const boundary = childNodes.find((node) => !ctx.hydrateUsed.has(node)) ?? null;
      insert(fragmentEndAnchor, container, boundary);
    }
  }

  // ============================================================
  // patchFragment
  // ============================================================

  function patchFragment(
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // 复用已有的 fragment 锚点
    n2.el = n1.el;
    const endAnchor = n1.anchor;
    if (!endAnchor) return;
    n2.anchor = endAnchor;

    const c1 = n1.children as VNode[] | null;
    const c2 = n2.children as VNode[] | null;

    // Fragment 的两者都应该是数组
    if (isArray(c1) && isArray(c2)) {
      // 根据 fragment patchFlag 选择 diff 策略
      if (n2.patchFlag & PatchFlags.STABLE_FRAGMENT) {
        // STABLE_FRAGMENT: children order never changes, patch by index directly
        diffStableFragment(
          c1,
          c2,
          container,
          endAnchor as HN,
          parentComponent,
          parentSuspense,
          isSVG,
        );
      } else if (n2.patchFlag & PatchFlags.KEYED_FRAGMENT) {
        // KEYED_FRAGMENT: children have keys, use keyed diff algorithm
        diffChildrenFragment(
          c1,
          c2,
          container,
          endAnchor as HN,
          parentComponent,
          parentSuspense,
          isSVG,
        );
      } else if (n2.patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
        // UNKEYED_FRAGMENT: children have no keys, use simple sync-from-start strategy
        diffUnkeyedFragment(
          c1,
          c2,
          container,
          endAnchor as HN,
          parentComponent,
          parentSuspense,
          isSVG,
        );
      } else {
        // 无 fragment 特定的 patchFlag，使用默认 keyed diff
        diffChildrenFragment(
          c1,
          c2,
          container,
          endAnchor as HN,
          parentComponent,
          parentSuspense,
          isSVG,
        );
      }
    } else if (isArray(c2)) {
      // 旧为 null/空，在结束锚点前挂载所有新节点
      for (let i = 0; i < c2.length; i++) {
        const rawChild = c2[i]!;
        const child = cloneIfMounted(rawChild);
        if (child !== rawChild) c2[i] = child;
        patch(null, child, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      }
    } else if (isArray(c1)) {
      // 新为 null/空，卸载所有旧节点
      unmountChildren(c1, parentComponent, parentSuspense);
    }
  }

  // ============================================================
  // diffStableFragment - STABLE_FRAGMENT: patch by index, skip key comparison
  // ============================================================

  /**
   * 取 fragment 内第 `index` 个子节点的「原位插入点」。
   *
   * ⚠️ 2026-11-13 修（P1-5）：此前按索引 patch 一律传 `anchor = null`，
   *   `insertBefore(node, null)` 等价于 append ⇒ 子节点类型变化（`<p>`→`<em>`）
   *   时新节点会跑到**整个容器末尾**（越过 fragment 结束锚点与后续兄弟）。
   *   这里用「下一个旧子节点的首节点」作为插入点；最后一个用 fragment 结束锚点。
   *   旧子节点尚未被本轮回调改动，`el` 仍然有效，因此不依赖宿主提供 nextSibling。
   */
  function getChildInsertAnchor(c1: VNode[], index: number, endAnchor: HN): HN {
    const next = c1[index + 1];
    return ((next?.el as HN | null) ?? endAnchor) as HN;
  }

  function diffStableFragment(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    endAnchor: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    const commonLength = Math.min(c1.length, c2.length);
    // 按索引 patch 公共前缀（无需 key 比较）
    for (let i = 0; i < commonLength; i++) {
      patch(
        c1[i]!,
        c2[i]!,
        container,
        getChildInsertAnchor(c1, i, endAnchor),
        parentComponent,
        parentSuspense,
        isSVG,
      );
    }
    // 挂载额外的新 children
    if (c2.length > c1.length) {
      for (let i = commonLength; i < c2.length; i++) {
        patch(null, c2[i]!, container, endAnchor, parentComponent, parentSuspense, isSVG);
      }
    }
    // 卸载额外的旧 children
    else if (c1.length > c2.length) {
      for (let i = commonLength; i < c1.length; i++) {
        unmount(c1[i]!, parentComponent, parentSuspense, true);
      }
    }
  }

  // ============================================================
  // diffUnkeyedFragment - UNKEYED_FRAGMENT: simple sync-from-start strategy
  // ============================================================

  function diffUnkeyedFragment(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    endAnchor: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // 从头同步：按索引 patch 相同类型的节点
    let i = 0;
    const l1 = c1.length;
    const l2 = c2.length;

    while (i < l1 && i < l2) {
      if (isSameVNodeType(c1[i]!, c2[i]!)) {
        patch(
          c1[i]!,
          c2[i]!,
          container,
          getChildInsertAnchor(c1, i, endAnchor),
          parentComponent,
          parentSuspense,
          isSVG,
        );
      } else {
        // 类型不匹配：卸载旧的，挂载新的（插回原位置，见 getChildInsertAnchor）
        const insertAnchor = getChildInsertAnchor(c1, i, endAnchor);
        unmount(c1[i]!, parentComponent, parentSuspense, true);
        patch(null, c2[i]!, container, insertAnchor, parentComponent, parentSuspense, isSVG);
      }
      i++;
    }

    // 挂载剩余的新 children
    while (i < l2) {
      patch(null, c2[i]!, container, endAnchor, parentComponent, parentSuspense, isSVG);
      i++;
    }

    // 卸载剩余的旧 children
    while (i < l1) {
      unmount(c1[i]!, parentComponent, parentSuspense, true);
      i++;
    }
  }

  // ============================================================
  // diffChildrenFragment - like diffChildren but uses endAnchor as fallback
  // ============================================================

  function diffChildrenFragment(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    endAnchor: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    ctx.diffChildrenInternal(c1, c2, container, parentComponent, parentSuspense, isSVG, endAnchor);
  }

  // ============================================================
  // unmountFragment
  // ============================================================

  function unmountFragment(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ): void {
    const { children } = vnode;
    if (isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        unmount(children[i]!, parentComponent, parentSuspense, doRemove);
      }
    }

    if (doRemove) {
      // 移除 fragment 锚点
      const vEl = getVNodeEl(vnode);
      if (vEl) {
        hostRemove(vEl);
      }
      if (vnode.anchor && vnode.anchor !== vnode.el) {
        hostRemove(vnode.anchor as unknown as HN);
      }
    }
  }

  return {
    mountFragment,
    patchFragment,
    unmountFragment,
  };
}
