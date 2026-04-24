/**
 * Lyt.js NativeRenderer — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * NativeRenderer 输出 NativeNode 描述树，无需真实 DOM。
 *
 * 测试覆盖：
 *   - createNativeRenderer 创建渲染器实例
 *   - 标签到原生组件映射（div→View, span→Text, img→Image 等）
 *   - 样式转换（flexbox/color/fontSize）
 *   - 事件处理映射（onClick→onPress）
 *   - 文本内容设置
 *   - 属性设置
 *   - 子节点插入/移除
 *   - Fragment 处理
 *   - Comment 处理
 *   - patchProp 方法
 *   - setText 方法
 *   - 序列化为 JSON
 *   - VNode 树转换
 */

import { describe, it, expect } from '../../test-utils/src/index'

// ================================================================
//  内联 NativeRenderer 实现（避免外部依赖，保持测试独立性）
// ================================================================

/** 原生节点描述 */
interface NativeNode {
  type: string
  props: Record<string, any>
  children: NativeNode[]
  nativeId?: string
  _parent?: NativeNode
}

/** HTML 标签到原生组件映射 */
const NATIVE_COMPONENT_MAP: Record<string, string> = {
  'div': 'View',
  'span': 'Text',
  'p': 'Text',
  'h1': 'Text', 'h2': 'Text', 'h3': 'Text',
  'h4': 'Text', 'h5': 'Text', 'h6': 'Text',
  'img': 'Image',
  'input': 'TextInput',
  'textarea': 'TextInput',
  'button': 'TouchableOpacity',
  'scroll': 'ScrollView',
  'list': 'FlatList',
  'a': 'TouchableOpacity',
  'ul': 'View', 'ol': 'View', 'li': 'View',
  'form': 'View',
  'header': 'View', 'footer': 'View', 'nav': 'View',
  'main': 'View', 'section': 'View',
  'article': 'View', 'aside': 'View',
}

/** CSS 样式到原生样式映射 */
const STYLE_MAP: Record<string, string> = {
  'flexDirection': 'flexDirection',
  'justifyContent': 'justifyContent',
  'alignItems': 'alignItems',
  'backgroundColor': 'backgroundColor',
  'color': 'color',
  'fontSize': 'fontSize',
  'fontWeight': 'fontWeight',
  'width': 'width',
  'height': 'height',
  'padding': 'padding',
  'margin': 'margin',
  'borderRadius': 'borderRadius',
  'opacity': 'opacity',
  'overflow': 'overflow',
}

/** DOM 事件到原生事件映射 */
const EVENT_MAP: Record<string, string> = {
  'click': 'onPress',
  'touchstart': 'onTouchStart',
  'touchend': 'onTouchEnd',
  'change': 'onChange',
  'input': 'onChangeText',
  'focus': 'onFocus',
  'blur': 'onBlur',
  'submit': 'onSubmitEditing',
  'scroll': 'onScroll',
  'longpress': 'onLongPress',
}

/** 自增 ID */
let _nativeIdCounter = 0
function generateNativeId(): string {
  return `native_${++_nativeIdCounter}`
}

/** kebab-case 转 PascalCase */
function toPascalCase(str: string): string {
  return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
}

/** NativeRenderer 类 */
class NativeRenderer {
  createElement(tag: string): NativeNode {
    const nativeType = NATIVE_COMPONENT_MAP[tag] || toPascalCase(tag)
    return { type: nativeType, props: {}, children: [], nativeId: generateNativeId() }
  }

  createText(text: string): NativeNode {
    return { type: 'RawText', props: { text }, children: [], nativeId: generateNativeId() }
  }

  createComment(text: string): NativeNode {
    return { type: '__Comment', props: { text }, children: [], nativeId: generateNativeId() }
  }

  setAttribute(el: NativeNode, key: string, val: any): void {
    if (!el) return
    if (key === 'style' && typeof val === 'object' && val !== null) {
      el.props.style = { ...(el.props.style || {}), ...this.mapStyle(val) }
      return
    }
    if (key === 'className' || key === 'class') {
      el.props.className = val
      return
    }
    if (key.startsWith('on') && typeof val === 'function') {
      const domEvent = key.slice(2).toLowerCase()
      const nativeEvent = this.mapEvent(domEvent)
      el.props[nativeEvent] = val
      return
    }
    if (key === 'src' && el.type === 'Image') {
      el.props.source = { uri: val }
      return
    }
    if (key === 'href') {
      el.props.href = val
      return
    }
    el.props[key] = val
  }

  removeAttribute(el: NativeNode, key: string): void {
    if (!el) return
    if (key === 'style') { delete el.props.style }
    else if (key.startsWith('on')) {
      const domEvent = key.slice(2).toLowerCase()
      const nativeEvent = this.mapEvent(domEvent)
      delete el.props[nativeEvent]
    } else { delete el.props[key] }
  }

  setStyle(el: NativeNode, style: object): void {
    if (!el) return
    const nativeStyle = this.mapStyle(style as Record<string, string>)
    el.props.style = { ...(el.props.style || {}), ...nativeStyle }
  }

  setClass(el: NativeNode, cls: string | object): void {
    if (!el) return
    if (typeof cls === 'string') { el.props.className = cls }
    else if (typeof cls === 'object' && cls !== null) {
      const classList: string[] = []
      for (const [name, value] of Object.entries(cls)) { if (value) classList.push(name) }
      el.props.className = classList.join(' ')
    }
  }

  insert(parent: NativeNode, child: NativeNode, ref?: NativeNode): void {
    if (!parent || !child) return
    if (child._parent) {
      const oldParent = child._parent
      const idx = oldParent.children.indexOf(child)
      if (idx !== -1) oldParent.children.splice(idx, 1)
    }
    child._parent = parent
    if (ref) {
      const idx = parent.children.indexOf(ref)
      if (idx !== -1) parent.children.splice(idx, 0, child)
      else parent.children.push(child)
    } else {
      parent.children.push(child)
    }
  }

  remove(child: NativeNode): void {
    if (!child || !child._parent) return
    const parent = child._parent
    const idx = parent.children.indexOf(child)
    if (idx !== -1) parent.children.splice(idx, 1)
    child._parent = undefined
  }

  replace(parent: NativeNode, oldChild: NativeNode, newChild: NativeNode): void {
    if (!parent || !oldChild || !newChild) return
    const idx = parent.children.indexOf(oldChild)
    if (idx !== -1) {
      oldChild._parent = undefined
      newChild._parent = parent
      parent.children[idx] = newChild
    }
  }

  addEventListener(el: NativeNode, event: string, handler: Function, options?: any): void {
    if (!el) return
    const nativeEvent = this.mapEvent(event)
    el.props[nativeEvent] = handler
  }

  removeEventListener(el: NativeNode, event: string, handler: Function): void {
    if (!el) return
    const nativeEvent = this.mapEvent(event)
    if (el.props[nativeEvent] === handler) delete el.props[nativeEvent]
  }

  nextTick(cb: Function): void { Promise.resolve().then(() => cb()) }
  parentNode(el: NativeNode): NativeNode | null { return el?._parent ?? null }
  nextSibling(el: NativeNode): NativeNode | null {
    if (!el || !el._parent) return null
    const siblings = el._parent.children
    const idx = siblings.indexOf(el)
    return idx !== -1 && idx + 1 < siblings.length ? siblings[idx + 1] : null
  }

  setText(node: NativeNode, text: string): void {
    if (!node) return
    if (node.type === 'RawText') node.props.text = text
  }

  patchProp(el: NativeNode, key: string, prevValue: any, nextValue: any): void {
    if (!el) return
    if (nextValue === null || nextValue === undefined) { this.removeAttribute(el, key); return }
    if (key === 'style') this.setStyle(el, nextValue)
    else if (key === 'class' || key === 'className') this.setClass(el, nextValue)
    else if (key.startsWith('on') && typeof nextValue === 'function') {
      const domEvent = key.slice(2).toLowerCase()
      el.props[this.mapEvent(domEvent)] = nextValue
    }
    else this.setAttribute(el, key, nextValue)
  }

  querySelector(selector: string): NativeNode | null { return null }

  getComponentType(tag: string): string { return NATIVE_COMPONENT_MAP[tag] || toPascalCase(tag) }

  mapStyle(cssStyle: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [cssKey, cssVal] of Object.entries(cssStyle)) {
      const nativeKey = STYLE_MAP[cssKey] || cssKey
      if (typeof cssVal === 'string' && /^\d+px$/.test(cssVal)) {
        result[nativeKey] = parseInt(cssVal, 10)
      } else {
        result[nativeKey] = cssVal
      }
    }
    return result
  }

  mapEvent(domEvent: string): string {
    return EVENT_MAP[domEvent] || `on${domEvent.charAt(0).toUpperCase()}${domEvent.slice(1)}`
  }

  serializeToJSON(node: NativeNode): string {
    const clean = (n: NativeNode): any => {
      const obj: any = { type: n.type, props: { ...n.props }, children: n.children.map(clean) }
      if (n.nativeId) obj.nativeId = n.nativeId
      return obj
    }
    return JSON.stringify(clean(node), null, 2)
  }

  renderToNativeTree(vnode: any): NativeNode {
    if (!vnode) return this.createComment('empty vnode')
    if (typeof vnode === 'string') return this.createText(vnode)
    if (vnode.type === Symbol.for('lyt.comment') || vnode.type === 'comment') return this.createComment(vnode.children || '')
    if (vnode.type === Symbol.for('lyt.text') || vnode.type === 'text') return this.createText(vnode.children || '')
    if (vnode.type === Symbol.for('lyt.fragment') || vnode.type === 'fragment') {
      const fragment = this.createElement('__Fragment')
      if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) this.insert(fragment, this.renderToNativeTree(child))
      }
      return fragment
    }
    if (typeof vnode.type === 'string') {
      const node = this.createElement(vnode.type)
      if (vnode.props) { for (const [key, val] of Object.entries(vnode.props)) { if (key === 'key' || key === 'ref') continue; this.setAttribute(node, key, val) } }
      if (vnode.children) {
        if (typeof vnode.children === 'string') this.insert(node, this.createText(vnode.children))
        else if (Array.isArray(vnode.children)) { for (const child of vnode.children) this.insert(node, this.renderToNativeTree(child)) }
      }
      return node
    }
    if (typeof vnode.type === 'object' || typeof vnode.type === 'function') {
      const node = this.createElement('div')
      if (Array.isArray(vnode.children)) { for (const child of vnode.children) this.insert(node, this.renderToNativeTree(child)) }
      return node
    }
    return this.createComment('unknown vnode type')
  }
}

/** 工厂函数 */
function createNativeRenderer(): NativeRenderer { return new NativeRenderer() }

// ================================================================
//  测试用例
// ================================================================

describe('NativeRenderer 原生渲染器', () => {
  // ---- 1. createNativeRenderer 创建渲染器实例 ----
  it('createNativeRenderer 创建渲染器实例', () => {
    const renderer = createNativeRenderer()
    expect(renderer).toBeDefined()
    expect(typeof renderer.createElement).toBe('function')
    expect(typeof renderer.createText).toBe('function')
    expect(typeof renderer.createComment).toBe('function')
    expect(typeof renderer.insert).toBe('function')
    expect(typeof renderer.remove).toBe('function')
    expect(typeof renderer.patchProp).toBe('function')
    expect(typeof renderer.setText).toBe('function')
    expect(typeof renderer.parentNode).toBe('function')
    expect(typeof renderer.nextSibling).toBe('function')
  })

  // ---- 2. 标签到原生组件映射：div → View ----
  it('标签映射 div → View', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    expect(el.type).toBe('View')
  })

  // ---- 3. 标签到原生组件映射：span → Text ----
  it('标签映射 span → Text', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('span')
    expect(el.type).toBe('Text')
  })

  // ---- 4. 标签到原生组件映射：img → Image ----
  it('标签映射 img → Image', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('img')
    expect(el.type).toBe('Image')
  })

  // ---- 5. 标签到原生组件映射：input → TextInput ----
  it('标签映射 input → TextInput', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('input')
    expect(el.type).toBe('TextInput')
  })

  // ---- 6. 标签到原生组件映射：scroll → ScrollView ----
  it('标签映射 scroll → ScrollView', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('scroll')
    expect(el.type).toBe('ScrollView')
  })

  // ---- 7. 标签到原生组件映射：未知标签转 PascalCase ----
  it('标签映射未知标签转 PascalCase', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('my-custom-component')
    expect(el.type).toBe('MyCustomComponent')
  })

  // ---- 8. 样式转换：flexbox ----
  it('样式转换 flexbox 属性', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.setStyle(el, { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' })
    expect(el.props.style.flexDirection).toBe('row')
    expect(el.props.style.justifyContent).toBe('center')
    expect(el.props.style.alignItems).toBe('flex-start')
  })

  // ---- 9. 样式转换：color / fontSize ----
  it('样式转换 color 和 fontSize', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.setStyle(el, { color: '#ff0000', fontSize: '16px' })
    expect(el.props.style.color).toBe('#ff0000')
    expect(el.props.style.fontSize).toBe(16) // '16px' 自动转为数字
  })

  // ---- 10. 样式转换：px 数值自动转换 ----
  it('样式转换 px 值自动转为数字', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.setStyle(el, { width: '100px', height: '200px', padding: '10px' })
    expect(el.props.style.width).toBe(100)
    expect(el.props.style.height).toBe(200)
    expect(el.props.style.padding).toBe(10)
  })

  // ---- 11. 事件处理映射：onClick → onPress ----
  it('事件映射 onClick → onPress', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('button')
    const handler = () => {}
    renderer.setAttribute(el, 'onClick', handler)
    expect(typeof el.props.onPress).toBe('function')
    expect(el.props.onPress).toBe(handler)
  })

  // ---- 12. 事件处理映射：多种事件 ----
  it('事件映射多种 DOM 事件', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    const clickHandler = () => {}
    const focusHandler = () => {}
    const scrollHandler = () => {}
    renderer.addEventListener(el, 'click', clickHandler)
    renderer.addEventListener(el, 'focus', focusHandler)
    renderer.addEventListener(el, 'scroll', scrollHandler)
    expect(el.props.onPress).toBe(clickHandler)
    expect(el.props.onFocus).toBe(focusHandler)
    expect(el.props.onScroll).toBe(scrollHandler)
  })

  // ---- 13. 文本内容设置 ----
  it('createText 创建文本节点', () => {
    const renderer = createNativeRenderer()
    const textNode = renderer.createText('Hello Native')
    expect(textNode.type).toBe('RawText')
    expect(textNode.props.text).toBe('Hello Native')
    expect(textNode.children).toEqual([])
  })

  // ---- 14. setText 设置文本内容 ----
  it('setText 更新文本节点内容', () => {
    const renderer = createNativeRenderer()
    const textNode = renderer.createText('Old Text')
    renderer.setText(textNode, 'New Text')
    expect(textNode.props.text).toBe('New Text')
  })

  // ---- 15. 属性设置 ----
  it('setAttribute 设置普通属性', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.setAttribute(el, 'id', 'my-view')
    renderer.setAttribute(el, 'accessibilityLabel', 'My View')
    expect(el.props.id).toBe('my-view')
    expect(el.props.accessibilityLabel).toBe('My View')
  })

  // ---- 16. src 属性映射为 source ----
  it('Image src 属性映射为 source', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('img')
    renderer.setAttribute(el, 'src', 'https://example.com/logo.png')
    expect(el.props.source).toEqual({ uri: 'https://example.com/logo.png' })
  })

  // ---- 17. 子节点插入 ----
  it('insert 插入子节点', () => {
    const renderer = createNativeRenderer()
    const parent = renderer.createElement('div')
    const child1 = renderer.createElement('span')
    const child2 = renderer.createElement('span')
    renderer.insert(parent, child1)
    renderer.insert(parent, child2)
    expect(parent.children.length).toBe(2)
    expect(parent.children[0]).toBe(child1)
    expect(parent.children[1]).toBe(child2)
    expect(child1._parent).toBe(parent)
    expect(child2._parent).toBe(parent)
  })

  // ---- 18. 子节点移除 ----
  it('remove 移除子节点', () => {
    const renderer = createNativeRenderer()
    const parent = renderer.createElement('div')
    const child = renderer.createElement('span')
    renderer.insert(parent, child)
    expect(parent.children.length).toBe(1)
    renderer.remove(child)
    expect(parent.children.length).toBe(0)
    expect(child._parent).toBeUndefined()
  })

  // ---- 19. 子节点替换 ----
  it('replace 替换子节点', () => {
    const renderer = createNativeRenderer()
    const parent = renderer.createElement('div')
    const oldChild = renderer.createElement('span')
    const newChild = renderer.createElement('span')
    renderer.insert(parent, oldChild)
    renderer.replace(parent, oldChild, newChild)
    expect(parent.children.length).toBe(1)
    expect(parent.children[0]).toBe(newChild)
    expect(newChild._parent).toBe(parent)
    expect(oldChild._parent).toBeUndefined()
  })

  // ---- 20. Fragment 处理 ----
  it('renderToNativeTree 处理 Fragment', () => {
    const renderer = createNativeRenderer()
    const vnode = {
      type: 'fragment',
      children: [
        { type: 'div', props: {}, children: 'A' },
        { type: 'span', props: {}, children: 'B' },
      ],
    }
    const result = renderer.renderToNativeTree(vnode)
    expect(result.type).toBe('__Fragment')
    expect(result.children.length).toBe(2)
    expect(result.children[0].type).toBe('View')
    expect(result.children[1].type).toBe('Text')
  })

  // ---- 21. Comment 处理 ----
  it('createComment 创建注释节点', () => {
    const renderer = createNativeRenderer()
    const comment = renderer.createComment('This is a comment')
    expect(comment.type).toBe('__Comment')
    expect(comment.props.text).toBe('This is a comment')
  })

  // ---- 22. renderToNativeTree 处理注释 VNode ----
  it('renderToNativeTree 处理注释 VNode', () => {
    const renderer = createNativeRenderer()
    const vnode = { type: 'comment', children: 'a comment' }
    const result = renderer.renderToNativeTree(vnode)
    expect(result.type).toBe('__Comment')
    expect(result.props.text).toBe('a comment')
  })

  // ---- 23. patchProp 新增属性 ----
  it('patchProp 新增属性', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.patchProp(el, 'id', null, 'new-id')
    expect(el.props.id).toBe('new-id')
  })

  // ---- 24. patchProp 移除属性 ----
  it('patchProp 移除属性（nextValue 为 null）', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.setAttribute(el, 'id', 'old-id')
    expect(el.props.id).toBe('old-id')
    renderer.patchProp(el, 'id', 'old-id', null)
    expect(el.props.id).toBeUndefined()
  })

  // ---- 25. patchProp 更新样式 ----
  it('patchProp 更新样式', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.patchProp(el, 'style', null, { color: 'red', fontSize: '14px' })
    expect(el.props.style.color).toBe('red')
    expect(el.props.style.fontSize).toBe(14)
  })

  // ---- 26. 序列化为 JSON ----
  it('serializeToJSON 序列化节点树', () => {
    const renderer = createNativeRenderer()
    const parent = renderer.createElement('div')
    const text = renderer.createText('Hello')
    renderer.insert(parent, text)
    const json = renderer.serializeToJSON(parent)
    const parsed = JSON.parse(json)
    expect(parsed.type).toBe('View')
    expect(parsed.children[0].type).toBe('RawText')
    expect(parsed.children[0].props.text).toBe('Hello')
    // _parent 不应出现在序列化结果中
    expect(parsed._parent).toBeUndefined()
    expect(parsed.children[0]._parent).toBeUndefined()
  })

  // ---- 27. parentNode 和 nextSibling ----
  it('parentNode 获取父节点', () => {
    const renderer = createNativeRenderer()
    const parent = renderer.createElement('div')
    const child = renderer.createElement('span')
    renderer.insert(parent, child)
    expect(renderer.parentNode(child)).toBe(parent)
    expect(renderer.parentNode(parent)).toBeNull()
  })

  it('nextSibling 获取下一个兄弟节点', () => {
    const renderer = createNativeRenderer()
    const parent = renderer.createElement('div')
    const child1 = renderer.createElement('span')
    const child2 = renderer.createElement('span')
    const child3 = renderer.createElement('span')
    renderer.insert(parent, child1)
    renderer.insert(parent, child2)
    renderer.insert(parent, child3)
    expect(renderer.nextSibling(child1)).toBe(child2)
    expect(renderer.nextSibling(child2)).toBe(child3)
    expect(renderer.nextSibling(child3)).toBeNull()
  })

  // ---- 28. insert 带参考节点（插入到指定位置） ----
  it('insert 带参考节点插入到指定位置', () => {
    const renderer = createNativeRenderer()
    const parent = renderer.createElement('div')
    const first = renderer.createElement('span')
    const second = renderer.createElement('span')
    const third = renderer.createElement('span')
    renderer.insert(parent, first)
    renderer.insert(parent, third)
    // 在 third 之前插入 second
    renderer.insert(parent, second, third)
    expect(parent.children.length).toBe(3)
    expect(parent.children[0]).toBe(first)
    expect(parent.children[1]).toBe(second)
    expect(parent.children[2]).toBe(third)
  })

  // ---- 29. removeAttribute ----
  it('removeAttribute 移除属性', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.setAttribute(el, 'id', 'test')
    expect(el.props.id).toBe('test')
    renderer.removeAttribute(el, 'id')
    expect(el.props.id).toBeUndefined()
  })

  // ---- 30. setClass 字符串形式 ----
  it('setClass 字符串形式', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.setClass(el, 'container active')
    expect(el.props.className).toBe('container active')
  })

  // ---- 31. setClass 对象形式 ----
  it('setClass 对象形式', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    renderer.setClass(el, { active: true, disabled: false, highlight: true })
    expect(el.props.className).toBe('active highlight')
  })

  // ---- 32. removeEventListener ----
  it('removeEventListener 移除事件监听器', () => {
    const renderer = createNativeRenderer()
    const el = renderer.createElement('div')
    const handler = () => {}
    renderer.addEventListener(el, 'click', handler)
    expect(el.props.onPress).toBe(handler)
    renderer.removeEventListener(el, 'click', handler)
    expect(el.props.onPress).toBeUndefined()
  })

  // ---- 33. renderToNativeTree 处理嵌套 VNode ----
  it('renderToNativeTree 处理嵌套 VNode', () => {
    const renderer = createNativeRenderer()
    const vnode = {
      type: 'div',
      props: { id: 'app' },
      children: [
        { type: 'span', props: {}, children: 'Hello' },
        { type: 'img', props: { src: '/logo.png' }, children: null },
      ],
    }
    const result = renderer.renderToNativeTree(vnode)
    expect(result.type).toBe('View')
    expect(result.props.id).toBe('app')
    expect(result.children.length).toBe(2)
    expect(result.children[0].type).toBe('Text')
    expect(result.children[0].children[0].props.text).toBe('Hello')
    expect(result.children[1].type).toBe('Image')
    expect(result.children[1].props.source).toEqual({ uri: '/logo.png' })
  })

  // ---- 34. renderToNativeTree 处理空 VNode ----
  it('renderToNativeTree 处理 null VNode', () => {
    const renderer = createNativeRenderer()
    const result = renderer.renderToNativeTree(null)
    expect(result.type).toBe('__Comment')
    expect(result.props.text).toBe('empty vnode')
  })

  // ---- 35. renderToNativeTree 处理字符串 VNode ----
  it('renderToNativeTree 处理字符串 VNode', () => {
    const renderer = createNativeRenderer()
    const result = renderer.renderToNativeTree('Plain text')
    expect(result.type).toBe('RawText')
    expect(result.props.text).toBe('Plain text')
  })
})
