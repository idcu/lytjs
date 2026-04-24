/**
 * Lyt.js 渲染器 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 通过模拟 DOM 操作（MockRenderer）测试渲染器的核心逻辑，
 * 不依赖真实浏览器 DOM。
 *
 * 测试覆盖：
 *   - createRenderer 创建渲染器实例
 *   - mount 首次渲染基本元素
 *   - mount 渲染嵌套元素
 *   - patch 更新文本内容
 *   - patch 更新属性
 *   - patch 更新 class
 *   - patch 替换元素（不同类型）
 *   - unmount 卸载元素
 *   - Fragment 多根节点渲染
 *   - 事件绑定和触发
 */

import { describe, it, expect, deepEqual } from '../../test-utils/src/index'

// ================================================================
//  Mock DOM 实现
// ================================================================

/**
 * 模拟 DOM 元素
 */
class MockElement {
  tagName: string
  nodeType = 1
  textContent: string = ''
  className: string = ''
  attributes: Record<string, string> = {}
  style: Record<string, string> = {}
  eventListeners: Record<string, Function[]> = {}
  childNodes: (MockElement | MockText | MockComment)[] = []
  parentNode: MockElement | null = null
  nextSiblingEl: (MockElement | MockText | MockComment) | null = null

  constructor(tag: string) {
    this.tagName = tag.toLowerCase()
  }

  setAttribute(key: string, val: string): void {
    this.attributes[key] = val
  }

  removeAttribute(key: string): void {
    delete this.attributes[key]
  }

  addEventListener(event: string, handler: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    this.eventListeners[event].push(handler)
  }

  removeEventListener(event: string, handler: Function): void {
    const list = this.eventListeners[event]
    if (list) {
      const idx = list.indexOf(handler)
      if (idx !== -1) list.splice(idx, 1)
    }
  }

  appendChild(child: MockElement | MockText | MockComment): void {
    child.parentNode = this
    this.childNodes.push(child)
  }

  insertBefore(child: MockElement | MockText | MockComment, ref: (MockElement | MockText | MockComment) | null): void {
    child.parentNode = this
    if (ref == null) {
      this.childNodes.push(child)
    } else {
      const idx = this.childNodes.indexOf(ref)
      if (idx !== -1) {
        this.childNodes.splice(idx, 0, child)
      } else {
        this.childNodes.push(child)
      }
    }
  }

  removeChild(child: MockElement | MockText | MockComment): void {
    const idx = this.childNodes.indexOf(child)
    if (idx !== -1) {
      this.childNodes.splice(idx, 1)
      child.parentNode = null
    }
  }

  replaceChild(newChild: MockElement | MockText | MockComment, oldChild: MockElement | MockText | MockComment): void {
    const idx = this.childNodes.indexOf(oldChild)
    if (idx !== -1) {
      this.childNodes[idx] = newChild
      newChild.parentNode = this
      oldChild.parentNode = null
    }
  }

  /** 模拟触发事件 */
  triggerEvent(event: string, detail?: any): void {
    const handlers = this.eventListeners[event]
    if (handlers) {
      for (const handler of handlers) {
        handler({ type: event, detail, target: this })
      }
    }
  }
}

/**
 * 模拟文本节点
 */
class MockText {
  nodeType = 3
  nodeValue: string
  parentNode: MockElement | null = null

  constructor(text: string) {
    this.nodeValue = text
  }
}

/**
 * 模拟注释节点
 */
class MockComment {
  nodeType = 8
  nodeValue: string
  parentNode: MockElement | null = null

  constructor(text: string) {
    this.nodeValue = text
  }
}

/**
 * Mock 渲染器 — 实现 LytRenderer 接口
 */
class MockRenderer {
  createElement(tag: string): any { return new MockElement(tag) }
  createText(text: string): any { return new MockText(text) }
  createComment(text: string): any { return new MockComment(text) }
  setAttribute(el: any, key: string, val: any): void { el.setAttribute(key, String(val)) }
  removeAttribute(el: any, key: string): void { el.removeAttribute(key) }
  setStyle(el: any, style: any): void {
    if (typeof style === 'string') {
      el.style.cssText = style
    } else if (style && typeof style === 'object') {
      for (const key in style) {
        el.style[key] = style[key]
      }
    }
  }
  setClass(el: any, cls: any): void {
    if (typeof cls === 'string') {
      el.className = cls
    } else if (cls && typeof cls === 'object') {
      let result = ''
      for (const key in cls) {
        if (cls[key]) result += (result ? ' ' : '') + key
      }
      el.className = result
    } else {
      el.className = ''
    }
  }
  insert(parent: any, child: any, ref?: any): void {
    parent.insertBefore(child, ref || null)
  }
  remove(child: any): void {
    if (child.parentNode) {
      child.parentNode.removeChild(child)
    }
  }
  replace(parent: any, oldChild: any, newChild: any): void {
    parent.replaceChild(newChild, oldChild)
  }
  addEventListener(el: any, event: string, handler: Function, options?: any): void {
    el.addEventListener(event, handler)
  }
  removeEventListener(el: any, event: string, handler: Function): void {
    el.removeEventListener(event, handler)
  }
  nextTick(cb: Function): void { Promise.resolve().then(cb as () => void) }
  parentNode(el: any): any { return el.parentNode }
  nextSibling(el: any): any { return el.nextSiblingEl }
  querySelector(selector: string): any { return null }
}

// ================================================================
//  手动实现 createRenderer（避免依赖 @lytjs/vdom 的 registerDOMOperations）
// ================================================================

/**
 * VNode 最小接口
 */
interface VNode {
  type: string | object | symbol
  props: Record<string, any> | null
  children: string | VNode[] | Record<string, any> | null
  key: string | number | null
  ref: any
  shapeFlag: number
  patchFlag: number
  dynamicChildren: VNode[] | null
  dynamicProps: string[] | null
  component: any
  el: any
  anchor: any
}

const ShapeFlags = {
  ELEMENT: 1,
  FUNCTIONAL_COMPONENT: 2,
  STATEFUL_COMPONENT: 4,
  TEXT_CHILDREN: 8,
  ARRAY_CHILDREN: 16,
  SLOTS_CHILDREN: 32,
}

const PatchFlags = {
  TEXT: 1,
  CLASS: 2,
  STYLE: 4,
  PROPS: 8,
  FULL_PROPS: 16,
}

const Fragment = Symbol('Fragment')
const Text = Symbol('Text')

function isFragment(vnode: VNode): boolean { return vnode.type === Fragment }
function isTextVNode(vnode: VNode): boolean { return vnode.type === Text }
function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}

interface LytRenderer {
  createElement(tag: string): any
  createText(text: string): any
  createComment(text: string): any
  setAttribute(el: any, key: string, val: any): void
  removeAttribute(el: any, key: string): void
  setStyle(el: any, style: object): void
  setClass(el: any, cls: string | object): void
  insert(parent: any, child: any, ref?: any): void
  remove(child: any): void
  replace(parent: any, oldChild: any, newChild: any): void
  addEventListener(el: any, event: string, handler: Function, options?: any): void
  removeEventListener(el: any, event: string, handler: Function): void
  nextTick(cb: Function): void
  parentNode(el: any): any
  nextSibling(el: any): any
  querySelector(selector: string): any
}

interface RendererInstance {
  mount(vnode: VNode, container: any): void
  patch(oldVNode: VNode, newVNode: VNode, container?: any): void
  unmount(vnode: VNode, container?: any): void
}

function createRenderer(renderer: LytRenderer): RendererInstance {
  function patch(
    n1: VNode | null, n2: VNode, container: any,
    anchor: any = null, parentComponent: any = null,
  ): void {
    if (n2 == null) { if (n1) unmount(n1, container); return }
    if (n1 === null) { mountVNode(n2, container, anchor, parentComponent); return }
    if (!isSameVNodeType(n1, n2)) { unmount(n1, container); mountVNode(n2, container, anchor, parentComponent); return }
    n2.el = n1.el; n2.anchor = n1.anchor
    const { shapeFlag } = n2
    if (isFragment(n2)) { processFragment(n1, n2, container, anchor, parentComponent); return }
    if (isTextVNode(n2)) { if (n2.children !== n1.children) { n2.el.nodeValue = n2.children as string }; return }
    if (shapeFlag & ShapeFlags.ELEMENT) { patchElement(n1, n2, parentComponent); return }
    if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) { patchComponent(n1, n2, parentComponent); return }
  }

  function mountVNode(vnode: VNode, container: any, anchor: any, parentComponent: any): void {
    const { shapeFlag } = vnode
    if (isFragment(vnode)) { mountFragment(vnode, container, anchor, parentComponent); return }
    if (isTextVNode(vnode)) {
      const el = renderer.createText(vnode.children as string)
      vnode.el = el; renderer.insert(container, el, anchor); return
    }
    if (shapeFlag & ShapeFlags.ELEMENT) { mountElement(vnode, container, anchor, parentComponent); return }
    if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) { mountComponent(vnode, container, anchor, parentComponent); return }
  }

  function mountElement(vnode: VNode, container: any, anchor: any, parentComponent: any): void {
    const tag = vnode.type as string
    const el = renderer.createElement(tag)
    vnode.el = el
    if (vnode.props) { for (const key in vnode.props) { mountProp(el, key, vnode.props[key]) } }
    const { shapeFlag, children } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { el.textContent = children as string }
    else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { mountChildren(children as VNode[], el, null, parentComponent) }
    renderer.insert(container, el, anchor)
  }

  function mountProp(el: any, key: string, value: any): void {
    if (key === 'class') { renderer.setClass(el, value) }
    else if (key === 'style') { renderer.setStyle(el, value) }
    else if (key.startsWith('on') || key.startsWith('@')) {
      const eventName = key.startsWith('@') ? key.slice(1).toLowerCase() : key.slice(2).toLowerCase()
      renderer.addEventListener(el, eventName, value)
    }
    else if (key === 'key' || key === 'ref') { /* skip */ }
    else { renderer.setAttribute(el, key, value) }
  }

  function mountChildren(children: VNode[], container: any, anchor: any, parentComponent: any): void {
    for (let i = 0; i < children.length; i++) { patch(null, children[i], container, anchor, parentComponent) }
  }

  function mountFragment(vnode: VNode, container: any, anchor: any, parentComponent: any): void {
    const { children } = vnode
    const fragmentStartAnchor = renderer.createComment('')
    renderer.insert(container, fragmentStartAnchor, anchor)
    if (Array.isArray(children) && children.length > 0) {
      mountChildren(children, container, fragmentStartAnchor, parentComponent)
    }
    vnode.el = fragmentStartAnchor
    vnode.anchor = fragmentStartAnchor
  }

  function mountComponent(vnode: VNode, container: any, anchor: any, parentComponent: any): void {
    const component = vnode.component
    if (component && component.update) { component.update() }
    if (component && component.subTree) {
      patch(null, component.subTree, container, anchor, component)
      vnode.el = component.subTree.el
    }
  }

  function unmount(vnode: VNode, container?: any): void {
    const { shapeFlag, children } = vnode
    if (isFragment(vnode)) {
      if (Array.isArray(children)) { for (let i = 0; i < children.length; i++) { unmount(children[i], container) } }
      if (vnode.anchor && vnode.anchor.parentNode) { renderer.remove(vnode.anchor) }
      return
    }
    if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) {
      if (vnode.component && vnode.component.subTree) { unmount(vnode.component.subTree, container) }
      return
    }
    if (vnode.el) { renderer.remove(vnode.el) }
  }

  function patchElement(n1: VNode, n2: VNode, parentComponent: any = null): void {
    const el = (n2.el = n1.el!)
    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    const { patchFlag, dynamicProps } = n2

    if (patchFlag && patchFlag > 0) {
      if (patchFlag & PatchFlags.TEXT) { if (n1.children !== n2.children) { el.textContent = n2.children as string } }
      if (patchFlag & PatchFlags.CLASS) { if (oldProps.class !== newProps.class) { renderer.setClass(el, newProps.class) } }
      if (patchFlag & PatchFlags.STYLE) { if (oldProps.style !== newProps.style) { renderer.setStyle(el, newProps.style || {}) } }
      if (patchFlag & PatchFlags.PROPS) {
        if (dynamicProps) {
          for (let i = 0; i < dynamicProps.length; i++) {
            const key = dynamicProps[i]
            patchSingleProp(el, key, newProps[key], oldProps[key])
          }
        }
      }
      if (patchFlag & PatchFlags.FULL_PROPS) { patchAllProps(el, oldProps, newProps) }
    } else {
      patchAllProps(el, oldProps, newProps)
    }

    if (!patchFlag || !(patchFlag & PatchFlags.TEXT)) {
      patchChildren(n1, n2, el, null, parentComponent)
    }
  }

  function patchSingleProp(el: any, key: string, newValue: any, oldValue: any): void {
    if (key === 'class') { renderer.setClass(el, newValue) }
    else if (key === 'style') { renderer.setStyle(el, newValue || {}) }
    else if (key.startsWith('on') || key.startsWith('@')) {
      const eventName = key.startsWith('@') ? key.slice(1).toLowerCase() : key.slice(2).toLowerCase()
      if (oldValue) { renderer.removeEventListener(el, eventName, oldValue) }
      if (newValue) { renderer.addEventListener(el, eventName, newValue) }
    }
    else { renderer.setAttribute(el, key, newValue) }
  }

  function patchAllProps(el: any, oldProps: Record<string, any>, newProps: Record<string, any>): void {
    for (const key in newProps) {
      if (key === 'key' || key === 'ref') continue
      const oldValue = oldProps[key]
      const newValue = newProps[key]
      if (newValue !== oldValue) { patchSingleProp(el, key, newValue, oldValue) }
    }
    for (const key in oldProps) {
      if (key === 'key' || key === 'ref') continue
      if (!(key in newProps)) {
        if (key === 'class') { renderer.setClass(el, '') }
        else if (key === 'style') { renderer.setStyle(el, {}) }
        else if (key.startsWith('on') || key.startsWith('@')) {
          const eventName = key.startsWith('@') ? key.slice(1).toLowerCase() : key.slice(2).toLowerCase()
          renderer.removeEventListener(el, eventName, oldProps[key])
        }
        else { renderer.removeAttribute(el, key) }
      }
    }
  }

  function patchChildren(n1: VNode, n2: VNode, container: any, anchor: any, parentComponent: any): void {
    const oldShapeFlag = n1.shapeFlag
    const newShapeFlag = n2.shapeFlag
    const oldChildren = n1.children
    const newChildren = n2.children

    if (newShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) { unmountChildren(oldChildren as VNode[]) }
      if (oldChildren !== newChildren) { container.textContent = newChildren as string }
      return
    }
    if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 简化处理：卸载旧的，挂载新的
        unmountChildren(oldChildren as VNode[])
        mountChildren(newChildren as VNode[], container, anchor, parentComponent)
      } else {
        if (oldShapeFlag & ShapeFlags.TEXT_CHILDREN) { container.textContent = '' }
        mountChildren(newChildren as VNode[], container, anchor, parentComponent)
      }
      return
    }
    if (newChildren == null) {
      if (oldShapeFlag & ShapeFlags.TEXT_CHILDREN) { container.textContent = '' }
      else if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) { unmountChildren(oldChildren as VNode[]) }
    }
  }

  function unmountChildren(children: VNode[]): void {
    for (let i = 0; i < children.length; i++) { unmount(children[i]) }
  }

  function processFragment(n1: VNode, n2: VNode, container: any, anchor: any, parentComponent: any): void {
    const oldChildren = n1.children as VNode[] | null
    const newChildren = n2.children as VNode[] | null
    if (Array.isArray(newChildren) && newChildren.length > 0) {
      patchChildren(n1, n2, container, anchor, parentComponent)
      n2.el = newChildren[0].el
      n2.anchor = newChildren[newChildren.length - 1].el
        ? renderer.nextSibling(newChildren[newChildren.length - 1].el)
        : anchor
    } else if (Array.isArray(oldChildren) && oldChildren.length > 0 && newChildren === null) {
      unmountChildren(oldChildren)
      n2.el = n1.el; n2.anchor = n1.anchor
    } else {
      n2.el = n1.el; n2.anchor = n1.anchor
    }
  }

  function patchComponent(n1: VNode, n2: VNode, parentComponent: any): void {
    n2.component = n1.component; n2.el = n1.el
    if (n2.component && n2.component.update) { n2.component.update() }
  }

  return {
    mount(vnode: VNode, container: any): void {
      if (container.nodeType === 1) { container.textContent = '' }
      patch(null, vnode, container, null, null)
    },
    patch(oldVNode: VNode, newVNode: VNode, container?: any): void {
      patch(oldVNode, newVNode, container || oldVNode.el?.parentNode, null, null)
    },
    unmount(vnode: VNode, container?: any): void {
      unmount(vnode, container)
    },
  }
}

// ================================================================
//  辅助函数
// ================================================================

/** 创建容器 */
function createContainer(): MockElement {
  const el = new MockElement('div')
  return el
}

/** 创建元素 VNode */
function h(tag: string, props?: Record<string, any> | null, children?: string | VNode[] | null): VNode {
  let shapeFlag = ShapeFlags.ELEMENT
  if (typeof children === 'string') { shapeFlag |= ShapeFlags.TEXT_CHILDREN }
  else if (Array.isArray(children)) { shapeFlag |= ShapeFlags.ARRAY_CHILDREN }
  return { type: tag, props: props || null, children: children || null, key: props?.key ?? null, ref: null, shapeFlag, patchFlag: 0, dynamicChildren: null, dynamicProps: null, component: null, el: null, anchor: null }
}

/** 创建文本 VNode */
function textVNode(content: string): VNode {
  return { type: Text, props: null, children: content, key: null, ref: null, shapeFlag: 0, patchFlag: 0, dynamicChildren: null, dynamicProps: null, component: null, el: null, anchor: null }
}

/** 创建 Fragment VNode */
function fragmentVNode(children: VNode[]): VNode {
  return { type: Fragment, props: null, children, key: null, ref: null, shapeFlag: ShapeFlags.ARRAY_CHILDREN, patchFlag: 0, dynamicChildren: null, dynamicProps: null, component: null, el: null, anchor: null }
}

// ================================================================
//  测试用例
// ================================================================

describe('Renderer 渲染器', () => {
  const mockRenderer = new MockRenderer()
  const renderer = createRenderer(mockRenderer)

  // ---- 1. createRenderer 创建渲染器实例 ----
  it('createRenderer 创建渲染器实例', () => {
    const r = createRenderer(new MockRenderer())
    expect(r).toBeDefined()
    expect(typeof r.mount).toBe('function')
    expect(typeof r.patch).toBe('function')
    expect(typeof r.unmount).toBe('function')
  })

  // ---- 2. mount 首次渲染基本元素 ----
  it('mount 首次渲染基本元素', () => {
    const container = createContainer()
    const vnode = h('div', { id: 'app' }, 'Hello')

    renderer.mount(vnode, container)

    expect(container.childNodes.length).toBe(1)
    const el = container.childNodes[0] as MockElement
    expect(el.tagName).toBe('div')
    expect(el.textContent).toBe('Hello')
    expect(el.attributes['id']).toBe('app')
  })

  // ---- 3. mount 渲染嵌套元素 ----
  it('mount 渲染嵌套元素', () => {
    const container = createContainer()
    const vnode = h('div', { class: 'wrapper' }, [
      h('h1', null, 'Title'),
      h('p', null, 'Content'),
    ])

    renderer.mount(vnode, container)

    expect(container.childNodes.length).toBe(1)
    const div = container.childNodes[0] as MockElement
    expect(div.tagName).toBe('div')
    expect(div.className).toBe('wrapper')
    expect(div.childNodes.length).toBe(2)

    const h1 = div.childNodes[0] as MockElement
    expect(h1.tagName).toBe('h1')
    expect(h1.textContent).toBe('Title')

    const p = div.childNodes[1] as MockElement
    expect(p.tagName).toBe('p')
    expect(p.textContent).toBe('Content')
  })

  // ---- 4. patch 更新文本内容 ----
  it('patch 更新文本内容', () => {
    const container = createContainer()
    const oldVNode = h('span', null, 'Old Text')
    renderer.mount(oldVNode, container)

    const newVNode = h('span', null, 'New Text')
    renderer.patch(oldVNode, newVNode)

    const el = container.childNodes[0] as MockElement
    expect(el.textContent).toBe('New Text')
  })

  // ---- 5. patch 更新属性 ----
  it('patch 更新属性', () => {
    const container = createContainer()
    const oldVNode = h('input', { type: 'text', placeholder: 'old' }, null)
    renderer.mount(oldVNode, container)

    const newVNode = h('input', { type: 'password', placeholder: 'new' }, null)
    renderer.patch(oldVNode, newVNode)

    const el = container.childNodes[0] as MockElement
    expect(el.attributes['type']).toBe('password')
    expect(el.attributes['placeholder']).toBe('new')
  })

  // ---- 6. patch 更新 class ----
  it('patch 更新 class', () => {
    const container = createContainer()
    const oldVNode = h('div', { class: 'foo bar' }, null)
    renderer.mount(oldVNode, container)

    const newVNode = h('div', { class: 'baz qux' }, null)
    renderer.patch(oldVNode, newVNode)

    const el = container.childNodes[0] as MockElement
    expect(el.className).toBe('baz qux')
  })

  // ---- 7. patch 替换元素（不同类型） ----
  it('patch 替换元素（不同类型）', () => {
    const container = createContainer()
    const oldVNode = h('div', null, 'Old')
    renderer.mount(oldVNode, container)

    const newVNode = h('span', null, 'New')
    renderer.patch(oldVNode, newVNode)

    expect(container.childNodes.length).toBe(1)
    const el = container.childNodes[0] as MockElement
    expect(el.tagName).toBe('span')
    expect(el.textContent).toBe('New')
  })

  // ---- 8. unmount 卸载元素 ----
  it('unmount 卸载元素', () => {
    const container = createContainer()
    const vnode = h('div', { id: 'remove-me' }, 'Content')
    renderer.mount(vnode, container)

    expect(container.childNodes.length).toBe(1)

    renderer.unmount(vnode)

    expect(container.childNodes.length).toBe(0)
  })

  // ---- 9. Fragment 多根节点渲染 ----
  it('Fragment 多根节点渲染', () => {
    const container = createContainer()
    const vnode = fragmentVNode([
      h('li', null, 'Item 1'),
      h('li', null, 'Item 2'),
      h('li', null, 'Item 3'),
    ])

    renderer.mount(vnode, container)

    // Fragment 渲染后，容器中应有 3 个 li 元素（加上注释锚点）
    const liElements = container.childNodes.filter(n => (n as MockElement).tagName === 'li')
    expect(liElements.length).toBe(3)
    expect((liElements[0] as MockElement).textContent).toBe('Item 1')
    expect((liElements[1] as MockElement).textContent).toBe('Item 2')
    expect((liElements[2] as MockElement).textContent).toBe('Item 3')
  })

  // ---- 10. 事件绑定和触发 ----
  it('事件绑定和触发', () => {
    const container = createContainer()
    let clicked = false
    const handler = () => { clicked = true }

    const vnode = h('button', { onClick: handler }, 'Click me')
    renderer.mount(vnode, container)

    expect(clicked).toBe(false)

    const btn = container.childNodes[0] as MockElement
    btn.triggerEvent('click')

    expect(clicked).toBe(true)
  })

  // ---- 11. patch 使用 PatchFlag 精确更新文本 ----
  it('patch 使用 PatchFlag 精确更新文本', () => {
    const container = createContainer()
    const oldVNode: VNode = h('div', { class: 'static' }, 'Old Text')
    oldVNode.patchFlag = PatchFlags.TEXT
    renderer.mount(oldVNode, container)

    // 使用 PatchFlag.TEXT 标记，只更新文本，不更新 class
    const newVNode: VNode = h('div', { class: 'should-not-update' }, 'New Text')
    newVNode.patchFlag = PatchFlags.TEXT
    renderer.patch(oldVNode, newVNode)

    const el = container.childNodes[0] as MockElement
    expect(el.textContent).toBe('New Text')
    // class 不应该被更新（因为 patchFlag 只有 TEXT）
    expect(el.className).toBe('static')
  })

  // ---- 12. patch 使用 PatchFlag 精确更新 class ----
  it('patch 使用 PatchFlag 精确更新 class', () => {
    const container = createContainer()
    const oldVNode: VNode = h('div', { class: 'old-class' }, 'Content')
    oldVNode.patchFlag = PatchFlags.CLASS
    renderer.mount(oldVNode, container)

    const newVNode: VNode = h('div', { class: 'new-class' }, 'Content')
    newVNode.patchFlag = PatchFlags.CLASS
    renderer.patch(oldVNode, newVNode)

    const el = container.childNodes[0] as MockElement
    expect(el.className).toBe('new-class')
  })

  // ---- 13. unmount Fragment ----
  it('unmount Fragment', () => {
    const container = createContainer()
    const vnode = fragmentVNode([
      h('span', null, 'A'),
      h('span', null, 'B'),
    ])
    renderer.mount(vnode, container)

    expect(container.childNodes.length).toBeGreaterThan(0)

    renderer.unmount(vnode)

    // Fragment 卸载后，子元素和锚点都应被移除
    expect(container.childNodes.length).toBe(0)
  })
})
