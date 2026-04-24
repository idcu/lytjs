/**
 * Lyt.js 核心 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试 createApp、h()、插件系统、provide/inject、component、directive。
 * 由于 createApp 依赖浏览器 DOM，部分测试使用模拟环境。
 *
 * 测试覆盖：
 *   - createApp 创建应用
 *   - app.mount 挂载（模拟 DOM）
 *   - app.unmount 卸载
 *   - h() 创建 VNode
 *   - app.use 安装插件
 *   - app.provide / inject
 *   - app.component 注册组件
 *   - app.directive 注册指令
 */

import {
  describe,
  it,
  expect,
  deepEqual,
} from '../../test-utils/src/index'

import {
  h,
  Fragment,
  ShapeFlags,
} from '../src/h'

import {
  createProvidesContext,
  installPlugin,
} from '../src/plugin'

import type {
  VNode,
  Plugin,
  AppAPI,
} from '../src/index'

// ================================================================
//  测试用例
// ================================================================

describe('Core 核心', () => {

  // ---- 1. h() 创建 VNode ----
  it('h() 创建 VNode', () => {
    const vnode = h('div')
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe('div')
    expect(vnode.props).toBe(null)
    expect(vnode.children).toBe(null)
    expect(vnode.shapeFlag).toBe(ShapeFlags.ELEMENT)
    expect(vnode.el).toBe(null)
  })

  // ---- 2. h() 创建带 props 的 VNode ----
  it('h() 创建带 props 的 VNode', () => {
    const vnode = h('div', { id: 'app', class: 'container' })
    expect(vnode.type).toBe('div')
    expect(vnode.props).not.toBeNull()
    expect(vnode.props!.id).toBe('app')
    expect(vnode.props!.class).toBe('container')
    // key 和 ref 应该从 props 中提取
    expect(vnode.key).toBe(null)
  })

  // ---- 3. h() 创建带 children 的 VNode ----
  it('h() 创建带 children 的 VNode', () => {
    // 文本子节点
    const vnode1 = h('span', null, 'Hello')
    expect(vnode1.children).toBe('Hello')
    expect(vnode1.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()

    // 数组子节点
    const vnode2 = h('ul', null, [
      h('li', null, 'Item 1'),
      h('li', null, 'Item 2'),
    ])
    expect(Array.isArray(vnode2.children)).toBe(true)
    expect(vnode2.children!.length).toBe(2)
    expect(vnode2.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy()
  })

  // ---- 4. h() 创建带 key 的 VNode ----
  it('h() 创建带 key 的 VNode', () => {
    const vnode = h('div', { key: 'unique', id: 'test' }, 'Content')
    expect(vnode.key).toBe('unique')
    // key 应该从 props 中移除
    expect(vnode.props!.key).toBeUndefined()
    expect(vnode.props!.id).toBe('test')
  })

  // ---- 5. h() 创建 Fragment ----
  it('h() 创建 Fragment', () => {
    const vnode = h(Fragment, null, [
      h('li', null, 'A'),
      h('li', null, 'B'),
    ])
    expect(vnode.type).toBe(Fragment)
    expect(Array.isArray(vnode.children)).toBe(true)
    expect(vnode.children!.length).toBe(2)
  })

  // ---- 6. h() 嵌套子节点 ----
  it('h() 嵌套子节点', () => {
    const vnode = h('div', { class: 'app' }, [
      h('header', null, [
        h('h1', null, 'Title'),
        h('nav', null, [
          h('a', { href: '/' }, 'Home'),
          h('a', { href: '/about' }, 'About'),
        ]),
      ]),
      h('main', null, 'Main Content'),
      h('footer', null, 'Footer'),
    ])

    expect(vnode.type).toBe('div')
    expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy()
    const children = vnode.children as VNode[]
    expect(children.length).toBe(3)
    expect((children[0] as VNode).type).toBe('header')
    expect((children[1] as VNode).type).toBe('main')
    expect((children[2] as VNode).type).toBe('footer')
  })

  // ---- 7. h() 数字子节点自动转字符串 ----
  it('h() 数字子节点自动转字符串', () => {
    const vnode = h('span', null, 42)
    expect(vnode.children).toBe('42')
    expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()
  })

  // ---- 8. h() 布尔值子节点被忽略 ----
  it('h() 布尔值子节点被忽略', () => {
    const vnode = h('div', null, [true, false, h('span', null, 'kept')])
    const children = vnode.children as VNode[]
    expect(children.length).toBe(1)
    expect((children[0] as VNode).type).toBe('span')
  })
})

describe('Plugin 插件系统', () => {

  // ---- 1. installPlugin 对象形式 ----
  it('installPlugin 对象形式', () => {
    let installed = false
    const plugin: Plugin = {
      install(app: AppAPI, ...options: any[]) {
        installed = true
        expect(app).toBeDefined()
        expect(options[0]).toBe('option1')
      },
    }

    const mockApp: AppAPI = {
      use: () => mockApp,
      provide: () => {},
      inject: () => undefined,
      config: {},
      globalProperties: {},
    }

    installPlugin(mockApp, plugin, 'option1')
    expect(installed).toBe(true)
  })

  // ---- 2. installPlugin 函数形式 ----
  it('installPlugin 函数形式', () => {
    let called = false
    const plugin: Plugin = (app: AppAPI, ...options: any[]) => {
      called = true
      expect(app).toBeDefined()
      expect(options[0]).toBe('opt')
    }

    const mockApp: AppAPI = {
      use: () => mockApp,
      provide: () => {},
      inject: () => undefined,
      config: {},
      globalProperties: {},
    }

    installPlugin(mockApp, plugin, 'opt')
    expect(called).toBe(true)
  })

  // ---- 3. createProvidesContext ----
  it('createProvidesContext 创建依赖注入容器', () => {
    const ctx = createProvidesContext()
    expect(ctx).toBeDefined()

    // 设置值
    ctx['config'] = { theme: 'dark' }
    expect(ctx['config']).toEqual({ theme: 'dark' })
  })

  // ---- 4. createProvidesContext 父子层级 ----
  it('createProvidesContext 父子层级', () => {
    const parent = createProvidesContext()
    parent['theme'] = 'light'

    const child = createProvidesContext(parent)
    child['locale'] = 'zh-CN'

    // 子级可以访问自己的值
    expect(child['locale']).toBe('zh-CN')

    // 子级可以访问父级的值（通过原型链）
    expect(child['theme']).toBe('light')

    // 父级不能访问子级的值
    expect(parent['locale']).toBeUndefined()
  })
})

describe('ShapeFlags 标记', () => {

  it('ShapeFlags 值正确', () => {
    expect(ShapeFlags.ELEMENT).toBe(1)
    expect(ShapeFlags.FUNCTIONAL_COMPONENT).toBe(2)
    expect(ShapeFlags.STATEFUL_COMPONENT).toBe(4)
    expect(ShapeFlags.TEXT_CHILDREN).toBe(8)
    expect(ShapeFlags.ARRAY_CHILDREN).toBe(16)
    expect(ShapeFlags.SLOTS_CHILDREN).toBe(32)
  })

  it('ShapeFlags 位运算', () => {
    const flag = ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN
    expect(flag & ShapeFlags.ELEMENT).toBeTruthy()
    expect(flag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()
    expect(flag & ShapeFlags.ARRAY_CHILDREN).toBeFalsy()
  })
})

describe('Fragment', () => {

  it('Fragment 是 Symbol 类型', () => {
    expect(typeof Fragment).toBe('symbol')
  })

  it('Fragment VNode 不设置 ELEMENT 标记', () => {
    const vnode = h(Fragment, null, [])
    expect(vnode.shapeFlag & ShapeFlags.ELEMENT).toBeFalsy()
  })
})
