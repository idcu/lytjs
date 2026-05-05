/**
 * @lytjs/adapter-web - Hydration
 * 简化的水合逻辑，将现有 DOM 节点与 vnode 匹配。
 *
 * 从 @lytjs/renderer/src/dom/hydration.ts 迁移，
 * 使用 WebRendererHost 的 getChildNodes/getNodeType/getTagName 等方法。
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isArray, isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { WebRendererHost } from './web-host';
import { patchProp } from './web-patch-props';

// Global dev flag declaration (injected by build tool)
declare const __DEV__: boolean;

// ============================================================
// Dev mode hydration mismatch warnings
// ============================================================

function warnHydrationMismatch(type: string, expected: string, actual: string): void {
  if (__DEV__) {
    warn(
      `Hydration mismatch: expected ${type} "${expected}" but got "${actual}". ` +
        `The DOM has been patched to match the vnode.`,
    );
  }
}

// ============================================================
// Hydration types
// ============================================================

export interface HydrationRenderer {
  hydrate(vnode: VNode, container: HTMLElement): void;
}

// ============================================================
// Hydrate Fragment
// FIX: P2-61 将 Fragment 水合逻辑提取为独立函数
// ============================================================

function hydrateFragment(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { children } = vnode;
  const childArray = isArray(children) ? children : [];
  let currentIndex = index;
  let hasMismatch = false;

  for (let i = 0; i < childArray.length; i++) {
    const child = childArray[i];
    if (child != null) {
      currentIndex = hydrateNode(child, parent, currentIndex, host);
    }
  }

  // Fragment el points to the first child's el.
  if (childArray.length > 0) {
    const childNodes = host.getChildNodes(parent);
    const firstChild = childNodes[index] ?? null;
    if (firstChild && childArray[0] && childArray[0].el === firstChild) {
      vnode.el = firstChild;
    } else if (childArray[0] && childArray[0].el) {
      vnode.el = childArray[0].el as Node;
      hasMismatch = true;
    } else {
      vnode.el = null;
    }
  } else {
    vnode.el = null;
  }

  if (hasMismatch && __DEV__) {
    warn(
      `Hydration mismatch in Fragment: some children could not be matched. ` +
        `The DOM has been patched to match the vnode.`,
    );
  }

  return currentIndex;
}

// ============================================================
// Hydrate Text
// FIX: P2-61 将 Text 水合逻辑提取为独立函数
// ============================================================

function hydrateText(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { children } = vnode;
  const childNodes = host.getChildNodes(parent);
  const node = childNodes[index];

  if (isFunction(children)) {
    if (__DEV__) {
      warn(
        `Hydration: Text VNode children is a function, which is not supported during hydration. ` +
          `The function will be replaced with an empty string.`,
      );
    }
  }

  const text = isFunction(children) ? '' : String(children ?? '');

  if (node && host.getNodeType(node) === Node.TEXT_NODE) {
    // Match: reuse existing text node
    if ((node as Text).textContent !== text) {
      warnHydrationMismatch('text content', text, (node as Text).textContent ?? '');
      (node as Text).textContent = text;
    }
    vnode.el = node;
  } else {
    // Mismatch: create new text node and replace
    warnHydrationMismatch(
      'node type',
      `Text("${text}")`,
      node && host.getNodeType(node) === Node.ELEMENT_NODE
        ? `Element(<${host.getTagName(node as Element)}>)`
        : node
          ? `Node(type=${host.getNodeType(node)})`
          : 'none',
    );
    const newNode = host.createText(text);
    if (node) {
      host.replaceChild(parent, newNode, node);
    } else {
      host.insert(newNode, parent);
    }
    vnode.el = newNode;
  }

  return index + 1;
}

// ============================================================
// Hydrate Comment
// FIX: P2-61 将 Comment 水合逻辑提取为独立函数
// ============================================================

function hydrateComment(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { children } = vnode;
  const childNodes = host.getChildNodes(parent);
  const node = childNodes[index];
  const text = isFunction(children) ? '' : String(children ?? '');

  if (node && host.getNodeType(node) === Node.COMMENT_NODE) {
    // Match: reuse existing comment node
    if ((node as Comment).textContent !== text) {
      warnHydrationMismatch('comment content', text, (node as Comment).textContent ?? '');
      (node as Comment).textContent = text;
    }
    vnode.el = node;
  } else {
    // Mismatch: create new comment node and replace
    warnHydrationMismatch(
      'node type',
      `Comment("${text}")`,
      node
        ? host.getNodeType(node) === Node.TEXT_NODE
          ? `Text("${(node as Text).textContent}")`
          : `Element(<${host.getTagName(node as Element)}>)`
        : 'none',
    );
    const newNode = host.createComment(text);
    if (node) {
      host.replaceChild(parent, newNode, node);
    } else {
      host.insert(newNode, parent);
    }
    vnode.el = newNode;
  }

  return index + 1;
}

// ============================================================
// Hydrate Element (matched case)
// FIX: P2-61 将 Element 匹配成功的水合逻辑提取为独立函数
// ============================================================

function hydrateMatchedElement(
  vnode: VNode,
  existingNode: Node,
  host: WebRendererHost,
): number {
  const { shapeFlag, children, props } = vnode;
  vnode.el = existingNode as Element;

  // Hydrate props (attach event listeners, sync attributes)
  // FIX: P1-16 使用可选链替代非空断言
  const isSVG = host.getNamespaceURI?.(existingNode as Element) === 'http://www.w3.org/2000/svg';
  const vnodeProps = props ?? {};
  for (const key in vnodeProps) {
    if (key === 'key' || key === 'ref') continue;
    patchProp(existingNode as Element, key, null, vnodeProps[key], isSVG);
  }

  // Hydrate children
  let childIndex = 0;
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        childIndex = hydrateNode(child, existingNode as HTMLElement, childIndex, host);
      }
    }
  } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    const text = String(children ?? '');
    const elChildren = host.getChildNodes(existingNode as Element);
    const firstChild = elChildren[0];
    if (firstChild && host.getNodeType(firstChild) === Node.TEXT_NODE) {
      if ((firstChild as Text).textContent !== text) {
        (firstChild as Text).textContent = text;
      }
    } else {
      (existingNode as HTMLElement).textContent = text;
    }
    childIndex = 1;
  }

  // Remove extra DOM nodes
  const elChildren = host.getChildNodes(existingNode as Element);
  while (elChildren.length > childIndex) {
    host.remove(elChildren[childIndex]!);
  }

  return childIndex;
}

// ============================================================
// Hydrate Element (mismatch case)
// FIX: P2-61 将 Element 不匹配时的水合逻辑提取为独立函数
// ============================================================

function hydrateMismatchedElement(
  vnode: VNode,
  parent: HTMLElement,
  existingNode: Node | undefined,
  host: WebRendererHost,
): void {
  const { type, shapeFlag, children, props } = vnode;
  const tag = type as string;

  warnHydrationMismatch(
    'element tag',
    `<${tag}>`,
    existingNode ? `<${host.getTagName(existingNode as Element)}>` : 'none',
  );

  // FIX: P1-16 使用可选链替代非空断言
  const parentNamespace = host.getNamespaceURI?.(parent);
  const isSVG = tag === 'svg' || parentNamespace === 'http://www.w3.org/2000/svg';
  const newEl = host.createElement(tag, isSVG);
  vnode.el = newEl;

  // Mount props
  const vnodeProps = props ?? {};
  for (const key in vnodeProps) {
    if (key === 'key' || key === 'ref') continue;
    patchProp(newEl, key, null, vnodeProps[key], isSVG);
  }

  // Mount children
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        hydrateNode(child, newEl as HTMLElement, i, host);
      }
    }
  } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    host.setElementText(newEl, String(children ?? ''));
  }

  // Replace or append
  if (existingNode) {
    host.replaceChild(parent, newEl, existingNode);
  } else {
    host.insert(newEl, parent);
  }
}

// ============================================================
// Hydrate Element
// FIX: P2-61 将 Element 水合逻辑提取为独立函数
// ============================================================

function hydrateElement(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { type, shapeFlag } = vnode;
  const tag = type as string;
  const childNodes = host.getChildNodes(parent);
  const existingNode = childNodes[index];

  if (
    existingNode &&
    host.getNodeType(existingNode) === Node.ELEMENT_NODE &&
    host.getTagName(existingNode as Element) === tag.toLowerCase()
  ) {
    // Match: reuse existing element
    hydrateMatchedElement(vnode, existingNode, host);
  } else {
    // Mismatch: create new element and replace
    hydrateMismatchedElement(vnode, parent, existingNode, host);
  }

  return index + 1;
}

// ============================================================
// hydrateNode - core recursive hydration
// FIX: P2-61 将 hydrateNode 重构为分发函数，具体逻辑委托给子函数
// ============================================================

function hydrateNode(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
  host: WebRendererHost,
): number {
  const { type, shapeFlag } = vnode;

  // Handle Fragment
  if (type === Fragment) {
    return hydrateFragment(vnode, parent, index, host);
  }

  // Handle Text
  if (type === Text) {
    return hydrateText(vnode, parent, index, host);
  }

  // Handle Comment
  if (type === Comment) {
    return hydrateComment(vnode, parent, index, host);
  }

  // Handle Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    return hydrateElement(vnode, parent, index, host);
  }

  if (__DEV__) {
    warn(`Hydration: unrecognized node type, skipping.`);
  }

  return index + 1;
}

// ============================================================
// createHydrationFunctions
// ============================================================

/**
 * 创建水合函数，用于将现有 DOM 与 vnode 匹配。
 *
 * @param _rendererOptions - 保留用于未来渲染器配置（当前未使用）
 * @param sharedVnodeMap - 可选的共享 vnodeMap，使水合和 DOM 渲染器使用同一映射
 */
export function createHydrationFunctions(
  _rendererOptions: Record<string, unknown>,
  sharedVnodeMap?: WeakMap<Element, VNode | null>,
): HydrationRenderer {
  const host = new WebRendererHost();
  const vnodeMap = sharedVnodeMap ?? new WeakMap<Element, VNode | null>();

  function hydrate(vnode: VNode, container: HTMLElement): void {
    hydrateNode(vnode, container, 0, host);
    vnodeMap.set(container, vnode);
  }

  return { hydrate };
}
