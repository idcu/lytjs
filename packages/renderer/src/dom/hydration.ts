/**
 * @lytjs/renderer - Hydration
 * Simplified hydration that matches existing DOM nodes with vnodes
 */

import type { VNode } from "@lytjs/vdom";
import { Fragment, Text, Comment, ShapeFlags } from "@lytjs/vdom";
import { isArray, isFunction } from "@lytjs/common-is";
import { warn } from "@lytjs/common-error";
import { patchProp } from "./patch-props";
import { vnodeMap } from "./dom-renderer";

// ============================================================
// Dev mode hydration mismatch warnings
// ============================================================

function warnHydrationMismatch(
  type: string,
  expected: string,
  actual: string,
): void {
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
    // Save reference to first child before hydration loop,
    // because child node replacement may invalidate indices.
    const firstChild = parent.childNodes[index] ?? null;
    let currentIndex = index;
    for (let i = 0; i < childArray.length; i++) {
      const child = childArray[i];
      if (child != null) {
        currentIndex = hydrateNode(child, parent, currentIndex);
      }
    }
    // Fragment el points to the first child's el
    if (childArray.length > 0) {
      vnode.el = firstChild;
    } else {
      vnode.el = null;
    }
    return currentIndex;
  }

  // Handle Text
  if (type === Text) {
    const node = parent.childNodes[index];
    const text = isFunction(children) ? "" : String(children ?? "");
    if (node && node.nodeType === Node.TEXT_NODE) {
      // Match: reuse existing text node
      if (node.textContent !== text) {
        warnHydrationMismatch("text content", text, node.textContent ?? "");
        node.textContent = text;
      }
      vnode.el = node;
    } else {
      // Mismatch: create new text node and replace
      warnHydrationMismatch(
        "node type",
        `Text("${text}")`,
        node && node.nodeType === Node.ELEMENT_NODE
          ? `Element(<${(node as Element).tagName.toLowerCase()}>)`
          : node
            ? `Node(type=${node.nodeType})`
            : "none",
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
    const text = isFunction(children) ? "" : String(children ?? "");
    if (node && node.nodeType === Node.COMMENT_NODE) {
      // Match: reuse existing comment node
      if (node.textContent !== text) {
        warnHydrationMismatch("comment content", text, node.textContent ?? "");
        node.textContent = text;
      }
      vnode.el = node;
    } else {
      // Mismatch: create new comment node and replace
      warnHydrationMismatch(
        "node type",
        `Comment("${text}")`,
        node
          ? node.nodeType === Node.TEXT_NODE
            ? `Text("${node.textContent}")`
            : `Element(<${(node as Element).tagName.toLowerCase()}>)`
          : "none",
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
      const isSVG =
        (existingNode as Element).namespaceURI === "http://www.w3.org/2000/svg";
      for (const key in props) {
        if (key === "key" || key === "ref") continue;
        patchProp(existingNode as Element, key, null, props[key], isSVG);
      }

      // Hydrate children
      let childIndex = 0;
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (child != null) {
            childIndex = hydrateNode(
              child,
              existingNode as HTMLElement,
              childIndex,
            );
          }
        }
      } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        const text = String(children ?? "");
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
        "element tag",
        `<${tag}>`,
        existingNode
          ? `<${(existingNode as Element).tagName.toLowerCase()}>`
          : "none",
      );
      const isSVG =
        tag === "svg" ||
        (existingNode as Element | undefined)?.namespaceURI ===
          "http://www.w3.org/2000/svg";
      const newEl = isSVG
        ? document.createElementNS("http://www.w3.org/2000/svg", tag)
        : document.createElement(tag);
      vnode.el = newEl;

      // Mount props
      for (const key in props) {
        if (key === "key" || key === "ref") continue;
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
        newEl.textContent = String(children ?? "");
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
 */
export function createHydrationFunctions(
  _rendererOptions: Record<string, unknown>,
): HydrationRenderer {
  function hydrate(vnode: VNode, container: HTMLElement): void {
    hydrateNode(vnode, container, 0);
    vnodeMap.set(container, vnode);
  }

  return { hydrate };
}
