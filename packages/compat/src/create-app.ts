/**
 * createApp 兼容层
 *
 * 提供与 Vue 3 兼容的 createApp API
 */

import { createApp as lytCreateApp } from '@lytjs/core'
import type { App, ComponentOptions, Plugin, Directive } from './types'

/**
 * 创建应用实例
 * @see https://vuejs.org/api/application.html#createapp
 */
export function createApp(rootComponent: any, rootProps?: any): App {
  const app = lytCreateApp(rootComponent, rootProps)

  // 为了保持与 Vue 3 兼容，添加一些方法
  return {
    ...app,

    /**
     * 使用插件
     */
    use(plugin: Plugin, ...options: any[]) {
      if (typeof plugin === 'function') {
        plugin(this, ...options)
      } else if (plugin && typeof plugin.install === 'function') {
        plugin.install(this, ...options)
      }
      return this
    },

    /**
     * 注册全局混入
     */
    mixin(mixin: ComponentOptions) {
      console.warn('[Compat: mixin is a placeholder')
      return this
    },

    /**
     * 注册/获取全局组件
     */
    component(name: string, component?: any) {
      if (component) {
        app.component(name, component)
        return this
      }
      return app.component(name)
    },

    /**
     * 注册/获取全局指令
     */
    directive(name: string, directive?: Directive) {
      if (directive) {
        console.warn('[Compat: directive registration is a placeholder')
        return this
      }
      console.warn('[Compat: directive retrieval is a placeholder')
      return null
    },

    /**
     * 提供全局依赖
     */
    provide<T>(key: string | symbol, value: T) {
      app.provide(key, value)
      return this
    },
  } as unknown as App
}
