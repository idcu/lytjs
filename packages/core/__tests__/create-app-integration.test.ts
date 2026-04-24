/**
 * Lyt.js createApp — 集成测试
 *
 * 直接导入 create-app.ts 的导出函数，测试应用创建、插件系统、
 * provide/inject、component/directive 注册等功能。
 * mount/unmount 需要真实 DOM，使用 jsdom。
 *
 * 测试覆盖：
 *   - createApp 基本创建
 *   - app.use 同步插件安装
 *   - app.use 异步插件安装
 *   - app.use 函数式插件
 *   - app.use 重复安装警告
 *   - app.unuse 插件卸载
 *   - app.isInstalled 查询插件状态
 *   - app.mount 挂载（jsdom）
 *   - app.unmount 卸载
 *   - app.provide / app.inject 依赖注入
 *   - app.component 全局组件注册
 *   - app.directive 全局指令注册
 *   - app.config 配置
 *   - app.globalProperties 全局属性
 *   - app._instance 根组件实例
 *   - 多实例隔离
 *   - ComponentOptions 适配（state 对象 → 工厂函数）
 *   - 函数式根组件
 */

import { JSDOM } from 'jsdom'
import { describe, it, expect } from '../../test-utils/src/index'

import {
  createApp,
  type App,
  type ComponentOptions,
  type DirectiveHooks,
} from '../src/create-app'

import { h, Fragment, ShapeFlags } from '../src/h'

// ================================================================
//  jsdom 环境设置
// ================================================================

function setupDOM() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>')
  globalThis.document = dom.window.document as any
  return dom
}

function cleanupDOM() {
  delete (globalThis as any).document
}

// ================================================================
//  测试用例
// ================================================================

describe('createApp 集成测试', () => {

  // ---- 基本创建 ----
  describe('createApp 基本创建', () => {
    it('使用组件选项创建应用', () => {
      const app = createApp({
        name: 'TestApp',
        render() { return h('div') },
      })
      expect(app).toBeDefined()
      expect(app.config).toBeDefined()
      expect(app.globalProperties).toBeDefined()
      expect(app._instance).toBeNull()
    })

    it('使用函数式根组件创建应用', () => {
      const app = createApp(() => h('div', null, 'Func'))
      expect(app).toBeDefined()
    })

    it('app.config 是空对象', () => {
      const app = createApp({ render() { return h('div') } })
      expect(app.config).toEqual({})
    })

    it('app.globalProperties 是空对象', () => {
      const app = createApp({ render() { return h('div') } })
      expect(app.globalProperties).toEqual({})
    })
  })

  // ---- 插件系统 ----
  describe('app.use 插件安装', () => {
    it('安装对象式插件', () => {
      let installed = false
      const plugin = {
        name: 'test-plugin',
        install(app: any) {
          installed = true
          app.provide('plugin-data', 'from-plugin')
        },
      }
      const app = createApp({ render() { return h('div') } })
      const result = app.use(plugin)
      expect(installed).toBe(true)
      expect(result).toBe(app) // 链式调用
    })

    it('安装函数式插件', () => {
      let called = false
      const plugin = (app: any) => {
        called = true
      }
      const app = createApp({ render() { return h('div') } })
      app.use(plugin)
      expect(called).toBe(true)
    })

    it('传递插件选项', () => {
      let receivedOptions: any = null
      const plugin = {
        install(_app: any, ...options: any[]) {
          receivedOptions = options
        },
      }
      const app = createApp({ render() { return h('div') } })
      app.use(plugin, { foo: 'bar' }, 'extra')
      expect(receivedOptions).toEqual([{ foo: 'bar' }, 'extra'])
    })

    it('重复安装同一插件时警告', () => {
      const plugin = { install() {} }
      const app = createApp({ render() { return h('div') } })
      app.use(plugin)
      // 第二次安装应返回 app 并发出警告
      const result = app.use(plugin)
      expect(result).toBe(app)
    })

    it('安装异步插件返回 Promise', async () => {
      const plugin = {
        async install(_app: any) {
          await new Promise(r => setTimeout(r, 10))
        },
      }
      const app = createApp({ render() { return h('div') } })
      const result = app.use(plugin)
      expect(result instanceof Promise).toBe(true)
      await result
    })

    it('异步插件安装后链式调用', async () => {
      const plugin = {
        async install(_app: any) {},
      }
      const app = createApp({ render() { return h('div') } })
      const result = await app.use(plugin)
      expect(result).toBe(app)
    })

    it('插件 onBeforeInstall 钩子', () => {
      let beforeCalled = false
      let installCalled = false
      const plugin = {
        name: 'lifecycle-plugin',
        onBeforeInstall() { beforeCalled = true },
        install() { installCalled = true },
        onInstalled() {},
      }
      const app = createApp({ render() { return h('div') } })
      app.use(plugin)
      expect(beforeCalled).toBe(true)
      expect(installCalled).toBe(true)
    })

    it('插件 onInstalled 钩子', () => {
      let installedCalled = false
      const plugin = {
        name: 'post-plugin',
        install() {},
        onInstalled() { installedCalled = true },
      }
      const app = createApp({ render() { return h('div') } })
      app.use(plugin)
      expect(installedCalled).toBe(true)
    })
  })

  // ---- 插件卸载 ----
  describe('app.unuse 插件卸载', () => {
    it('卸载已安装的插件', () => {
      let uninstalled = false
      const plugin = {
        name: 'removable',
        install() {},
        uninstall() { uninstalled = true },
      }
      const app = createApp({ render() { return h('div') } })
      app.use(plugin)
      app.unuse(plugin)
      expect(uninstalled).toBe(true)
    })

    it('卸载未安装的插件时警告', () => {
      const plugin = { install() {} }
      const app = createApp({ render() { return h('div') } })
      const result = app.unuse(plugin)
      expect(result).toBe(app)
    })

    it('卸载后 isInstalled 返回 false', () => {
      const plugin = { name: 'check', install() {} }
      const app = createApp({ render() { return h('div') } })
      app.use(plugin)
      expect(app.isInstalled(plugin)).toBe(true)
      app.unuse(plugin)
      expect(app.isInstalled(plugin)).toBe(false)
    })
  })

  // ---- isInstalled ----
  describe('app.isInstalled', () => {
    it('未安装的插件返回 false', () => {
      const plugin = { install() {} }
      const app = createApp({ render() { return h('div') } })
      expect(app.isInstalled(plugin)).toBe(false)
    })

    it('安装后返回 true', () => {
      const plugin = { install() {} }
      const app = createApp({ render() { return h('div') } })
      app.use(plugin)
      expect(app.isInstalled(plugin)).toBe(true)
    })
  })

  // ---- provide / inject ----
  describe('app.provide / app.inject', () => {
    it('provide 和 inject 基本用法', () => {
      const app = createApp({ render() { return h('div') } })
      app.provide('key', 'value')
      expect(app.inject('key')).toBe('value')
    })

    it('inject 未提供的 key 返回 undefined', () => {
      const app = createApp({ render() { return h('div') } })
      expect(app.inject('nonexistent')).toBe(undefined)
    })

    it('inject 带默认值', () => {
      const app = createApp({ render() { return h('div') } })
      expect(app.inject('nonexistent', 'default')).toBe('default')
    })

    it('provide 覆盖已存在的值', () => {
      const app = createApp({ render() { return h('div') } })
      app.provide('key', 'first')
      app.provide('key', 'second')
      expect(app.inject('key')).toBe('second')
    })

    it('provide 使用 symbol key', () => {
      const sym = Symbol('test')
      const app = createApp({ render() { return h('div') } })
      app.provide(sym, 'symbol-value')
      expect(app.inject(sym)).toBe('symbol-value')
    })

    it('provide 返回 app（链式调用）', () => {
      const app = createApp({ render() { return h('div') } })
      const result = app.provide('key', 'value')
      expect(result).toBe(app)
    })
  })

  // ---- component ----
  describe('app.component', () => {
    it('注册全局组件', () => {
      const app = createApp({ render() { return h('div') } })
      const MyComp = { render() { return h('span') } }
      const result = app.component('MyComp', MyComp)
      expect(result).toBe(app)
    })

    it('获取已注册的组件', () => {
      const app = createApp({ render() { return h('div') } })
      const MyComp = { render() { return h('span') } }
      app.component('MyComp', MyComp)
      expect(app.component('MyComp')).toBe(MyComp)
    })

    it('获取未注册的组件返回 undefined', () => {
      const app = createApp({ render() { return h('div') } })
      expect(app.component('NonExistent')).toBe(undefined)
    })
  })

  // ---- directive ----
  describe('app.directive', () => {
    it('注册全局指令', () => {
      const app = createApp({ render() { return h('div') } })
      const myDirective: DirectiveHooks = {
        mounted(el: any) { el.dataset.directed = 'true' },
      }
      const result = app.directive('my-dir', myDirective)
      expect(result).toBe(app)
    })

    it('获取已注册的指令', () => {
      const app = createApp({ render() { return h('div') } })
      const myDirective: DirectiveHooks = { mounted() {} }
      app.directive('my-dir', myDirective)
      expect(app.directive('my-dir')).toBe(myDirective)
    })

    it('获取未注册的指令返回 undefined', () => {
      const app = createApp({ render() { return h('div') } })
      expect(app.directive('nonexistent')).toBe(undefined)
    })
  })

  // ---- mount / unmount (jsdom) ----
  describe('app.mount / app.unmount', () => {
    it('mount 挂载到 DOM 元素', () => {
      setupDOM()
      try {
        const app = createApp({
          render() {
            return h('div', { id: 'root' }, 'Mounted!', { shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN })
          },
        })
        const container = document.getElementById('app')!
        app.mount(container)
        expect(container.innerHTML).toContain('Mounted!')
      } finally {
        cleanupDOM()
      }
    })

    it('mount 挂载到 CSS 选择器', () => {
      setupDOM()
      try {
        const app = createApp({
          render() {
            return h('p', null, 'Selector Mount', { shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN })
          },
        })
        app.mount('#app')
        const container = document.getElementById('app')!
        expect(container.innerHTML).toContain('Selector Mount')
      } finally {
        cleanupDOM()
      }
    })

    it('mount 找不到容器时抛出错误', () => {
      setupDOM()
      try {
        const app = createApp({ render() { return h('div') } })
        expect(() => app.mount('#nonexistent')).toThrow()
      } finally {
        cleanupDOM()
      }
    })

    it('重复 mount 时警告并返回 app', () => {
      setupDOM()
      try {
        const app = createApp({
          render() { return h('div') },
        })
        app.mount('#app')
        const result = app.mount('#app')
        expect(result).toBe(app)
      } finally {
        cleanupDOM()
      }
    })

    it('unmount 卸载应用', () => {
      setupDOM()
      try {
        const app = createApp({
          render() {
            return h('div', null, 'Unmount Me', { shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN })
          },
        })
        app.mount('#app')
        const container = document.getElementById('app')!
        expect(container.innerHTML).toContain('Unmount Me')
        app.unmount()
        expect(container.innerHTML).toBe('')
      } finally {
        cleanupDOM()
      }
    })

    it('unmount 未挂载的应用时警告', () => {
      const app = createApp({ render() { return h('div') } })
      // 不应抛出错误
      app.unmount()
    })
  })

  // ---- 多实例隔离 ----
  describe('多实例隔离', () => {
    it('不同实例的 provide/inject 互不影响', () => {
      const app1 = createApp({ render() { return h('div') } })
      const app2 = createApp({ render() { return h('div') } })

      app1.provide('shared', 'app1-value')
      app2.provide('shared', 'app2-value')

      expect(app1.inject('shared')).toBe('app1-value')
      expect(app2.inject('shared')).toBe('app2-value')
    })

    it('不同实例的插件互不影响', () => {
      let count = 0
      const plugin = {
        install() { count++ },
      }
      const app1 = createApp({ render() { return h('div') } })
      const app2 = createApp({ render() { return h('div') } })

      app1.use(plugin)
      expect(count).toBe(1)
      expect(app1.isInstalled(plugin)).toBe(true)
      expect(app2.isInstalled(plugin)).toBe(false)

      app2.use(plugin)
      expect(count).toBe(2)
    })

    it('不同实例的组件注册互不影响', () => {
      const app1 = createApp({ render() { return h('div') } })
      const app2 = createApp({ render() { return h('div') } })

      const comp1 = { render() { return h('span') } }
      const comp2 = { render() { return h('p') } }

      app1.component('shared', comp1)
      app2.component('shared', comp2)

      expect(app1.component('shared')).toBe(comp1)
      expect(app2.component('shared')).toBe(comp2)
    })

    it('不同实例的指令注册互不影响', () => {
      const app1 = createApp({ render() { return h('div') } })
      const app2 = createApp({ render() { return h('div') } })

      const dir1: DirectiveHooks = { mounted() {} }
      const dir2: DirectiveHooks = { mounted() {} }

      app1.directive('shared', dir1)
      app2.directive('shared', dir2)

      expect(app1.directive('shared')).toBe(dir1)
      expect(app2.directive('shared')).toBe(dir2)
    })
  })

  // ---- ComponentOptions 适配 ----
  describe('ComponentOptions 适配', () => {
    it('state 对象形式适配为工厂函数', () => {
      setupDOM()
      try {
        const app = createApp({
          state: { count: 0 },
          render() {
            return h('div', null, 'rendered')
          },
        })
        app.mount('#app')
        const container = document.getElementById('app')!
        expect(container.innerHTML).toContain('rendered')
      } finally {
        cleanupDOM()
      }
    })

    it('state 工厂函数形式', () => {
      setupDOM()
      try {
        const app = createApp({
          state: () => ({ value: 42 }),
          render() {
            return h('div', null, 'factory-state')
          },
        })
        app.mount('#app')
        const container = document.getElementById('app')!
        expect(container.innerHTML).toContain('factory-state')
      } finally {
        cleanupDOM()
      }
    })

    it('computed 简写形式适配', () => {
      setupDOM()
      try {
        const app = createApp({
          state: () => ({ count: 5 }),
          computed: {
            double() { return 10 },
          },
          render() {
            return h('div', null, 'computed-test')
          },
        })
        app.mount('#app')
        const container = document.getElementById('app')!
        expect(container.innerHTML).toContain('computed-test')
      } finally {
        cleanupDOM()
      }
    })

    it('模板编译', () => {
      setupDOM()
      try {
        const app = createApp({
          template: '<div class="tmpl">Template</div>',
        })
        app.mount('#app')
        const container = document.getElementById('app')!
        expect(container.innerHTML).toContain('Template')
      } finally {
        cleanupDOM()
      }
    })
  })

  // ---- 链式调用 ----
  describe('链式调用', () => {
    it('provide + component + directive 链式调用', () => {
      const app = createApp({ render() { return h('div') } })
      const result = app
        .provide('k', 'v')
        .component('A', { render() { return h('div') } })
        .directive('b', { mounted() {} })
      expect(result).toBe(app)
    })
  })

  // ---- globalProperties ----
  describe('globalProperties', () => {
    it('可以设置全局属性', () => {
      const app = createApp({ render() { return h('div') } })
      app.globalProperties.$http = { get: () => {} }
      expect(app.globalProperties.$http).toBeDefined()
    })
  })
})
