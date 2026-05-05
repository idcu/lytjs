/**
 * @lytjs/vdom - patch
 *
 * Core patch logic with platform-agnostic renderer host.
 *
 * This is the main entry point that orchestrates all patch sub-modules:
 * - patch-element.ts: Element vnode mount/patch
 * - patch-component.ts: Component vnode mount
 * - patch-fragment.ts: Fragment vnode mount/patch/unmount
 * - patch-teleport.ts: Teleport vnode mount/patch/unmount/move
 * - patch-suspense.ts: Suspense vnode mount/patch/unmount
 * - patch-children.ts: Children diff/mount/unmount
 */

import {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  isSameVNodeType,
} from '@lytjs/common-vnode';
import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { isArray, isFunction } from '@lytjs/common-is';
import { warn, error } from '@lytjs/common-error';
import type { RendererHost } from '@lytjs/host-contract';
import type { RendererOptions, SuspenseBoundary } from './types';
import {
  registerDOMOperations,
} from './list-diff';
import type { DOMOperations } from './list-diff';

// Sub-module imports
import type { RendererContext } from './patch-element';
import { createElementPatch } from './patch-element';
import { createComponentPatch } from './patch-component';
import { createFragmentPatch } from './patch-fragment';
import { createTeleportPatch } from './patch-teleport';
import { createSuspensePatch } from './patch-suspense';
import { createChildrenPatch } from './patch-children';

// ============================================================
// RendererHost adapter: wraps a RendererHost into RendererOptions shape
// ============================================================

/**
 * Internal renderer options shape shared by both host and legacy adapters.
 */
interface InternalRendererOptions<HN, HE extends HN> {
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
  setupChildComponent: ((vnode: VNode, parent: ComponentInternalInstance | null) => void) | undefined;
}

/**
 * Adapt a RendererHost to the internal RendererOptions-like shape used by createRenderer.
 * This bridges the gap between RendererHost's patchProp(el, key, prev, next, isSVG?)
 * and the internal need for a simpler patchProp(el, key, prev, next).
 */
function hostToOptions<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
): InternalRendererOptions<HN, HE> {
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
    setupChildComponent: undefined,
  };
}

/**
 * Adapt legacy RendererOptions to the internal shape used by createRenderer.
 */
function optionsToInternal<HN, HE extends HN>(
  options: RendererOptions<HN, HE>,
): InternalRendererOptions<HN, HE> {
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
    setupChildComponent: options.setupChildComponent,
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
    setupChildComponent,
  } = internal;

  // Helper: assign host node to vnode.el (VNode.el is typed as Node | null in common-vnode,
  // but we work with generic HN here, so we need a type assertion).
  // The double assertion (HN -> unknown -> Node) is necessary because HN and Node are
  // unrelated types in the generic context — TypeScript does not allow direct casts between
  // two generic types that don't share a common base. Going through unknown is the standard
  // pattern for this kind of cross-boundary type bridge.
  const setVNodeEl = (vnode: VNode, el: HN | null) => { vnode.el = el as unknown as Node | null; };
  const getVNodeEl = (vnode: VNode): HN | null => vnode.el as unknown as HN | null;

  // ============================================================
  // Build shared RendererContext for sub-modules
  // ============================================================

  // We use a mutable context object that gets populated as functions are created.
  // This allows sub-modules to reference each other through the shared context.
  const ctx = {} as RendererContext<HN, HE>;

  // Populate host operations
  ctx.createElement = createElement;
  ctx.setElementText = setElementText;
  ctx.insert = insert;
  ctx.remove = hostRemove;
  ctx.createText = createText;
  ctx.setText = setText;
  ctx.patchProp = patchProp;
  ctx.createComment = createComment;
  ctx.querySelector = querySelector;
  ctx.setupChildComponent = setupChildComponent;
  ctx.setVNodeEl = setVNodeEl;
  ctx.getVNodeEl = getVNodeEl;

  // ============================================================
  // Create sub-module APIs
  // ============================================================

  const childrenAPI = createChildrenPatch<HN, HE>(ctx);
  const elementAPI = createElementPatch<HN, HE>(ctx);
  const componentAPI = createComponentPatch<HN, HE>(ctx);
  const fragmentAPI = createFragmentPatch<HN, HE>(ctx);
  const teleportAPI = createTeleportPatch<HN, HE>(ctx);
  const suspenseAPI = createSuspensePatch<HN, HE>(ctx);

  // Wire up children helpers into context
  ctx.mountChildren = childrenAPI.mountChildren;
  ctx.unmountChildren = childrenAPI.unmountChildren;
  ctx.patchChildren = childrenAPI.patchChildren;
  ctx.patchBlockChildren = childrenAPI.patchBlockChildren;
  ctx.diffChildrenInternal = childrenAPI.diffChildrenInternal;

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
    // 仅对非组件类型的 vnode 执行此操作，组件 vnode 的 el 为 null 不代表需要重新挂载。
    if (n1 !== null && isSameVNodeType(n1, n2)) {
      if (n1.el === null && !(n1.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) && !(n1.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT)) {
        n1 = null;
      }
    }

    // 第二次检查：在 n1 可能被置为 null 之后，再次判断是否走 patch 路径。
    // 两次检查是必要的：第一次可能将 n1 置为 null，第二次需要基于更新后的 n1 做判断。
    if (n1 !== null && isSameVNodeType(n1, n2)) {
      // Fragment needs special handling
      if (n2.type === Fragment) {
        fragmentAPI.patchFragment(n1, n2, container, parentComponent, parentSuspense, isSVG);
      } else if (n2.type === Text || n2.type === Comment) {
        // Patch text/comment node: update content if children changed
        const node = n1.el;
        setVNodeEl(n2, node as unknown as HN | null);
        if (n1.children !== n2.children) {
          if (isFunction(n2.children)) {
            warn(
              `${n2.type === Text ? 'Text' : 'Comment'} vnode received a function children value. ` +
                `Function children are only supported on component vnodes. ` +
                `The value will be replaced with an empty string.`,
            );
          }
          setText(node as unknown as HN, isFunction(n2.children) ? '' : String(n2.children ?? ''));
        }
      } else if (n2.shapeFlag & ShapeFlags.SUSPENSE) {
        suspenseAPI.patchSuspense(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG);
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
        teleportAPI.patchTeleport(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else {
        // Patch existing element node
        elementAPI.patchElement(n1, n2, parentComponent, parentSuspense, isSVG);
      }
    } else {
      // Unmount old node
      if (n1 !== null) {
        unmount(n1, parentComponent, parentSuspense, true);
      }

      // Mount new node
      if (n2.shapeFlag & ShapeFlags.ELEMENT) {
        elementAPI.mountElement(n2, container, anchor, isSVG, parentComponent, parentSuspense);
      } else if (n2.type === Text) {
        elementAPI.mountTextNode(n2, container, anchor);
      } else if (n2.type === Comment) {
        elementAPI.mountCommentNode(n2, container, anchor);
      } else if (n2.type === Fragment) {
        fragmentAPI.mountFragment(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (n2.shapeFlag & ShapeFlags.TELEPORT) {
        teleportAPI.mountTeleport(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (n2.shapeFlag & ShapeFlags.SUSPENSE) {
        suspenseAPI.mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        componentAPI.mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      }
    }
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

      // Also unmount the component's subTree to remove DOM elements
      const subTree = (component as ComponentInternalInstance).subTree;
      if (subTree) {
        unmount(subTree, component as ComponentInternalInstance, parentSuspense, doRemove);
      }
      return;
    }

    if (type === Fragment) {
      fragmentAPI.unmountFragment(vnode, parentComponent, parentSuspense, doRemove);
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
      teleportAPI.unmountTeleport(vnode, parentComponent, parentSuspense, doRemove);
      return;
    }

    if (vnode.shapeFlag & ShapeFlags.SUSPENSE) {
      suspenseAPI.unmountSuspense(vnode, parentComponent, parentSuspense, doRemove);
      return;
    }

    // Unmount children
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        unmount(children[i]!, parentComponent, parentSuspense, doRemove);
      }
    }

    // Clean up string refs on unmount
    if (vnode.ref && parentComponent) {
      if (typeof vnode.ref === 'string') {
        delete parentComponent.refs[vnode.ref];
      } else if (typeof vnode.ref === 'function') {
        vnode.ref(null);
      } else if (vnode.ref !== null && typeof vnode.ref === 'object' && 'value' in vnode.ref) {
        (vnode.ref as { value: unknown }).value = null;
      }
    }

    if (doRemove) {
      if (el) hostRemove(el);
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
      teleportAPI.moveTeleport(vnode, container, anchor);
    } else {
      const vEl = getVNodeEl(vnode);
      if (vEl) insert(vEl, container, anchor);
    }
  }

  // ============================================================
  // Wire up core recursive functions into context
  // (must be done after patch/unmount/move are defined)
  // ============================================================

  ctx.patch = patch;
  ctx.unmount = unmount;
  ctx.move = move;

  // ============================================================
  // mount
  // ============================================================

  function mount(vnode: VNode, container: HN): void {
    patch(null, vnode, container, null);
  }

  // ============================================================
  // diffChildren - public API
  // ============================================================

  const { diffChildren } = childrenAPI;

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
