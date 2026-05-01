/**
 * @lytjs/vdom - types
 * VDOM-specific types that extend common-vnode types
 */

import type { VNode, ComponentInternalInstance } from "@lytjs/common-vnode";
import type { Props as SharedProps } from "@lytjs/shared-types";

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
export interface Component {
  __v_isComponent: true;
  name?: string;
  setup?: (...args: any[]) => any;
  render?: (...args: any[]) => any;
  props?: Record<string, unknown>;
  emits?: string[] | Record<string, unknown>;
}

// ============================================================
// Renderer types
// ============================================================

/** Renderer options for host platform operations */
export interface RendererOptions<
  HostNode = Node,
  HostElement extends Node = Element,
> {
  /** Create a host element from a tag string */
  createElement(type: string): HostElement;
  /** Set text content on a host element */
  setElementText(node: HostElement, text: string): void;
  /** Insert a host node before an anchor, or append to parent */
  insert(child: HostNode, parent: HostNode, anchor?: HostNode | null): void;
  /** Remove a host node from its parent */
  remove(child: HostNode): void;
  /** Create a text node */
  createText(text: string): HostNode;
  /** Set text content on a text node */
  setText(node: HostNode, text: string): void;
  /** Get next sibling of a host node */
  nextSibling(node: HostNode): HostNode | null;
  /** Get parent of a host node */
  parentNode(node: HostNode): HostNode | null;
  /** Patch a prop on a host element */
  patchProp(
    el: HostElement,
    key: string,
    prevValue: unknown,
    nextValue: unknown,
    prevChildren?: VNode[],
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
  ): void;
  /** Create a comment node */
  createComment(text: string): HostNode;
  /** Query selector (for Teleport target) */
  querySelector?(selector: string): HostElement | null;
}

// ============================================================
// Suspense types (stub)
// ============================================================

/** Suspense boundary interface */
export interface SuspenseBoundary {
  vnode: VNode;
  parent: ComponentInternalInstance | null;
  parentComponent: ComponentInternalInstance | null;
  isSVG: boolean;
  container: Node;
  anchor: Node | null;
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
