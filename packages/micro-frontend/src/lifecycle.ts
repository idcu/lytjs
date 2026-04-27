/**
 * @lytjs/micro-frontend — 生命周期管理
 *
 * 提供 MicroApp 类，统一管理子应用的挂载、卸载和更新。
 *
 * 核心功能：
 * - MicroApp: 子应用生命周期管理
 * - MicroAppStatus: 应用状态枚举
 * - MicroAppOptions: 应用配置选项
 *
 * 纯原生零依赖实现。
 */

import type { Sandbox } from './sandbox'
import type { EventBus } from './communication'
import type { SharedState } from './communication'

// ============================================================
// 类型定义
// ============================================================

/**
 * 微前端应用状态
 */
export type MicroAppStatus =
  | 'not_loaded'    // 未加载
  | 'loading'       // 加载中
  | 'loaded'        // 已加载（资源已获取）
  | 'mounting'      // 挂载中
  | 'mounted'       // 已挂载
  | 'updating'      // 更新中
  | 'unmounting'    // 卸载中
  | 'unmounted'     // 已卸载
  | 'load_error'    // 加载失败
  | 'mount_error'   // 挂载失败

/**
 * 子应用生命周期钩子
 */
export interface MicroAppLifecycle {
  /** 加载前 */
  beforeLoad?(): Promise<void> | void
  /** 加载后 */
  afterLoad?(): Promise<void> | void
  /** 挂载前 */
  beforeMount?(props: Record<string, any>): Promise<void> | void
  /** 挂载后 */
  afterMount?(props: Record<string, any>): Promise<void> | void
  /** 更新前 */
  beforeUpdate?(props: Record<string, any>): Promise<void> | void
  /** 更新后 */
  afterUpdate?(props: Record<string, any>): Promise<void> | void
  /** 卸载前 */
  beforeUnmount?(): Promise<void> | void
  /** 卸载后 */
  afterUnmount?(): Promise<void> | void
}

/**
 * 子应用配置选项
 */
export interface MicroAppOptions {
  /** 应用名称（唯一标识） */
  name: string
  /** 应用入口（URL 或组件选项） */
  entry: string | Record<string, any>
  /** 挂载容器 */
  container: HTMLElement | string
  /** JS 沙箱 */
  sandbox?: Sandbox
  /** CSS 沙箱（StyleSandbox 实例） */
  styleSandbox?: { inject(css: string): HTMLStyleElement; removeAll(): void; destroy(): void }
  /** 事件总线 */
  eventBus?: EventBus
  /** 共享状态 */
  sharedState?: SharedState
  /** 生命周期钩子 */
  lifecycle?: MicroAppLifecycle
  /** 传递给子应用的 Props */
  props?: Record<string, any>
  /** 是否自动挂载（默认 false） */
  autoMount?: boolean
  /** 自定义挂载函数 */
  customMount?: (container: HTMLElement, props: Record<string, any>) => Promise<void> | void
  /** 自定义卸载函数 */
  customUnmount?: (container: HTMLElement) => Promise<void> | void
  /** 自定义更新函数 */
  customUpdate?: (container: HTMLElement, props: Record<string, any>) => Promise<void> | void
}

/**
 * 子应用信息
 */
export interface MicroAppInfo {
  /** 应用名称 */
  name: string
  /** 应用状态 */
  status: MicroAppStatus
  /** 挂载容器 */
  container: HTMLElement | null
  /** 当前 Props */
  props: Record<string, any>
  /** 错误信息（如果有） */
  error: Error | null
}

// ============================================================
// MicroApp 类
// ============================================================

/**
 * 微前端子应用管理类
 *
 * 统一管理子应用的生命周期：加载 -> 挂载 -> 更新 -> 卸载。
 *
 * @example
 * ```ts
 * const app = new MicroApp({
 *   name: 'child-app',
 *   entry: '//localhost:3001',
 *   container: '#app-container',
 *   props: { theme: 'dark' },
 * })
 *
 * // 挂载
 * await app.mount()
 *
 * // 更新
 * await app.update({ theme: 'light' })
 *
 * // 卸载
 * await app.unmount()
 *
 * // 获取状态
 * console.log(app.getStatus())
 * ```
 */
export class MicroApp {
  /** 应用名称 */
  readonly name: string
  /** 应用入口 */
  readonly entry: string | Record<string, any>
  /** 生命周期钩子 */
  readonly lifecycle: MicroAppLifecycle

  /** 当前状态 */
  private _status: MicroAppStatus = 'not_loaded'
  /** 挂载容器 */
  private _container: HTMLElement | null = null
  /** 当前 Props */
  private _props: Record<string, any>
  /** 沙箱 */
  private _sandbox: Sandbox | null = null
  /** CSS 沙箱 */
  private _styleSandbox: MicroAppOptions['styleSandbox'] = undefined
  /** 事件总线 */
  private _eventBus: EventBus | null = null
  /** 共享状态 */
  private _sharedState: SharedState | null = null
  /** 错误信息 */
  private _error: Error | null = null
  /** 自定义挂载函数 */
  private _customMount: MicroAppOptions['customMount']
  /** 自定义卸载函数 */
  private _customUnmount: MicroAppOptions['customUnmount']
  /** 自定义更新函数 */
  private _customUpdate: MicroAppOptions['customUpdate']

  constructor(options: MicroAppOptions) {
    this.name = options.name
    this.entry = options.entry
    this.lifecycle = options.lifecycle || {}
    this._props = options.props || {}
    this._sandbox = options.sandbox || null
    this._styleSandbox = options.styleSandbox ?? undefined
    this._eventBus = options.eventBus || null
    this._sharedState = options.sharedState || null
    this._customMount = options.customMount
    this._customUnmount = options.customUnmount
    this._customUpdate = options.customUpdate

    // 解析容器
    if (typeof options.container === 'string') {
      const el = document.querySelector(options.container)
      if (!el) {
        throw new Error(
          `[MicroApp] Container "${options.container}" not found.`
        )
      }
      this._container = el as HTMLElement
    } else {
      this._container = options.container
    }

    // 自动挂载
    if (options.autoMount) {
      this.mount().catch((e) => {
        console.error(`[MicroApp] Auto mount failed for "${this.name}":`, e)
      })
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): MicroAppStatus {
    return this._status
  }

  /**
   * 获取应用信息
   */
  getInfo(): MicroAppInfo {
    return {
      name: this.name,
      status: this._status,
      container: this._container,
      props: { ...this._props },
      error: this._error,
    }
  }

  /**
   * 挂载子应用
   *
   * 执行完整的挂载流程：
   * 1. beforeLoad -> 加载资源 -> afterLoad
   * 2. beforeMount -> 执行挂载 -> afterMount
   *
   * @param extraProps - 额外的 Props（合并到现有 Props）
   */
  async mount(extraProps?: Record<string, any>): Promise<void> {
    if (this._status === 'mounted' || this._status === 'mounting') {
      console.warn(`[MicroApp] "${this.name}" is already mounted or mounting.`)
      return
    }

    // 合并额外 Props
    if (extraProps) {
      this._props = { ...this._props, ...extraProps }
    }

    try {
      // === 加载阶段 ===
      this._setStatus('loading')

      await this.lifecycle.beforeLoad?.()

      // 如果 entry 是 URL，加载资源
      if (typeof this.entry === 'string' && this.entry.startsWith('http')) {
        await this._loadResources(this.entry)
      }

      this._setStatus('loaded')
      await this.lifecycle.afterLoad?.()

      // === 挂载阶段 ===
      this._setStatus('mounting')

      await this.lifecycle.beforeMount?.(this._props)

      // 激活沙箱
      if (this._sandbox) {
        this._sandbox.activate()
      }

      // 执行挂载
      if (this._customMount) {
        await this._customMount(this._container!, this._props)
      } else if (typeof this.entry === 'object') {
        // entry 是组件选项，使用 Web Component 方式挂载
        await this._mountComponent(this.entry)
      } else {
        // entry 是 URL，创建 iframe 或 script 注入
        await this._mountFromURL(this.entry)
      }

      this._setStatus('mounted')
      await this.lifecycle.afterMount?.(this._props)

      // 发布挂载事件
      this._eventBus?.emit('app:mounted', { name: this.name })
    } catch (e) {
      this._error = e instanceof Error ? e : new Error(String(e))
      this._setStatus('mount_error')
      this._eventBus?.emit('app:error', {
        name: this.name,
        status: this._status,
        error: this._error,
      })
      throw this._error
    }
  }

  /**
   * 更新子应用 Props
   *
   * @param props - 新的 Props（浅合并到现有 Props）
   */
  async update(props: Record<string, any>): Promise<void> {
    if (this._status !== 'mounted') {
      console.warn(
        `[MicroApp] "${this.name}" is not mounted. Current status: ${this._status}`
      )
      return
    }

    try {
      this._setStatus('updating')
      await this.lifecycle.beforeUpdate?.(props)

      // 合并 Props
      this._props = { ...this._props, ...props }

      // 执行更新
      if (this._customUpdate) {
        await this._customUpdate(this._container!, this._props)
      } else {
        // 默认更新：通过 CustomEvent 通知子应用
        this._container?.dispatchEvent(
          new CustomEvent('props:update', {
            detail: this._props,
            bubbles: true,
            composed: true,
          })
        )
      }

      this._setStatus('mounted')
      await this.lifecycle.afterUpdate?.(this._props)

      // 发布更新事件
      this._eventBus?.emit('app:updated', { name: this.name, props: this._props })
    } catch (e) {
      this._error = e instanceof Error ? e : new Error(String(e))
      this._setStatus('mounted') // 更新失败不影响挂载状态
      this._eventBus?.emit('app:error', {
        name: this.name,
        status: 'update_error',
        error: this._error,
      })
      throw this._error
    }
  }

  /**
   * 卸载子应用
   */
  async unmount(): Promise<void> {
    if (this._status !== 'mounted') {
      console.warn(
        `[MicroApp] "${this.name}" is not mounted. Current status: ${this._status}`
      )
      return
    }

    try {
      this._setStatus('unmounting')
      await this.lifecycle.beforeUnmount?.()

      // 执行卸载
      if (this._customUnmount) {
        await this._customUnmount(this._container!)
      } else {
        // 默认卸载：清空容器
        if (this._container) {
          this._container.innerHTML = ''
        }
      }

      // 停用沙箱
      if (this._sandbox) {
        this._sandbox.deactivate()
      }

      // 清理 CSS 沙箱
      if (this._styleSandbox) {
        this._styleSandbox.removeAll()
      }

      this._setStatus('unmounted')
      await this.lifecycle.afterUnmount?.()

      // 发布卸载事件
      this._eventBus?.emit('app:unmounted', { name: this.name })
    } catch (e) {
      this._error = e instanceof Error ? e : new Error(String(e))
      this._setStatus('unmounted')
      throw this._error
    }
  }

  /**
   * 销毁子应用（卸载 + 清理所有资源）
   */
  async destroy(): Promise<void> {
    await this.unmount()

    // 销毁沙箱
    if (this._sandbox) {
      this._sandbox.destroy()
      this._sandbox = null
    }

    // 销毁 CSS 沙箱
    if (this._styleSandbox) {
      this._styleSandbox.destroy()
      this._styleSandbox = undefined
    }

    this._error = null
    this._setStatus('not_loaded')
  }

  /**
   * 加载远程资源
   */
  private async _loadResources(entry: string): Promise<void> {
    // 加载 HTML 入口
    try {
      const response = await fetch(entry)
      if (!response.ok) {
        throw new Error(`Failed to load entry: ${response.status} ${response.statusText}`)
      }
      const html = await response.text()

      // 解析 HTML，提取 script 和 style
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      // 注入样式
      const styles = doc.querySelectorAll('style')
      for (const style of styles) {
        if (this._styleSandbox) {
          this._styleSandbox.inject(style.textContent || '')
        }
      }

      // 加载外部样式
      const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]')
      for (const link of styleLinks) {
        const href = link.getAttribute('href')
        if (href) {
          const fullUrl = new URL(href, entry).href
          try {
            const cssResponse = await fetch(fullUrl)
            const css = await cssResponse.text()
            if (this._styleSandbox) {
              this._styleSandbox.inject(css)
            }
          } catch {
            console.warn(`[MicroApp] Failed to load stylesheet: ${fullUrl}`)
          }
        }
      }

      // 注意：script 加载在浏览器环境中需要特殊处理
      // 这里只做 HTML 解析，实际 script 执行由 _mountFromURL 处理
    } catch (e) {
      throw new Error(
        `[MicroApp] Failed to load resources from "${entry}": ${e instanceof Error ? e.message : e}`
      )
    }
  }

  /**
   * 从组件选项挂载
   */
  private async _mountComponent(componentOptions: Record<string, any>): Promise<void> {
    if (!this._container) return

    // 使用 Web Component 方式挂载
    // 创建一个包装 div，将组件渲染到其中
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-micro-app', this.name)
    this._container.appendChild(wrapper)

    // 如果组件有 render 函数，直接调用
    if (typeof componentOptions.render === 'function') {
      const vnode = componentOptions.render(this._props)
      if (vnode && vnode.type) {
        const el = document.createElement(vnode.type)
        if (typeof vnode.children === 'string') {
          el.textContent = vnode.children
        }
        wrapper.appendChild(el)
      }
    }
  }

  /**
   * 从 URL 挂载
   */
  private async _mountFromURL(entry: string): Promise<void> {
    if (!this._container) return

    // 使用 iframe 方式隔离（最安全的隔离方案）
    const iframe = document.createElement('iframe')
    iframe.setAttribute('data-micro-app', this.name)
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.src = entry

    this._container.appendChild(iframe)
  }

  /**
   * 设置状态
   */
  private _setStatus(status: MicroAppStatus): void {
    const oldStatus = this._status
    this._status = status

    // 发布状态变化事件
    this._eventBus?.emit('app:status-change', {
      name: this.name,
      oldStatus,
      newStatus: status,
    })
  }
}
