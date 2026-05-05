/**
 * @lytjs/vdom - types
 * VDOM-specific types that extend common-vnode types
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import type { Props as SharedProps } from '@lytjs/shared-types';

// Re-export from @lytjs/host-contract for convenience
export type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  TransitionDurationInfo,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
} from '@lytjs/host-contract';

// ============================================================
// Basic types
// ============================================================

/** Props type for VNode */
export type Props = SharedProps;

/** Host element type (DOM Element) */
export type HostElement = Element;

/** Host node type (DOM Node) */
export type HostNode = Node;

// ============================================================
// Component types
// ============================================================

/** Component interface with internal marker */
export interface Component<P = Record<string, unknown>, RawBindings = {}> {
  __v_isComponent: true;
  name?: string;
  setup?: (
    props: P,
    ctx: {
      attrs: Record<string, unknown>;
      slots: Record<string, unknown>;
      emit: (...args: unknown[]) => void;
    },
  ) => RawBindings | void;
  render?: (ctx: { props: P; slots: Record<string, unknown>; [key: string]: unknown }) => unknown;
  props?: Record<string, unknown>;
  emits?: string[] | Record<string, unknown>;
}

// ============================================================
// Renderer types
// ============================================================

/**
 * Renderer options for host platform operations.
 *
 * @deprecated Use RendererHost from @lytjs/host-contract instead.
 * This interface is kept for backward compatibility.
 */
export interface RendererOptions<HN = unknown, HE extends HN = HN> {
  /** Create a host element from a tag string */
  createElement(type: string): HE;
  /** Set text content on a host element */
  setElementText(node: HE, text: string): void;
  /** Insert a host node before an anchor, or append to parent */
  insert(child: HN, parent: HN, anchor?: HN | null): void;
  /** Remove a host node from its parent */
  remove(child: HN): void;
  /** Create a text node */
  createText(text: string): HN;
  /** Set text content on a text node */
  setText(node: HN, text: string): void;
  /** Get next sibling of a host node */
  nextSibling(node: HN): HN | null;
  /** Get parent of a host node */
  parentNode(node: HN): HN | null;
  /** Patch a prop on a host element */
  patchProp(
    el: HE,
    key: string,
    prevValue: unknown,
    nextValue: unknown,
    prevChildren?: VNode[],
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
  ): void;
  /** Create a comment node */
  createComment(text: string): HN;
  /** Query selector (for Teleport target) */
  querySelector?(selector: string): HE | null;
  /** Optional callback to create and setup a component instance for child components.
   *  When provided, mountComponent will call this if vnode.component is not set.
   *  Receives the vnode and the parent component instance.
   *  Should set vnode.component with the created instance. */
  setupChildComponent?(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
  ): void;
  /** FIX: P1-4 Optional callback to normalize props during component updates.
   *  When provided, patch will call this to normalize nextProps before assigning
   *  to component.props, ensuring declared props validation and attrs separation. */
  normalizeProps?(
    instance: ComponentInternalInstance,
    rawProps: Record<string, unknown> | null,
  ): void;
}

// ============================================================
// Suspense types
// ============================================================

/**
 * Suspense boundary interface
 *
 * Used by the patch algorithm to manage async component rendering.
 * The boundary tracks the active and pending branches, fallback state,
 * and associated reactive effects.
 *
 * Note: container and anchor use `unknown` to remain platform-agnostic.
 * The renderer internally knows the concrete host node type.
 */
export interface SuspenseBoundary {
  vnode: VNode;
  parent: ComponentInternalInstance | null;
  parentComponent: ComponentInternalInstance | null;
  isSVG: boolean;
  container: unknown;
  anchor: unknown;
  activeBranch: VNode | null;
  pendingBranch: VNode | null;
  isInFallback: boolean;
  isHydrating: boolean;
  effects: Array<{ stop: () => void }>;
}

// ============================================================
// Internal types
// ============================================================

/** Internal component instance (minimal) */
export interface InternalComponentInstance {
  vnode: VNode;
  parent: InternalComponentInstance | null;
  subTree: VNode;
  isMounted: boolean;
  isUnmounted: boolean;
  update: (() => void) | null;
  render: (() => VNode) | null;
}
