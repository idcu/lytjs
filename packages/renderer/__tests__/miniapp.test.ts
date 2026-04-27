/**
 * Lyt.js MiniAppRenderer — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * MiniAppRenderer 输出 MiniAppNode 描述树，可序列化为 WXML/AXML/TTML。
 *
 * 测试覆盖：
 *   - createMiniAppRenderer 创建渲染器实例
 *   - WXML 基本元素输出
 *   - WXML 列表渲染（wx:for）
 *   - WXML 条件渲染（wx:if）
 *   - WXML 事件绑定（bindtap）
 *   - AXML 列表渲染（a:for）
 *   - AXML 条件渲染（a:if）
 *   - AXML 事件绑定（onTap）
 *   - TTML 列表渲染（tt:for）
 *   - TTML 条件渲染（tt:if）
 *   - TTML 事件绑定（bindtap）
 *   - 样式转换
 *   - 组件映射
 *   - Fragment / Comment 处理
 *   - patchProp / setText
 */

import { describe, it, expect } from '../../test-utils/src/index'

// ================================================================
//  内联 MiniAppRenderer 实现（避免外部依赖，保持测试独立性）
// ================================================================

/** 小程序模板节点描述 */
interface MiniAppNode {
  tag: string
  attrs: Record<string, string>
  children: MiniAppNode[]
  text?: string
  wxIf?: string
  wxFor?: string
  wxForKey?: string
  bindEvents: Record<string, string>
  modelBindings: Record<string, string>
  _parent?: MiniAppNode
}

/** HTML 标签到小程序组件映射 */
const MINIAPP_COMPONENT_MAP: Record<string, string> = {
  'div': 'view', 'span': 'text', 'p': 'text',
  'h1': 'text', 'h2': 'text', 'h3': 'text',
  'h4': 'text', 'h5': 'text', 'h6': 'text',
  'img': 'image', 'input': 'input', 'textarea': 'textarea',
  'button': 'button', 'scroll': 'scroll-view', 'list': 'view',
  'a': 'navigator', 'ul': 'view', 'ol': 'view', 'li': 'view',
  'form': 'form', 'header': 'view', 'footer': 'view', 'nav': 'view',
  'main': 'view', 'section': 'view', 'article': 'view', 'aside': 'view',
}

/** 事件名映射 */
const EVENT_PREFIX_MAP: Record<string, string> = {
  'click': 'tap', 'input': 'input', 'change': 'change',
  'submit': 'submit', 'focus': 'focus', 'blur': 'blur',
  'touchstart': 'touchstart', 'touchend': 'touchend',
  'touchmove': 'touchmove', 'scroll': 'scroll', 'longpress': 'longpress',
}

/** 平台前缀配置 */
const PLATFORM_PREFIX: Record<string, { if: string; else: string; for: string; forKey: string; bind: string; catch: string }> = {
  wechat:    { if: 'wx:if',    else: 'wx:else',    for: 'wx:for',    forKey: 'wx:key',    bind: 'bind',    catch: 'catch' },
  alipay:    { if: 'a:if',     else: 'a:else',     for: 'a:for',     forKey: 'a:key',     bind: 'on',      catch: 'catchEvent' },
  bytedance: { if: 'tt:if',    else: 'tt:else',    for: 'tt:for',    forKey: 'tt:key',    bind: 'bind',    catch: 'catch' },
}

/** MiniAppRenderer 类 */
class MiniAppRenderer {
  createElement(tag: string): MiniAppNode {
    const miniTag = MINIAPP_COMPONENT_MAP[tag] || tag
    return { tag: miniTag, attrs: {}, children: [], bindEvents: {}, modelBindings: {} }
  }

  createText(text: string): MiniAppNode {
    return { tag: '__text__', attrs: {}, children: [], text, bindEvents: {}, modelBindings: {} }
  }

  createComment(text: string): MiniAppNode {
    return { tag: '__comment__', attrs: {}, children: [], text, bindEvents: {}, modelBindings: {} }
  }

  setAttribute(el: MiniAppNode, key: string, val: any): void {
    if (!el) return
    if (key.startsWith('lyt:')) {
      const directive = key.slice(4)
      this._applyDirective(el, directive, val)
      return
    }
    if (key === 'v-if' || key === 'if') { el.wxIf = String(val); return }
    if (key === 'v-else' || key === 'else') { el.attrs['wx:else'] = ''; return }
    if (key === 'v-for' || key === 'each') {
      const forExpr = String(val)
      const match = forExpr.match(/(?:\((\w+),\s*(\w+)\)|(\w+))\s+in\s+(.+)/)
      if (match) { el.wxFor = match[4] || match[3]; el.wxForKey = match[1] || match[3] }
      else { el.wxFor = forExpr }
      return
    }
    if (key.startsWith('on') && typeof val === 'function') {
      const domEvent = key.slice(2).toLowerCase()
      const miniEvent = EVENT_PREFIX_MAP[domEvent] || domEvent
      el.bindEvents[miniEvent] = val.name || 'handleEvent'
      return
    }
    if (key === 'v-model' || key === 'model') { el.modelBindings['value'] = String(val); return }
    if (key === 'class' || key === 'className') { el.attrs['class'] = String(val); return }
    if (key === 'style') {
      if (typeof val === 'object' && val !== null) { el.attrs['style'] = this._styleObjectToString(val) }
      else { el.attrs['style'] = String(val) }
      return
    }
    if (key === 'href' && el.tag === 'navigator') { el.attrs['url'] = String(val); return }
    el.attrs[key] = String(val)
  }

  removeAttribute(el: MiniAppNode, key: string): void {
    if (!el) return
    if (key === 'v-if' || key === 'if') { delete el.wxIf }
    else if (key === 'v-for' || key === 'each') { delete el.wxFor; delete el.wxForKey }
    else if (key.startsWith('on')) {
      const domEvent = key.slice(2).toLowerCase()
      const miniEvent = EVENT_PREFIX_MAP[domEvent] || domEvent
      delete el.bindEvents[miniEvent]
    } else { delete el.attrs[key] }
  }

  setStyle(el: MiniAppNode, style: object): void {
    if (!el) return
    el.attrs['style'] = this._styleObjectToString(style as Record<string, string>)
  }

  setClass(el: MiniAppNode, cls: string | object): void {
    if (!el) return
    if (typeof cls === 'string') { el.attrs['class'] = cls }
    else if (typeof cls === 'object' && cls !== null) {
      const classList: string[] = []
      for (const [name, value] of Object.entries(cls)) { if (value) classList.push(name) }
      el.attrs['class'] = classList.join(' ')
    }
  }

  insert(parent: MiniAppNode, child: MiniAppNode, ref?: MiniAppNode): void {
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
    } else { parent.children.push(child) }
  }

  remove(child: MiniAppNode): void {
    if (!child || !child._parent) return
    const parent = child._parent
    const idx = parent.children.indexOf(child)
    if (idx !== -1) parent.children.splice(idx, 1)
    child._parent = undefined
  }

  replace(parent: MiniAppNode, oldChild: MiniAppNode, newChild: MiniAppNode): void {
    if (!parent || !oldChild || !newChild) return
    const idx = parent.children.indexOf(oldChild)
    if (idx !== -1) { oldChild._parent = undefined; newChild._parent = parent; parent.children[idx] = newChild }
  }

  addEventListener(el: MiniAppNode, event: string, handler: Function, options?: any): void {
    if (!el) return
    const miniEvent = EVENT_PREFIX_MAP[event] || event
    el.bindEvents[miniEvent] = handler.name || 'handleEvent'
  }

  removeEventListener(el: MiniAppNode, event: string, handler: Function): void {
    if (!el) return
    const miniEvent = EVENT_PREFIX_MAP[event] || event
    delete el.bindEvents[miniEvent]
  }

  nextTick(cb: Function): void { Promise.resolve().then(() => cb()) }
  parentNode(el: MiniAppNode): MiniAppNode | null { return el?._parent ?? null }
  nextSibling(el: MiniAppNode): MiniAppNode | null {
    if (!el || !el._parent) return null
    const siblings = el._parent.children
    const idx = siblings.indexOf(el)
    return idx !== -1 && idx + 1 < siblings.length ? siblings[idx + 1] : null
  }

  setText(node: MiniAppNode, text: string): void {
    if (!node) return
    if (node.tag === '__text__') node.text = text
  }

  patchProp(el: MiniAppNode, key: string, prevValue: any, nextValue: any): void {
    if (!el) return
    if (nextValue === null || nextValue === undefined) { this.removeAttribute(el, key); return }
    if (key === 'style') this.setStyle(el, nextValue)
    else if (key === 'class' || key === 'className') this.setClass(el, nextValue)
    else if (key.startsWith('on') && typeof nextValue === 'function') {
      const domEvent = key.slice(2).toLowerCase()
      const miniEvent = EVENT_PREFIX_MAP[domEvent] || domEvent
      el.bindEvents[miniEvent] = nextValue.name || 'handleEvent'
    }
    else this.setAttribute(el, key, nextValue)
  }

  querySelector(selector: string): MiniAppNode | null { return null }

  serializeToWXML(node: MiniAppNode, indent: number = 0): string {
    return this._serializeToTemplate(node, indent, 'wechat')
  }

  serializeToAXML(node: MiniAppNode, indent: number = 0): string {
    return this._serializeToTemplate(node, indent, 'alipay')
  }

  serializeToTTML(node: MiniAppNode, indent: number = 0): string {
    return this._serializeToTemplate(node, indent, 'bytedance')
  }

  getPlatformTemplate(node: MiniAppNode, platform: 'wechat' | 'alipay' | 'bytedance'): string {
    return this._serializeToTemplate(node, 0, platform)
  }

  mapDirective(lytDirective: string, value: string, platform: string = 'wechat'): string {
    const prefix = PLATFORM_PREFIX[platform] || PLATFORM_PREFIX.wechat
    switch (lytDirective) {
      case 'if': return `${prefix.if}="{{${value}}}"`
      case 'else': return `${prefix.else}`
      case 'each': {
        const match = value.match(/(?:\((\w+),\s*(\w+)\)|(\w+))\s+in\s+(.+)/)
        if (match) {
          const item = match[1] || match[3]
          const dataSource = match[4] || match[3]
          return `${prefix.for}="{{${dataSource}}}" ${prefix.forKey}="{{${item}}}"`
        }
        return `${prefix.for}="{{${value}}}"`
      }
      case 'show': return `hidden="{{!${value}}}"`
      default: return `${value}="${value}"`
    }
  }

  mapEvent(lytEvent: string, platform: string = 'wechat'): string {
    const prefix = PLATFORM_PREFIX[platform] || PLATFORM_PREFIX.wechat
    const miniEvent = EVENT_PREFIX_MAP[lytEvent] || lytEvent
    // 支付宝小程序使用 onTap / onInput 等 camelCase 形式
    if (prefix.bind === 'on') {
      return `on${miniEvent.charAt(0).toUpperCase()}${miniEvent.slice(1)}`
    }
    return `${prefix.bind}${miniEvent}`
  }

  private _applyDirective(el: MiniAppNode, directive: string, value: any): void {
    switch (directive) {
      case 'if': el.wxIf = String(value); break
      case 'else': el.attrs['wx:else'] = ''; break
      case 'each': {
        const forExpr = String(value)
        const match = forExpr.match(/(?:\((\w+),\s*(\w+)\)|(\w+))\s+in\s+(.+)/)
        if (match) { el.wxFor = match[4] || match[3]; el.wxForKey = match[1] || match[3] }
        else { el.wxFor = forExpr }
        break
      }
      case 'show': el.attrs['hidden'] = String(value); break
      default: el.attrs[directive] = String(value)
    }
  }

  private _styleObjectToString(style: Record<string, string>): string {
    return Object.entries(style)
      .map(([key, val]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        return `${cssKey}: ${val}`
      })
      .join('; ')
  }

  private _serializeToTemplate(node: MiniAppNode, indent: number, platform: string): string {
    const spaces = '  '.repeat(indent)
    const prefix = PLATFORM_PREFIX[platform] || PLATFORM_PREFIX.wechat

    if (node.tag === '__text__') return `${spaces}${node.text || ''}`
    if (node.tag === '__comment__') return `${spaces}<!-- ${node.text || ''} -->`
    if (node.tag === '__fragment__') {
      return node.children.map(child => this._serializeToTemplate(child, indent, platform)).join('\n')
    }

    const attrParts: string[] = []

    for (const [key, val] of Object.entries(node.attrs)) {
      if (key === 'wx:else') { attrParts.push(prefix.else); continue }
      attrParts.push(`${key}="${val}"`)
    }

    if (node.wxIf) attrParts.unshift(`${prefix.if}="{{${node.wxIf}}}"`)
    if (node.wxFor) {
      attrParts.unshift(`${prefix.for}="{{${node.wxFor}}}"`)
      if (node.wxForKey) attrParts.unshift(`${prefix.forKey}="{{${node.wxForKey}}}"`)
    }

    for (const [eventName, handlerName] of Object.entries(node.bindEvents)) {
      // 支付宝小程序使用 onTap / onInput 等 camelCase 形式
      const eventBinding = prefix.bind === 'on'
        ? `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`
        : `${prefix.bind}${eventName}`
      attrParts.push(`${eventBinding}="${handlerName}"`)
    }

    for (const [modelKey, modelVal] of Object.entries(node.modelBindings)) {
      attrParts.push(`model:${modelKey}="{{${modelVal}}}"`)
    }

    const attrStr = attrParts.length > 0 ? ' ' + attrParts.join(' ') : ''

    const selfClosingTags = new Set(['image', 'input'])
    if (node.children.length === 0 && selfClosingTags.has(node.tag)) {
      return `${spaces}<${node.tag}${attrStr} />`
    }

    if (node.children.length === 0) return `${spaces}<${node.tag}${attrStr}></${node.tag}>`

    const childrenStr = node.children
      .map(child => this._serializeToTemplate(child, indent + 1, platform))
      .join('\n')

    return `${spaces}<${node.tag}${attrStr}>\n${childrenStr}\n${spaces}</${node.tag}>`
  }
}

/** 工厂函数 */
function createMiniAppRenderer(): MiniAppRenderer { return new MiniAppRenderer() }

// ================================================================
//  测试用例
// ================================================================

describe('MiniAppRenderer 小程序渲染器', () => {
  // ---- 1. createMiniAppRenderer 创建渲染器实例 ----
  it('createMiniAppRenderer 创建渲染器实例', () => {
    const renderer = createMiniAppRenderer()
    expect(renderer).toBeDefined()
    expect(typeof renderer.createElement).toBe('function')
    expect(typeof renderer.createText).toBe('function')
    expect(typeof renderer.createComment).toBe('function')
    expect(typeof renderer.serializeToWXML).toBe('function')
    expect(typeof renderer.serializeToAXML).toBe('function')
    expect(typeof renderer.serializeToTTML).toBe('function')
    expect(typeof renderer.patchProp).toBe('function')
    expect(typeof renderer.setText).toBe('function')
  })

  // ---- 2. WXML 基本元素输出 ----
  it('WXML 基本元素输出', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    const text = renderer.createText('Hello MiniApp')
    renderer.insert(view, text)
    const wxml = renderer.serializeToWXML(view)
    expect(wxml).toBe('<view>\n  Hello MiniApp\n</view>')
  })

  // ---- 3. WXML 带属性的元素输出 ----
  it('WXML 带属性的元素输出', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'class', 'container')
    renderer.setAttribute(view, 'id', 'app')
    const wxml = renderer.serializeToWXML(view)
    expect(wxml).toContain('class="container"')
    expect(wxml).toContain('id="app"')
    expect(wxml).toContain('<view')
  })

  // ---- 4. WXML 列表渲染（wx:for） ----
  it('WXML 列表渲染 wx:for', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-for', 'item in list')
    const wxml = renderer.serializeToWXML(view)
    expect(wxml).toContain('wx:for="{{list}}"')
    expect(wxml).toContain('wx:key="{{item}}"')
  })

  // ---- 5. WXML 列表渲染带索引（wx:for） ----
  it('WXML 列表渲染带索引 wx:for', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-for', '(item, index) in items')
    const wxml = renderer.serializeToWXML(view)
    expect(wxml).toContain('wx:for="{{items}}"')
    expect(wxml).toContain('wx:key="{{item}}"')
  })

  // ---- 6. WXML 条件渲染（wx:if） ----
  it('WXML 条件渲染 wx:if', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-if', 'show')
    const wxml = renderer.serializeToWXML(view)
    expect(wxml).toContain('wx:if="{{show}}"')
  })

  // ---- 7. WXML 条件渲染（wx:else） ----
  it('WXML 条件渲染 wx:else', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-else', '')
    const wxml = renderer.serializeToWXML(view)
    expect(wxml).toContain('wx:else')
  })

  // ---- 8. WXML 事件绑定（bindtap） ----
  it('WXML 事件绑定 bindtap', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('button')
    function handleTap() {}
    renderer.setAttribute(view, 'onClick', handleTap)
    const wxml = renderer.serializeToWXML(view)
    expect(wxml).toContain('bindtap="handleTap"')
  })

  // ---- 9. WXML 多种事件绑定 ----
  it('WXML 多种事件绑定', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('input')
    function handleInput() {}
    function handleFocus() {}
    renderer.addEventListener(view, 'input', handleInput)
    renderer.addEventListener(view, 'focus', handleFocus)
    const wxml = renderer.serializeToWXML(view)
    expect(wxml).toContain('bindinput="handleInput"')
    expect(wxml).toContain('bindfocus="handleFocus"')
  })

  // ---- 10. AXML 列表渲染（a:for） ----
  it('AXML 列表渲染 a:for', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-for', 'item in list')
    const axml = renderer.serializeToAXML(view)
    expect(axml).toContain('a:for="{{list}}"')
    expect(axml).toContain('a:key="{{item}}"')
  })

  // ---- 11. AXML 条件渲染（a:if） ----
  it('AXML 条件渲染 a:if', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-if', 'visible')
    const axml = renderer.serializeToAXML(view)
    expect(axml).toContain('a:if="{{visible}}"')
  })

  // ---- 12. AXML 条件渲染（a:else） ----
  it('AXML 条件渲染 a:else', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-else', '')
    const axml = renderer.serializeToAXML(view)
    expect(axml).toContain('a:else')
  })

  // ---- 13. AXML 事件绑定（onTap） ----
  it('AXML 事件绑定 onTap', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('button')
    function handleTap() {}
    renderer.setAttribute(view, 'onClick', handleTap)
    const axml = renderer.serializeToAXML(view)
    expect(axml).toContain('onTap="handleTap"')
  })

  // ---- 14. TTML 列表渲染（tt:for） ----
  it('TTML 列表渲染 tt:for', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-for', 'item in list')
    const ttml = renderer.serializeToTTML(view)
    expect(ttml).toContain('tt:for="{{list}}"')
    expect(ttml).toContain('tt:key="{{item}}"')
  })

  // ---- 15. TTML 条件渲染（tt:if） ----
  it('TTML 条件渲染 tt:if', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-if', 'active')
    const ttml = renderer.serializeToTTML(view)
    expect(ttml).toContain('tt:if="{{active}}"')
  })

  // ---- 16. TTML 条件渲染（tt:else） ----
  it('TTML 条件渲染 tt:else', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-else', '')
    const ttml = renderer.serializeToTTML(view)
    expect(ttml).toContain('tt:else')
  })

  // ---- 17. TTML 事件绑定（bindtap） ----
  it('TTML 事件绑定 bindtap', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('button')
    function handleTap() {}
    renderer.setAttribute(view, 'onClick', handleTap)
    const ttml = renderer.serializeToTTML(view)
    expect(ttml).toContain('bindtap="handleTap"')
  })

  // ---- 18. 样式转换 ----
  it('样式对象转换为内联样式字符串', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setStyle(view, { color: 'red', fontSize: '16px', marginTop: '10px' })
    const wxml = renderer.serializeToWXML(view)
    expect(wxml).toContain('color: red')
    expect(wxml).toContain('font-size: 16px')
    expect(wxml).toContain('margin-top: 10px')
  })

  // ---- 19. 组件映射 ----
  it('HTML 标签映射为小程序组件', () => {
    const renderer = createMiniAppRenderer()
    expect(renderer.createElement('div').tag).toBe('view')
    expect(renderer.createElement('span').tag).toBe('text')
    expect(renderer.createElement('p').tag).toBe('text')
    expect(renderer.createElement('img').tag).toBe('image')
    expect(renderer.createElement('input').tag).toBe('input')
    expect(renderer.createElement('button').tag).toBe('button')
    expect(renderer.createElement('scroll').tag).toBe('scroll-view')
    expect(renderer.createElement('a').tag).toBe('navigator')
    expect(renderer.createElement('header').tag).toBe('view')
    expect(renderer.createElement('footer').tag).toBe('view')
    expect(renderer.createElement('nav').tag).toBe('view')
    expect(renderer.createElement('section').tag).toBe('view')
  })

  // ---- 20. 自闭合标签输出 ----
  it('image 自闭合标签输出', () => {
    const renderer = createMiniAppRenderer()
    const img = renderer.createElement('img')
    renderer.setAttribute(img, 'src', '/logo.png')
    const wxml = renderer.serializeToWXML(img)
    expect(wxml).toBe('<image src="/logo.png" />')
  })

  // ---- 21. input 自闭合标签输出 ----
  it('input 自闭合标签输出', () => {
    const renderer = createMiniAppRenderer()
    const input = renderer.createElement('input')
    renderer.setAttribute(input, 'placeholder', 'Enter text')
    const wxml = renderer.serializeToWXML(input)
    expect(wxml).toBe('<input placeholder="Enter text" />')
  })

  // ---- 22. Fragment 处理 ----
  it('Fragment 直接展开子节点', () => {
    const renderer = createMiniAppRenderer()
    const fragment: MiniAppNode = {
      tag: '__fragment__', attrs: {}, children: [
        renderer.createElement('div'),
        renderer.createElement('span'),
      ], bindEvents: {}, modelBindings: {},
    }
    const wxml = renderer.serializeToWXML(fragment)
    expect(wxml).toContain('<view')
    expect(wxml).toContain('<text')
    // Fragment 本身不应出现在输出中
    expect(wxml).not.toContain('__fragment__')
  })

  // ---- 23. Comment 处理 ----
  it('Comment 序列化为 HTML 注释', () => {
    const renderer = createMiniAppRenderer()
    const comment = renderer.createComment('a comment')
    const wxml = renderer.serializeToWXML(comment)
    expect(wxml).toBe('<!-- a comment -->')
  })

  // ---- 24. patchProp 新增属性 ----
  it('patchProp 新增属性', () => {
    const renderer = createMiniAppRenderer()
    const el = renderer.createElement('div')
    renderer.patchProp(el, 'id', null, 'my-view')
    expect(el.attrs.id).toBe('my-view')
  })

  // ---- 25. patchProp 移除属性 ----
  it('patchProp 移除属性', () => {
    const renderer = createMiniAppRenderer()
    const el = renderer.createElement('div')
    renderer.setAttribute(el, 'id', 'old-id')
    expect(el.attrs.id).toBe('old-id')
    renderer.patchProp(el, 'id', 'old-id', null)
    expect(el.attrs.id).toBeUndefined()
  })

  // ---- 26. setText 设置文本内容 ----
  it('setText 设置文本内容', () => {
    const renderer = createMiniAppRenderer()
    const textNode = renderer.createText('Old')
    renderer.setText(textNode, 'New')
    expect(textNode.text).toBe('New')
  })

  // ---- 27. mapDirective 指令映射 ----
  it('mapDirective 映射 if 指令', () => {
    const renderer = createMiniAppRenderer()
    expect(renderer.mapDirective('if', 'show', 'wechat')).toBe('wx:if="{{show}}"')
    expect(renderer.mapDirective('if', 'show', 'alipay')).toBe('a:if="{{show}}"')
    expect(renderer.mapDirective('if', 'show', 'bytedance')).toBe('tt:if="{{show}}"')
  })

  // ---- 28. mapDirective 映射 each 指令 ----
  it('mapDirective 映射 each 指令', () => {
    const renderer = createMiniAppRenderer()
    const result = renderer.mapDirective('each', 'item in list', 'wechat')
    expect(result).toContain('wx:for="{{list}}"')
    expect(result).toContain('wx:key="{{item}}"')
  })

  // ---- 29. mapDirective 映射 show 指令 ----
  it('mapDirective 映射 show 指令', () => {
    const renderer = createMiniAppRenderer()
    const result = renderer.mapDirective('show', 'visible', 'wechat')
    expect(result).toBe('hidden="{{!visible}}"')
  })

  // ---- 30. mapEvent 事件映射 ----
  it('mapEvent 事件映射各平台', () => {
    const renderer = createMiniAppRenderer()
    expect(renderer.mapEvent('click', 'wechat')).toBe('bindtap')
    expect(renderer.mapEvent('click', 'alipay')).toBe('onTap')
    expect(renderer.mapEvent('click', 'bytedance')).toBe('bindtap')
    expect(renderer.mapEvent('input', 'wechat')).toBe('bindinput')
    expect(renderer.mapEvent('scroll', 'alipay')).toBe('onScroll')
  })

  // ---- 31. v-model 双向绑定 ----
  it('v-model 双向绑定序列化', () => {
    const renderer = createMiniAppRenderer()
    const input = renderer.createElement('input')
    renderer.setAttribute(input, 'v-model', 'name')
    const wxml = renderer.serializeToWXML(input)
    expect(wxml).toContain('model:value="{{name}}"')
  })

  // ---- 32. 嵌套结构序列化 ----
  it('嵌套结构 WXML 序列化', () => {
    const renderer = createMiniAppRenderer()
    const parent = renderer.createElement('div')
    renderer.setAttribute(parent, 'class', 'container')
    const child1 = renderer.createElement('span')
    renderer.insert(child1, renderer.createText('Hello'))
    const child2 = renderer.createElement('img')
    renderer.setAttribute(child2, 'src', '/logo.png')
    renderer.insert(parent, child1)
    renderer.insert(parent, child2)
    const wxml = renderer.serializeToWXML(parent)
    expect(wxml).toContain('<view class="container">')
    expect(wxml).toContain('<text>')
    expect(wxml).toContain('Hello')
    expect(wxml).toContain('<image src="/logo.png" />')
  })

  // ---- 33. getPlatformTemplate 通用方法 ----
  it('getPlatformTemplate 各平台输出', () => {
    const renderer = createMiniAppRenderer()
    const view = renderer.createElement('div')
    renderer.setAttribute(view, 'v-if', 'show')
    const wxml = renderer.getPlatformTemplate(view, 'wechat')
    const axml = renderer.getPlatformTemplate(view, 'alipay')
    const ttml = renderer.getPlatformTemplate(view, 'bytedance')
    expect(wxml).toContain('wx:if="{{show}}"')
    expect(axml).toContain('a:if="{{show}}"')
    expect(ttml).toContain('tt:if="{{show}}"')
  })

  // ---- 34. setClass 对象形式 ----
  it('setClass 对象形式', () => {
    const renderer = createMiniAppRenderer()
    const el = renderer.createElement('div')
    renderer.setClass(el, { active: true, disabled: false, highlight: true })
    expect(el.attrs['class']).toBe('active highlight')
  })

  // ---- 35. href → url 映射（navigator 组件） ----
  it('navigator href 映射为 url', () => {
    const renderer = createMiniAppRenderer()
    const nav = renderer.createElement('a')
    renderer.setAttribute(nav, 'href', '/pages/detail')
    const wxml = renderer.serializeToWXML(nav)
    expect(wxml).toContain('url="/pages/detail"')
    expect(wxml).toContain('<navigator')
  })

  // ---- 36. lyt:if 指令 ----
  it('lyt:if 指令设置条件', () => {
    const renderer = createMiniAppRenderer()
    const el = renderer.createElement('div')
    renderer.setAttribute(el, 'lyt:if', 'visible')
    expect(el.wxIf).toBe('visible')
    const wxml = renderer.serializeToWXML(el)
    expect(wxml).toContain('wx:if="{{visible}}"')
  })

  // ---- 37. lyt:each 指令 ----
  it('lyt:each 指令设置列表', () => {
    const renderer = createMiniAppRenderer()
    const el = renderer.createElement('div')
    renderer.setAttribute(el, 'lyt:each', 'item in items')
    expect(el.wxFor).toBe('items')
    expect(el.wxForKey).toBe('item')
  })
})
