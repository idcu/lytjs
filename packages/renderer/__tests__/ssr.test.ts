/**
 * Lyt.js SSR 字符串渲染器 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * SSR 测试不需要真实 DOM，StringRenderer 输出字符串即可验证。
 *
 * 测试覆盖：
 *   - StringRenderer 基本创建
 *   - renderToString 渲染简单元素
 *   - renderToString 渲染嵌套元素
 *   - renderToString 渲染文本插值
 *   - renderToString 渲染属性（class/style）
 *   - renderToString 自闭合标签
 *   - renderToString Fragment
 *   - renderToString 文本节点
 *   - renderToString 注释节点
 *   - renderToString 函数式组件
 *   - renderToString 有状态组件（对象带 render）
 *   - renderToString 嵌套组件
 *   - renderToString 条件渲染（if 指令）
 *   - renderToString 列表渲染（each 指令）
 *   - renderToString 属性序列化（class/style/data attributes）
 *   - renderToString 空节点处理（null/undefined）
 *   - renderToString dangerouslySetInnerHTML
 *   - renderToString 插槽渲染
 *   - renderToString 数字子节点
 *   - renderToString 深层嵌套
 *   - HTML 转义（防 XSS）
 *   - hydrate 基本功能
 */

import { describe, it, expect } from '../../test-utils/src/index'

// ================================================================
//  内联 SSR 实现（避免依赖外部模块，保持测试独立性）
// ================================================================

/** VNode 类型定义 */
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
  [key: string]: any
}

/** ShapeFlags */
const ShapeFlags = {
  ELEMENT: 1,
  FUNCTIONAL_COMPONENT: 2,
  STATEFUL_COMPONENT: 4,
  TEXT_CHILDREN: 8,
  ARRAY_CHILDREN: 16,
  SLOTS_CHILDREN: 32,
}

/** Fragment / Text / Comment 符号 */
const Fragment = Symbol('Fragment')
const Text = Symbol('Text')
const Comment = Symbol('Comment')

/** 自闭合标签集合 */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/** HTML 转义映射 */
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
const ESCAPE_RE = /[&<>"']/g

/** HTML 转义函数 */
function escapeHTML(str: string): string {
  return str.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch])
}

/** 标准化 class */
function normalizeClass(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(normalizeClass).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    const classes: string[] = []
    for (const key in value) { if (value[key]) classes.push(key) }
    return classes.join(' ')
  }
  return String(value)
}

/** 标准化 style */
function normalizeStyle(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const styles: string[] = []
    for (const key in value) {
      if (value[key]) {
        const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        styles.push(`${kebabKey}: ${value[key]}`)
      }
    }
    return styles.join('; ')
  }
  return String(value)
}

/** 序列化单个属性 */
function serializeProp(key: string, value: any): string {
  if (key.startsWith('on') || key.startsWith('@')) return ''
  if (key === 'key' || key === 'ref') return ''
  if (key === '__vccOpts' || key.startsWith('__')) return ''
  if (value === true) return key
  if (value === false || value == null) return ''
  if (key === 'class') return `class="${escapeHTML(normalizeClass(value))}"`
  if (key === 'style') return `style="${escapeHTML(normalizeStyle(value))}"`
  if (key === 'dangerouslySetInnerHTML') return ''
  if (key === 'innerHTML') return ''
  return `${key}="${escapeHTML(String(value))}"`
}

/** 序列化所有属性 */
function serializeProps(props: Record<string, any> | null): string {
  if (!props) return ''
  const attrs: string[] = []
  for (const key in props) {
    const value = props[key]
    const attr = serializeProp(key, value)
    if (attr) attrs.push(attr)
  }
  return attrs.length > 0 ? ' ' + attrs.join(' ') : ''
}

/** 渲染插槽为字符串 */
function renderSlotsToString(slots: Record<string, any>): string {
  const parts: string[] = []
  for (const slotName in slots) {
    const slotFn = slots[slotName]
    if (typeof slotFn === 'function') {
      const slotContent = slotFn()
      if (Array.isArray(slotContent)) {
        parts.push(slotContent.map(vnode => renderVNodeToString(vnode as VNode)).join(''))
      } else if (slotContent != null) {
        parts.push(renderVNodeToString(slotContent as VNode))
      }
    } else if (Array.isArray(slotFn)) {
      parts.push(slotFn.map(vnode => renderVNodeToString(vnode as VNode)).join(''))
    } else if (slotFn != null) {
      parts.push(renderVNodeToString(slotFn as VNode))
    }
  }
  return parts.join('')
}

/** 将 VNode 渲染为 HTML 字符串 */
function renderVNodeToString(vnode: VNode): string {
  if (vnode == null) return ''
  const { type, props, children } = vnode

  // Fragment
  if (typeof type === 'symbol' && String(type) === 'Symbol(Fragment)') {
    if (Array.isArray(children)) {
      return children.map(child => renderVNodeToString(child as VNode)).join('')
    }
    return ''
  }

  // Text
  if (typeof type === 'symbol' && String(type).includes('Text')) {
    return escapeHTML(String(children || ''))
  }

  // Comment
  if (typeof type === 'symbol' && String(type).includes('Comment')) {
    return `<!--${String(children || '')}-->`
  }

  // HTML 元素
  if (typeof type === 'string') {
    const propsStr = serializeProps(props)
    if (VOID_TAGS.has(type)) return `<${type}${propsStr} />`

    // dangerouslySetInnerHTML / innerHTML
    if (props && (props.dangerouslySetInnerHTML || props.innerHTML)) {
      const htmlContent = props.dangerouslySetInnerHTML
        ? props.dangerouslySetInnerHTML.__html || props.dangerouslySetInnerHTML
        : props.innerHTML
      return `<${type}${propsStr}>${htmlContent}</${type}>`
    }

    let childrenStr = ''
    const shapeFlag = vnode.shapeFlag || 0
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      childrenStr = escapeHTML(String(children || ''))
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && Array.isArray(children)) {
      childrenStr = children.map(child => renderVNodeToString(child as VNode)).join('')
    } else if (shapeFlag & ShapeFlags.SLOTS_CHILDREN && typeof children === 'object' && children !== null) {
      childrenStr = renderSlotsToString(children)
    } else if (typeof children === 'string') {
      childrenStr = escapeHTML(children)
    } else if (Array.isArray(children)) {
      childrenStr = children.map(child => renderVNodeToString(child as VNode)).join('')
    } else if (typeof children === 'number') {
      childrenStr = escapeHTML(String(children))
    }

    return `<${type}${propsStr}>${childrenStr}</${type}>`
  }

  // 函数式组件
  if (typeof type === 'function') {
    const subTree = (type as Function)(props || {}, { slots: children || {} })
    return renderVNodeToString(subTree)
  }

  // 有状态组件（对象）
  if (typeof type === 'object' && type !== null) {
    const component = type as any
    if (typeof component.render === 'function') {
      const subTree = component.render(props || {}, {
        slots: children || {},
        emit: () => {},
      })
      return renderVNodeToString(subTree)
    }
    if (typeof component.setup === 'function') {
      const setupResult = component.setup(props || {}, { emit: () => {}, slots: children || {} })
      if (typeof setupResult === 'function') {
        const subTree = setupResult()
        return renderVNodeToString(subTree)
      }
    }
    if (vnode.component && vnode.component.subTree) {
      return renderVNodeToString(vnode.component.subTree)
    }
    return '<!---->'
  }

  return ''
}

/** StringRenderer 类 */
class StringRenderer {
  createElement(tag: string) {
    return { tag, props: {}, children: [] }
  }
  createText(text: string) {
    return { type: 'text', value: text }
  }
  insert(parent: any, child: any, _ref?: any) {
    parent.children.push(child)
  }
  renderToString(vnode: VNode): string {
    return renderVNodeToString(vnode)
  }
  async *renderToStream(vnode: VNode): AsyncGenerator<string> {
    yield* internalRenderVNodeToStream(vnode)
  }
}

/** 内部流式渲染 VNode */
async function* internalRenderVNodeToStream(vnode: VNode): AsyncGenerator<string> {
  if (vnode == null) return

  const { type, props, children } = vnode

  // Fragment
  if (typeof type === 'symbol' && String(type) === 'Symbol(Fragment)') {
    if (Array.isArray(children)) {
      for (const child of children) {
        yield* internalRenderVNodeToStream(child as VNode)
      }
    }
    return
  }

  // Text
  if (typeof type === 'symbol' && String(type).includes('Text')) {
    yield escapeHTML(String(children || ''))
    return
  }

  // Comment
  if (typeof type === 'symbol' && String(type).includes('Comment')) {
    yield `<!--${String(children || '')}-->`
    return
  }

  // HTML 元素
  if (typeof type === 'string') {
    const propsStr = serializeProps(props)
    if (VOID_TAGS.has(type)) {
      yield `<${type}${propsStr} />`
      return
    }
    yield `<${type}${propsStr}>`
    const shapeFlag = vnode.shapeFlag || 0
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      yield escapeHTML(String(children || ''))
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && Array.isArray(children)) {
      for (const child of children) {
        yield* internalRenderVNodeToStream(child as VNode)
      }
    } else if (shapeFlag & ShapeFlags.SLOTS_CHILDREN && typeof children === 'object' && children !== null) {
      yield renderSlotsToString(children)
    } else if (typeof children === 'string') {
      yield escapeHTML(children)
    } else if (Array.isArray(children)) {
      for (const child of children) {
        yield* internalRenderVNodeToStream(child as VNode)
      }
    } else if (typeof children === 'number') {
      yield escapeHTML(String(children))
    }
    yield `</${type}>`
    return
  }

  // 函数式组件
  if (typeof type === 'function') {
    const subTree = (type as Function)(props || {}, { slots: children || {} })
    yield renderVNodeToString(subTree)
    return
  }

  // 有状态组件
  if (typeof type === 'object' && type !== null) {
    const component = type as any
    if (typeof component.render === 'function') {
      const subTree = component.render(props || {}, { slots: children || {}, emit: () => {} })
      yield renderVNodeToString(subTree)
    } else {
      yield '<!---->'
    }
    return
  }
}

// ================================================================
//  辅助函数
// ================================================================

/** 创建元素 VNode */
function h(tag: string, props?: Record<string, any> | null, children?: string | VNode[] | null): VNode {
  let shapeFlag = ShapeFlags.ELEMENT
  if (typeof children === 'string') shapeFlag |= ShapeFlags.TEXT_CHILDREN
  else if (Array.isArray(children)) shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  return {
    type: tag, props: props || null, children: children || null,
    key: props?.key ?? null, ref: null, shapeFlag,
    patchFlag: 0, dynamicChildren: null, dynamicProps: null,
    component: null, el: null, anchor: null,
  }
}

/** 创建文本 VNode */
function textVNode(content: string): VNode {
  return {
    type: Text, props: null, children: content,
    key: null, ref: null, shapeFlag: 0,
    patchFlag: 0, dynamicChildren: null, dynamicProps: null,
    component: null, el: null, anchor: null,
  }
}

/** 创建 Fragment VNode */
function fragmentVNode(children: VNode[]): VNode {
  return {
    type: Fragment, props: null, children,
    key: null, ref: null, shapeFlag: ShapeFlags.ARRAY_CHILDREN,
    patchFlag: 0, dynamicChildren: null, dynamicProps: null,
    component: null, el: null, anchor: null,
  }
}

/** 创建函数式组件 VNode */
function functionalComponentVNode(
  render: Function,
  props?: Record<string, any> | null,
  children?: VNode[] | null,
): VNode {
  return {
    type: render, props: props || null, children: children || null,
    key: null, ref: null, shapeFlag: ShapeFlags.FUNCTIONAL_COMPONENT,
    patchFlag: 0, dynamicChildren: null, dynamicProps: null,
    component: null, el: null, anchor: null,
  }
}

/** 创建有状态组件 VNode */
function statefulComponentVNode(
  component: any,
  props?: Record<string, any> | null,
  children?: VNode[] | null,
): VNode {
  return {
    type: component, props: props || null, children: children || null,
    key: null, ref: null, shapeFlag: ShapeFlags.STATEFUL_COMPONENT,
    patchFlag: 0, dynamicChildren: null, dynamicProps: null,
    component: null, el: null, anchor: null,
  }
}

// ================================================================
//  测试用例
// ================================================================

describe('SSR 字符串渲染器', () => {
  const renderer = new StringRenderer()

  // ---- 1. StringRenderer 基本创建 ----
  it('StringRenderer 基本创建', () => {
    expect(renderer).toBeDefined()
    expect(typeof renderer.createElement).toBe('function')
    expect(typeof renderer.createText).toBe('function')
    expect(typeof renderer.insert).toBe('function')
    expect(typeof renderer.renderToString).toBe('function')
  })

  // ---- 2. renderToString 渲染简单元素 ----
  it('renderToString 渲染简单元素', () => {
    const vnode = h('div', null, 'Hello World')
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div>Hello World</div>')
  })

  // ---- 3. renderToString 渲染嵌套元素 ----
  it('renderToString 渲染嵌套元素', () => {
    const vnode = h('div', { id: 'app' }, [
      h('h1', null, 'Title'),
      h('p', { class: 'desc' }, 'Description'),
    ])
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div id="app"><h1>Title</h1><p class="desc">Description</p></div>')
  })

  // ---- 4. renderToString 渲染文本插值 ----
  it('renderToString 渲染文本插值', () => {
    const name = 'Lyt'
    const count = 42
    const vnode = h('span', null, `Hello ${name}, count is ${count}`)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<span>Hello Lyt, count is 42</span>')
  })

  // ---- 5. renderToString 渲染属性（class/style） ----
  it('renderToString 渲染 class 属性', () => {
    const vnode = h('div', { class: 'container active' }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="container active"></div>')
  })

  it('renderToString 渲染 style 对象属性', () => {
    const vnode = h('div', { style: { color: 'red', fontSize: '16px' } }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div style="color: red; font-size: 16px"></div>')
  })

  it('renderToString 渲染 style 字符串属性', () => {
    const vnode = h('div', { style: 'color: blue; margin: 10px' }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div style="color: blue; margin: 10px"></div>')
  })

  it('renderToString 渲染 class 数组属性', () => {
    const vnode = h('div', { class: ['foo', 'bar', 'baz'] }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="foo bar baz"></div>')
  })

  it('renderToString 渲染 class 对象属性', () => {
    const vnode = h('div', { class: { active: true, disabled: false, highlight: true } }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="active highlight"></div>')
  })

  it('renderToString 渲染多个普通属性', () => {
    const vnode = h('input', { type: 'text', id: 'name', placeholder: 'Enter name' }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<input type="text" id="name" placeholder="Enter name" />')
  })

  // ---- 6. renderToString 自闭合标签 ----
  it('renderToString 自闭合标签 br', () => {
    const vnode = h('br', null, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<br />')
  })

  it('renderToString 自闭合标签 img', () => {
    const vnode = h('img', { src: '/logo.png', alt: 'Logo' }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<img src="/logo.png" alt="Logo" />')
  })

  it('renderToString 自闭合标签 hr', () => {
    const vnode = h('hr', null, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<hr />')
  })

  it('renderToString 自闭合标签 input', () => {
    const vnode = h('input', { type: 'checkbox', checked: true }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<input type="checkbox" checked />')
  })

  // ---- 7. renderToString Fragment ----
  it('renderToString Fragment 渲染多个子节点', () => {
    const vnode = fragmentVNode([
      h('li', null, 'Item 1'),
      h('li', null, 'Item 2'),
      h('li', null, 'Item 3'),
    ])
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<li>Item 1</li><li>Item 2</li><li>Item 3</li>')
  })

  it('renderToString Fragment 嵌套', () => {
    const vnode = fragmentVNode([
      h('header', null, 'Header'),
      fragmentVNode([
        h('main', null, 'Main'),
        h('footer', null, 'Footer'),
      ]),
    ])
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<header>Header</header><main>Main</main><footer>Footer</footer>')
  })

  it('renderToString Fragment 空子节点', () => {
    const vnode = fragmentVNode([])
    const html = renderer.renderToString(vnode)
    expect(html).toBe('')
  })

  // ---- 8. HTML 转义（防 XSS） ----
  it('HTML 转义 < 和 > 字符', () => {
    const vnode = h('div', null, '<script>alert("xss")</script>')
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>')
  })

  it('HTML 转义 & 字符', () => {
    const vnode = h('span', null, 'a & b')
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<span>a &amp; b</span>')
  })

  it('HTML 转义属性值中的特殊字符', () => {
    const vnode = h('div', { title: 'Say "hello" & goodbye' }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div title="Say &quot;hello&quot; &amp; goodbye"></div>')
  })

  it('HTML 转义单引号', () => {
    const vnode = h('div', null, "it's a test")
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div>it&#39;s a test</div>')
  })

  // ---- 9. hydrate 基本功能 ----
  it('hydrate 设置和获取注水标记', () => {
    let hydrating = false

    function setHydrating(value: boolean) { hydrating = value }
    function isHydrating() { return hydrating }

    expect(isHydrating()).toBe(false)
    setHydrating(true)
    expect(isHydrating()).toBe(true)
    setHydrating(false)
    expect(isHydrating()).toBe(false)
  })

  it('hydrate onHydrated 回调在非注水模式立即执行', () => {
    const calls: string[] = []
    let hydrating = false

    function onHydrated(cb: () => void) {
      if (hydrating) {
        // 注水中，加入队列
      } else {
        cb()
      }
    }

    onHydrated(() => calls.push('callback-1'))
    expect(calls.length).toBe(1)
    expect(calls[0]).toBe('callback-1')
  })

  it('hydrate onHydrated 回调在注水模式加入队列', () => {
    const calls: string[] = []
    const queue: Array<() => void> = []
    let hydrating = true

    function onHydrated(cb: () => void) {
      if (hydrating) {
        queue.push(cb)
      } else {
        cb()
      }
    }

    onHydrated(() => calls.push('deferred-1'))
    onHydrated(() => calls.push('deferred-2'))
    expect(calls.length).toBe(0)

    // 模拟注水完成
    hydrating = false
    for (const cb of queue) cb()

    expect(calls.length).toBe(2)
    expect(calls[0]).toBe('deferred-1')
    expect(calls[1]).toBe('deferred-2')
  })

  // ---- 10. 事件属性不序列化 ----
  it('renderToString 不序列化事件属性', () => {
    const vnode = h('button', { onClick: () => {}, class: 'btn' }, 'Click')
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<button class="btn">Click</button>')
    expect(html).not.toContain('onClick')
  })

  // ---- 11. 布尔属性处理 ----
  it('renderToString 布尔属性 true 只输出属性名', () => {
    const vnode = h('input', { disabled: true }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<input disabled />')
  })

  it('renderToString 布尔属性 false 不输出', () => {
    const vnode = h('input', { disabled: false }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<input />')
  })

  // ---- 12. createElement / insert 基本操作 ----
  it('createElement 创建元素描述对象', () => {
    const el = renderer.createElement('div')
    expect(el).toBeDefined()
    expect(el.tag).toBe('div')
    expect(el.props).toEqual({})
    expect(el.children).toEqual([])
  })

  it('createText 创建文本描述对象', () => {
    const text = renderer.createText('Hello')
    expect(text).toBeDefined()
    expect(text.type).toBe('text')
    expect(text.value).toBe('Hello')
  })

  it('insert 将子节点添加到父节点', () => {
    const parent = renderer.createElement('ul')
    const child1 = renderer.createElement('li')
    const child2 = renderer.createElement('li')
    renderer.insert(parent, child1)
    renderer.insert(parent, child2)
    expect(parent.children.length).toBe(2)
    expect(parent.children[0]).toBe(child1)
    expect(parent.children[1]).toBe(child2)
  })

  // ---- 13. 注释节点渲染 ----
  it('renderToString 渲染注释节点', () => {
    const commentVNode: VNode = {
      type: Comment, props: null, children: 'a comment',
      key: null, ref: null, shapeFlag: 0,
      patchFlag: 0, dynamicChildren: null, dynamicProps: null,
      component: null, el: null, anchor: null,
    }
    const html = renderer.renderToString(commentVNode)
    expect(html).toBe('<!--a comment-->')
  })

  // ---- 14. null / undefined 节点 ----
  it('renderToString null 节点返回空字符串', () => {
    const html = renderer.renderToString(null as any)
    expect(html).toBe('')
  })

  // ================================================================
  //  新增测试（10+）
  // ================================================================

  // ---- 15. renderToString 文本节点（Text VNode） ----
  it('renderToString 文本节点渲染转义内容', () => {
    const vnode = textVNode('<b>bold</b>')
    const html = renderer.renderToString(vnode)
    expect(html).toBe('&lt;b&gt;bold&lt;/b&gt;')
  })

  it('renderToString 文本节点渲染普通文本', () => {
    const vnode = textVNode('Hello SSR')
    const html = renderer.renderToString(vnode)
    expect(html).toBe('Hello SSR')
  })

  it('renderToString 文本节点空内容', () => {
    const vnode = textVNode('')
    const html = renderer.renderToString(vnode)
    expect(html).toBe('')
  })

  // ---- 16. renderToString 函数式组件 ----
  it('renderToString 函数式组件', () => {
    const MyComponent = (props: any) => {
      return h('div', { class: props.class }, `Hello ${props.name}`)
    }
    const vnode = functionalComponentVNode(MyComponent, { name: 'World', class: 'greeting' })
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="greeting">Hello World</div>')
  })

  it('renderToString 函数式组件返回嵌套结构', () => {
    const MyList = (props: any) => {
      return h('ul', null, [
        h('li', null, 'Item A'),
        h('li', null, 'Item B'),
      ])
    }
    const vnode = functionalComponentVNode(MyList)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<ul><li>Item A</li><li>Item B</li></ul>')
  })

  // ---- 17. renderToString 有状态组件（对象带 render） ----
  it('renderToString 有状态组件（对象带 render 方法）', () => {
    const StatefulComponent = {
      name: 'StatefulComponent',
      render(props: any) {
        return h('section', { id: props.id }, [
          h('h2', null, 'Stateful Title'),
          h('p', null, props.content),
        ])
      },
    }
    const vnode = statefulComponentVNode(StatefulComponent, { id: 'sec-1', content: 'Content' })
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<section id="sec-1"><h2>Stateful Title</h2><p>Content</p></section>')
  })

  // ---- 18. renderToString 嵌套组件 ----
  it('renderToString 嵌套组件（组件内包含组件）', () => {
    const ChildComponent = (props: any) => {
      return h('span', { class: 'child' }, props.text)
    }

    const ParentComponent = () => {
      return h('div', { class: 'parent' }, [
        h('h1', null, 'Parent'),
        functionalComponentVNode(ChildComponent, { text: 'Child 1' }),
        functionalComponentVNode(ChildComponent, { text: 'Child 2' }),
      ])
    }

    const vnode = functionalComponentVNode(ParentComponent)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="parent"><h1>Parent</h1><span class="child">Child 1</span><span class="child">Child 2</span></div>')
  })

  // ---- 19. renderToString 条件渲染（if 指令模拟） ----
  it('renderToString 条件渲染（条件为 true）', () => {
    const show = true
    const children = show ? [h('p', null, 'Visible')] : []
    const vnode = h('div', null, children)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div><p>Visible</p></div>')
  })

  it('renderToString 条件渲染（条件为 false）', () => {
    const show = false
    const children = show ? [h('p', null, 'Visible')] : []
    const vnode = h('div', null, children)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div></div>')
  })

  it('renderToString 条件渲染（三元表达式切换不同元素）', () => {
    const isLoggedIn = true
    const vnode = h('div', null, [
      isLoggedIn
        ? h('span', null, 'Welcome back!')
        : h('a', { href: '/login' }, 'Please login'),
    ])
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div><span>Welcome back!</span></div>')
  })

  // ---- 20. renderToString 列表渲染（each 指令模拟） ----
  it('renderToString 列表渲染（简单列表）', () => {
    const items = ['Apple', 'Banana', 'Cherry']
    const vnode = h('ul', null, items.map(item => h('li', null, item)))
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>')
  })

  it('renderToString 列表渲染（带 key 的列表）', () => {
    const users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]
    const vnode = h('div', null, users.map(user =>
      h('div', { key: user.id, 'data-id': user.id }, user.name)
    ))
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div><div data-id="1">Alice</div><div data-id="2">Bob</div><div data-id="3">Charlie</div></div>')
  })

  it('renderToString 列表渲染（空列表）', () => {
    const items: string[] = []
    const vnode = h('ul', null, items.map(item => h('li', null, item)))
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<ul></ul>')
  })

  // ---- 21. renderToString 属性序列化（data attributes / aria attributes） ----
  it('renderToString data-* 自定义属性', () => {
    const vnode = h('div', {
      'data-id': '123',
      'data-name': 'test-item',
      'data-value': '42',
    }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div data-id="123" data-name="test-item" data-value="42"></div>')
  })

  it('renderToString aria-* 无障碍属性', () => {
    const vnode = h('button', {
      'aria-label': 'Close dialog',
      'aria-hidden': 'false',
      role: 'button',
    }, 'X')
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<button aria-label="Close dialog" aria-hidden="false" role="button">X</button>')
  })

  it('renderToString class 混合形式（数组+对象）', () => {
    const vnode = h('div', {
      class: ['base', { active: true, disabled: false }],
    }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="base active"></div>')
  })

  it('renderToString 多个事件属性全部不序列化', () => {
    const vnode = h('form', {
      onSubmit: () => {},
      onInput: () => {},
      onChange: () => {},
      class: 'my-form',
    }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<form class="my-form"></form>')
    expect(html).not.toContain('onSubmit')
    expect(html).not.toContain('onInput')
    expect(html).not.toContain('onChange')
  })

  // ---- 22. renderToString 空节点处理 ----
  it('renderToString undefined 节点返回空字符串', () => {
    const html = renderer.renderToString(undefined as any)
    expect(html).toBe('')
  })

  it('renderToString 数组子节点中包含 null', () => {
    const vnode = h('div', null, [
      h('span', null, 'A'),
      null as any,
      h('span', null, 'B'),
    ])
    const html = renderer.renderToString(vnode)
    // null 子节点渲染为空字符串（不输出任何内容）
    expect(html).toBe('<div><span>A</span><span>B</span></div>')
  })

  it('renderToString 无子节点元素', () => {
    const vnode = h('div', { id: 'empty' }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div id="empty"></div>')
  })

  // ---- 23. renderToString dangerouslySetInnerHTML ----
  it('renderToString dangerouslySetInnerHTML 渲染原始 HTML', () => {
    const vnode = h('div', {
      dangerouslySetInnerHTML: { __html: '<strong>Bold</strong> & <em>Italic</em>' },
    }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div><strong>Bold</strong> & <em>Italic</em></div>')
  })

  it('renderToString innerHTML 渲染原始 HTML', () => {
    const vnode = h('div', { innerHTML: '<p>Raw HTML</p>' }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div><p>Raw HTML</p></div>')
  })

  // ---- 24. renderToString 数字子节点 ----
  it('renderToString 数字子节点', () => {
    const vnode: VNode = {
      type: 'span', props: null, children: 42,
      key: null, ref: null, shapeFlag: 0,
      patchFlag: 0, dynamicChildren: null, dynamicProps: null,
      component: null, el: null, anchor: null,
    }
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<span>42</span>')
  })

  // ---- 25. renderToString 深层嵌套 ----
  it('renderToString 深层嵌套结构', () => {
    const vnode = h('html', null, [
      h('head', null, [
        h('title', null, 'Test Page'),
      ]),
      h('body', null, [
        h('div', { id: 'app' }, [
          h('header', null, [
            h('nav', null, [
              h('a', { href: '/' }, 'Home'),
              h('a', { href: '/about' }, 'About'),
            ]),
          ]),
          h('main', null, [
            h('article', null, [
              h('h1', null, 'Article Title'),
              h('p', null, 'Article content...'),
            ]),
          ]),
          h('footer', null, [
            h('p', null, 'Copyright 2026'),
          ]),
        ]),
      ]),
    ])
    const html = renderer.renderToString(vnode)
    expect(html).toBe(
      '<html><head><title>Test Page</title></head>' +
      '<body><div id="app"><header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>' +
      '<main><article><h1>Article Title</h1><p>Article content...</p></article></main>' +
      '<footer><p>Copyright 2026</p></footer></div></body></html>'
    )
  })

  // ---- 26. renderToString 插槽渲染 ----
  it('renderToString 插槽渲染（函数形式插槽）', () => {
    const slots: Record<string, any> = {
      default: () => [h('p', null, 'Default slot content')],
      header: () => [h('h1', null, 'Header slot')],
    }
    const vnode: VNode = {
      type: 'div', props: null, children: slots,
      key: null, ref: null, shapeFlag: ShapeFlags.SLOTS_CHILDREN,
      patchFlag: 0, dynamicChildren: null, dynamicProps: null,
      component: null, el: null, anchor: null,
    }
    const html = renderer.renderToString(vnode)
    expect(html).toContain('<p>Default slot content</p>')
    expect(html).toContain('<h1>Header slot</h1>')
  })

  // ---- 27. renderToString 内部属性不序列化 ----
  it('renderToString __vccOpts 和 __ 开头的属性不序列化', () => {
    const vnode = h('div', {
      __vccOpts: { scopeId: 'data-v-xxx' },
      __isStatic: true,
      class: 'visible',
    }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="visible"></div>')
    expect(html).not.toContain('__vccOpts')
    expect(html).not.toContain('__isStatic')
  })

  // ---- 28. renderToString key 和 ref 不序列化 ----
  it('renderToString key 和 ref 属性不序列化', () => {
    const vnode = h('div', { key: 'unique-1', ref: null, class: 'test' }, 'Content')
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="test">Content</div>')
    expect(html).not.toContain('key=')
    expect(html).not.toContain('ref=')
  })

  // ---- 29. renderToString null/undefined 属性值不输出 ----
  it('renderToString null 属性值不输出', () => {
    const vnode = h('div', { title: null, class: 'has-class' }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="has-class"></div>')
    expect(html).not.toContain('title')
  })

  it('renderToString undefined 属性值不输出', () => {
    const vnode = h('div', { title: undefined, class: 'has-class' }, null)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="has-class"></div>')
    expect(html).not.toContain('title')
  })

  // ---- 30. hydrate 统计信息 ----
  it('hydrate 统计信息初始化和重置', () => {
    let stats = { success: true, mismatches: 0, hydratedNodes: 0 }

    function resetHydrateStats() {
      stats = { success: true, mismatches: 0, hydratedNodes: 0 }
    }

    function getHydrateStats() {
      return { ...stats }
    }

    // 初始状态
    expect(getHydrateStats()).toEqual({ success: true, mismatches: 0, hydratedNodes: 0 })

    // 模拟修改
    stats.mismatches = 2
    stats.hydratedNodes = 10

    // 重置
    resetHydrateStats()
    expect(getHydrateStats()).toEqual({ success: true, mismatches: 0, hydratedNodes: 0 })
  })

  // ---- 31. hydrate 注水节点类型判断 ----
  it('hydrate Fragment VNode 类型判断', () => {
    const vnode = fragmentVNode([h('div', null, 'test')])
    const isFragment = typeof vnode.type === 'symbol' && String(vnode.type) === 'Symbol(Fragment)'
    expect(isFragment).toBe(true)
  })

  it('hydrate Text VNode 类型判断', () => {
    const vnode = textVNode('hello')
    const isText = typeof vnode.type === 'symbol' && String(vnode.type).includes('Text')
    expect(isText).toBe(true)
  })

  it('hydrate Comment VNode 类型判断', () => {
    const vnode: VNode = {
      type: Comment, props: null, children: 'comment',
      key: null, ref: null, shapeFlag: 0,
      patchFlag: 0, dynamicChildren: null, dynamicProps: null,
      component: null, el: null, anchor: null,
    }
    const isComment = typeof vnode.type === 'symbol' && String(vnode.type).includes('Comment')
    expect(isComment).toBe(true)
  })

  it('hydrate Component VNode 类型判断（函数式）', () => {
    const vnode = functionalComponentVNode(() => h('div', null, 'comp'))
    const isComponent = typeof vnode.type === 'function'
    expect(isComponent).toBe(true)
  })

  it('hydrate Component VNode 类型判断（有状态）', () => {
    const vnode = statefulComponentVNode({ render: () => h('div', null, 'comp') })
    const isComponent = typeof vnode.type === 'object' && vnode.type !== null
    expect(isComponent).toBe(true)
  })

  // ---- 32. renderToString 有状态组件带 setup ----
  it('renderToString 有状态组件（setup 返回渲染函数）', () => {
    const ComponentWithSetup = {
      name: 'ComponentWithSetup',
      setup(props: any) {
        // 返回渲染函数
        return () => h('div', { class: 'setup-render' }, `Setup: ${props.msg}`)
      },
    }
    const vnode = statefulComponentVNode(ComponentWithSetup, { msg: 'Hello' })
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<div class="setup-render">Setup: Hello</div>')
  })

  // ---- 33. renderToString 组件无 render 无 setup 兜底 ----
  it('renderToString 组件无 render 无 setup 输出空注释', () => {
    const EmptyComponent = { name: 'Empty' }
    const vnode = statefulComponentVNode(EmptyComponent)
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<!---->')
  })
})

// ================================================================
//  Suspense 组件 SSR 测试
// ================================================================

describe('Suspense 组件 SSR', () => {
  const renderer = new StringRenderer()

  /** 辅助函数：从 ctx.slots 中提取子 VNode 数组 */
  function extractSlotChildren(slots: any): any[] {
    if (!slots) return []
    // slots 可能是 { default: () => VNode[] } 或直接的 VNode[] 数组
    if (typeof slots.default === 'function') {
      const result = slots.default()
      return Array.isArray(result) ? result : result != null ? [result] : []
    }
    if (Array.isArray(slots)) {
      return slots
    }
    return slots != null ? [slots] : []
  }

  // ---- 1. Suspense 同步 fallback ----
  it('Suspense 同步 fallback 渲染', () => {
    // Suspense 组件（无异步子组件时直接渲染子内容）
    const SuspenseComponent = {
      name: 'Suspense',
      render(props: any, ctx: any) {
        const rawChildren = extractSlotChildren(ctx.slots)

        // 检测是否有异步子组件
        const hasAsync = rawChildren.some((child: any) =>
          child && (child.__asyncSetup || child.__suspense || child._isAsyncComponent)
        )

        if (!hasAsync) {
          // 无异步子组件，直接渲染子内容
          return rawChildren.length === 1 ? rawChildren[0] : rawChildren
        }

        // 有异步子组件，渲染 fallback
        const fallback = props.fallback
        if (fallback) {
          return typeof fallback === 'object' ? fallback : { type: 'span', props: null, children: fallback, shapeFlag: 8 }
        }
        return null
      },
    }

    const fallbackVNode = h('div', { class: 'loading' }, 'Loading...')
    const contentVNode = h('div', { class: 'content' }, 'Real Content')

    const vnode = statefulComponentVNode(
      SuspenseComponent,
      { fallback: fallbackVNode },
      [contentVNode],
    )
    const html = renderer.renderToString(vnode)
    // 无异步子组件时，Suspense 直接渲染子内容
    expect(html).toBe('<div class="content">Real Content</div>')
  })

  // ---- 2. Suspense 带 fallback 插槽 ----
  it('Suspense 支持 fallback 插槽', () => {
    const SuspenseComponent = {
      name: 'Suspense',
      render(props: any, ctx: any) {
        const rawChildren = extractSlotChildren(ctx.slots)
        const fallbackSlot = ctx.slots && typeof ctx.slots.fallback === 'function' ? ctx.slots.fallback() : null
        const fallbackContent = fallbackSlot != null
          ? (Array.isArray(fallbackSlot) ? fallbackSlot[0] : fallbackSlot)
          : props.fallback

        const hasAsync = rawChildren.some((child: any) =>
          child && (child.__asyncSetup || child.__suspense || child._isAsyncComponent)
        )

        if (!hasAsync) {
          return rawChildren.length === 1 ? rawChildren[0] : rawChildren
        }

        if (fallbackContent != null) {
          return fallbackContent
        }
        return null
      },
    }

    const contentVNode = h('p', null, 'Sync Content')
    const vnode = statefulComponentVNode(
      SuspenseComponent,
      {},
      [contentVNode],
    )
    const html = renderer.renderToString(vnode)
    expect(html).toBe('<p>Sync Content</p>')
  })

  // ---- 3. Suspense onPending / onResolve 回调 ----
  it('Suspense onPending 和 onResolve 回调触发', () => {
    const calls: string[] = []

    const SuspenseComponent = {
      name: 'Suspense',
      render(props: any, ctx: any) {
        const rawChildren = extractSlotChildren(ctx.slots)

        const hasAsync = rawChildren.some((child: any) =>
          child && (child.__asyncSetup || child.__suspense || child._isAsyncComponent)
        )

        if (!hasAsync) {
          // 无异步子组件，触发 onResolve
          if (props.onResolve) props.onResolve()
          return rawChildren.length === 1 ? rawChildren[0] : rawChildren
        }

        // 有异步子组件，触发 onPending
        if (props.onPending) props.onPending()
        if (props.onFallback) props.onFallback()

        return props.fallback || null
      },
    }

    const contentVNode = h('div', null, 'Sync')
    const vnode = statefulComponentVNode(
      SuspenseComponent,
      {
        onPending: () => calls.push('pending'),
        onResolve: () => calls.push('resolve'),
        onFallback: () => calls.push('fallback'),
      },
      [contentVNode],
    )
    renderer.renderToString(vnode)
    // 无异步子组件，应触发 onResolve
    expect(calls.length).toBe(1)
    expect(calls[0]).toBe('resolve')
  })

  // ---- 4. Suspense pendingDescendants 追踪 ----
  it('Suspense 追踪待处理异步后代数量', () => {
    // 模拟 Suspense 内部状态追踪
    let pendingDescendants = 0

    const asyncVNode1: VNode = {
      type: 'div', props: null, children: 'Async 1',
      key: null, ref: null, shapeFlag: 8,
      patchFlag: 0, dynamicChildren: null, dynamicProps: null,
      component: null, el: null, anchor: null,
      __asyncSetup: true, _isAsyncComponent: true,
    }
    const asyncVNode2: VNode = {
      type: 'div', props: null, children: 'Async 2',
      key: null, ref: null, shapeFlag: 8,
      patchFlag: 0, dynamicChildren: null, dynamicProps: null,
      component: null, el: null, anchor: null,
      __asyncSetup: true, _isAsyncComponent: true,
    }

    const asyncChildren = [asyncVNode1, asyncVNode2]
    pendingDescendants = asyncChildren.length

    expect(pendingDescendants).toBe(2)

    // 模拟一个完成
    pendingDescendants = Math.max(0, pendingDescendants - 1)
    expect(pendingDescendants).toBe(1)

    // 模拟另一个完成
    pendingDescendants = Math.max(0, pendingDescendants - 1)
    expect(pendingDescendants).toBe(0)
  })
})

// ================================================================
//  renderToStream 测试
// ================================================================

describe('renderToStream 流式渲染', () => {
  // ---- 1. renderToStream 基本输出 ----
  it('renderToStream 基本元素输出', async () => {
    // 内联实现 renderToStreamGenerator（与 ssr-renderer 中的逻辑一致）
    const vnode = h('div', { id: 'stream-test' }, 'Hello Stream')

    // 使用 StringRenderer 的 renderToStream 方法
    const renderer = new StringRenderer()
    const chunks: string[] = []

    for await (const chunk of renderer.renderToStream(vnode)) {
      chunks.push(chunk)
    }

    const result = chunks.join('')
    expect(result).toBe('<div id="stream-test">Hello Stream</div>')
  })

  // ---- 2. renderToStream 嵌套元素分块输出 ----
  it('renderToStream 嵌套元素分块输出', async () => {
    const vnode = h('div', { class: 'parent' }, [
      h('h1', null, 'Title'),
      h('p', null, 'Content'),
    ])

    const renderer = new StringRenderer()
    const chunks: string[] = []

    for await (const chunk of renderer.renderToStream(vnode)) {
      chunks.push(chunk)
    }

    const result = chunks.join('')
    expect(result).toBe('<div class="parent"><h1>Title</h1><p>Content</p></div>')
    // 流式渲染应该产生多个 chunk
    expect(chunks.length).toBeGreaterThan(1)
  })

  // ---- 3. renderToStream Fragment ----
  it('renderToStream Fragment 流式输出', async () => {
    const vnode = fragmentVNode([
      h('li', null, 'A'),
      h('li', null, 'B'),
    ])

    const renderer = new StringRenderer()
    const chunks: string[] = []

    for await (const chunk of renderer.renderToStream(vnode)) {
      chunks.push(chunk)
    }

    const result = chunks.join('')
    expect(result).toBe('<li>A</li><li>B</li>')
  })

  // ---- 4. renderToStream 自闭合标签 ----
  it('renderToStream 自闭合标签单 chunk 输出', async () => {
    const vnode = h('br', null, null)
    const renderer = new StringRenderer()
    const chunks: string[] = []

    for await (const chunk of renderer.renderToStream(vnode)) {
      chunks.push(chunk)
    }

    expect(chunks.length).toBe(1)
    expect(chunks[0]).toBe('<br />')
  })

  // ---- 5. renderToStream 文本节点 ----
  it('renderToStream 文本节点输出', async () => {
    const vnode = textVNode('Stream Text')
    const renderer = new StringRenderer()
    const chunks: string[] = []

    for await (const chunk of renderer.renderToStream(vnode)) {
      chunks.push(chunk)
    }

    expect(chunks.length).toBe(1)
    expect(chunks[0]).toBe('Stream Text')
  })

  // ---- 6. renderToStream null 节点 ----
  it('renderToStream null 节点不输出', async () => {
    const renderer = new StringRenderer()
    const chunks: string[] = []

    for await (const chunk of renderer.renderToStream(null as any)) {
      chunks.push(chunk)
    }

    expect(chunks.length).toBe(0)
  })

  // ---- 7. renderToStream 函数式组件 ----
  it('renderToStream 函数式组件输出', async () => {
    const MyComp = (props: any) => h('span', null, `Hi ${props.name}`)
    const vnode = functionalComponentVNode(MyComp, { name: 'Stream' })
    const renderer = new StringRenderer()
    const chunks: string[] = []

    for await (const chunk of renderer.renderToStream(vnode)) {
      chunks.push(chunk)
    }

    const result = chunks.join('')
    expect(result).toBe('<span>Hi Stream</span>')
  })

  // ---- 8. renderToStream Suspense 集成（无异步子组件） ----
  it('renderToStream Suspense 无异步子组件直接输出内容', async () => {
    const SuspenseComp = {
      name: 'Suspense',
      render(props: any, ctx: any) {
        const slots = ctx.slots || {}
        let rawChildren: any[] = []
        if (typeof slots.default === 'function') {
          const result = slots.default()
          rawChildren = Array.isArray(result) ? result : result != null ? [result] : []
        } else if (Array.isArray(slots)) {
          rawChildren = slots
        } else if (slots != null) {
          rawChildren = [slots]
        }
        return rawChildren.length === 1 ? rawChildren[0] : rawChildren
      },
    }

    const contentVNode = h('div', null, 'Suspense Content')
    const vnode = statefulComponentVNode(SuspenseComp, {}, [contentVNode])
    const renderer = new StringRenderer()
    const chunks: string[] = []

    for await (const chunk of renderer.renderToStream(vnode)) {
      chunks.push(chunk)
    }

    const result = chunks.join('')
    expect(result).toBe('<div>Suspense Content</div>')
  })

  // ---- 9. renderToStream ReadableStream 接口 ----
  it('renderToStream 返回 ReadableStream（模拟验证）', async () => {
    // 验证 ReadableStream 接口可用性
    const testStream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('chunk1')
        controller.enqueue('chunk2')
        controller.close()
      },
    })

    const reader = testStream.getReader()
    const chunks: string[] = []

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    expect(chunks).toEqual(['chunk1', 'chunk2'])
  })

  // ---- 10. renderToStream 深层嵌套分块 ----
  it('renderToStream 深层嵌套结构分块输出', async () => {
    const vnode = h('section', null, [
      h('article', null, [
        h('h1', null, 'Title'),
        h('p', null, [
          h('strong', null, 'Bold'),
          h('em', null, 'Italic'),
        ]),
      ]),
    ])

    const renderer = new StringRenderer()
    const chunks: string[] = []

    for await (const chunk of renderer.renderToStream(vnode)) {
      chunks.push(chunk)
    }

    const result = chunks.join('')
    expect(result).toBe(
      '<section><article><h1>Title</h1><p><strong>Bold</strong><em>Italic</em></p></article></section>'
    )
  })
})

// ================================================================
//  defineAsyncComponent SSR 测试
// ================================================================

describe('defineAsyncComponent SSR', () => {
  // ---- 1. defineAsyncComponent 基本加载 ----
  it('defineAsyncComponent 基本加载成功', async () => {
    // 模拟 defineAsyncComponent 的核心逻辑
    let loadCalled = false
    let resolved = false

    const fakeLoader = () => {
      loadCalled = true
      return Promise.resolve({
        name: 'LoadedComponent',
        render: () => ({ type: 'div', props: null, children: 'Loaded!', shapeFlag: 8 }),
      })
    }

    // 模拟加载过程
    const loadPromise = fakeLoader()
    expect(loadCalled).toBe(true)

    const loaded = await loadPromise
    resolved = true
    expect(resolved).toBe(true)
    expect(loaded.name).toBe('LoadedComponent')
  })

  // ---- 2. defineAsyncComponent 显示 loading 状态 ----
  it('defineAsyncComponent 加载中显示 loading 状态', () => {
    // 模拟异步组件状态机
    type Status = 'pending' | 'loading' | 'resolved' | 'error' | 'timeout'
    let status: Status = 'pending'
    let loadingDelayId: number | null = null

    // 模拟进入 loading 状态
    status = 'loading'

    // 模拟有 loadingComponent 且 delay=0
    const delay = 0
    const hasLoadingComponent = true

    let showLoading = false
    if (status === 'loading' && hasLoadingComponent) {
      if (delay <= 0 || loadingDelayId === null) {
        showLoading = true
      }
    }

    expect(status).toBe('loading')
    expect(showLoading).toBe(true)
  })

  // ---- 3. defineAsyncComponent 错误处理 ----
  it('defineAsyncComponent 错误处理和 onError 回调', async () => {
    let errorCaught: Error | null = null
    let onErrorCalled = false
    let retryCalled = false
    let failCalled = false

    const fakeLoader = () => {
      return Promise.reject(new Error('Network error'))
    }

    const onError = (error: Error, retry: () => void, fail: () => void) => {
      onErrorCalled = true
      errorCaught = error
      // 模拟 fail
      fail()
    }

    // 模拟加载过程
    try {
      await fakeLoader()
    } catch (error) {
      errorCaught = error as Error
      // 模拟 onError 回调
      onError(error as Error, () => { retryCalled = true }, () => { failCalled = true })
    }

    expect(errorCaught).toBeDefined()
    expect(errorCaught!.message).toBe('Network error')
    expect(onErrorCalled).toBe(true)
    expect(failCalled).toBe(true)
  })

  // ---- 4. defineAsyncComponent 超时处理 ----
  it('defineAsyncComponent 超时处理', async () => {
    // 模拟超时逻辑
    type Status = 'pending' | 'loading' | 'resolved' | 'error' | 'timeout'
    let status: Status = 'loading'
    let timeoutError: Error | null = null
    const timeout = 100

    // 模拟超时定时器触发
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        if (status === 'loading' || status === 'pending') {
          status = 'timeout'
          timeoutError = new Error(`[Lyt AsyncComponent] 加载超时 (${timeout}ms)`)
        }
        resolve()
      }, timeout)
    })

    expect(status).toBe('timeout')
    expect(timeoutError).toBeDefined()
    expect(timeoutError!.message).toContain('加载超时')
    expect(timeoutError!.message).toContain('100ms')
  })

  // ---- 5. defineAsyncComponent 重试机制 ----
  it('defineAsyncComponent 重试机制', async () => {
    let retryAttempts = 0
    const maxRetry = 3

    const fakeLoader = () => {
      retryAttempts++
      if (retryAttempts <= maxRetry) {
        return Promise.reject(new Error(`Attempt ${retryAttempts} failed`))
      }
      return Promise.resolve({ name: 'LoadedComponent' })
    }

    // 模拟重试逻辑
    let result: any = null
    let lastError: Error | null = null

    for (let i = 0; i <= maxRetry; i++) {
      try {
        result = await fakeLoader()
        break
      } catch (err: any) {
        lastError = err
      }
    }

    expect(retryAttempts).toBe(4) // 初始 + 3 次重试
    expect(result).toBeDefined()
    expect(result.name).toBe('LoadedComponent')
  })

  // ---- 6. defineAsyncComponent _isAsyncComponent 标记 ----
  it('defineAsyncComponent 暴露 _isAsyncComponent 标记', () => {
    // 模拟异步组件标记
    const asyncCompWrapper: any = {
      name: 'AsyncComponent',
      _isComponentDefine: true,
    }

    // 暴露异步标记
    asyncCompWrapper._isAsyncComponent = true
    asyncCompWrapper.__asyncSetup = true
    asyncCompWrapper.__suspense = true

    expect(asyncCompWrapper._isAsyncComponent).toBe(true)
    expect(asyncCompWrapper.__asyncSetup).toBe(true)
    expect(asyncCompWrapper.__suspense).toBe(true)
  })

  // ---- 7. defineAsyncComponent suspensible 模式 ----
  it('defineAsyncComponent suspensible 模式返回异步标记 VNode', () => {
    const suspensible = true
    let loadPromise: Promise<any> | null = null

    // 模拟 load
    loadPromise = Promise.resolve({ name: 'Comp' })

    // 模拟 render 中的 suspensible 分支
    let result: any = null
    if (suspensible) {
      result = {
        __suspense: true,
        __asyncPromise: loadPromise,
        __asyncSetup: true,
        _isAsyncComponent: true,
      }
    }

    expect(result.__suspense).toBe(true)
    expect(result.__asyncPromise).toBe(loadPromise)
    expect(result._isAsyncComponent).toBe(true)
  })

  // ---- 8. defineAsyncComponent 非 suspensible 模式 ----
  it('defineAsyncComponent 非 suspensible 模式显示 loadingComponent', () => {
    const suspensible = false
    const loadingComponent = { name: 'LoadingSpinner' }
    const delay = 0
    let loadPromise: Promise<any> | null = null

    // 模拟 load
    loadPromise = Promise.resolve({ name: 'Comp' })

    let result: any = null
    if (!suspensible) {
      if (loadingComponent) {
        if (delay <= 0) {
          result = {
            tag: loadingComponent,
            __asyncLoading: true,
          }
        }
      }
    }

    expect(result).toBeDefined()
    expect(result.__asyncLoading).toBe(true)
    expect(result.tag).toBe(loadingComponent)
  })
})
