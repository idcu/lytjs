/**
 * Lyt.js 核心 — 插件系统增强功能单元测试
 *
 * 测试覆盖：
 *   1. 插件去重安装（Set 记录，同一插件对象只安装一次）
 *   2. 插件卸载支持（app.unuse(plugin)）
 *   3. 插件状态查询（app.isInstalled(plugin)）
 *   4. 异步插件支持（install 返回 Promise）
 *   5. 插件生命周期钩子（onBeforeInstall / onInstalled）
 *   6. 插件元数据（name 属性）
 *   7. 辅助函数（isPluginObject, isPluginFunction, getPluginName, uninstallPlugin）
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '../../test-utils/src/index'

import {
  createProvidesContext,
  installPlugin,
  uninstallPlugin,
  isPluginObject,
  isPluginFunction,
  getPluginName,
} from '../src/plugin'

import type {
  Plugin,
  PluginObject,
  AppAPI,
} from '../src/index'

// ================================================================
//  辅助：创建最小化 AppAPI mock
// ================================================================

/** 已安装插件集合（模拟 createApp 内部） */
let mockInstalledPlugins: Set<Plugin>

/** 重置已安装插件集合 */
function resetPlugins(): void {
  mockInstalledPlugins = new Set<Plugin>()
}

/** 创建 mock AppAPI */
function createMockAppAPI(): AppAPI {
  const provides = createProvidesContext()
  const config: any = {}
  const globalProperties: Record<string, any> = {}

  const api: AppAPI = {
    use(plugin: Plugin, ...options: any[]): AppAPI | Promise<AppAPI> {
      if (mockInstalledPlugins.has(plugin)) {
        return api
      }
      mockInstalledPlugins.add(plugin)
      const result = installPlugin(api, plugin, ...options)
      if (result instanceof Promise) {
        return result.then(() => api)
      }
      return api
    },
    unuse(plugin: Plugin): AppAPI | Promise<AppAPI> {
      if (!mockInstalledPlugins.has(plugin)) {
        return api
      }
      mockInstalledPlugins.delete(plugin)
      const result = uninstallPlugin(api, plugin)
      if (result instanceof Promise) {
        return result.then(() => api)
      }
      return api
    },
    isInstalled(plugin: Plugin): boolean {
      return mockInstalledPlugins.has(plugin)
    },
    provide(key: string | symbol, value: any): void {
      provides[key] = value
    },
    inject(key: string | symbol, defaultValue?: any): any {
      const value = provides[key]
      return value !== undefined ? value : defaultValue
    },
    config,
    globalProperties,
  }

  return api
}

// ================================================================
//  测试用例
// ================================================================

describe('插件系统增强', () => {

  // ============================================================
  // 1. 插件去重安装
  // ============================================================

  describe('插件去重安装', () => {

    beforeEach(() => { resetPlugins() })
    afterEach(() => { resetPlugins() })

    it('同一个插件对象只安装一次（对象形式）', () => {
      const app = createMockAppAPI()
      let installCount = 0

      const plugin: PluginObject = {
        install() {
          installCount++
        },
      }

      app.use(plugin)
      app.use(plugin)
      app.use(plugin)

      expect(installCount).toBe(1)
    })

    it('同一个插件函数只安装一次', () => {
      const app = createMockAppAPI()
      let installCount = 0

      const pluginFn: Plugin = () => {
        installCount++
      }

      app.use(pluginFn)
      app.use(pluginFn)

      expect(installCount).toBe(1)
    })

    it('不同的插件对象可以分别安装', () => {
      const app = createMockAppAPI()
      let count1 = 0
      let count2 = 0

      const plugin1: PluginObject = {
        install() { count1++ },
      }
      const plugin2: PluginObject = {
        install() { count2++ },
      }

      app.use(plugin1)
      app.use(plugin2)

      expect(count1).toBe(1)
      expect(count2).toBe(1)
      expect(app.isInstalled(plugin1)).toBe(true)
      expect(app.isInstalled(plugin2)).toBe(true)
    })

    it('重复安装时返回 app 实例（不抛异常）', () => {
      const app = createMockAppAPI()
      const plugin: PluginObject = { install() {} }

      const result1 = app.use(plugin)
      const result2 = app.use(plugin)

      expect(result1).toBe(app)
      expect(result2).toBe(app)
    })

  })

  // ============================================================
  // 2. 插件卸载支持
  // ============================================================

  describe('插件卸载支持', () => {

    beforeEach(() => { resetPlugins() })
    afterEach(() => { resetPlugins() })

    it('卸载已安装的插件（对象形式）', () => {
      const app = createMockAppAPI()
      let uninstalled = false

      const plugin: PluginObject = {
        install() {},
        uninstall() {
          uninstalled = true
        },
      }

      app.use(plugin)
      expect(app.isInstalled(plugin)).toBe(true)

      app.unuse(plugin)
      expect(app.isInstalled(plugin)).toBe(false)
      expect(uninstalled).toBe(true)
    })

    it('卸载未安装的插件不报错', () => {
      const app = createMockAppAPI()
      const plugin: PluginObject = {
        install() {},
        uninstall() {},
      }

      // 未安装直接卸载，不应抛异常
      const result = app.unuse(plugin)
      expect(result).toBe(app)
      expect(app.isInstalled(plugin)).toBe(false)
    })

    it('卸载后可以重新安装同一插件', () => {
      const app = createMockAppAPI()
      let installCount = 0

      const plugin: PluginObject = {
        install() { installCount++ },
        uninstall() {},
      }

      app.use(plugin)
      expect(installCount).toBe(1)

      app.unuse(plugin)
      expect(app.isInstalled(plugin)).toBe(false)

      app.use(plugin)
      expect(installCount).toBe(2)
      expect(app.isInstalled(plugin)).toBe(true)
    })

    it('没有 uninstall 方法的插件卸载时给出警告', () => {
      const app = createMockAppAPI()
      const plugin: PluginObject = {
        install() {},
        // 没有 uninstall
      }

      app.use(plugin)

      // 捕获 console.warn
      const warnSpy: string[] = []
      const originalWarn = console.warn
      console.warn = (msg: string) => warnSpy.push(msg)

      app.unuse(plugin)

      console.warn = originalWarn

      expect(app.isInstalled(plugin)).toBe(false)
      expect(warnSpy.length).toBe(1)
      expect(warnSpy[0]).toContain('未定义 uninstall 方法')
    })

  })

  // ============================================================
  // 3. 插件状态查询
  // ============================================================

  describe('插件状态查询', () => {

    beforeEach(() => { resetPlugins() })
    afterEach(() => { resetPlugins() })

    it('未安装的插件返回 false', () => {
      const app = createMockAppAPI()
      const plugin: PluginObject = { install() {} }

      expect(app.isInstalled(plugin)).toBe(false)
    })

    it('安装后返回 true', () => {
      const app = createMockAppAPI()
      const plugin: PluginObject = { install() {} }

      app.use(plugin)
      expect(app.isInstalled(plugin)).toBe(true)
    })

    it('卸载后返回 false', () => {
      const app = createMockAppAPI()
      const plugin: PluginObject = {
        install() {},
        uninstall() {},
      }

      app.use(plugin)
      expect(app.isInstalled(plugin)).toBe(true)

      app.unuse(plugin)
      expect(app.isInstalled(plugin)).toBe(false)
    })

    it('函数形式插件也支持状态查询', () => {
      const app = createMockAppAPI()
      const pluginFn: Plugin = () => {}

      expect(app.isInstalled(pluginFn)).toBe(false)

      app.use(pluginFn)
      expect(app.isInstalled(pluginFn)).toBe(true)
    })

  })

  // ============================================================
  // 4. 异步插件支持
  // ============================================================

  describe('异步插件支持', () => {

    beforeEach(() => { resetPlugins() })
    afterEach(() => { resetPlugins() })

    it('install 返回 Promise 时 app.use() 也返回 Promise', async () => {
      const app = createMockAppAPI()
      let resolved = false

      const asyncPlugin: PluginObject = {
        install() {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              resolved = true
              resolve()
            }, 10)
          })
        },
      }

      const result = app.use(asyncPlugin)

      // result 应该是 Promise
      expect(result instanceof Promise).toBe(true)
      // 此时 install 还没执行完
      expect(resolved).toBe(false)

      await result

      expect(resolved).toBe(true)
      expect(app.isInstalled(asyncPlugin)).toBe(true)
    })

    it('异步插件接收选项参数', async () => {
      const app = createMockAppAPI()
      let receivedOptions: any = null

      const asyncPlugin: PluginObject = {
        async install(_app, ...options) {
          receivedOptions = options
        },
      }

      await app.use(asyncPlugin, { foo: 'bar' })

      expect(receivedOptions).toEqual([{ foo: 'bar' }])
    })

    it('异步插件安装失败时 Promise 被 reject', async () => {
      const app = createMockAppAPI()

      const failingPlugin: PluginObject = {
        install() {
          return Promise.reject(new Error('安装失败'))
        },
      }

      const result = app.use(failingPlugin)
      let caughtError: Error | null = null

      try {
        await result
      } catch (err: any) {
        caughtError = err
      }

      expect(caughtError).not.toBeNull()
      expect(caughtError!.message).toBe('安装失败')
    })

    it('同步插件 app.use() 返回 app 实例（非 Promise）', () => {
      const app = createMockAppAPI()
      const syncPlugin: PluginObject = { install() {} }

      const result = app.use(syncPlugin)

      expect(result instanceof Promise).toBe(false)
      expect(result).toBe(app)
    })

  })

  // ============================================================
  // 5. 插件生命周期钩子
  // ============================================================

  describe('插件生命周期钩子', () => {

    beforeEach(() => { resetPlugins() })
    afterEach(() => { resetPlugins() })

    it('onBeforeInstall 在 install 之前调用', () => {
      const app = createMockAppAPI()
      const order: string[] = []

      const plugin: PluginObject = {
        onBeforeInstall() {
          order.push('before')
        },
        install() {
          order.push('install')
        },
      }

      app.use(plugin)

      expect(order).toEqual(['before', 'install'])
    })

    it('onInstalled 在 install 之后调用', () => {
      const app = createMockAppAPI()
      const order: string[] = []

      const plugin: PluginObject = {
        install() {
          order.push('install')
        },
        onInstalled() {
          order.push('after')
        },
      }

      app.use(plugin)

      expect(order).toEqual(['install', 'after'])
    })

    it('完整的生命周期顺序：onBeforeInstall -> install -> onInstalled', () => {
      const app = createMockAppAPI()
      const order: string[] = []

      const plugin: PluginObject = {
        onBeforeInstall() {
          order.push('before')
        },
        install() {
          order.push('install')
        },
        onInstalled() {
          order.push('after')
        },
      }

      app.use(plugin)

      expect(order).toEqual(['before', 'install', 'after'])
    })

    it('异步 onBeforeInstall 等待完成后再执行 install', async () => {
      const app = createMockAppAPI()
      const order: string[] = []

      const plugin: PluginObject = {
        onBeforeInstall() {
          order.push('before-start')
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              order.push('before-end')
              resolve()
            }, 10)
          })
        },
        install() {
          order.push('install')
        },
      }

      await app.use(plugin)

      expect(order).toEqual(['before-start', 'before-end', 'install'])
    })

    it('异步 install + 异步 onInstalled 按顺序执行', async () => {
      const app = createMockAppAPI()
      const order: string[] = []

      const plugin: PluginObject = {
        install() {
          order.push('install-start')
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              order.push('install-end')
              resolve()
            }, 10)
          })
        },
        onInstalled() {
          order.push('after-start')
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              order.push('after-end')
              resolve()
            }, 10)
          })
        },
      }

      await app.use(plugin)

      expect(order).toEqual([
        'install-start', 'install-end',
        'after-start', 'after-end',
      ])
    })

    it('没有定义钩子时不影响正常安装', () => {
      const app = createMockAppAPI()
      let installed = false

      const plugin: PluginObject = {
        install() {
          installed = true
        },
        // 不定义 onBeforeInstall 和 onInstalled
      }

      app.use(plugin)

      expect(installed).toBe(true)
      expect(app.isInstalled(plugin)).toBe(true)
    })

  })

  // ============================================================
  // 6. 插件元数据
  // ============================================================

  describe('插件元数据', () => {

    it('getPluginName 返回对象插件的 name 属性', () => {
      const plugin: PluginObject = {
        name: 'my-plugin',
        install() {},
      }

      expect(getPluginName(plugin)).toBe('my-plugin')
    })

    it('getPluginName 返回函数插件的 name 属性', () => {
      function myPlugin() {}
      const plugin: Plugin = myPlugin

      expect(getPluginName(plugin)).toBe('myPlugin')
    })

    it('getPluginName 对无 name 的对象插件返回默认标识', () => {
      const plugin: PluginObject = {
        install() {},
      }

      expect(getPluginName(plugin)).toBe('[PluginObject]')
    })

    it('getPluginName 对无 name 属性的函数返回默认标识', () => {
      // 使用 Object.defineProperty 清除 name 属性
      const fn = () => {}
      Object.defineProperty(fn, 'name', { value: '', configurable: true })
      const plugin: Plugin = fn

      expect(getPluginName(plugin)).toBe('[PluginFunction]')
    })

    it('name 属性不影响插件安装功能', () => {
      resetPlugins()
      const app = createMockAppAPI()
      let installed = false

      const plugin: PluginObject = {
        name: 'test-meta-plugin',
        install() {
          installed = true
        },
      }

      app.use(plugin)

      expect(installed).toBe(true)
      expect(app.isInstalled(plugin)).toBe(true)
    })

  })

  // ============================================================
  // 7. 辅助函数
  // ============================================================

  describe('辅助函数', () => {

    it('isPluginObject 正确识别对象插件', () => {
      const objPlugin: PluginObject = { install() {} }
      expect(isPluginObject(objPlugin)).toBe(true)
    })

    it('isPluginObject 对函数插件返回 false', () => {
      const fnPlugin: Plugin = () => {}
      expect(isPluginObject(fnPlugin)).toBe(false)
    })

    it('isPluginObject 对 null 返回 false', () => {
      expect(isPluginObject(null as any)).toBe(false)
    })

    it('isPluginFunction 正确识别函数插件', () => {
      const fnPlugin: Plugin = () => {}
      expect(isPluginFunction(fnPlugin)).toBe(true)
    })

    it('isPluginFunction 对对象插件返回 false', () => {
      const objPlugin: PluginObject = { install() {} }
      expect(isPluginFunction(objPlugin)).toBe(false)
    })

    it('uninstallPlugin 对函数插件给出警告', () => {
      const app = createMockAppAPI()
      const fnPlugin: Plugin = () => {}

      const warnSpy: string[] = []
      const originalWarn = console.warn
      console.warn = (msg: string) => warnSpy.push(msg)

      uninstallPlugin(app, fnPlugin)

      console.warn = originalWarn

      expect(warnSpy.length).toBe(1)
      expect(warnSpy[0]).toContain('不支持卸载')
    })

    it('uninstallPlugin 对无 uninstall 的对象插件给出警告', () => {
      const app = createMockAppAPI()
      const plugin: PluginObject = { install() {} }

      const warnSpy: string[] = []
      const originalWarn = console.warn
      console.warn = (msg: string) => warnSpy.push(msg)

      uninstallPlugin(app, plugin)

      console.warn = originalWarn

      expect(warnSpy.length).toBe(1)
      expect(warnSpy[0]).toContain('未定义 uninstall 方法')
    })

    it('installPlugin 对无效插件给出警告', () => {
      const app = createMockAppAPI()

      const warnSpy: string[] = []
      const originalWarn = console.warn
      console.warn = (msg: string) => warnSpy.push(msg)

      installPlugin(app, 'not-a-plugin' as any)

      console.warn = originalWarn

      expect(warnSpy.length).toBe(1)
      expect(warnSpy[0]).toContain('无效的插件')
    })

  })

  // ============================================================
  // 8. 向后兼容性
  // ============================================================

  describe('向后兼容性', () => {

    beforeEach(() => { resetPlugins() })
    afterEach(() => { resetPlugins() })

    it('原有的对象插件 { install } 仍然正常工作', () => {
      const app = createMockAppAPI()
      let called = false

      const legacyPlugin: PluginObject = {
        install() {
          called = true
        },
      }

      app.use(legacyPlugin)

      expect(called).toBe(true)
      expect(app.isInstalled(legacyPlugin)).toBe(true)
    })

    it('原有的函数插件仍然正常工作', () => {
      const app = createMockAppAPI()
      let called = false

      const legacyFn: Plugin = () => {
        called = true
      }

      app.use(legacyFn)

      expect(called).toBe(true)
      expect(app.isInstalled(legacyFn)).toBe(true)
    })

    it('插件可以通过 app.provide 提供依赖', () => {
      const app = createMockAppAPI()

      const plugin: PluginObject = {
        install(app) {
          app.provide('myKey', 'myValue')
        },
      }

      app.use(plugin)

      expect(app.inject('myKey')).toBe('myValue')
    })

    it('插件可以通过 app.globalProperties 挂载全局属性', () => {
      const app = createMockAppAPI()

      const plugin: PluginObject = {
        install(app) {
          app.globalProperties.$myMethod = () => 'hello'
        },
      }

      app.use(plugin)

      expect(typeof app.globalProperties.$myMethod).toBe('function')
      expect(app.globalProperties.$myMethod()).toBe('hello')
    })

    it('插件链式调用仍然有效', () => {
      const app = createMockAppAPI()

      const plugin1: PluginObject = { install() {} }
      const plugin2: PluginObject = { install() {} }
      const plugin3: PluginObject = { install() {} }

      // 链式调用
      const result = app.use(plugin1).use(plugin2).use(plugin3)

      expect(result).toBe(app)
      expect(app.isInstalled(plugin1)).toBe(true)
      expect(app.isInstalled(plugin2)).toBe(true)
      expect(app.isInstalled(plugin3)).toBe(true)
    })

  })

  // ============================================================
  // 9. 异步卸载
  // ============================================================

  describe('异步卸载', () => {

    beforeEach(() => { resetPlugins() })
    afterEach(() => { resetPlugins() })

    it('uninstall 返回 Promise 时 app.unuse() 也返回 Promise', async () => {
      const app = createMockAppAPI()
      let uninstalled = false

      const asyncPlugin: PluginObject = {
        install() {},
        uninstall() {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              uninstalled = true
              resolve()
            }, 10)
          })
        },
      }

      app.use(asyncPlugin)
      expect(app.isInstalled(asyncPlugin)).toBe(true)

      const result = app.unuse(asyncPlugin)

      expect(result instanceof Promise).toBe(true)
      expect(uninstalled).toBe(false)

      await result

      expect(uninstalled).toBe(true)
      expect(app.isInstalled(asyncPlugin)).toBe(false)
    })

    it('异步卸载后可以重新安装', async () => {
      const app = createMockAppAPI()
      let installCount = 0

      const asyncPlugin: PluginObject = {
        install() { installCount++ },
        uninstall() {
          return Promise.resolve()
        },
      }

      app.use(asyncPlugin)
      expect(installCount).toBe(1)

      await app.unuse(asyncPlugin)
      expect(app.isInstalled(asyncPlugin)).toBe(false)

      app.use(asyncPlugin)
      expect(installCount).toBe(2)
      expect(app.isInstalled(asyncPlugin)).toBe(true)
    })

  })

  // ============================================================
  // 10. 生命周期钩子接收选项
  // ============================================================

  describe('生命周期钩子接收选项', () => {

    beforeEach(() => { resetPlugins() })
    afterEach(() => { resetPlugins() })

    it('onBeforeInstall 接收选项参数', () => {
      const app = createMockAppAPI()
      let receivedOptions: any = null

      const plugin: PluginObject = {
        onBeforeInstall(_app, ...options) {
          receivedOptions = options
        },
        install() {},
      }

      app.use(plugin, { a: 1, b: 2 })

      expect(receivedOptions).toEqual([{ a: 1, b: 2 }])
    })

    it('onInstalled 接收选项参数', () => {
      const app = createMockAppAPI()
      let receivedOptions: any = null

      const plugin: PluginObject = {
        install() {},
        onInstalled(_app, ...options) {
          receivedOptions = options
        },
      }

      app.use(plugin, 'option1', 'option2')

      expect(receivedOptions).toEqual(['option1', 'option2'])
    })

  })

})
