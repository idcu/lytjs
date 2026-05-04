/**
 * @lytjs/vdom - patch
 * Core patch logic with platform-agnostic renderer host
 */

import {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
  isSameVNodeType,
} from '@lytjs/common-vnode';
import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { isArray, isFunction, hasChanged, EMPTY_OBJ, isString } from '@lytjs/common-is';
import { warn, error } from '@lytjs/common-error';
import type { RendererHost } from '@lytjs/host-contract';
import type { RendererOptions, SuspenseBoundary } from './types';
import {
  registerDOMOperations,
  patchKeyedChildren as listDiffPatchKeyedChildren,
} from './list-diff';
import type { DOMOperations } from './list-diff';

// ============================================================
// RendererHost adapter: wraps a RendererHost into RendererOptions shape
// ============================================================

/**
 * Adapt a RendererHost to the internal RendererOptions-like shape used by createRenderer.
 * This bridges the gap between RendererHost's patchProp(el, key, prev, next, isSVG?)
 * and the internal need for a simpler patchProp(el, key, prev, next).
 */
function hostToOptions<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
): {
  createElement: (type: string) => HE;
  setElementText: (node: HE, text: string) => void;
  insert: (child: HN, parent: HN, anchor?: HN | null) => void;
  remove: (child: HN) => void;
  createText: (text: string) => HN;
  setText: (node: HN, text: string) => void;
  patchProp: (el: HE, key: string, prevValue: unknown, nextValue: unknown) => void;
  createComment: (text: string) => HN;
  querySelector: (selector: string) => HE | null;
  nextSibling: (node: HN) => HN | null;
  parentNode: (node: HN) => HN | null;
} {
  return {
    createElement: (type: string) => host.createElement(type),
    setElementText: (node, text) => host.setElementText(node, text),
    insert: (child, parent, anchor) => host.insert(child, parent, anchor),
    remove: (child) => host.remove(child),
    createText: (text) => host.createText(text),
    setText: (node, text) => host.setText(node, text),
    patchProp: (el, key, prevValue, nextValue) => host.patchProp(el, key, prevValue, nextValue),
    createComment: (text) => host.createComment(text),
    querySelector: (selector) => host.querySelector(selector),
    nextSibling: (node) => host.nextSibling(node),
    parentNode: (node) => host.parentNode(node),
  };
}

/**
 * Adapt legacy RendererOptions to the internal shape used by createRenderer.
 */
function optionsToInternal<HN, HE extends HN>(
  options: RendererOptions<HN, HE>,
): {
  createElement: (type: string) => HE;
  setElementText: (node: HE, text: string) => void;
  insert: (child: HN, parent: HN, anchor?: HN | null) => void;
  remove: (child: HN) => void;
  createText: (text: string) => HN;
  setText: (node: HN, text: string) => void;
  patchProp: (el: HE, key: string, prevValue: unknown, nextValue: unknown) => void;
  createComment: (text: string) => HN;
  querySelector: ((selector: string) => HE | null) | undefined;
  nextSibling: (node: HN) => HN | null;
  parentNode: (node: HN) => HN | null;
} {
  return {
    createElement: (type) => options.createElement(type),
    setElementText: (node, text) => options.setElementText(node, text),
    insert: (child, parent, anchor) => options.insert(child, parent, anchor),
    remove: (child) => options.remove(child),
    createText: (text) => options.createText(text),
    setText: (node, text) => options.setText(node, text),
    patchProp: (el, key, prevValue, nextValue) =>
      options.patchProp(el, key, prevValue, nextValue),
    createComment: (text) => options.createComment(text),
    querySelector: options.querySelector
      ? (selector) => options.querySelector!(selector)
      : undefined,
    nextSibling: (node) => options.nextSibling(node),
    parentNode: (node) => options.parentNode(node),
  };
}

// ============================================================
// Renderer factory
// ============================================================

/**
 * Create a renderer with the given RendererHost.
 * Returns patch, mount, and unmount functions.
 *
 * This is the primary signature — fully platform-agnostic.
 */
export function createRenderer<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
): {
  patch(
    n1: VNode | null,
    n2: VNode,
    container: HN,
    anchor?: HN | null,
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
    isSVG?: boolean,
  ): void;
  mount(vnode: VNode, container: HN): void;
  unmount(vnode: VNode): void;
  move(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ): void;
  diffChildren(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void;
};

/**
 * @deprecated Use createRenderer(host: RendererHost) instead.
 * Legacy signature accepting RendererOptions for backward compatibility.
 */
export function createRenderer<HN, HE extends HN>(
  options: RendererOptions<HN, HE>,
): {
  patch(
    n1: VNode | null,
    n2: VNode,
    container: HN,
    anchor?: HN | null,
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
    isSVG?: boolean,
  ): void;
  mount(vnode: VNode, container: HN): void;
  unmount(vnode: VNode): void;
  move(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ): void;
  diffChildren(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void;
};

export function createRenderer<HN, HE extends HN>(
  hostOrOptions: RendererHost<HN, HE> | RendererOptions<HN, HE>,
) {
  // Detect whether we received a RendererHost or legacy RendererOptions
  const isHost = 'addClass' in hostOrOptions && 'getBoundingClientRect' in hostOrOptions;
  const internal = isHost
    ? hostToOptions(hostOrOptions as RendererHost<HN, HE>)
    : optionsToInternal(hostOrOptions as RendererOptions<HN, HE>);

  const {
    createElement,
    setElementText,
    insert,
    remove: hostRemove,
    createText,
    setText,
    patchProp,
    createComment,
    querySelector,
  } = internal;

  // Helper: assign host node to vnode.el (VNode.el is typed as Node | null in common-vnode,
  // but we work with generic HN here, so we need a type assertion)
  const setVNodeEl = (vnode: VNode, el: HN | null) => { vnode.el = el as unknown as Node | null; };
  const getVNodeEl = (vnode: VNode): HN | null => vnode.el as unknown as HN | null;

  // ============================================================
  // patch - core diffing entry point
  // ============================================================

  function patch(
    n1: VNode | null,
    n2: VNode,
    container: HN,
    anchor: HN | null = null,
    parentComponent: ComponentInternalInstance | null = null,
    parentSuspense: SuspenseBoundary | null = null,
    isSVG: boolean = false,
  ): void {
    // 第一次检查：判断 n1 是否可以复用（同类型）。
    // 如果 n1.el 为 null（例如之前被卸载），则将 n1 置为 null 以走挂载逻辑。
    if (n1 !== null && isSameVNodeType(n1, n2)) {
      if (n1.el === null) {
        n1 = null;
      }
    }

    // 第二次检查：在 n1 可能被置为 null 之后，再次判断是否走 patch 路径。
    // 两次检查是必要的：第一次可能将 n1 置为 null，第二次需要基于更新后的 n1 做判断。
    if (n1 !== null && isSameVNodeType(n1, n2)) {
      // Fragment needs special handling
      if (n2.type === Fragment) {
        patchFragment(n1, n2, container, parentComponent, parentSuspense, isSVG);
      } else if (n2.type === Text) {
        // Patch text node: update textContent if children changed
        const node = n1.el;
        setVNodeEl(n2, node as unknown as HN | null);
        if (n1.children !== n2.children) {
          if (isFunction(n2.children)) {
            warn(
              `Text vnode received a function children value. ` +
                `Function children are only supported on component vnodes. ` +
                `The value will be replaced with an empty string.`,
            );
          }
          setText(node as unknown as HN, isFunction(n2.children) ? '' : String(n2.children ?? ''));
        }
      } else if (n2.type === Comment) {
        // Patch comment node: update nodeValue if children changed
        const node = n1.el;
        setVNodeEl(n2, node as unknown as HN | null);
        if (n1.children !== n2.children) {
          setText(node as unknown as HN, isFunction(n2.children) ? '' : String(n2.children ?? ''));
        }
      } else if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // Component patch: delegate to component update process
        n2.el = n1.el;
        n2.component = n1.component;
        if (n2.component) {
          const { update } = n2.component;
          if (update) {
            update();
          }
        }
      } else if (n2.shapeFlag & ShapeFlags.TELEPORT) {
        patchTeleport(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (n2.shapeFlag & ShapeFlags.SUSPENSE) {
        patchSuspense(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else {
        // Patch existing element node
        patchElement(n1, n2, parentComponent, parentSuspense, isSVG);
      }
    } else {
      // Unmount old node
      if (n1 !== null) {
        unmount(n1, parentComponent, parentSuspense, true);
      }

      // Mount new node
      if (n2.shapeFlag & ShapeFlags.ELEMENT) {
        mountElement(n2, container, anchor, isSVG);
      } else if (n2.type === Text) {
        mountTextNode(n2, container, anchor);
      } else if (n2.type === Comment) {
        mountCommentNode(n2, container, anchor);
      } else if (n2.type === Fragment) {
        mountFragment(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (n2.shapeFlag & ShapeFlags.TELEPORT) {
        mountTeleport(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (n2.shapeFlag & ShapeFlags.SUSPENSE) {
        mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      }
    }
  }

  // ============================================================
  // mountElement
  // ============================================================

  function mountElement(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
  ): void {
    if (typeof vnode.type !== 'string') {
      warn(
        `mountElement received a vnode with non-string type (${String(vnode.type)}). ` +
          `Only element vnodes can be mounted as elements.`,
      );
      return;
    }
    const tag = vnode.type;
    const el = createElement(tag);
    setVNodeEl(vnode, el);

    // Apply props
    const props = vnode.props ?? EMPTY_OBJ;
    for (const key in props) {
      if (key === 'key' || key === 'ref') continue;
      patchProp(el, key, null, props[key]);
    }

    // Mount children
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, anchor, isSVG);
    } else if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      setElementText(el, String(vnode.children ?? ''));
    }

    // Insert into container
    insert(el, container, anchor);
  }

  // ============================================================
  // mountTextNode
  // ============================================================

  function mountTextNode(vnode: VNode, container: HN, anchor: HN | null): void {
    const text = isFunction(vnode.children) ? '' : String(vnode.children ?? '');
    const node = createText(text);
    setVNodeEl(vnode, node);
    insert(node, container, anchor);
  }

  // ============================================================
  // mountCommentNode
  // ============================================================

  function mountCommentNode(vnode: VNode, container: HN, anchor: HN | null): void {
    const text = isFunction(vnode.children) ? '' : String(vnode.children ?? '');
    const node = createComment(text);
    setVNodeEl(vnode, node);
    vnode.anchor = node as unknown as Node | null;
    insert(node, container, anchor);
  }

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

    insert(fragmentStartAnchor, container, anchor);
    insert(fragmentEndAnchor, container, anchor);

    // Mount children between the anchors
    const children = isArray(vnode.children) ? vnode.children : [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        patch(null, child, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG);
      }
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
    // Reuse the existing fragment anchors
    n2.el = n1.el;
    const endAnchor = n1.anchor;
    if (!endAnchor) return;
    n2.anchor = endAnchor;

    const c1 = n1.children as VNode[] | null;
    const c2 = n2.children as VNode[] | null;

    // Both should be arrays for fragments
    if (isArray(c1) && isArray(c2)) {
      // Choose diff strategy based on fragment patchFlag
      if (n2.patchFlag & PatchFlags.STABLE_FRAGMENT) {
        // STABLE_FRAGMENT: children order never changes, patch by index directly
        diffStableFragment(c1, c2, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      } else if (n2.patchFlag & PatchFlags.KEYED_FRAGMENT) {
        // KEYED_FRAGMENT: children have keys, use keyed diff algorithm
        diffChildrenFragment(c1, c2, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      } else if (n2.patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
        // UNKEYED_FRAGMENT: children have no keys, use simple sync-from-start strategy
        diffUnkeyedFragment(c1, c2, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      } else {
        // No fragment-specific patchFlag, use default keyed diff
        diffChildrenFragment(c1, c2, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      }
    } else if (isArray(c2)) {
      // Old was null/empty, mount all new before end anchor
      for (let i = 0; i < c2.length; i++) {
        patch(null, c2[i]!, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      }
    } else if (isArray(c1)) {
      // New is null/empty, unmount all old
      unmountChildren(c1, parentComponent, parentSuspense);
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
    listDiffPatchKeyedChildren(
      c1,
      c2,
      container,
      parentComponent,
      parentSuspense,
      isSVG,
      fallbackAnchor,
    );
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
    diffChildrenInternal(c1, c2, container, parentComponent, parentSuspense, isSVG, endAnchor);
  }

  // ============================================================
  // diffStableFragment - STABLE_FRAGMENT: patch by index, skip key comparison
  // ============================================================

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
    // Patch common prefix by index (no key comparison needed)
    for (let i = 0; i < commonLength; i++) {
      patch(c1[i]!, c2[i]!, container, null, parentComponent, parentSuspense, isSVG);
    }
    // Mount extra new children
    if (c2.length > c1.length) {
      for (let i = commonLength; i < c2.length; i++) {
        patch(null, c2[i]!, container, endAnchor, parentComponent, parentSuspense, isSVG);
      }
    }
    // Unmount extra old children
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
    // Sync from start: patch nodes with the same type at the same index
    let i = 0;
    const l1 = c1.length;
    const l2 = c2.length;

    while (i < l1 && i < l2) {
      if (isSameVNodeType(c1[i]!, c2[i]!)) {
        patch(c1[i]!, c2[i]!, container, null, parentComponent, parentSuspense, isSVG);
      } else {
        // Type mismatch: unmount old, mount new
        unmount(c1[i]!, parentComponent, parentSuspense, true);
        patch(null, c2[i]!, container, null, parentComponent, parentSuspense, isSVG);
      }
      i++;
    }

    // Mount remaining new children
    while (i < l2) {
      patch(null, c2[i]!, container, endAnchor, parentComponent, parentSuspense, isSVG);
      i++;
    }

    // Unmount remaining old children
    while (i < l1) {
      unmount(c1[i]!, parentComponent, parentSuspense, true);
      i++;
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
  // diffProps - full props diff between old and new props
  // ============================================================

  function diffProps(
    el: HE,
    oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
  ): void {
    for (const key in newProps) {
      if (key === 'key' || key === 'ref') continue;
      const next = newProps[key];
      const prev = oldProps[key];
      if (hasChanged(next, prev)) {
        patchProp(el, key, prev, next);
      }
    }
    for (const key in oldProps) {
      if (key === 'key' || key === 'ref') continue;
      if (!(key in newProps)) {
        patchProp(el, key, oldProps[key], null);
      }
    }
  }

  // ============================================================
  // patchElement
  // ============================================================

  function patchElement(
    n1: VNode,
    n2: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // n1.el is guaranteed to exist since n1 was previously mounted
    const el = n1.el! as unknown as HE;
    setVNodeEl(n2, n1.el as unknown as HN | null);

    // Patch props
    const oldProps = n1.props ?? EMPTY_OBJ;
    const newProps = n2.props ?? EMPTY_OBJ;

    if (n2.patchFlag & PatchFlags.FULL_PROPS) {
      // Full props diff
      diffProps(el, oldProps, newProps);
    } else if (n2.patchFlag > 0) {
      // PatchFlag optimization
      if (n2.patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          patchProp(el, 'class', oldProps.class, newProps.class);
        }
      }
      if (n2.patchFlag & PatchFlags.STYLE) {
        patchProp(el, 'style', oldProps.style, newProps.style);
      }
      if (n2.patchFlag & PatchFlags.PROPS) {
        // Only diff dynamicProps
        const dynamicProps = n2.dynamicProps;
        if (dynamicProps) {
          for (let i = 0; i < dynamicProps.length; i++) {
            const key = dynamicProps[i]!;
            const next = newProps[key];
            const prev = oldProps[key];
            if (hasChanged(next, prev)) {
              patchProp(el, key, prev, next);
            }
          }
        }
      }
      if (n2.patchFlag & PatchFlags.TEXT) {
        if (n1.children !== n2.children) {
          setElementText(el, String(n2.children ?? ''));
        }
      }
    } else if (oldProps !== newProps) {
      // No patchFlag, do full props diff
      diffProps(el, oldProps, newProps);
    }

    // Patch children — Block Tree 快速路径
    const oldDynamicChildren = n1.dynamicChildren;
    const newDynamicChildren = n2.dynamicChildren;

    if (oldDynamicChildren && newDynamicChildren && oldDynamicChildren.length > 0) {
      // Block Tree 优化路径：仅 diff dynamicChildren
      patchBlockChildren(n1, n2, el, parentComponent, parentSuspense, isSVG);
    } else {
      // 回退路径：全量 diff children
      patchChildren(n1, n2, el, parentComponent, parentSuspense, isSVG);
    }
  }

  // ============================================================
  // patchBlockChildren — Block Tree 快速路径
  // ============================================================

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
    const oldDynamicChildren = n1.dynamicChildren!;
    const newDynamicChildren = n2.dynamicChildren!;

    for (let i = 0; i < newDynamicChildren.length; i++) {
      const oldVNode = oldDynamicChildren[i];
      const newVNode = newDynamicChildren[i]!;

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
      setElementText(container as HE, String(c2 ?? ''));
    } else {
      // New children are array (or null)
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // Old children were text - clear it
        setElementText(container as HE, '');
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

  // ============================================================
  // unmount
  // ============================================================

  function unmount(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean = false,
  ): void {
    const { type, children, component } = vnode;
    const el = getVNodeEl(vnode);

    // Handle component unmount - trigger onUnmounted lifecycle hook
    if (
      component &&
      (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ||
        vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT)
    ) {
      const { bum } = component as ComponentInternalInstance;
      if (isArray(bum)) {
        // 逐个执行 beforeUnmount 回调。单个回调抛出异常时，捕获并记录错误后继续执行
        // 后续回调，确保所有 beforeUnmount 钩子都有机会运行，避免一个组件的卸载错误
        // 影响其他组件的清理逻辑。
        for (let i = 0; i < bum.length; i++) {
          try {
            bum[i]!();
          } catch (e) {
            error(`Error in beforeUnmount hook: ${e}`);
          }
        }
      } else if (bum) {
        try {
          bum();
        } catch (e) {
          error(`Error in beforeUnmount hook: ${e}`);
        }
      }
      component.isUnmounted = true;
      return;
    }

    if (type === Fragment) {
      unmountFragment(vnode, parentComponent, parentSuspense, doRemove);
      return;
    }

    if (type === Comment) {
      if (doRemove) {
        const commentEl = getVNodeEl(vnode);
        if (commentEl) hostRemove(commentEl);
      }
      return;
    }

    if (vnode.shapeFlag & ShapeFlags.TELEPORT) {
      unmountTeleport(vnode, parentComponent, parentSuspense, doRemove);
      return;
    }

    if (vnode.shapeFlag & ShapeFlags.SUSPENSE) {
      unmountSuspense(vnode, parentComponent, parentSuspense, doRemove);
      return;
    }

    // Unmount children
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        unmount(children[i]!, parentComponent, parentSuspense, doRemove);
      }
    }

    if (doRemove) {
      if (el) hostRemove(el);
    }
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
      // Remove fragment anchors
      const vEl = getVNodeEl(vnode);
      if (vEl) {
        hostRemove(vEl);
      }
      if (vnode.anchor && vnode.anchor !== vnode.el) {
        hostRemove(vnode.anchor as unknown as HN);
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
  // Teleport - mount / patch / unmount / move
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
      diffChildrenInternal(
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

  // ============================================================
  // Suspense - mount / patch / unmount
  // ============================================================

  function mountSuspense(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    _parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // Create a SuspenseBoundary and store it on the vnode
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

    // Mount the default content (children) as the active branch
    const children = isArray(vnode.children) ? vnode.children : [];
    const activeBranch = children[0] ?? null;
    boundary.activeBranch = activeBranch;

    if (activeBranch) {
      patch(null, activeBranch, container, anchor, parentComponent, boundary, isSVG);
    }

    // Create placeholder comment node
    const placeholder = createComment('');
    setVNodeEl(vnode, placeholder);
    insert(placeholder, container, anchor);
  }

  function patchSuspense(
    n1: VNode,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // Reuse the existing boundary
    const boundary = n1.suspense as SuspenseBoundary | undefined;
    if (boundary) {
      n2.suspense = boundary;
      boundary.vnode = n2;
    }

    n2.el = n1.el;

    // Patch the active branch
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

  function unmountSuspense(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ): void {
    const boundary = vnode.suspense as SuspenseBoundary | undefined;

    // Unmount the active branch
    const children = isArray(vnode.children) ? vnode.children : [];
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]!, parentComponent, parentSuspense, doRemove);
    }

    // Clean up boundary
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

  // ============================================================
  // move
  // ============================================================

  function move(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ): void {
    if (vnode.type === Fragment) {
      // Move fragment children
      const children = isArray(vnode.children) ? vnode.children : [];
      for (let i = 0; i < children.length; i++) {
        move(children[i]!, container, anchor, parentComponent, parentSuspense);
      }
      // Move anchors
      const vEl = getVNodeEl(vnode);
      if (vEl) insert(vEl, container, anchor);
      if (vnode.anchor && vnode.anchor !== vnode.el) insert(vnode.anchor as unknown as HN, container, anchor);
    } else if (vnode.shapeFlag & ShapeFlags.TELEPORT) {
      moveTeleport(vnode, container, anchor);
    } else {
      const vEl = getVNodeEl(vnode);
      if (vEl) insert(vEl, container, anchor);
    }
  }

  // ============================================================
  // mount
  // ============================================================

  function mount(vnode: VNode, container: HN): void {
    patch(null, vnode, container, null);
  }

  // ============================================================
  // 注册 DOM 操作到 list-diff 模块
  // ============================================================
  const domOps: DOMOperations<HN, SuspenseBoundary | null> = {
    insert: (child, container, anchor) => {
      const childEl = getVNodeEl(child);
      if (childEl) {
        insert(childEl, container, anchor);
      }
    },
    createElement: (type) => createElement(type),
    mount: (vnode, container, anchor) => {
      patch(null, vnode, container, anchor);
    },
    patch: (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG) => {
      patch(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG);
    },
    unmount: (vnode, parentComponent, parentSuspense, doRemove) => {
      unmount(vnode, parentComponent, parentSuspense, doRemove);
    },
    move: (vnode, container, anchor, parentComponent, parentSuspense) => {
      move(vnode, container, anchor, parentComponent, parentSuspense);
    },
  };
  registerDOMOperations(domOps);

  return {
    patch,
    mount,
    unmount: (vnode: VNode) => unmount(vnode, null, null, true),
    move,
    diffChildren,
  };
}
