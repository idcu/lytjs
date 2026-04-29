/**
 * @lytjs/vdom - patch
 * Core patch logic with minimal DOM renderer
 */

import {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
} from '@lytjs/common-vnode'
import type { VNode } from '@lytjs/common-vnode'
import { isArray, isFunction, hasChanged, EMPTY_OBJ } from '@lytjs/common-is'
import { isSafeAttribute } from '@lytjs/common-string'
import type { RendererOptions, HostNode, HostElement } from './types'
import { getVNodeProps } from './props-map'
import { getSequence } from '@lytjs/common-algorithm'

// ============================================================
// Renderer factory
// ============================================================

/**
 * Create a renderer with the given host platform options.
 * Returns patch, mount, and unmount functions.
 */
export function createRenderer(options: RendererOptions<HostNode, HostElement>) {
  const {
    createElement,
    setElementText,
    insert,
    remove: hostRemove,
    createText,
    patchProp,
    createComment,
  } = options

  // ============================================================
  // isSameVNodeType
  // ============================================================

  function isSameVNodeType(n1: VNode, n2: VNode): boolean {
    return n1.type === n2.type && n1.key === n2.key
  }

  // ============================================================
  // patch - core diffing entry point
  // ============================================================

  function patch(
    n1: VNode | null,
    n2: VNode,
    container: HostNode,
    anchor: HostNode | null = null,
    parentComponent: any = null,
    parentSuspense: any = null,
    isSVG: boolean = false,
  ): void {
    // If n1 and n2 are the same type, patch them
    if (n1 !== null && isSameVNodeType(n1, n2)) {
      // Fragment needs special handling
      if (n2.type === Fragment) {
        patchFragment(n1, n2, container, parentComponent, parentSuspense, isSVG)
      } else {
        // Patch existing node
        patchElement(n1, n2, parentComponent, parentSuspense, isSVG)
      }
    } else {
      // Unmount old node
      if (n1 !== null) {
        unmount(n1, parentComponent, parentSuspense, true)
      }

      // Mount new node
      if (n2.shapeFlag & ShapeFlags.ELEMENT) {
        mountElement(n2, container, anchor, isSVG)
      } else if (n2.type === Text) {
        mountTextNode(n2, container, anchor)
      } else if (n2.type === Comment) {
        mountCommentNode(n2, container, anchor)
      } else if (n2.type === Fragment) {
        mountFragment(n2, container, anchor, parentComponent, parentSuspense, isSVG)
      }
    }
  }

  // ============================================================
  // mountElement
  // ============================================================

  function mountElement(
    vnode: VNode,
    container: HostNode,
    anchor: HostNode | null,
    isSVG: boolean,
  ): void {
    const tag = vnode.type as string
    const el = createElement(tag)
    vnode.el = el

    // Apply props
    const props = getVNodeProps(vnode) ?? EMPTY_OBJ
    for (const key in props) {
      if (key === 'key' || key === 'ref') continue
      patchProp(el, key, null, props[key])
    }

    // Mount children
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, anchor, isSVG)
    } else if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      setElementText(el, String(vnode.children ?? ''))
    }

    // Insert into container
    insert(el, container, anchor)
  }

  // ============================================================
  // mountTextNode
  // ============================================================

  function mountTextNode(
    vnode: VNode,
    container: HostNode,
    anchor: HostNode | null,
  ): void {
    const text = isFunction(vnode.children) ? '' : String(vnode.children ?? '')
    const node = createText(text)
    vnode.el = node
    insert(node, container, anchor)
  }

  // ============================================================
  // mountCommentNode
  // ============================================================

  function mountCommentNode(
    vnode: VNode,
    container: HostNode,
    anchor: HostNode | null,
  ): void {
    const text = isFunction(vnode.children) ? '' : String(vnode.children ?? '')
    const node = createComment(text)
    vnode.el = node
    vnode.anchor = node
    insert(node, container, anchor)
  }

  // ============================================================
  // mountFragment
  // ============================================================

  function mountFragment(
    vnode: VNode,
    container: HostNode,
    anchor: HostNode | null,
    parentComponent: any,
    parentSuspense: any,
    isSVG: boolean,
  ): void {
    const fragmentStartAnchor = createComment('')
    const fragmentEndAnchor = createComment('')
    vnode.el = fragmentStartAnchor
    vnode.anchor = fragmentEndAnchor

    insert(fragmentStartAnchor, container, anchor)
    insert(fragmentEndAnchor, container, anchor)

    // Mount children between the anchors
    const children = isArray(vnode.children) ? vnode.children : []
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child != null) {
        patch(null, child, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG)
      }
    }
  }

  // ============================================================
  // patchFragment
  // ============================================================

  function patchFragment(
    n1: VNode,
    n2: VNode,
    container: HostNode,
    parentComponent: any,
    parentSuspense: any,
    isSVG: boolean,
  ): void {
    // Reuse the existing fragment anchors
    n2.el = n1.el
    const endAnchor = n1.anchor
    if (!endAnchor) return
    n2.anchor = endAnchor

    const c1 = n1.children as VNode[] | null
    const c2 = n2.children as VNode[] | null

    // Both should be arrays for fragments
    if (isArray(c1) && isArray(c2)) {
      // Use diffChildren with the parent container
      // The anchor for insertions should be the fragment's end anchor
      diffChildrenFragment(c1, c2, container, endAnchor, parentComponent, parentSuspense, isSVG)
    } else if (isArray(c2)) {
      // Old was null/empty, mount all new before end anchor
      for (let i = 0; i < c2.length; i++) {
        patch(null, c2[i]!, container, endAnchor, parentComponent, parentSuspense, isSVG)
      }
    } else if (isArray(c1)) {
      // New is null/empty, unmount all old
      unmountChildren(c1, parentComponent, parentSuspense)
    }
  }

  // ============================================================
  // diffChildrenInternal - 通用 keyed diff 算法
  // ============================================================

  function diffChildrenInternal(
    c1: VNode[],
    c2: VNode[],
    container: HostNode,
    parentComponent: any,
    parentSuspense: any,
    isSVG: boolean,
    fallbackAnchor: HostNode | null,
  ): void {
    let i = 0
    const l2 = c2.length
    let e1 = c1.length - 1
    let e2 = l2 - 1

    // 1. Sync from start
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]!
      const n2 = c2[i]!
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG)
      } else {
        break
      }
      i++
    }

    // 2. Sync from end
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]!
      const n2 = c2[e2]!
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG)
      } else {
        break
      }
      e1--
      e2--
    }

    // 3. Common sequence + mount
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1
        const anchor = nextPos < l2 ? c2[nextPos]!.el : fallbackAnchor
        while (i <= e2) {
          patch(null, c2[i]!, container, anchor, parentComponent, parentSuspense, isSVG)
          i++
        }
      }
    }
    // 4. Common sequence + unmount
    else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i]!, parentComponent, parentSuspense, true)
        i++
      }
    }
    // 5. Unknown sequence - use keyed diff with LIS
    else {
      const s1 = i
      const s2 = i

      const keyToNewIndexMap: Map<string | number | symbol, number> = new Map()
      for (i = s2; i <= e2; i++) {
        const nextChild = c2[i]!
        const key = nextChild.key
        if (key != null) {
          keyToNewIndexMap.set(key, i)
        }
      }

      let j: number
      let patched = 0
      const toBePatched = e2 - s2 + 1
      let moved = false
      let maxNewIndexSoFar = 0

      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)

      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i]!
        if (patched >= toBePatched) {
          unmount(prevChild, parentComponent, parentSuspense, true)
          continue
        }

        let newIndex: number | undefined
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          for (j = s2; j <= e2; j++) {
            if (
              newIndexToOldIndexMap[j - s2] === 0 &&
              isSameVNodeType(prevChild, c2[j]!)
            ) {
              newIndex = j
              break
            }
          }
        }

        if (newIndex === undefined) {
          unmount(prevChild, parentComponent, parentSuspense, true)
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            moved = true
          }
          patch(
            prevChild,
            c2[newIndex]!,
            container,
            null,
            parentComponent,
            parentSuspense,
            isSVG,
          )
          patched++
        }
      }

      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []

      j = increasingNewIndexSequence.length - 1

      for (i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i
        const nextChild = c2[nextIndex]!
        const anchor =
          nextIndex + 1 < l2 ? c2[nextIndex + 1]!.el : fallbackAnchor

        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, anchor, parentComponent, parentSuspense, isSVG)
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]!) {
            if (nextChild.el) {
              insert(nextChild.el, container, anchor)
            }
          } else {
            j--
          }
        }
      }
    }
  }

  // ============================================================
  // diffChildrenFragment - like diffChildren but uses endAnchor as fallback
  // ============================================================

  function diffChildrenFragment(
    c1: VNode[],
    c2: VNode[],
    container: HostNode,
    endAnchor: HostNode,
    parentComponent: any,
    parentSuspense: any,
    isSVG: boolean,
  ): void {
    diffChildrenInternal(c1, c2, container, parentComponent, parentSuspense, isSVG, endAnchor)
  }

  // ============================================================
  // mountChildren
  // ============================================================

  function mountChildren(
    vnode: VNode,
    container: HostNode,
    anchor: HostNode | null,
    isSVG: boolean,
    parentComponent: any = null,
    parentSuspense: any = null,
  ): void {
    const children = vnode.children
    if (!isArray(children)) return

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child != null) {
        patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG)
      }
    }
  }

  // ============================================================
  // patchElement
  // ============================================================

  function patchElement(
    n1: VNode,
    n2: VNode,
    parentComponent: any,
    parentSuspense: any,
    isSVG: boolean,
  ): void {
    // n1.el is guaranteed to exist since n1 was previously mounted
    const el = (n2.el = n1.el!) as HostElement

    // Patch props
    const oldProps = getVNodeProps(n1) ?? EMPTY_OBJ
    const newProps = getVNodeProps(n2) ?? EMPTY_OBJ

    if (n2.patchFlag === PatchFlags.FULL_PROPS) {
      // Full props diff
      for (const key in newProps) {
        if (key === 'key' || key === 'ref') continue
        const next = newProps[key]
        const prev = oldProps[key]
        if (hasChanged(next, prev)) {
          patchProp(el, key, prev, next)
        }
      }
      for (const key in oldProps) {
        if (key === 'key' || key === 'ref') continue
        if (!(key in newProps)) {
          patchProp(el, key, oldProps[key], null)
        }
      }
    } else if (n2.patchFlag > 0) {
      // PatchFlag optimization
      if (n2.patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          patchProp(el, 'class', oldProps.class, newProps.class)
        }
      }
      if (n2.patchFlag & PatchFlags.STYLE) {
        patchProp(el, 'style', oldProps.style, newProps.style)
      }
      if (n2.patchFlag & PatchFlags.PROPS) {
        // Only diff dynamicProps
        const dynamicProps = n2.dynamicProps
        if (dynamicProps) {
          for (let i = 0; i < dynamicProps.length; i++) {
            const key = dynamicProps[i]!
            const next = newProps[key]
            const prev = oldProps[key]
            if (hasChanged(next, prev)) {
              patchProp(el, key, prev, next)
            }
          }
        }
      }
      if (n2.patchFlag & PatchFlags.TEXT) {
        if (n1.children !== n2.children) {
          setElementText(el, String(n2.children ?? ''))
        }
      }
    } else if (oldProps !== newProps) {
      // No patchFlag, do full props diff
      for (const key in newProps) {
        if (key === 'key' || key === 'ref') continue
        const next = newProps[key]
        const prev = oldProps[key]
        if (hasChanged(next, prev)) {
          patchProp(el, key, prev, next)
        }
      }
      for (const key in oldProps) {
        if (key === 'key' || key === 'ref') continue
        if (!(key in newProps)) {
          patchProp(el, key, oldProps[key], null)
        }
      }
    }

    // Patch children
    patchChildren(n1, n2, el, parentComponent, parentSuspense, isSVG)
  }

  // ============================================================
  // patchChildren
  // ============================================================

  function patchChildren(
    n1: VNode,
    n2: VNode,
    container: HostNode,
    parentComponent: any,
    parentSuspense: any,
    isSVG: boolean,
  ): void {
    const c1 = n1.children as VNode[] | string | null
    const c2 = n2.children as VNode[] | string | null
    const { shapeFlag: prevShapeFlag } = n1
    const { shapeFlag: nextShapeFlag } = n2

    if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // New children are text
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // Old children were array - unmount all
        unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
      }
      if (c2 !== c1) {
        // Set new text
        setElementText(container as HostElement, String(c2 ?? ''))
      }
    } else {
      // New children are array (or null)
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // Old children were text - clear it
        setElementText(container as HostElement, '')
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
          )
        } else {
          // New children are null - unmount all old
          unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
        }
      } else if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // Old children were null/none - mount new array
        mountChildren(n2, container, null, isSVG, parentComponent, parentSuspense)
      }
    }
  }

  // ============================================================
  // diffChildren - keyed diff with LIS optimization
  // ============================================================

  function diffChildren(
    c1: VNode[],
    c2: VNode[],
    container: HostNode,
    parentComponent: any,
    parentSuspense: any,
    isSVG: boolean,
  ): void {
    diffChildrenInternal(c1, c2, container, parentComponent, parentSuspense, isSVG, null)
  }

  // ============================================================
  // unmount
  // ============================================================

  function unmount(
    vnode: VNode,
    parentComponent: any,
    parentSuspense: any,
    doRemove: boolean = false,
  ): void {
    const { type, children, el } = vnode

    if (type === Fragment) {
      unmountFragment(vnode, parentComponent, parentSuspense, doRemove)
      return
    }

    if (type === Comment) {
      if (doRemove) {
        if (el) hostRemove(el)
      }
      return
    }

    // Unmount children
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        unmount(children[i]!, parentComponent, parentSuspense, doRemove)
      }
    }

    if (doRemove) {
      if (el) hostRemove(el)
    }
  }

  // ============================================================
  // unmountFragment
  // ============================================================

  function unmountFragment(
    vnode: VNode,
    parentComponent: any,
    parentSuspense: any,
    doRemove: boolean,
  ): void {
    const { children } = vnode
    if (isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        unmount(children[i]!, parentComponent, parentSuspense, doRemove)
      }
    }

    if (doRemove) {
      // Remove fragment anchors
      if (vnode.el) {
        hostRemove(vnode.el)
      }
      if (vnode.anchor && vnode.anchor !== vnode.el) {
        hostRemove(vnode.anchor)
      }
    }
  }

  // ============================================================
  // unmountChildren
  // ============================================================

  function unmountChildren(
    children: VNode[],
    parentComponent: any,
    parentSuspense: any,
  ): void {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]!, parentComponent, parentSuspense, true)
    }
  }

  // ============================================================
  // move
  // ============================================================

  function move(
    vnode: VNode,
    container: HostNode,
    anchor: HostNode | null,
    parentComponent: any,
    parentSuspense: any,
  ): void {
    if (vnode.type === Fragment) {
      // Move fragment children
      const children = isArray(vnode.children) ? vnode.children : []
      for (let i = 0; i < children.length; i++) {
        move(children[i]!, container, anchor, parentComponent, parentSuspense)
      }
      // Move anchors
      if (vnode.el) insert(vnode.el, container, anchor)
      if (vnode.anchor && vnode.anchor !== vnode.el) insert(vnode.anchor, container, anchor)
    } else {
      if (vnode.el) insert(vnode.el, container, anchor)
    }
  }

  // ============================================================
  // mount
  // ============================================================

  function mount(vnode: VNode, container: HostNode): void {
    patch(null, vnode, container, null)
  }

  return {
    patch,
    mount,
    unmount: (vnode: VNode) => unmount(vnode, null, null, true),
    move,
    diffChildren,
  }
}

// ============================================================
// Default DOM renderer options
// ============================================================

/**
 * Create default DOM renderer options for browser environments
 */
export function createDOMRendererOptions(): RendererOptions<Node, Element> {
  return {
    createElement(tag: string): Element {
      return document.createElement(tag)
    },
    setElementText(node: Element, text: string): void {
      node.textContent = text
    },
    insert(child: Node, parent: Node, anchor: Node | null = null): void {
      parent.insertBefore(child, anchor)
    },
    remove(child: Node): void {
      const parent = child.parentNode
      if (parent) {
        parent.removeChild(child)
      }
    },
    createText(text: string): Node {
      return document.createTextNode(text)
    },
    setText(node: Node, text: string): void {
      node.nodeValue = text
    },
    nextSibling(node: Node): Node | null {
      return node.nextSibling
    },
    parentNode(node: Node): Node | null {
      return node.parentNode
    },
    patchProp(el: Element, key: string, prevValue: unknown, nextValue: unknown): void {
      if (key === 'class') {
        if (prevValue !== nextValue) {
          el.className = (nextValue as string) || ''
        }
      } else if (key === 'style') {
        if (typeof nextValue === 'string') {
          el.setAttribute('style', nextValue)
        } else if (nextValue != null) {
          const style = el as HTMLElement
          for (const k in nextValue as Record<string, string>) {
            const val = (nextValue as Record<string, string>)[k]
            if (val !== undefined) {
              style.style.setProperty(k, val)
            }
          }
        } else {
          el.removeAttribute('style')
        }
      } else if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()
        if (prevValue) {
          el.removeEventListener(eventName, prevValue as EventListener)
        }
        if (nextValue) {
          el.addEventListener(eventName, nextValue as EventListener)
        }
      } else if (nextValue == null || nextValue === false) {
        el.removeAttribute(key)
      } else {
        if (isSafeAttribute(key, String(nextValue))) {
          el.setAttribute(key, String(nextValue))
        }
      }
    },
    createComment(text: string): Node {
      return document.createComment(text)
    },
  }
}
