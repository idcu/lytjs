/**
 * @lytjs/micro-frontend — qiankun / micro-app 适配器
 *
 * 提供主流微前端框架的适配层，使 Lyt.js 应用可以快速接入 qiankun 或 micro-app。
 *
 * 核心功能：
 * - createQiankunLifeCycle: 生成 qiankun 生命周期
 * - createMicroAppEntry: 生成 micro-app 入口
 *
 * 纯原生零依赖实现。
 */

import type { MicroAppOptions } from './lifecycle'
import { MicroApp } from './lifecycle'
import type { EventBus } from './communication'
import type { SharedState } from './communication'

// ============================================================
// 类型定义
// ============================================================

/**
 * qiankun 生命周期导出
 */
export interface QiankunLifeCycle {
  /** bootstrap - 初始化（只调用一次） */
  bootstrap: (props: QiankunProps) => Promise<void>
  /** mount - 挂载 */
  mount: (props: QiankunProps) => Promise<void>
  /** unmount - 卸载 */
  unmount: (props: QiankunProps) => Promise<void>
  /** update - 更新（可选） */
  update?: (props: QiankunProps) => Promise<void>
}

/**
 * qiankun Props
 */
export interface QiankunProps {
  /** 容器 */
  container: HTMLElement
  /** 应用名称 */
  name: string
  /** 基座应用数据 */
  data?: Record<string, any>
  /** 全局状态 */
  globalState?: {
    getGlobalState: (key?: string) => any
    setGlobalState: (state: Record<string, any>) => void
    onGlobalStateChange: (callback: (state: Record<string, any>, prev: Record<string, any>) => void) => void
    offGlobalStateChange: () => void
  }
}

/**
 * micro-app 入口配置
 */
export interface MicroAppEntryConfig {
  /** 应用名称 */
  name: string
  /** 入口 URL */
  entry: string
  /** 挂载容器选择器 */
  container: string
  /** 是否活跃 */
  active?: boolean
}

/**
 * qiankun 适配器配置
 */
export interface QiankunAdapterOptions {
  /** 应用名称 */
  name: string
  /** Lyt.js 组件选项或渲染函数 */
  component: Record<string, any> | (() => any)
  /** 样式 */
  styles?: string
  /** 事件总线 */
  eventBus?: EventBus
  /** 共享状态 */
  sharedState?: SharedState
}

/**
 * micro-app 适配器配置
 */
export interface MicroAppAdapterOptions {
  /** 应用名称 */
  name: string
  /** Lyt.js 组件选项或渲染函数 */
  component: Record<string, any> | (() => any)
  /** 样式 */
  styles?: string
  /** 事件总线 */
  eventBus?: EventBus
  /** 共享状态 */
  sharedState?: SharedState
}

// ============================================================
// qiankun 适配器
// ============================================================

/**
 * 生成 qiankun 生命周期
 *
 * 将 Lyt.js 应用适配为 qiankun 子应用的标准生命周期导出。
 *
 * @param options - 适配器配置
 * @returns qiankun 生命周期对象
 *
 * @example
 * ```ts
 * // child-app/main.ts
 * import { createQiankunLifeCycle } from '@lytjs/micro-frontend/adapters'
 * import { MyComponent } from './MyComponent'
 *
 * const { bootstrap, mount, unmount, update } = createQiankunLifeCycle({
 *   name: 'child-app',
 *   component: MyComponent,
 *   styles: ':host { display: block; }',
 * })
 *
 * // 导出 qiankun 生命周期
 * export { bootstrap, mount, unmount, update }
 *
 * // 支持 qiankun 的独立运行
 * if (!(window as any).__POWERED_BY_QIANKUN__) {
 *   mount({ container: document.getElementById('app')!, name: 'child-app' })
 * }
 * ```
 */
export function createQiankunLifeCycle(options: QiankunAdapterOptions): QiankunLifeCycle {
  const { name, component, styles, eventBus, sharedState } = options

  let microApp: MicroApp | null = null
  let currentProps: Record<string, any> = {}

  /**
   * bootstrap - 初始化（只调用一次）
   */
  async function bootstrap(props: QiankunProps): Promise<void> {
    console.log(`[MicroApp][${name}] Bootstrap...`)
    // qiankun 的 bootstrap 通常只做初始化工作
  }

  /**
   * mount - 挂载
   */
  async function mount(props: QiankunProps): Promise<void> {
    console.log(`[MicroApp][${name}] Mounting...`)

    currentProps = {
      ...currentProps,
      container: props.container,
      name: props.name,
      data: props.data,
    }

    // 如果 qiankun 提供了全局状态，桥接到 SharedState
    if (props.globalState && sharedState) {
      // 同步全局状态到 SharedState
      const globalState = props.globalState.getGlobalState()
      if (globalState) {
        sharedState.batchSet(globalState)
      }

      // 监听全局状态变化
      props.globalState.onGlobalStateChange((state: Record<string, any>) => {
        sharedState!.batchSet(state)
      })
    }

    // 创建 MicroApp 实例
    microApp = new MicroApp({
      name: name,
      entry: typeof component === 'function' ? { render: component } : component,
      container: props.container,
      eventBus,
      sharedState,
      props: currentProps,
      lifecycle: {
        afterMount: () => {
          console.log(`[MicroApp][${name}] Mounted successfully.`)
        },
        afterUnmount: () => {
          console.log(`[MicroApp][${name}] Unmounted.`)
        },
      },
    })

    await microApp.mount()
  }

  /**
   * unmount - 卸载
   */
  async function unmount(_props: QiankunProps): Promise<void> {
    console.log(`[MicroApp][${name}] Unmounting...`)

    if (microApp) {
      await microApp.unmount()
      microApp = null
    }
  }

  /**
   * update - 更新（可选）
   */
  async function update(props: QiankunProps): Promise<void> {
    console.log(`[MicroApp][${name}] Updating...`)

    if (microApp && props.data) {
      await microApp.update(props.data)
    }
  }

  return { bootstrap, mount, unmount, update }
}

// ============================================================
// micro-app 适配器
// ============================================================

/**
 * 生成 micro-app 入口
 *
 * 将 Lyt.js 应用适配为 micro-app 子应用。
 * micro-app 通过 Web Component 方式加载子应用，
 * 因此我们需要将 Lyt.js 组件注册为 Custom Element。
 *
 * @param options - 适配器配置
 * @returns micro-app 入口配置
 *
 * @example
 * ```ts
 * // child-app/main.ts
 * import { createMicroAppEntry } from '@lytjs/micro-frontend/adapters'
 * import { MyComponent } from './MyComponent'
 *
 * const entry = createMicroAppEntry({
 *   name: 'child-app',
 *   component: MyComponent,
 *   styles: ':host { display: block; }',
 * })
 *
 * // 注册为 Custom Element
 * entry.register()
 *
 * // 如果需要，可以手动挂载
 * // entry.mount('#app')
 * ```
 */
export function createMicroAppEntry(options: MicroAppAdapterOptions) {
  const { name, component, styles, eventBus, sharedState } = options

  // 生成 Custom Element 标签名
  const tagName = `micro-${name}`

  // 是否已注册
  let registered = false

  /**
   * 注册为 Custom Element
   */
  function register(): void {
    if (registered) return

    if (typeof (globalThis as any).customElements === 'undefined') {
      console.warn(
        `[MicroApp][${name}] Custom Elements API not available. ` +
        `Cannot register micro-app entry.`
      )
      return
    }

    // 动态导入 @lytjs/core 的 defineCustomElement
    tryImportDefineCustomElement().then((defineCustomElement) => {
      if (!defineCustomElement) {
        console.warn(
          `[MicroApp][${name}] @lytjs/core not available. ` +
          `Cannot register micro-app entry.`
        )
        return
      }

      const componentOptions = typeof component === 'function'
        ? { render: component }
        : component

      // 收集 observedAttributes
      const observedAttributes = componentOptions.props
        ? Object.keys(componentOptions.props).map((key: string) =>
            key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
          )
        : []

      defineCustomElement(tagName, componentOptions, {
        observedAttributes,
        styles,
      })

      registered = true
      console.log(`[MicroApp][${name}] Registered as <${tagName}>`)
    })
  }

  /**
   * 手动挂载到指定容器
   */
  async function mount(containerSelector: string): Promise<void> {
    const container = document.querySelector(containerSelector)
    if (!container) {
      throw new Error(`[MicroApp][${name}] Container "${containerSelector}" not found.`)
    }

    // 创建 Custom Element 并添加到容器
    const el = document.createElement(tagName)
    container.appendChild(el)
  }

  /**
   * 获取 Custom Element 标签名
   */
  function getTagName(): string {
    return tagName
  }

  return {
    name,
    tagName,
    register,
    mount,
    getTagName,
  }
}

/**
 * 动态导入 defineCustomElement
 */
async function tryImportDefineCustomElement(): Promise<((tagName: string, component: any, options?: any) => void) | null> {
  try {
    // 尝试从 @lytjs/core 导入
    const module = await import('@lytjs/core/web-component')
    return module.defineCustomElement || null
  } catch {
    return null
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 创建通用微前端配置
 *
 * 生成可用于多种微前端框架的配置对象。
 *
 * @param options - 配置选项
 * @returns 微前端配置
 *
 * @example
 * ```ts
 * const config = createMicroFrontendConfig({
 *   name: 'child-app',
 *   component: MyComponent,
 *   styles: ':host { display: block; }',
 * })
 *
 * // 用于 qiankun
 * const qiankunLifecycle = config.toQiankun()
 *
 * // 用于 micro-app
 * config.toMicroApp().register()
 * ```
 */
export function createMicroFrontendConfig(options: {
  name: string
  component: Record<string, any> | (() => any)
  styles?: string
  eventBus?: EventBus
  sharedState?: SharedState
}) {
  const qiankunLC = createQiankunLifeCycle(options)
  const microAppEntry = createMicroAppEntry(options)

  return {
    name: options.name,
    toQiankun: () => qiankunLC,
    toMicroApp: () => microAppEntry,
  }
}
