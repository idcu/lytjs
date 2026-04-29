/**
 * @lytjs/renderer - Hydration
 * Simplified hydration that matches existing DOM nodes with vnodes
 */

import type { VNode } from '@lytjs/vdom'
import { Fragment, Text, ShapeFlags, getVNodeProps } from '@lytjs/vdom'
import { isArray, isFunction } from '@lytjs/common-is'
import { patchProp } from './patch-props'

// ============================================================
// Hydration types
// ============================================================

export interface HydrationRenderer {
  hydrate(vnode: VNode, container: HTMLElement): void
}

// ============================================================
// hydrateNode - core recursive hydration
// ============================================================

function hydrateNode(
  vnode: VNode,
  parent: HTMLElement,
  index: number,
): number {
  const { type, shapeFlag, children } = vnode

  // Handle Fragment
  if (type === Fragment) {
    const childArray = isArray(children) ? children : []
    let currentIndex = index
    for (let i = 0; i < childArray.length; i++) {
      const child = childArray[i]
      if (child != null) {
        currentIndex = hydrateNode(child, parent, currentIndex)
      }
    }
    // Fragment el points to the first child's el
    vnode.el = parent.childNodes[index] ?? null
    return currentIndex
  }

  // Handle Text
  if (type === Text) {
    const node = parent.childNodes[index]
    const text = isFunction(children) ? '' : String(children ?? '')
    if (node && node.nodeType === Node.TEXT_NODE) {
      // Match: reuse existing text node
      if (node.textContent !== text) {
        node.textContent = text
      }
      vnode.el = node
    } else {
      // Mismatch: create new text node and replace
      const newNode = document.createTextNode(text)
      if (node) {
        parent.replaceChild(newNode, node)
      } else {
        parent.appendChild(newNode)
      }
      vnode.el = newNode
    }
    return index + 1
  }

  // Handle Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    const tag = type as string
    const existingNode = parent.childNodes[index]
    const props = getVNodeProps(vnode) ?? {}

    if (
      existingNode &&
      existingNode.nodeType === Node.ELEMENT_NODE &&
      (existingNode as Element).tagName.toLowerCase() === tag.toLowerCase()
    ) {
      // Match: reuse existing element
      vnode.el = existingNode as Element

      // Hydrate props (attach event listeners, sync attributes)
      const isSVG = (existingNode as Element).namespaceURI === 'http://www.w3.org/2000/svg'
      for (const key in props) {
        if (key === 'key' || key === 'ref') continue
        patchProp(existingNode as Element, key, null, props[key], isSVG)
      }

      // Hydrate children
      let childIndex = 0
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          if (child != null) {
            childIndex = hydrateNode(child, existingNode as HTMLElement, childIndex)
          }
        }
      } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        const text = String(children ?? '')
        const firstChild = (existingNode as HTMLElement).firstChild
        if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
          if (firstChild.textContent !== text) {
            firstChild.textContent = text
          }
        } else {
          // Mismatch: set text content
          ;(existingNode as HTMLElement).textContent = text
        }
        childIndex = 1
      }

      // Remove extra DOM nodes
      const elChildren = (existingNode as HTMLElement).childNodes
      while (elChildren.length > childIndex) {
        ;(existingNode as HTMLElement).removeChild(elChildren[childIndex]!)
      }
    } else {
      // Mismatch: create new element and replace
      const isSVG = tag === 'svg' ||
        (existingNode as Element | undefined)?.namespaceURI === 'http://www.w3.org/2000/svg'
      const newEl = isSVG
        ? document.createElementNS('http://www.w3.org/2000/svg', tag)
        : document.createElement(tag)
      vnode.el = newEl

      // Mount props
      for (const key in props) {
        if (key === 'key' || key === 'ref') continue
        patchProp(newEl, key, null, props[key], isSVG)
      }

      // Mount children
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          if (child != null) {
            hydrateNode(child, newEl as HTMLElement, i)
          }
        }
      } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        newEl.textContent = String(children ?? '')
      }

      // Replace or append
      if (existingNode) {
        parent.replaceChild(newEl, existingNode)
      } else {
        parent.appendChild(newEl)
      }
    }

    return index + 1
  }

  return index + 1
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
    hydrateNode(vnode, container, 0)
    ;(container as any)._vnode = vnode
  }

  return { hydrate }
}
