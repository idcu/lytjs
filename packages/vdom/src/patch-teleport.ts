/**
 * @lytjs/vdom - patch-teleport
 *
 * Teleport vnode 的挂载、更新、卸载和移动逻辑。
 * 包含 mountTeleport、patchTeleport、unmountTeleport、moveTeleport 函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { isArray, isString, EMPTY_OBJ } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';

// ============================================================
// Teleport patch factory
// ============================================================

export interface TeleportPatchAPI<HN, _HE extends HN> {
  mountTeleport: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  patchTeleport: (
    n1: VNode,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  unmountTeleport: (
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ) => void;
  moveTeleport: (vnode: VNode, container: HN, anchor: HN | null) => void;
}

/**
 * 创建 teleport 相关的 patch 函数集合。
 */
export function createTeleportPatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): TeleportPatchAPI<HN, HE> {
  const {
    createComment,
    insert,
    remove: hostRemove,
    setVNodeEl,
    getVNodeEl,
    patch,
    unmount,
    move,
    mountChildren,
    querySelector,
  } = ctx;

  // ============================================================
  // mountTeleport
  // ============================================================

  function mountTeleport(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    const { props } = vnode;
    const to = props?.to as string | HE | undefined;
    const disabled = !!props?.disabled;

    if (disabled) {
      // When disabled, mount children directly into the container
      mountChildren(vnode, container, anchor, isSVG, parentComponent, parentSuspense);
      // Store a placeholder comment in container
      const placeholder = createComment('');
      setVNodeEl(vnode, placeholder);
      vnode.targetAnchor = null;
      insert(placeholder, container, anchor);
    } else {
      // Resolve target container
      let target: HE | null = null;
      if (isString(to)) {
        target = querySelector ? querySelector(to) : null;
      } else if (to && typeof to === 'object') {
        target = to as HE;
      }

      if (!target) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          warn(`Teleport target "${String(to)}" not found. Mounting children in place.`);
        }
        mountChildren(vnode, container, anchor, isSVG, parentComponent, parentSuspense);
        const placeholder = createComment('');
        setVNodeEl(vnode, placeholder);
        vnode.targetAnchor = null;
        insert(placeholder, container, anchor);
        return;
      }

      // Create anchor nodes in the target container
      const targetStart = createComment('teleport start');
      const targetEnd = createComment('teleport end');
      insert(targetStart, target, null);
      insert(targetEnd, target, null);

      // Mount children between the target anchors
      const children = isArray(vnode.children) ? vnode.children : [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child != null) {
          patch(null, child, target, targetEnd, parentComponent, parentSuspense, isSVG);
        }
      }

      // Create placeholder comment in the original container
      const placeholder = createComment('');
      insert(placeholder, container, anchor);

      // Store references on vnode
      setVNodeEl(vnode, placeholder);
      vnode.target = target as unknown as Element | null;
      vnode.targetAnchor = targetEnd as unknown as Node | null;
      vnode.targetStart = targetStart as unknown as Node | null;
    }
  }

  function patchTeleport(
    n1: VNode,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    const oldProps = n1.props ?? EMPTY_OBJ;
    const newProps = n2.props ?? EMPTY_OBJ;
    const oldDisabled = !!oldProps.disabled;
    const newDisabled = !!newProps.disabled;
    const oldTo = oldProps.to as string | HE | undefined;
    const newTo = newProps.to as string | HE | undefined;

    // Reuse the placeholder el
    n2.el = n1.el;
    n2.target = n1.target;
    n2.targetAnchor = n1.targetAnchor;
    n2.targetStart = n1.targetStart;

    // Case 1: target changed (and not disabled)
    if (!newDisabled && oldTo !== newTo) {
      // Resolve new target
      let newTarget: HE | null = null;
      if (isString(newTo)) {
        newTarget = querySelector ? querySelector(newTo) : null;
      } else if (newTo && typeof newTo === 'object') {
        newTarget = newTo as HE;
      }

      if (newTarget) {
        // Create new anchors in the new target
        const targetStart = createComment('teleport start');
        const targetEnd = createComment('teleport end');
        insert(targetStart, newTarget, null);
        insert(targetEnd, newTarget, null);

        // Move children from old target to new target
        const children = isArray(n2.children) ? n2.children : [];
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (child != null) {
            move(child, newTarget, targetEnd, parentComponent, parentSuspense);
          }
        }

        // Remove old target anchors
        if (n1.targetStart) hostRemove(n1.targetStart as unknown as HN);
        if (n1.targetAnchor) hostRemove(n1.targetAnchor as unknown as HN);

        n2.target = newTarget as unknown as Element | null;
        n2.targetAnchor = targetEnd as unknown as Node | null;
        n2.targetStart = targetStart as unknown as Node | null;
      }
    }
    // Case 2: disabled -> enabled or enabled -> disabled
    else if (oldDisabled !== newDisabled) {
      if (newDisabled) {
        // Was enabled, now disabled: move children from target back to container
        const children = isArray(n2.children) ? n2.children : [];
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (child != null) {
            move(child, container, anchor, parentComponent, parentSuspense);
          }
        }
        if (n1.targetStart) hostRemove(n1.targetStart as unknown as HN);
        if (n1.targetAnchor) hostRemove(n1.targetAnchor as unknown as HN);
        n2.target = null;
        n2.targetAnchor = null;
        n2.targetStart = null;
      } else {
        // Was disabled, now enabled: re-mount as teleport
        mountTeleport(n2, container, anchor, parentComponent, parentSuspense, isSVG);
        return;
      }
    }

    // Patch children
    const c1 = n1.children as VNode[] | null;
    const c2 = n2.children as VNode[] | null;
    if (isArray(c1) && isArray(c2)) {
      const patchContainer = newDisabled ? container : ((n2.target as unknown as HN) ?? container);
      const patchAnchor = newDisabled ? anchor : (n2.targetAnchor as unknown as HN | null);
      ctx.diffChildrenInternal(
        c1,
        c2,
        patchContainer,
        parentComponent,
        parentSuspense,
        isSVG,
        patchAnchor,
      );
    }
  }

  function unmountTeleport(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ): void {
    // Unmount children
    const children = isArray(vnode.children) ? vnode.children : [];
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]!, parentComponent, parentSuspense, doRemove);
    }

    if (doRemove) {
      // Remove target anchors
      if (vnode.targetStart) hostRemove(vnode.targetStart as unknown as HN);
      if (vnode.targetAnchor) hostRemove(vnode.targetAnchor as unknown as HN);
      // Remove placeholder in container
      const vEl = getVNodeEl(vnode);
      if (vEl) hostRemove(vEl);
    }
  }

  function moveTeleport(vnode: VNode, container: HN, anchor: HN | null): void {
    // Only move the placeholder comment node in the container.
    // The children in the target container stay in place.
    const vEl = getVNodeEl(vnode);
    if (vEl) {
      insert(vEl, container, anchor);
    }
  }

  return {
    mountTeleport,
    patchTeleport,
    unmountTeleport,
    moveTeleport,
  };
}
