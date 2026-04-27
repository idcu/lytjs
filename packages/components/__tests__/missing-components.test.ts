/**
 * @lytjs/components - 缺失组件单元测试
 *
 * 测试 7 个缺失测试的组件：Icon, Link, Container, Divider, Breadcrumb, Spin, Empty。
 * 验证组件定义完整性、props 默认值、VNode 创建、验证器和边界情况。
 * 使用 @lytjs/test-utils 统一测试框架。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import { h } from '../../core/src/h.ts'

import { Icon } from '../src/base/icon.ts'
import { Link } from '../src/base/link.ts'
import { Container } from '../src/base/container.ts'
import { Divider } from '../src/base/divider.ts'
import { Breadcrumb } from '../src/navigation/breadcrumb.ts'
import { Spin } from '../src/data-display/spin.ts'
import { Empty } from '../src/data-display/empty.ts'

// ================================================================
// DOM 模拟环境
// ================================================================

const mockStyleProps: Record<string, string> = {}
let mockIdCounter = 0

const mockDocument = {
  createElement(tag: string) {
    const el: any = {
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      textContent: '',
      style: { ...mockStyleProps },
      childNodes: [] as any[],
      children: [] as any[],
      parentNode: null as any,
      id: '',
      appendChild(child: any) {
        this.childNodes.push(child)
        this.children.push(child)
        child.parentNode = this
        return child
      },
      removeChild(child: any) {
        const idx = this.childNodes.indexOf(child)
        if (idx > -1) {
          this.childNodes.splice(idx, 1)
          this.children.splice(idx, 1)
          child.parentNode = null
        }
        return child
      },
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      getAttribute() { return null },
      classList: { add() {}, remove() {}, contains() { return false } },
      querySelector() { return null },
      querySelectorAll() { return [] },
    }
    el.id = `mock-el-${++mockIdCounter}`
    return el
  },
  documentElement: {
    style: mockStyleProps,
    setProperty(key: string, value: string) { mockStyleProps[key] = value },
    getPropertyValue(key: string) { return mockStyleProps[key] || '' },
  },
  body: null as any,
  head: null as any,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true },
}

mockDocument.body = mockDocument.createElement('body')
mockDocument.head = mockDocument.createElement('head')
;(globalThis as any).document = mockDocument
;(globalThis as any).window = {
  document: mockDocument,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true },
  getComputedStyle() {
    return { getPropertyValue(key: string) { return mockStyleProps[key] || '' } }
  },
  requestAnimationFrame(fn: Function) { return setTimeout(fn, 0) },
  cancelAnimationFrame() {},
  setTimeout,
  clearTimeout,
  console,
}

// ================================================================
// 辅助函数
// ================================================================

function expectComponentDefinition(comp: any, name: string) {
  expect(comp).toBeDefined()
  expect(comp._isComponentDefine).toBe(true)
  expect(comp.name).toBe(name)
  expect(comp.options).toBeDefined()
  expect(typeof comp.options).toBe('object')
}

function expectHasProps(comp: any) {
  expect(comp.options.props).toBeDefined()
  expect(typeof comp.options.props).toBe('object')
  expect(Object.keys(comp.options.props).length).toBeGreaterThan(0)
}

function expectHasTemplate(comp: any) {
  expect(comp.options.template).toBeDefined()
  expect(typeof comp.options.template).toBe('string')
  expect(comp.options.template.length).toBeGreaterThan(0)
}

function expectHasStyles(comp: any) {
  expect(comp.options.styles).toBeDefined()
  expect(typeof comp.options.styles).toBe('string')
  expect(comp.options.styles.length).toBeGreaterThan(0)
}

function expectHasSetup(comp: any) {
  expect(comp.options.setup).toBeDefined()
  expect(typeof comp.options.setup).toBe('function')
}

// ================================================================
// Icon 组件测试
// ================================================================

describe('Icon 组件', () => {
  it('Icon 组件定义完整（有 props/template/styles/setup）', () => {
    expectComponentDefinition(Icon, 'LytIcon')
    expectHasProps(Icon)
    expectHasTemplate(Icon)
    expectHasStyles(Icon)
    expectHasSetup(Icon)
  })

  it('Icon props 默认值正确', () => {
    const props = Icon.options.props
    expect(props.name.default).toBe('')
    expect(props.size.default).toBe('16px')
    expect(props.color.default).toBe('')
    expect(props.spin.default).toBe(false)
  })

  it('Icon 可创建 VNode', () => {
    const vnode = h(Icon, { name: 'search', size: '24px' })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Icon)
    expect(vnode.props).toBeDefined()
  })

  it('Icon 支持自定义颜色和旋转', () => {
    const vnode = h(Icon, { name: 'loading', color: '#ff0000', spin: true })
    expect(vnode.props.color).toBe('#ff0000')
    expect(vnode.props.spin).toBe(true)
  })

  it('Icon 不传 name 时使用默认空字符串', () => {
    const vnode = h(Icon, {})
    expect(vnode.props.name).toBeUndefined()
    // 默认值由组件内部处理，VNode 层面不传 name 即可
    expect(vnode.type).toBe(Icon)
  })

  it('Icon 模板包含 lyt-icon 基础类名', () => {
    const template = Icon.options.template
    expect(template).toContain('lyt-icon')
    expect(template).toContain('lyt-icon--spin')
  })
})

// ================================================================
// Link 组件测试
// ================================================================

describe('Link 组件', () => {
  it('Link 组件定义完整（有 props/template/styles/setup）', () => {
    expectComponentDefinition(Link, 'LytLink')
    expectHasProps(Link)
    expectHasTemplate(Link)
    expectHasStyles(Link)
    expectHasSetup(Link)
  })

  it('Link props 默认值正确', () => {
    const props = Link.options.props
    expect(props.href.default).toBe('')
    expect(props.target.default).toBe('_self')
    expect(props.type.default).toBe('default')
    expect(props.underline.default).toBe(false)
    expect(props.disabled.default).toBe(false)
  })

  it('Link 可创建 VNode', () => {
    const vnode = h(Link, { href: 'https://example.com', type: 'primary' })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Link)
    expect(vnode.props.href).toBe('https://example.com')
  })

  it('Link type 验证器包含所有类型', () => {
    const validator = Link.options.props.type.validator
    expect(validator('default')).toBe(true)
    expect(validator('primary')).toBe(true)
    expect(validator('success')).toBe(true)
    expect(validator('warning')).toBe(true)
    expect(validator('danger')).toBe(true)
    expect(validator('info')).toBe(true)
    expect(validator('invalid')).toBe(false)
  })

  it('Link 支持 underline 和 disabled 属性', () => {
    const vnode = h(Link, { underline: true, disabled: true })
    expect(vnode.props.underline).toBe(true)
    expect(vnode.props.disabled).toBe(true)
  })

  it('Link 支持 target 属性', () => {
    const vnode = h(Link, { href: '/page', target: '_blank' })
    expect(vnode.props.target).toBe('_blank')
  })
})

// ================================================================
// Container 组件测试
// ================================================================

describe('Container 组件', () => {
  it('Container 组件定义完整（有 props/template/styles/setup）', () => {
    expectComponentDefinition(Container, 'LytContainer')
    expectHasProps(Container)
    expectHasTemplate(Container)
    expectHasStyles(Container)
    expectHasSetup(Container)
  })

  it('Container props 默认值正确', () => {
    const props = Container.options.props
    expect(props.maxWidth.default).toBe('1200px')
    expect(props.padding.default).toBe('0')
    expect(props.center.default).toBe(true)
  })

  it('Container 可创建 VNode', () => {
    const vnode = h(Container, { maxWidth: '960px', padding: '20px' })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Container)
    expect(vnode.props.maxWidth).toBe('960px')
  })

  it('Container 支持 center 属性', () => {
    const vnode = h(Container, { center: false })
    expect(vnode.props.center).toBe(false)
  })

  it('Container 模板包含 lyt-container 类名', () => {
    const template = Container.options.template
    expect(template).toContain('lyt-container')
    expect(template).toContain('containerStyle()')
  })

  it('Container 使用默认值创建 VNode', () => {
    const vnode = h(Container, {})
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Container)
  })
})

// ================================================================
// Divider 组件测试
// ================================================================

describe('Divider 组件', () => {
  it('Divider 组件定义完整（有 props/template/styles/setup）', () => {
    expectComponentDefinition(Divider, 'LytDivider')
    expectHasProps(Divider)
    expectHasTemplate(Divider)
    expectHasStyles(Divider)
    expectHasSetup(Divider)
  })

  it('Divider props 默认值正确', () => {
    const props = Divider.options.props
    expect(props.direction.default).toBe('horizontal')
    expect(props.contentPosition.default).toBe('center')
    expect(props.dashed.default).toBe(false)
  })

  it('Divider 可创建 VNode', () => {
    const vnode = h(Divider, { direction: 'horizontal' })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Divider)
  })

  it('Divider direction 验证器包含 horizontal/vertical', () => {
    const validator = Divider.options.props.direction.validator
    expect(validator('horizontal')).toBe(true)
    expect(validator('vertical')).toBe(true)
    expect(validator('invalid')).toBe(false)
  })

  it('Divider contentPosition 验证器包含 left/center/right', () => {
    const validator = Divider.options.props.contentPosition.validator
    expect(validator('left')).toBe(true)
    expect(validator('center')).toBe(true)
    expect(validator('right')).toBe(true)
    expect(validator('invalid')).toBe(false)
  })

  it('Divider 支持 dashed 虚线样式', () => {
    const vnode = h(Divider, { dashed: true, direction: 'vertical' })
    expect(vnode.props.dashed).toBe(true)
    expect(vnode.props.direction).toBe('vertical')
  })

  it('Divider 模板包含条件渲染逻辑', () => {
    const template = Divider.options.template
    expect(template).toContain('lyt-divider')
    expect(template).toContain('lyt-divider--{direction}')
    expect(template).toContain('lyt-divider--vertical')
    expect(template).toContain('lyt-divider--dashed')
  })
})

// ================================================================
// Breadcrumb 组件测试
// ================================================================

describe('Breadcrumb 组件', () => {
  it('Breadcrumb 组件定义完整（有 props/template/styles/setup）', () => {
    expectComponentDefinition(Breadcrumb, 'LytBreadcrumb')
    expectHasProps(Breadcrumb)
    expectHasTemplate(Breadcrumb)
    expectHasStyles(Breadcrumb)
    expectHasSetup(Breadcrumb)
  })

  it('Breadcrumb props 默认值正确', () => {
    const props = Breadcrumb.options.props
    expect(props.separator.default).toBe('/')
    const defaultItems = props.items.default()
    expect(Array.isArray(defaultItems)).toBe(true)
    expect(defaultItems).toHaveLength(0)
  })

  it('Breadcrumb 可创建 VNode', () => {
    const items = [
      { label: '首页', href: '/' },
      { label: '列表', href: '/list' },
      { label: '详情' },
    ]
    const vnode = h(Breadcrumb, { items, separator: '>' })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Breadcrumb)
    expect(vnode.props.items).toHaveLength(3)
  })

  it('Breadcrumb items prop 类型为 Array', () => {
    const props = Breadcrumb.options.props
    expect(props.items.type).toBe(Array)
  })

  it('Breadcrumb 支持自定义分隔符', () => {
    const vnode = h(Breadcrumb, { items: [], separator: '-' })
    expect(vnode.props.separator).toBe('-')
  })

  it('Breadcrumb 模板包含 aria-label 无障碍属性', () => {
    const template = Breadcrumb.options.template
    expect(template).toContain('aria-label="Breadcrumb"')
    expect(template).toContain('lyt-breadcrumb')
    expect(template).toContain('lyt-breadcrumb__item')
  })

  it('Breadcrumb 模板包含最后一项不渲染分隔符的逻辑', () => {
    const template = Breadcrumb.options.template
    expect(template).toContain('isLast')
    expect(template).toContain('lyt-breadcrumb__separator')
  })
})

// ================================================================
// Spin 组件测试
// ================================================================

describe('Spin 组件', () => {
  it('Spin 组件定义完整（有 props/template/styles/setup）', () => {
    expectComponentDefinition(Spin, 'LytSpin')
    expectHasProps(Spin)
    expectHasTemplate(Spin)
    expectHasStyles(Spin)
    expectHasSetup(Spin)
  })

  it('Spin props 默认值正确', () => {
    const props = Spin.options.props
    expect(props.spinning.default).toBe(true)
    expect(props.size.default).toBe('default')
    expect(props.tip.default).toBe('')
    expect(props.delay.default).toBe(0)
  })

  it('Spin 可创建 VNode', () => {
    const vnode = h(Spin, { spinning: true, tip: '加载中...' })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Spin)
    expect(vnode.props.spinning).toBe(true)
  })

  it('Spin size 验证器包含 small/default/large', () => {
    const validator = Spin.options.props.size.validator
    expect(validator('small')).toBe(true)
    expect(validator('default')).toBe(true)
    expect(validator('large')).toBe(true)
    expect(validator('invalid')).toBe(false)
  })

  it('Spin 支持 delay 延迟显示', () => {
    const vnode = h(Spin, { spinning: true, delay: 500 })
    expect(vnode.props.delay).toBe(500)
  })

  it('Spin 模板包含加载图标和提示文字', () => {
    const template = Spin.options.template
    expect(template).toContain('lyt-spin')
    expect(template).toContain('lyt-spin--spinning')
    expect(template).toContain('lyt-spin__icon')
    expect(template).toContain('lyt-spin__tip')
    expect(template).toContain('lyt-spin__content')
  })

  it('Spin 使用默认值创建 VNode', () => {
    const vnode = h(Spin, {})
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Spin)
  })
})

// ================================================================
// Empty 组件测试
// ================================================================

describe('Empty 组件', () => {
  it('Empty 组件定义完整（有 props/template/styles/setup）', () => {
    expectComponentDefinition(Empty, 'LytEmpty')
    expectHasProps(Empty)
    expectHasTemplate(Empty)
    expectHasStyles(Empty)
    expectHasSetup(Empty)
  })

  it('Empty props 默认值正确', () => {
    const props = Empty.options.props
    expect(props.description.default).toBe('暂无数据')
    expect(props.image.default).toBe('')
  })

  it('Empty 可创建 VNode', () => {
    const vnode = h(Empty, { description: '没有找到相关内容' })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Empty)
    expect(vnode.props.description).toBe('没有找到相关内容')
  })

  it('Empty 支持自定义图片', () => {
    const vnode = h(Empty, { image: '/empty.png', description: '空空如也' })
    expect(vnode.props.image).toBe('/empty.png')
    expect(vnode.props.description).toBe('空空如也')
  })

  it('Empty 使用默认值创建 VNode', () => {
    const vnode = h(Empty, {})
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Empty)
  })

  it('Empty 模板包含默认占位 SVG', () => {
    const template = Empty.options.template
    expect(template).toContain('lyt-empty')
    expect(template).toContain('lyt-empty__image')
    expect(template).toContain('lyt-empty__description')
    expect(template).toContain('lyt-empty__image-placeholder')
    expect(template).toContain('lyt-empty__footer')
  })
})

// ================================================================
// 跨组件验证
// ================================================================

describe('缺失组件 - 跨组件验证', () => {
  it('所有 7 个组件均有 _isComponentDefine 标记', () => {
    const components = [Icon, Link, Container, Divider, Breadcrumb, Spin, Empty]
    components.forEach(comp => {
      expect(comp._isComponentDefine).toBe(true)
    })
  })

  it('所有 7 个组件均有 setup 函数', () => {
    const components = [Icon, Link, Container, Divider, Breadcrumb, Spin, Empty]
    components.forEach(comp => {
      expect(comp.options.setup).toBeDefined()
      expect(typeof comp.options.setup).toBe('function')
    })
  })

  it('所有 7 个组件均有 styles 定义', () => {
    const components = [Icon, Link, Container, Divider, Breadcrumb, Spin, Empty]
    components.forEach(comp => {
      expect(comp.options.styles).toBeDefined()
      expect(typeof comp.options.styles).toBe('string')
      expect(comp.options.styles.length).toBeGreaterThan(0)
    })
  })

  it('所有 7 个组件均可通过 h() 创建 VNode', () => {
    const testCases = [
      { comp: Icon, props: { name: 'test' } },
      { comp: Link, props: { href: '/test' } },
      { comp: Container, props: {} },
      { comp: Divider, props: {} },
      { comp: Breadcrumb, props: { items: [] } },
      { comp: Spin, props: {} },
      { comp: Empty, props: {} },
    ]
    testCases.forEach(({ comp, props }) => {
      const vnode = h(comp, props)
      expect(vnode).toBeDefined()
      expect(vnode.type).toBe(comp)
    })
  })

  it('所有 7 个组件的 name 均以 Lyt 开头', () => {
    const components = [Icon, Link, Container, Divider, Breadcrumb, Spin, Empty]
    components.forEach(comp => {
      expect(comp.name.startsWith('Lyt')).toBe(true)
    })
  })
})
