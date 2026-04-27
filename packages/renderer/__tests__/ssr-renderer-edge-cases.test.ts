/**
 * Lyt.js SSR 渲染器 — 边界测试（直接导入 ssr-renderer 模块）
 *
 * 直接导入并测试 ssr-renderer.ts 的导出函数，以提高覆盖率。
 * SSR 渲染不需要真实 DOM，可以在 Node.js 中直接运行。
 *
 * 测试覆盖：
 *   - escapeHTML HTML 转义
 *   - serializeProp 属性序列化
 *   - normalizeClass class 标准化
 *   - normalizeStyle style 标准化
 *   - serializeProps 批量属性序列化
 *   - StringRenderer 类
 *   - renderToString 独立函数
 *   - renderToStream 流式渲染
 *   - renderToStreamGenerator 异步生成器
 *   - HTML 元素渲染
 *   - 自闭合标签
 *   - Fragment 渲染
 *   - 文本节点
 *   - 注释节点
 *   - 空内容处理
 *   - 事件属性忽略
 *   - 内部属性忽略
 *   - 布尔属性
 *   - class 多种形式
 *   - style 对象形式（驼峰转 kebab-case）
 *   - data-* 自定义属性
 *   - aria-* 无障碍属性
 *   - dangerouslySetInnerHTML
 *   - innerHTML
 *   - 函数式组件
 *   - 有状态组件（对象带 render）
 *   - 有状态组件（setup 返回渲染函数）
 *   - 嵌套组件
 *   - 条件渲染
 *   - 列表渲染
 *   - 插槽渲染
 *   - Island 组件渲染
 *   - 特殊字符处理
 *   - 深层嵌套
 *   - 多根节点 Fragment
 */

import { describe, it, expect } from '../../test-utils/src/index'

import {
  escapeHTML,
  serializeProp,
  normalizeClass,
  normalizeStyle,
  serializeProps,
  StringRenderer,
  renderToString,
  renderToStream,
  renderToStreamGenerator,
  ssrRenderer,
  type VNode,
  type SSRVNode,
  type SSRTextVNode,
  type ComponentOptions,
} from '../src/ssr/ssr-renderer'

// ================================================================
//  辅助函数
// ================================================================

const Fragment = Symbol('Fragment')
const Text = Symbol('Text')
const Comment = Symbol('Comment')

/** ShapeFlags 与 ssr-renderer 内部一致 */
const SF = {
  ELEMENT: 1,
  FUNCTIONAL_COMPONENT: 2,
  STATEFUL_COMPONENT: 4,
  TEXT_CHILDREN: 8,
  ARRAY_CHILDREN: 16,
  SLOTS_CHILDREN: 32,
}

/** 创建元素 VNode */
function el(tag: string, props: Record<string, any> | null = null, children: any = null, extra: Partial<VNode> = {}): VNode {
  return {
    type: tag,
    props,
    children,
    key: null,
    ref: null,
    shapeFlag: SF.ELEMENT | (typeof children === 'string' ? SF.TEXT_CHILDREN : Array.isArray(children) ? SF.ARRAY_CHILDREN : 0),
    patchFlag: 0,
    dynamicChildren: null,
    dynamicProps: null,
    component: null,
    el: null,
    anchor: null,
    ...extra,
  }
}

/** 创建文本 VNode */
function text(content: string): VNode {
  return {
    type: Text,
    props: null,
    children: content,
    key: null,
    ref: null,
    shapeFlag: SF.TEXT_CHILDREN,
    patchFlag: 0,
    dynamicChildren: null,
    dynamicProps: null,
    component: null,
    el: null,
    anchor: null,
  }
}

/** 创建注释 VNode */
function comment(content: string): VNode {
  return {
    type: Comment,
    props: null,
    children: content,
    key: null,
    ref: null,
    shapeFlag: 0,
    patchFlag: 0,
    dynamicChildren: null,
    dynamicProps: null,
    component: null,
    el: null,
    anchor: null,
  }
}

/** 创建 Fragment VNode */
function frag(children: VNode[]): VNode {
  return {
    type: Fragment,
    props: null,
    children,
    key: null,
    ref: null,
    shapeFlag: SF.ARRAY_CHILDREN,
    patchFlag: 0,
    dynamicChildren: null,
    dynamicProps: null,
    component: null,
    el: null,
    anchor: null,
  }
}

// ================================================================
//  测试用例
// ================================================================

describe('SSR Renderer 边界测试', () => {

  // ---- escapeHTML ----
  describe('escapeHTML', () => {
    it('转义 & 字符', () => {
      expect(escapeHTML('a&b')).toBe('a&amp;b')
    })

    it('转义 < 字符', () => {
      expect(escapeHTML('a<b')).toBe('a&lt;b')
    })

    it('转义 > 字符', () => {
      expect(escapeHTML('a>b')).toBe('a&gt;b')
    })

    it('转义双引号', () => {
      expect(escapeHTML('a"b')).toBe('a&quot;b')
    })

    it('转义单引号', () => {
      expect(escapeHTML("a'b")).toBe('a&#39;b')
    })

    it('转义所有特殊字符', () => {
      expect(escapeHTML('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      )
    })

    it('空字符串不变', () => {
      expect(escapeHTML('')).toBe('')
    })

    it('无特殊字符不变', () => {
      expect(escapeHTML('hello world')).toBe('hello world')
    })
  })

  // ---- normalizeClass ----
  describe('normalizeClass', () => {
    it('字符串直接返回', () => {
      expect(normalizeClass('foo bar')).toBe('foo bar')
    })

    it('空值返回空字符串', () => {
      expect(normalizeClass('')).toBe('')
      expect(normalizeClass(null)).toBe('')
      expect(normalizeClass(undefined)).toBe('')
    })

    it('数组形式', () => {
      expect(normalizeClass(['foo', 'bar'])).toBe('foo bar')
    })

    it('数组过滤假值', () => {
      expect(normalizeClass(['foo', '', 'bar', null, false, 0])).toBe('foo bar')
    })

    it('对象形式', () => {
      expect(normalizeClass({ foo: true, bar: false, baz: true })).toBe('foo baz')
    })

    it('混合形式', () => {
      expect(normalizeClass(['foo', { bar: true, baz: false }])).toBe('foo bar')
    })

    it('非对象非数组转为字符串', () => {
      expect(normalizeClass(123)).toBe('123')
    })
  })

  // ---- normalizeStyle ----
  describe('normalizeStyle', () => {
    it('字符串直接返回', () => {
      expect(normalizeStyle('color: red')).toBe('color: red')
    })

    it('空值返回空字符串', () => {
      expect(normalizeStyle('')).toBe('')
      expect(normalizeStyle(null)).toBe('')
    })

    it('对象形式 - 驼峰转 kebab-case', () => {
      expect(normalizeStyle({ color: 'red', fontSize: '14px' })).toBe('color: red; font-size: 14px')
    })

    it('对象形式 - 过滤假值', () => {
      expect(normalizeStyle({ color: 'red', display: '' })).toBe('color: red')
    })

    it('非对象转为字符串', () => {
      expect(normalizeStyle(42)).toBe('42')
    })
  })

  // ---- serializeProp ----
  describe('serializeProp', () => {
    it('普通属性', () => {
      expect(serializeProp('id', 'app')).toBe('id="app"')
    })

    it('事件属性被忽略 (on*)', () => {
      expect(serializeProp('onClick', () => {})).toBe('')
      expect(serializeProp('onMouseEnter', () => {})).toBe('')
    })

    it('事件属性被忽略 (@*)', () => {
      expect(serializeProp('@click', () => {})).toBe('')
    })

    it('key 不序列化', () => {
      expect(serializeProp('key', '123')).toBe('')
    })

    it('ref 不序列化', () => {
      expect(serializeProp('ref', {})).toBe('')
    })

    it('内部属性 __vccOpts 不序列化', () => {
      expect(serializeProp('__vccOpts', {})).toBe('')
    })

    it('__ 前缀属性不序列化', () => {
      expect(serializeProp('__internal', 'val')).toBe('')
    })

    it('布尔属性 true 只输出属性名', () => {
      expect(serializeProp('disabled', true)).toBe('disabled')
    })

    it('布尔属性 false 不输出', () => {
      expect(serializeProp('disabled', false)).toBe('')
    })

    it('null/undefined 不输出', () => {
      expect(serializeProp('data-x', null)).toBe('')
      expect(serializeProp('data-y', undefined)).toBe('')
    })

    it('class 属性', () => {
      expect(serializeProp('class', 'foo bar')).toBe('class="foo bar"')
    })

    it('class 数组形式', () => {
      expect(serializeProp('class', ['a', 'b'])).toBe('class="a b"')
    })

    it('class 对象形式', () => {
      expect(serializeProp('class', { active: true, hidden: false })).toBe('class="active"')
    })

    it('style 属性', () => {
      expect(serializeProp('style', 'color: red')).toBe('style="color: red"')
    })

    it('style 对象形式', () => {
      expect(serializeProp('style', { color: 'red', fontSize: '14px' })).toBe('style="color: red; font-size: 14px"')
    })

    it('dangerouslySetInnerHTML 不序列化到属性', () => {
      expect(serializeProp('dangerouslySetInnerHTML', { __html: '<b>hi</b>' })).toBe('')
    })

    it('innerHTML 不序列化到属性', () => {
      expect(serializeProp('innerHTML', '<b>hi</b>')).toBe('')
    })

    it('data-* 自定义属性', () => {
      expect(serializeProp('data-id', '123')).toBe('data-id="123"')
    })

    it('aria-* 无障碍属性', () => {
      expect(serializeProp('aria-label', 'Close')).toBe('aria-label="Close"')
    })

    it('属性值包含特殊字符时转义', () => {
      expect(serializeProp('title', 'a"b')).toBe('title="a&quot;b"')
    })

    it('数字属性值', () => {
      expect(serializeProp('tabindex', 0)).toBe('tabindex="0"')
    })
  })

  // ---- serializeProps ----
  describe('serializeProps', () => {
    it('null 返回空字符串', () => {
      expect(serializeProps(null)).toBe('')
    })

    it('空对象返回空字符串', () => {
      expect(serializeProps({})).toBe('')
    })

    it('多个属性', () => {
      expect(serializeProps({ id: 'app', class: 'foo' })).toBe(' id="app" class="foo"')
    })

    it('过滤掉事件和内部属性', () => {
      const result = serializeProps({ id: 'app', onClick: () => {}, key: '1', __x: 'y' })
      expect(result).toBe(' id="app"')
    })
  })

  // ---- StringRenderer 类 ----
  describe('StringRenderer', () => {
    it('createElement 创建元素描述对象', () => {
      const renderer = new StringRenderer()
      const vnode = renderer.createElement('div')
      expect(vnode.tag).toBe('div')
      expect(vnode.props).toEqual({})
      expect(vnode.children).toEqual([])
    })

    it('createText 创建文本描述对象', () => {
      const renderer = new StringRenderer()
      const textNode = renderer.createText('Hello')
      expect(textNode.type).toBe('text')
      expect(textNode.value).toBe('Hello')
    })

    it('createComment 创建注释描述对象', () => {
      const renderer = new StringRenderer()
      const commentNode = renderer.createComment('a comment')
      expect(commentNode.type).toBe('comment')
      expect(commentNode.value).toBe('a comment')
    })

    it('insert 插入子节点', () => {
      const renderer = new StringRenderer()
      const parent = renderer.createElement('div')
      const child = renderer.createText('Hello')
      renderer.insert(parent, child)
      expect(parent.children.length).toBe(1)
      expect(parent.children[0]).toBe(child)
    })

    it('renderToString 渲染简单元素', () => {
      const renderer = new StringRenderer()
      const vnode = el('div', null, 'Hello', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderer.renderToString(vnode)).toBe('<div>Hello</div>')
    })

    it('renderToStream 流式渲染', async () => {
      const renderer = new StringRenderer()
      const vnode = el('div', null, 'Hello', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const chunks: string[] = []
      for await (const chunk of renderer.renderToStream(vnode)) {
        chunks.push(chunk)
      }
      expect(chunks.join('')).toBe('<div>Hello</div>')
    })
  })

  // ---- renderToString 独立函数 ----
  describe('renderToString', () => {
    it('null 返回空字符串', () => {
      expect(renderToString(null as any)).toBe('')
    })

    it('undefined 返回空字符串', () => {
      expect(renderToString(undefined as any)).toBe('')
    })

    it('渲染简单元素', () => {
      const vnode = el('div', null, 'Hello', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<div>Hello</div>')
    })

    it('渲染带属性的元素', () => {
      const vnode = el('div', { id: 'app', class: 'container' }, 'Hi', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<div id="app" class="container">Hi</div>')
    })

    it('渲染嵌套元素', () => {
      const vnode = el('div', null, [
        el('span', null, 'Hello', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
        el('span', null, 'World', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
      ])
      expect(renderToString(vnode)).toBe('<div><span>Hello</span><span>World</span></div>')
    })

    it('渲染自闭合标签 (br)', () => {
      const vnode = el('br')
      expect(renderToString(vnode)).toBe('<br />')
    })

    it('渲染自闭合标签 (img)', () => {
      const vnode = el('img', { src: 'test.png', alt: 'test' })
      expect(renderToString(vnode)).toBe('<img src="test.png" alt="test" />')
    })

    it('渲染自闭合标签 (input)', () => {
      const vnode = el('input', { type: 'text', disabled: true })
      expect(renderToString(vnode)).toBe('<input type="text" disabled />')
    })

    it('渲染自闭合标签 (hr)', () => {
      const vnode = el('hr')
      expect(renderToString(vnode)).toBe('<hr />')
    })

    it('渲染 Fragment', () => {
      const vnode = frag([
        el('span', null, 'A', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
        el('span', null, 'B', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
      ])
      expect(renderToString(vnode)).toBe('<span>A</span><span>B</span>')
    })

    it('渲染空 Fragment', () => {
      const vnode = frag([])
      expect(renderToString(vnode)).toBe('')
    })

    it('渲染文本节点', () => {
      const vnode = text('Hello World')
      expect(renderToString(vnode)).toBe('Hello World')
    })

    it('渲染文本节点 - 转义特殊字符', () => {
      const vnode = text('<b>bold</b>')
      expect(renderToString(vnode)).toBe('&lt;b&gt;bold&lt;/b&gt;')
    })

    it('渲染注释节点', () => {
      const vnode = comment('a comment')
      expect(renderToString(vnode)).toBe('<!--a comment-->')
    })

    it('渲染空注释', () => {
      const vnode = comment('')
      expect(renderToString(vnode)).toBe('<!---->')
    })

    it('渲染空文本', () => {
      const vnode = text('')
      expect(renderToString(vnode)).toBe('')
    })

    it('事件属性被忽略', () => {
      const vnode = el('button', { onClick: () => {}, onMouseEnter: () => {} }, 'Click', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<button>Click</button>')
    })

    it('key/ref 不出现在输出中', () => {
      const vnode = el('div', { key: '1', ref: {} }, 'Hi', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<div>Hi</div>')
    })

    it('布尔属性 disabled', () => {
      const vnode = el('input', { disabled: true })
      expect(renderToString(vnode)).toBe('<input disabled />')
    })

    it('布尔属性 false 不输出', () => {
      const vnode = el('input', { disabled: false })
      expect(renderToString(vnode)).toBe('<input />')
    })

    it('class 数组形式', () => {
      const vnode = el('div', { class: ['a', 'b', 'c'] }, 'Hi', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<div class="a b c">Hi</div>')
    })

    it('class 对象形式', () => {
      const vnode = el('div', { class: { active: true, hidden: false } }, 'Hi', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<div class="active">Hi</div>')
    })

    it('style 对象形式', () => {
      const vnode = el('div', { style: { color: 'red', fontSize: '16px' } }, 'Hi', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<div style="color: red; font-size: 16px">Hi</div>')
    })

    it('data-* 自定义属性', () => {
      const vnode = el('div', { 'data-id': '123', 'data-name': 'test' }, 'Hi', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<div data-id="123" data-name="test">Hi</div>')
    })

    it('aria-* 无障碍属性', () => {
      const vnode = el('button', { 'aria-label': 'Close', 'aria-hidden': 'true' }, 'X', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<button aria-label="Close" aria-hidden="true">X</button>')
    })

    it('dangerouslySetInnerHTML', () => {
      const vnode = el('div', { dangerouslySetInnerHTML: { __html: '<b>bold</b>' } })
      expect(renderToString(vnode)).toBe('<div>&lt;b&gt;bold&lt;/b&gt;</div>')
    })

    it('dangerouslySetInnerHTML 直接字符串', () => {
      const vnode = el('div', { dangerouslySetInnerHTML: '<b>bold</b>' })
      expect(renderToString(vnode)).toBe('<div>&lt;b&gt;bold&lt;/b&gt;</div>')
    })

    it('innerHTML', () => {
      const vnode = el('div', { innerHTML: '<em>italic</em>' })
      expect(renderToString(vnode)).toBe('<div>&lt;em&gt;italic&lt;/em&gt;</div>')
    })

    it('数字子节点', () => {
      const vnode = el('span', null, 42, { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<span>42</span>')
    })

    it('无 shapeFlag 的字符串子节点', () => {
      const vnode = { type: 'div', props: null, children: 'Hello' } as VNode
      expect(renderToString(vnode)).toBe('<div>Hello</div>')
    })

    it('无 shapeFlag 的数组子节点', () => {
      const vnode = {
        type: 'div',
        props: null,
        children: [el('span', null, 'A', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })],
      } as VNode
      expect(renderToString(vnode)).toBe('<div><span>A</span></div>')
    })

    it('无 shapeFlag 的数字子节点', () => {
      const vnode = { type: 'span', props: null, children: 99 } as VNode
      expect(renderToString(vnode)).toBe('<span>99</span>')
    })

    it('深层嵌套', () => {
      const vnode = el('div', null, [
        el('section', null, [
          el('article', null, [
            el('p', null, 'Deep', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
          ]),
        ]),
      ])
      expect(renderToString(vnode)).toBe('<div><section><article><p>Deep</p></article></section></div>')
    })

    it('特殊字符在属性中转义', () => {
      const vnode = el('div', { title: 'a"b&c<d>e' }, 'Hi', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<div title="a&quot;b&amp;c&lt;d&gt;e">Hi</div>')
    })

    it('特殊字符在文本中转义', () => {
      const vnode = el('div', null, '<script>alert("xss")</script>', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      expect(renderToString(vnode)).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>')
    })

    it('函数式组件', () => {
      const MyComp = (props: any) => el('h1', null, props.title, { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const vnode = {
        type: MyComp,
        props: { title: 'Hello' },
        children: null,
        key: null,
        ref: null,
        shapeFlag: SF.FUNCTIONAL_COMPONENT,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      expect(renderToString(vnode)).toBe('<h1>Hello</h1>')
    })

    it('有状态组件（对象带 render）', () => {
      const MyComp = {
        render(props: any) {
          return el('h2', null, props.msg, { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
        },
      }
      const vnode = {
        type: MyComp,
        props: { msg: 'Stateful' },
        children: null,
        key: null,
        ref: null,
        shapeFlag: SF.STATEFUL_COMPONENT,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      expect(renderToString(vnode)).toBe('<h2>Stateful</h2>')
    })

    it('有状态组件（setup 返回渲染函数）', () => {
      const MyComp = {
        setup(props: any) {
          return () => el('h3', null, props.text, { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
        },
      }
      const vnode = {
        type: MyComp,
        props: { text: 'Setup' },
        children: null,
        key: null,
        ref: null,
        shapeFlag: SF.STATEFUL_COMPONENT,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      expect(renderToString(vnode)).toBe('<h3>Setup</h3>')
    })

    it('嵌套组件', () => {
      const Child = {
        render() {
          return el('span', null, 'Child', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
        },
      }
      const Parent = {
        render() {
          return el('div', null, [
            {
              type: Child,
              props: {},
              children: null,
              key: null,
              ref: null,
              shapeFlag: SF.STATEFUL_COMPONENT,
              patchFlag: 0,
              dynamicChildren: null,
              dynamicProps: null,
              component: null,
              el: null,
              anchor: null,
            } as VNode,
          ])
        },
      }
      const vnode = {
        type: Parent,
        props: {},
        children: null,
        key: null,
        ref: null,
        shapeFlag: SF.STATEFUL_COMPONENT,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      expect(renderToString(vnode)).toBe('<div><span>Child</span></div>')
    })

    it('条件渲染 - 真值', () => {
      const show = true
      const vnode = el('div', null, [
        show ? el('p', null, 'Visible', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }) : null,
      ])
      expect(renderToString(vnode)).toBe('<div><p>Visible</p></div>')
    })

    it('条件渲染 - 假值', () => {
      const show = false
      const vnode = el('div', null, [
        show ? el('p', null, 'Hidden', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }) : null,
      ])
      expect(renderToString(vnode)).toBe('<div></div>')
    })

    it('列表渲染', () => {
      const items = ['a', 'b', 'c']
      const vnode = el('ul', null, items.map(item =>
        el('li', null, item, { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      ))
      expect(renderToString(vnode)).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>')
    })

    it('空列表渲染', () => {
      const vnode = el('ul', null, [])
      expect(renderToString(vnode)).toBe('<ul></ul>')
    })

    it('插槽渲染 - 函数形式', () => {
      const vnode = el('div', null, null, {
        shapeFlag: SF.ELEMENT | SF.SLOTS_CHILDREN,
      })
      // 手动设置 children 为 slots 对象
      vnode.children = {
        default: () => [el('span', null, 'Slot Content', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })],
        header: () => [el('header', null, 'Header', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })],
      }
      expect(renderToString(vnode)).toBe('<div><span>Slot Content</span><header>Header</header></div>')
    })

    it('插槽渲染 - 数组形式', () => {
      const vnode = el('div', null, null, {
        shapeFlag: SF.ELEMENT | SF.SLOTS_CHILDREN,
      })
      vnode.children = {
        default: [el('span', null, 'Direct', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })],
      }
      expect(renderToString(vnode)).toBe('<div><span>Direct</span></div>')
    })

    it('插槽渲染 - 单个 VNode', () => {
      const vnode = el('div', null, null, {
        shapeFlag: SF.ELEMENT | SF.SLOTS_CHILDREN,
      })
      vnode.children = {
        default: el('p', null, 'Single', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
      }
      expect(renderToString(vnode)).toBe('<div><p>Single</p></div>')
    })

    it('Island 组件渲染', () => {
      const IslandComp = {
        name: 'MyIsland',
        __island: true,
        __islandTag: 'div',
        render(props: any) {
          return el('span', null, props.content, { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
        },
      }
      const vnode = {
        type: IslandComp,
        props: { content: 'Island', 'data-hydrate-when': 'visible' },
        children: null,
        key: null,
        ref: null,
        shapeFlag: SF.STATEFUL_COMPONENT,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      const html = renderToString(vnode)
      expect(html).toContain('data-hydrate="MyIsland"')
      expect(html).toContain('data-props=')
      expect(html).toContain('data-hydrate-when="visible"')
      expect(html).toContain('<span>Island</span>')
      expect(html).toContain('<script type="application/json"')
    })

    it('Island 组件 - 函数式', () => {
      const IslandFn = {
        name: 'FnIsland',
        __island: true,
        __islandTag: 'section',
      }
      const vnode = {
        type: (() => el('p', null, 'FnIsland', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })) as any,
        props: {},
        children: null,
        key: null,
        ref: null,
        shapeFlag: 0,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      // Override type to be the island object
      ;(vnode as any).type = IslandFn
      const html = renderToString(vnode)
      expect(html).toContain('data-hydrate="FnIsland"')
    })

    it('已挂载组件（vnode.component.subTree）', () => {
      const subTree = el('main', null, 'SubTree', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const vnode = {
        type: {},
        props: null,
        children: null,
        key: null,
        ref: null,
        shapeFlag: 0,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: { subTree },
        el: null,
        anchor: null,
      } as VNode
      expect(renderToString(vnode)).toBe('<main>SubTree</main>')
    })

    it('无法识别的组件返回空注释', () => {
      const vnode = {
        type: { noRender: true },
        props: null,
        children: null,
        key: null,
        ref: null,
        shapeFlag: 0,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      expect(renderToString(vnode)).toBe('<!---->')
    })

    it('未知 type 返回空字符串', () => {
      const vnode = {
        type: 123,
        props: null,
        children: null,
        key: null,
        ref: null,
        shapeFlag: 0,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      expect(renderToString(vnode)).toBe('')
    })
  })

  // ---- renderToStream ----
  describe('renderToStream', () => {
    it('流式渲染简单元素', async () => {
      const vnode = el('div', null, 'Hello', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<div>Hello</div>')
    })

    it('流式渲染 null', async () => {
      const stream = renderToStream(null as any)
      const reader = stream.getReader()
      const { done } = await reader.read()
      expect(done).toBe(true)
    })

    it('流式渲染 Fragment', async () => {
      const vnode = frag([
        el('a', null, '1', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
        el('b', null, '2', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
      ])
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<a>1</a><b>2</b>')
    })

    it('流式渲染文本节点', async () => {
      const vnode = text('Stream Text')
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('Stream Text')
    })

    it('流式渲染注释节点', async () => {
      const vnode = comment('stream comment')
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<!--stream comment-->')
    })

    it('流式渲染自闭合标签', async () => {
      const vnode = el('br')
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<br />')
    })

    it('流式渲染组件', async () => {
      const MyComp = {
        render() {
          return el('p', null, 'Streamed Component', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
        },
      }
      const vnode = {
        type: MyComp,
        props: {},
        children: null,
        key: null,
        ref: null,
        shapeFlag: SF.STATEFUL_COMPONENT,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<p>Streamed Component</p>')
    })

    it('流式渲染函数式组件', async () => {
      const FnComp = () => el('em', null, 'Functional', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const vnode = {
        type: FnComp,
        props: {},
        children: null,
        key: null,
        ref: null,
        shapeFlag: SF.FUNCTIONAL_COMPONENT,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<em>Functional</em>')
    })

    it('流式渲染 dangerouslySetInnerHTML', async () => {
      const vnode = el('div', { dangerouslySetInnerHTML: { __html: '<b>bold</b>' } })
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<div>&lt;b&gt;bold&lt;/b&gt;</div>')
    })

    it('流式渲染嵌套元素', async () => {
      const vnode = el('div', null, [
        el('header', null, 'H', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
        el('footer', null, 'F', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
      ])
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<div><header>H</header><footer>F</footer></div>')
    })

    it('使用自定义 suspenseIdPrefix', async () => {
      const vnode = el('div', null, 'Test', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const stream = renderToStream(vnode, { suspenseIdPrefix: 'custom' })
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<div>Test</div>')
    })
  })

  // ---- renderToStreamGenerator ----
  describe('renderToStreamGenerator', () => {
    it('异步生成器渲染', async () => {
      const vnode = el('div', null, 'Gen', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const chunks: string[] = []
      for await (const chunk of renderToStreamGenerator(vnode)) {
        chunks.push(chunk)
      }
      expect(chunks.join('')).toBe('<div>Gen</div>')
    })

    it('异步生成器渲染 null', async () => {
      const chunks: string[] = []
      for await (const chunk of renderToStreamGenerator(null as any)) {
        chunks.push(chunk)
      }
      expect(chunks.length).toBe(0)
    })

    it('异步生成器渲染 Fragment', async () => {
      const vnode = frag([
        el('x', null, '1', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
        el('y', null, '2', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
      ])
      const chunks: string[] = []
      for await (const chunk of renderToStreamGenerator(vnode)) {
        chunks.push(chunk)
      }
      expect(chunks.join('')).toBe('<x>1</x><y>2</y>')
    })
  })

  // ---- Suspense 流式渲染 ----
  describe('Suspense 流式渲染', () => {
    it('同步 Suspense 直接渲染子节点', async () => {
      const SuspenseComp = { name: 'Suspense', _isSuspense: true }
      const child = el('div', null, 'No Async', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const vnode = {
        type: SuspenseComp,
        props: {},
        children: [child],
        key: null,
        ref: null,
        shapeFlag: 0,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<div>No Async</div>')
    })

    it('Suspense 带 fallback 但无异步子节点', async () => {
      const SuspenseComp = { name: 'Suspense', _isSuspense: true }
      const child = el('div', null, 'Sync', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const fallback = el('div', null, 'Loading...', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const vnode = {
        type: SuspenseComp,
        props: { fallback },
        children: [child],
        key: null,
        ref: null,
        shapeFlag: 0,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      // 无异步子节点，直接渲染真实内容
      expect(chunks.join('')).toBe('<div>Sync</div>')
    })

    it('Suspense fallback 为字符串', async () => {
      const SuspenseComp = { name: 'Suspense', _isSuspense: true }
      const child = el('div', null, 'Content', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })
      const vnode = {
        type: SuspenseComp,
        props: { fallback: 'Loading...' },
        children: [child],
        key: null,
        ref: null,
        shapeFlag: 0,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<div>Content</div>')
    })

    it('Suspense 子节点为 slots 对象', async () => {
      const SuspenseComp = { name: 'Suspense', _isSuspense: true }
      const vnode = {
        type: SuspenseComp,
        props: {},
        children: {
          default: () => [el('div', null, 'Slot Content', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN })],
        },
        key: null,
        ref: null,
        shapeFlag: 0,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<div>Slot Content</div>')
    })

    it('异步组件加载失败输出错误注释', async () => {
      const AsyncComp = { _isAsyncComponent: true, __asyncPromise: Promise.reject(new Error('fail')) }
      const vnode = {
        type: AsyncComp,
        props: {},
        children: null,
        key: null,
        ref: null,
        shapeFlag: 0,
        patchFlag: 0,
        dynamicChildren: null,
        dynamicProps: null,
        component: null,
        el: null,
        anchor: null,
      } as VNode
      const stream = renderToStream(vnode)
      const reader = stream.getReader()
      const chunks: string[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      expect(chunks.join('')).toBe('<!--async-component-error-->')
    })
  })

  // ---- ssrRenderer 默认实例 ----
  describe('ssrRenderer 默认实例', () => {
    it('是 StringRenderer 实例', () => {
      expect(ssrRenderer instanceof StringRenderer).toBe(true)
    })
  })

  // ---- 综合场景 ----
  describe('综合场景', () => {
    it('完整页面渲染', () => {
      const vnode = el('html', null, [
        el('head', null, [
          el('title', null, 'Test Page', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
        ]),
        el('body', null, [
          el('div', { id: 'app', class: ['container', { dark: true }] }, [
            el('h1', null, 'Hello SSR', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
            el('p', { style: { color: 'blue', fontSize: '18px' } }, 'Paragraph', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
            el('ul', null, [
              el('li', null, 'Item 1', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
              el('li', null, 'Item 2', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
            ]),
            el('img', { src: 'photo.jpg', alt: 'A photo' }),
            el('input', { type: 'text', placeholder: 'Type here' }),
          ]),
        ]),
      ])
      const html = renderToString(vnode)
      expect(html).toContain('<html>')
      expect(html).toContain('<title>Test Page</title>')
      expect(html).toContain('<div id="app" class="container dark">')
      expect(html).toContain('<h1>Hello SSR</h1>')
      expect(html).toContain('style="color: blue; font-size: 18px"')
      expect(html).toContain('<img src="photo.jpg" alt="A photo" />')
      expect(html).toContain('<input type="text" placeholder="Type here" />')
      expect(html).toContain('</html>')
    })

    it('多根节点 Fragment 作为根', () => {
      const vnode = frag([
        el('header', null, 'Header', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
        el('main', null, 'Main', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
        el('footer', null, 'Footer', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
      ])
      expect(renderToString(vnode)).toBe(
        '<header>Header</header><main>Main</main><footer>Footer</footer>'
      )
    })

    it('混合内容 Fragment', () => {
      const vnode = frag([
        text('Text node'),
        el('br'),
        comment('a comment'),
        el('span', null, 'After', { shapeFlag: SF.ELEMENT | SF.TEXT_CHILDREN }),
      ])
      expect(renderToString(vnode)).toBe(
        'Text node<br /><!--a comment--><span>After</span>'
      )
    })
  })
})
