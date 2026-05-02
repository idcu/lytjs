/**
 * @lytjs/renderer - Hydration
 * Simplified hydration that matches existing DOM nodes with vnodes
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isArray, isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { patchProp } from './patch-props';

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
// hydrateNode - core recursive hydration
// ============================================================

function hydrateNode(vnode: VNode, parent: HTMLElement, index: number): number {
  const { type, shapeFlag, children } = vnode;

  // Handle Fragment
  if (type === Fragment) {
    const childArray = isArray(children) ? children : [];
    let currentIndex = index;
    let hasMismatch = false;
    for (let i = 0; i < childArray.length; i++) {
      const child = childArray[i];
      if (child != null) {
        currentIndex = hydrateNode(child, parent, currentIndex);
      }
    }
    // Fragment el points to the first child's el.
    // When a hydration mismatch caused a node replacement, the saved
    // firstChild reference may point to an orphaned node that was
    // detached from the DOM. Use the first child vnode's el instead,
    // which is always the currently-attached DOM node after hydration.
    if (childArray.length > 0) {
      const firstChild = parent.childNodes[index] ?? null;
      if (firstChild && childArray[0] && childArray[0].el === firstChild) {
        // No mismatch on first child: safe to use the reference
        vnode.el = firstChild;
      } else if (childArray[0] && childArray[0].el) {
        // First child was replaced during hydration: use the new el
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

  // Handle Text
  if (type === Text) {
    const node = parent.childNodes[index];
    const text = isFunction(children) ? '' : String(children ?? '');
    if (node && node.nodeType === Node.TEXT_NODE) {
      // Match: reuse existing text node
      if (node.textContent !== text) {
        warnHydrationMismatch('text content', text, node.textContent ?? '');
        node.textContent = text;
      }
      vnode.el = node;
    } else {
      // Mismatch: create new text node and replace
      warnHydrationMismatch(
        'node type',
        `Text("${text}")`,
        node && node.nodeType === Node.ELEMENT_NODE
          ? `Element(<${(node as Element).tagName.toLowerCase()}>)`
          : node
            ? `Node(type=${node.nodeType})`
            : 'none',
      );
      const newNode = document.createTextNode(text);
      if (node) {
        parent.replaceChild(newNode, node);
      } else {
        parent.appendChild(newNode);
      }
      vnode.el = newNode;
    }
    return index + 1;
  }

  // Handle Comment
  if (type === Comment) {
    const node = parent.childNodes[index];
    const text = isFunction(children) ? '' : String(children ?? '');
    if (node && node.nodeType === Node.COMMENT_NODE) {
      // Match: reuse existing comment node
      if (node.textContent !== text) {
        warnHydrationMismatch('comment content', text, node.textContent ?? '');
        node.textContent = text;
      }
      vnode.el = node;
    } else {
      // Mismatch: create new comment node and replace
      warnHydrationMismatch(
        'node type',
        `Comment("${text}")`,
        node
          ? node.nodeType === Node.TEXT_NODE
            ? `Text("${node.textContent}")`
            : `Element(<${(node as Element).tagName.toLowerCase()}>)`
          : 'none',
      );
      const newNode = document.createComment(text);
      if (node) {
        parent.replaceChild(newNode, node);
      } else {
        parent.appendChild(newNode);
      }
      vnode.el = newNode;
    }
    return index + 1;
  }

  // Handle Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    const tag = type as string;
    const existingNode = parent.childNodes[index];
    const props = vnode.props ?? {};

    if (
      existingNode &&
      existingNode.nodeType === Node.ELEMENT_NODE &&
      (existingNode as Element).tagName.toLowerCase() === tag.toLowerCase()
    ) {
      // Match: reuse existing element
      vnode.el = existingNode as Element;

      // Hydrate props (attach event listeners, sync attributes)
      const isSVG = (existingNode as Element).namespaceURI === 'http://www.w3.org/2000/svg';
      for (const key in props) {
        if (key === 'key' || key === 'ref') continue;
        patchProp(existingNode as Element, key, null, props[key], isSVG);
      }

      // Hydrate children
      let childIndex = 0;
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (child != null) {
            childIndex = hydrateNode(child, existingNode as HTMLElement, childIndex);
          }
        }
      } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        const text = String(children ?? '');
        const firstChild = (existingNode as HTMLElement).firstChild;
        if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
          if (firstChild.textContent !== text) {
            firstChild.textContent = text;
          }
        } else {
          // Mismatch: set text content
          (existingNode as HTMLElement).textContent = text;
        }
        childIndex = 1;
      }

      // Remove extra DOM nodes
      const elChildren = (existingNode as HTMLElement).childNodes;
      while (elChildren.length > childIndex) {
        (existingNode as HTMLElement).removeChild(elChildren[childIndex]!);
      }
    } else {
      // Mismatch: create new element and replace
      warnHydrationMismatch(
        'element tag',
        `<${tag}>`,
        existingNode ? `<${(existingNode as Element).tagName.toLowerCase()}>` : 'none',
      );
      const isSVG =
        tag === 'svg' ||
        (existingNode as Element | undefined)?.namespaceURI === 'http://www.w3.org/2000/svg';
      const newEl = isSVG
        ? document.createElementNS('http://www.w3.org/2000/svg', tag)
        : document.createElement(tag);
      vnode.el = newEl;

      // Mount props
      for (const key in props) {
        if (key === 'key' || key === 'ref') continue;
        patchProp(newEl, key, null, props[key], isSVG);
      }

      // Mount children
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (child != null) {
            hydrateNode(child, newEl as HTMLElement, i);
          }
        }
      } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        newEl.textContent = String(children ?? '');
      }

      // Replace or append
      if (existingNode) {
        parent.replaceChild(newEl, existingNode);
      } else {
        parent.appendChild(newEl);
      }
    }

    return index + 1;
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
 * Create hydration functions for matching existing DOM with vnodes.
 * Accepts an optional shared vnodeMap so hydration and DOM renderer
 * use the same vnode-to-element mapping.
 */
export function createHydrationFunctions(
  // _rendererOptions is reserved for future renderer configuration.
  // Currently unused but kept in the API signature for forward compatibility.
  _rendererOptions: Record<string, unknown>,
  sharedVnodeMap?: WeakMap<Element, VNode | null>,
): HydrationRenderer {
  // Use shared vnodeMap if provided, otherwise create a local one
  const vnodeMap = sharedVnodeMap ?? new WeakMap<Element, VNode | null>();

  function hydrate(vnode: VNode, container: HTMLElement): void {
    hydrateNode(vnode, container, 0);
    vnodeMap.set(container, vnode);
  }

  return { hydrate };
}
