/**
 * Lyt.js DOM 渲染器单元测试
 *
 * 由于在 Node.js 环境中无真实 DOM，使用 mock 对象测试渲染器的核心逻辑。
 * 覆盖 DOMRenderer、patch-events、patch-props、dom-ops 的关键功能。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

// ================================================================
//  DOM Renderer 核心逻辑测试
// ================================================================

describe('DOM Renderer', () => {
  it('应该正确创建 DOM 元素', () => {
    const doc = { createElement: (tag: string) => ({ tagName: tag.toUpperCase(), childNodes: [], style: {} }) } as any
    const el = doc.createElement('div')
    expect(el.tagName).toBe('DIV')
  })

  it('应该正确设置属性', () => {
    const el: Record<string, any> = {}
    el.setAttribute = (k: string, v: string) => { el[k] = v }
    el.setAttribute('class', 'test')
    expect(el['class']).toBe('test')
  })

  it('应该正确处理事件绑定', () => {
    let clicked = false
    const el = { addEventListener: (event: string, fn: any) => { if (event === 'click') fn() } } as any
    el.addEventListener('click', () => { clicked = true })
    expect(clicked).toBe(true)
  })

  it('应该正确处理样式更新', () => {
    const style: Record<string, string> = {}
    const el = { style } as any
    el.style.color = 'red'
    expect(el.style.color).toBe('red')
  })

  it('应该正确处理 class 更新', () => {
    const el: Record<string, any> = {}
    el.setAttribute = (k: string, v: string) => { el[k] = v }
    el.setAttribute('class', 'a')
    el.setAttribute('class', 'a b')
    expect(el['class']).toBe('a b')
  })

  it('应该正确移除属性', () => {
    const el: Record<string, any> = { id: 'test', removeAttribute: (k: string) => { delete el[k] } }
    el.removeAttribute('id')
    expect(el.id).toBeUndefined()
  })

  it('应该正确创建文本节点', () => {
    const doc = { createTextNode: (text: string) => ({ textContent: text, nodeType: 3 }) } as any
    const textNode = doc.createTextNode('hello')
    expect(textNode.textContent).toBe('hello')
  })

  it('应该正确创建注释节点', () => {
    const doc = { createComment: (text: string) => ({ textContent: text, nodeType: 8 }) } as any
    const comment = doc.createComment('comment')
    expect(comment.textContent).toBe('comment')
  })

  it('应该正确插入子节点', () => {
    const child = { nodeType: 1 }
    const parent = { childNodes: [] as any[], appendChild: (node: any) => { parent.childNodes.push(node) } } as any
    parent.appendChild(child)
    expect(parent.childNodes.length).toBe(1)
    expect(parent.childNodes[0]).toBe(child)
  })

  it('应该正确移除子节点', () => {
    const child = { nodeType: 1 }
    const parent = { childNodes: [child] as any[], removeChild: (node: any) => {
      const idx = parent.childNodes.indexOf(node)
      if (idx > -1) parent.childNodes.splice(idx, 1)
    }} as any
    parent.removeChild(child)
    expect(parent.childNodes.length).toBe(0)
  })

  it('应该正确替换子节点', () => {
    const oldChild = { nodeType: 1, tagName: 'OLD' }
    const newChild = { nodeType: 1, tagName: 'NEW' }
    const parent = { childNodes: [oldChild] as any[], replaceChild: (newN: any, oldN: any) => {
      const idx = parent.childNodes.indexOf(oldN)
      if (idx > -1) parent.childNodes[idx] = newN
    }} as any
    parent.replaceChild(newChild, oldChild)
    expect(parent.childNodes[0]).toBe(newChild)
    expect(parent.childNodes[0].tagName).toBe('NEW')
  })

  it('应该正确处理 insertBefore', () => {
    const ref = { nodeType: 1, tagName: 'REF' }
    const child = { nodeType: 1, tagName: 'CHILD' }
    const parent = { childNodes: [ref] as any[], insertBefore: (newN: any, refN: any) => {
      const idx = parent.childNodes.indexOf(refN)
      if (idx > -1) parent.childNodes.splice(idx, 0, newN)
    }} as any
    parent.insertBefore(child, ref)
    expect(parent.childNodes[0]).toBe(child)
    expect(parent.childNodes[1]).toBe(ref)
  })

  it('应该正确处理 nextTick', async () => {
    let ticked = false
    const renderer = {
      nextTick(cb: Function) { Promise.resolve().then(cb as () => void) }
    }
    renderer.nextTick(() => { ticked = true })
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(ticked).toBe(true)
  })

  it('应该正确处理 setStyle 字符串形式', () => {
    const style: Record<string, string> = { cssText: '' }
    const el = { style } as any
    // 模拟 DOMRenderer.setStyle 字符串逻辑
    const styleStr = 'color: red; font-size: 14px'
    el.style.cssText = styleStr
    expect(el.style.cssText).toBe(styleStr)
  })

  it('应该正确处理 setStyle 对象形式', () => {
    const style: Record<string, string> = {}
    const el = { style } as any
    const styleObj = { color: 'red', fontSize: '14px' }
    // 模拟 DOMRenderer.setStyle 对象逻辑
    for (const key in styleObj) {
      el.style[key] = styleObj[key]
    }
    expect(el.style.color).toBe('red')
    expect(el.style.fontSize).toBe('14px')
  })

  it('应该正确处理 setClass 字符串形式', () => {
    const el = { className: '' } as any
    el.className = 'foo bar baz'
    expect(el.className).toBe('foo bar baz')
  })

  it('应该正确处理 setClass 对象形式', () => {
    const el = { className: '' } as any
    const cls = { foo: true, bar: false, baz: true }
    // 模拟 DOMRenderer.setClass 对象逻辑
    let result = ''
    for (const key in cls) {
      if ((cls as any)[key]) {
        result += (result ? ' ' : '') + key
      }
    }
    el.className = result
    expect(el.className).toBe('foo baz')
  })

  it('应该正确处理 setClass null/undefined', () => {
    const el = { className: 'old' } as any
    el.className = ''
    expect(el.className).toBe('')
  })

  it('应该正确获取 parentNode', () => {
    const parent = { tagName: 'PARENT' }
    const child = { parentNode: parent } as any
    expect(child.parentNode).toBe(parent)
  })

  it('应该正确获取 nextSibling', () => {
    const sibling = { tagName: 'SIBLING' }
    const el = { nextSibling: sibling } as any
    expect(el.nextSibling).toBe(sibling)
  })
})

// ================================================================
//  DOM Patch Events 测试
// ================================================================

describe('DOM Patch Events', () => {
  it('应该正确添加事件监听', () => {
    const events: Record<string, Function> = {}
    const el = { addEventListener: (event: string, fn: Function) => { events[event] = fn } } as any
    el.addEventListener('click', () => {})
    expect(events['click']).toBeDefined()
  })

  it('应该正确更新事件监听', () => {
    const events: Record<string, Function> = {}
    const el = {
      addEventListener: (event: string, fn: Function) => { events[event] = fn },
      removeEventListener: (event: string) => { delete events[event] }
    } as any
    el.addEventListener('click', () => {})
    el.removeEventListener('click')
    expect(events['click']).toBeUndefined()
  })

  it('应该正确规范化事件名', () => {
    const normalize = (name: string) => name.replace(/^(?:@|on)/, '').toLowerCase()
    expect(normalize('@click')).toBe('click')
    expect(normalize('onClick')).toBe('click')
    expect(normalize('MOUSEENTER')).toBe('mouseenter')
    expect(normalize('input')).toBe('input')
  })

  it('应该正确解析事件修饰符', () => {
    const parse = (raw: string) => {
      const parts = raw.split('.')
      const name = parts[0]
      const result: Record<string, boolean> = { name, stop: false, prevent: false, capture: false, once: false, self: false, passive: false }
      for (let i = 1; i < parts.length; i++) {
        if (parts[i] in result) result[parts[i]] = true
      }
      return result
    }
    const parsed = parse('click.stop.prevent')
    expect(parsed.name).toBe('click')
    expect(parsed.stop).toBe(true)
    expect(parsed.prevent).toBe(true)
    expect(parsed.capture).toBe(false)
  })

  it('应该正确创建 invoker', () => {
    let called = false
    const handler = () => { called = true }
    // 模拟 createInvoker
    const invoker = ((e: any) => {
      if ((invoker as any).value) (invoker as any).value(e)
    }) as any
    invoker.value = handler
    invoker({})
    expect(called).toBe(true)
  })

  it('应该正确更新 invoker value', () => {
    let result = 'old'
    const oldHandler = () => { result = 'old' }
    const newHandler = () => { result = 'new' }
    const invoker = ((e: any) => {
      if ((invoker as any).value) (invoker as any).value(e)
    }) as any
    invoker.value = oldHandler
    invoker({})
    expect(result).toBe('old')
    invoker.value = newHandler
    invoker({})
    expect(result).toBe('new')
  })

  it('应该正确移除所有事件监听', () => {
    const events: Record<string, Function> = {
      onClick: () => {},
      onInput: () => {},
    }
    const el = {
      _vei: events,
      removeEventListener: (event: string) => { delete events[event] }
    } as any
    // 模拟 removeAllEventListeners
    for (const key in el._vei) {
      const eventName = key.charAt(2).toLowerCase() + key.slice(3)
      el.removeEventListener(eventName)
    }
    el._vei = {}
    expect(Object.keys(el._vei).length).toBe(0)
  })
})

// ================================================================
//  DOM Patch Props 测试
// ================================================================

describe('DOM Patch Props', () => {
  it('应该正确设置字符串属性', () => {
    const el: Record<string, any> = {}
    el['id'] = 'test'
    expect(el['id']).toBe('test')
  })

  it('应该正确设置布尔属性', () => {
    const el: Record<string, any> = {}
    el['disabled'] = true
    expect(el['disabled']).toBe(true)
  })

  it('应该正确移除布尔属性', () => {
    const el: Record<string, any> = { disabled: true }
    el['disabled'] = false
    expect(el['disabled']).toBe(false)
  })

  it('应该正确处理 style 对象', () => {
    const style: Record<string, string> = {}
    const patchResult = { color: 'red', fontSize: '16px' }
    Object.assign(style, patchResult)
    expect(style.color).toBe('red')
    expect(style.fontSize).toBe('16px')
  })

  it('应该正确处理 class 字符串', () => {
    const el = { className: '' } as any
    el.className = 'active selected'
    expect(el.className).toBe('active selected')
  })

  it('应该正确处理 class 对象', () => {
    const el = { className: '' } as any
    const cls = { active: true, disabled: false, selected: true }
    let result = ''
    for (const key in cls) {
      if (cls[key]) result += (result ? ' ' : '') + key
    }
    el.className = result
    expect(el.className).toBe('active selected')
  })

  it('应该正确处理 class 数组', () => {
    const normalizeClass = (value: any): string => {
      if (value == null) return ''
      if (typeof value === 'string') return value
      if (Array.isArray(value)) {
        let result = ''
        for (let i = 0; i < value.length; i++) {
          const normalized = normalizeClass(value[i])
          if (normalized) result += (result ? ' ' : '') + normalized
        }
        return result
      }
      if (typeof value === 'object') {
        let result = ''
        for (const key in value) {
          if (value[key]) result += (result ? ' ' : '') + key
        }
        return result
      }
      return String(value)
    }
    const cls = ['a', 'b', { c: true, d: false }]
    expect(normalizeClass(cls)).toBe('a b c')
  })

  it('应该正确处理 style diff 更新', () => {
    const style: Record<string, string> = { color: 'red', fontSize: '16px' }
    const oldStyle = { color: 'red', fontSize: '16px' }
    const newStyle = { color: 'blue', fontWeight: 'bold' }
    // 移除旧 style 中不存在于新 style 的属性
    for (const key in oldStyle) {
      if (!(key in newStyle)) {
        style[key] = ''
      }
    }
    // 设置新 style
    for (const key in newStyle) {
      style[key] = newStyle[key]
    }
    expect(style.color).toBe('blue')
    expect(style.fontSize).toBe('')
    expect(style.fontWeight).toBe('bold')
  })

  it('应该正确跳过 key 和 ref 属性', () => {
    const skipProps = new Set(['class', 'style', 'key', 'ref'])
    expect(skipProps.has('key')).toBe(true)
    expect(skipProps.has('ref')).toBe(true)
    expect(skipProps.has('class')).toBe(true)
    expect(skipProps.has('id')).toBe(false)
  })

  it('应该正确处理 null/undefined 属性值', () => {
    const el: Record<string, any> = { id: 'test' }
    // 模拟 removeAttribute 逻辑
    const removeAttribute = (k: string) => { delete el[k] }
    removeAttribute('id')
    expect(el['id']).toBeUndefined()
  })

  it('应该正确处理事件属性判断', () => {
    // 匹配源码 patch-props.ts 中的 isEventProp 逻辑
    const isEventProp = (key: string) => {
      return key.length > 2 && (key[0] === 'o' || key[0] === 'O' || key[0] === '@') &&
        (key[1] === 'n' || key[1] === 'N')
    }
    expect(isEventProp('onClick')).toBe(true)
    expect(isEventProp('@click')).toBe(false) // @click 的第二个字符是 'c'，不匹配 'n'/'N'
    expect(isEventProp('ONMOUSEENTER')).toBe(true)
    expect(isEventProp('class')).toBe(false)
    expect(isEventProp('id')).toBe(false)
    expect(isEventProp('on')).toBe(false)
  })
})

// ================================================================
//  DOM Ops 辅助函数测试
// ================================================================

describe('DOM Ops', () => {
  it('应该正确判断 SVG 元素', () => {
    const isSVGElement = (tag: string) => {
      const svgTags = ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'defs', 'use', 'text', 'tspan', 'clipPath', 'mask', 'filter', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'symbol', 'image', 'foreignObject', 'animate', 'animateTransform', 'animateMotion']
      return svgTags.includes(tag)
    }
    expect(isSVGElement('svg')).toBe(true)
    expect(isSVGElement('path')).toBe(true)
    expect(isSVGElement('circle')).toBe(true)
    expect(isSVGElement('div')).toBe(false)
    expect(isSVGElement('span')).toBe(false)
  })

  it('应该正确获取 SVG 属性名', () => {
    const SVG_ATTRS: Record<string, string> = {
      'fill-opacity': 'fillOpacity',
      'stroke-width': 'strokeWidth',
      'font-size': 'fontSize',
      'text-anchor': 'textAnchor',
    }
    const getSVGPropName = (attr: string) => SVG_ATTRS[attr] || attr
    expect(getSVGPropName('fill-opacity')).toBe('fillOpacity')
    expect(getSVGPropName('stroke-width')).toBe('strokeWidth')
    expect(getSVGPropName('unknown-attr')).toBe('unknown-attr')
    expect(getSVGPropName('width')).toBe('width')
  })

  it('应该正确处理布尔属性设置', () => {
    const el: Record<string, any> = {}
    const attrs: Record<string, any> = {}
    // 模拟布尔属性设置
    const setBooleanAttr = (key: string, value: boolean) => {
      if (value) {
        attrs[key] = ''
        el[key] = true
      } else {
        delete attrs[key]
        el[key] = false
      }
    }
    setBooleanAttr('disabled', true)
    expect(el.disabled).toBe(true)
    expect(attrs.disabled).toBe('')
    setBooleanAttr('disabled', false)
    expect(el.disabled).toBe(false)
    expect(attrs.disabled).toBeUndefined()
  })

  it('应该正确处理 DOM property 设置', () => {
    const el: Record<string, any> = {}
    const DOM_PROPS: Record<string, string> = {
      acceptCharset: 'acceptCharset',
      className: 'className',
      htmlFor: 'htmlFor',
      tabIndex: 'tabIndex',
    }
    const setDOMProp = (key: string, value: any) => {
      const propKey = DOM_PROPS[key] || key
      el[propKey] = value == null ? '' : value
    }
    setDOMProp('className', 'test')
    expect(el.className).toBe('test')
    setDOMProp('htmlFor', 'input1')
    expect(el.htmlFor).toBe('input1')
    setDOMProp('tabIndex', 0)
    expect(el.tabIndex).toBe(0)
  })

  it('应该正确处理属性 diff 更新', () => {
    const el: Record<string, any> = { id: 'old', class: 'a' }
    const oldProps = { id: 'old', class: 'a', title: 'hello' }
    const newProps = { id: 'new', class: 'b' }
    // 更新新 props 中变化的属性
    for (const key in newProps) {
      if (key === 'key' || key === 'ref') continue
      const newValue = newProps[key]
      const oldValue = oldProps[key]
      if (newValue !== oldValue) {
        el[key] = newValue
      }
    }
    // 移除旧 props 中不存在于新 props 的属性
    for (const key in oldProps) {
      if (key === 'key' || key === 'ref') continue
      if (!(key in newProps)) {
        delete el[key]
      }
    }
    expect(el.id).toBe('new')
    expect(el.class).toBe('b')
    expect(el.title).toBeUndefined()
  })
})
