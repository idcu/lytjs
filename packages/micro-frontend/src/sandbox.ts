/**
 * @lytjs/micro-frontend — 沙箱隔离
 *
 * 提供 JS 沙箱和 CSS 沙箱，确保子应用之间互不干扰。
 *
 * 核心功能：
 * - createSandbox: 创建 JS 沙箱（Proxy 拦截 window 访问）
 * - createStyleSandbox: 创建 CSS 沙箱（添加 scope 前缀）
 * - Sandbox 类型定义
 *
 * 纯原生零依赖实现（不依赖 Proxy polyfill）。
 */

// ============================================================
// 类型定义
// ============================================================

/**
 * 沙箱状态
 */
export type SandboxStatus = 'created' | 'active' | 'inactive'

/**
 * JS 沙箱接口
 */
export interface Sandbox {
  /** 沙箱状态 */
  status: SandboxStatus
  /** 沙箱内的 window 代理对象 */
  proxyWindow: Window
  /** 激活沙箱 */
  activate(): void
  /** 停用沙箱 */
  deactivate(): void
  /** 销毁沙箱，清理所有资源 */
  destroy(): void
}

/**
 * CSS 沙箱接口
 */
export interface StyleSandbox {
  /** scope 前缀 */
  scopePrefix: string
  /** 注入的样式元素列表 */
  styleElements: HTMLStyleElement[]
  /** 注入样式 */
  inject(css: string): HTMLStyleElement
  /** 移除所有注入的样式 */
  removeAll(): void
  /** 销毁 CSS 沙箱 */
  destroy(): void
}

/**
 * 沙箱配置选项
 */
export interface SandboxOptions {
  /** 沙箱名称（用于调试） */
  name?: string
  /** 是否记录新增的全局变量（默认 true） */
  trackGlobals?: boolean
  /** 需要拦截的全局变量白名单 */
  interceptGlobals?: string[]
  /** 需要透传给真实 window 的属性 */
  passThrough?: string[]
}

/**
 * CSS 沙箱配置选项
 */
export interface StyleSandboxOptions {
  /** 容器元素 */
  container: HTMLElement
  /** scope 前缀（默认自动生成） */
  prefix?: string
  /** 是否使用 Shadow DOM 隔离（默认 false） */
  useShadowDOM?: boolean
}

// ============================================================
// 常量：需要透传的 window 属性
// ============================================================

const WINDOW_PROPERTIES_TO_PASS_THROUGH = [
  // 事件构造器
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'TouchEvent',
  'MessageEvent',
  'ErrorEvent',
  'PromiseRejectionEvent',
  'FocusEvent',
  'InputEvent',
  'PopStateEvent',
  'HashChangeEvent',
  'AnimationEvent',
  'TransitionEvent',
  'WheelEvent',
  'DragEvent',
  'PointerEvent',
  'ClipboardEvent',
  // DOM 构造器
  'Document',
  'Window',
  'HTMLElement',
  'Element',
  'Node',
  'NodeList',
  'HTMLCollection',
  'DOMParser',
  'DOMException',
  'MutationObserver',
  'IntersectionObserver',
  'ResizeObserver',
  'PerformanceObserver',
  'AbortController',
  'AbortSignal',
  // 其他
  'Array',
  'ArrayBuffer',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Float32Array',
  'Float64Array',
  'Function',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Map',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'Reflect',
  'RegExp',
  'Set',
  'String',
  'Symbol',
  'TypeError',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'WeakMap',
  'WeakRef',
  'WeakSet',
  'JSON',
  'Math',
  'console',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'queueMicrotask',
  'fetch',
  'URL',
  'URLSearchParams',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'Blob',
  'File',
  'FileReader',
  'crypto',
  'structuredClone',
  'atob',
  'btoa',
  'TextEncoder',
  'TextDecoder',
  'escape',
  'unescape',
  'encodeURI',
  'decodeURI',
  'encodeURIComponent',
  'decodeURIComponent',
  'isNaN',
  'isFinite',
  'parseFloat',
  'parseInt',
  'NaN',
  'Infinity',
  'undefined',
]

// ============================================================
// JS 沙箱实现
// ============================================================

/**
 * 创建 JS 沙箱
 *
 * 使用 Proxy 拦截 window 访问，记录新增的全局变量，
 * 卸载时自动清理，防止子应用污染全局环境。
 *
 * @param options - 沙箱配置选项
 * @returns Sandbox 实例
 *
 * @example
 * ```ts
 * const sandbox = createSandbox({ name: 'child-app' })
 *
 * // 激活沙箱
 * sandbox.activate()
 *
 * // 在沙箱中执行代码
 * sandbox.proxyWindow.myGlobalVar = 'hello'
 *
 * // 停用沙箱（自动清理新增的全局变量）
 * sandbox.deactivate()
 *
 * // 销毁沙箱
 * sandbox.destroy()
 * ```
 */
export function createSandbox(options: SandboxOptions = {}): Sandbox {
  const {
    name = 'default',
    trackGlobals = true,
    interceptGlobals = [],
    passThrough = [],
  } = options

  // 合并透传属性列表
  const allPassThrough = new Set([
    ...WINDOW_PROPERTIES_TO_PASS_THROUGH,
    ...passThrough,
  ])

  // 记录沙箱新增的全局变量
  const addedGlobals = new Map<string, unknown>()

  // 记录被修改的全局变量（用于恢复）
  const modifiedGlobals = new Map<string, unknown>()

  // 沙箱状态
  let status: SandboxStatus = 'created'

  // 是否使用 fakeWindow 模式（非 Proxy 模式的降级方案）
  const useFakeWindow = typeof Proxy === 'undefined'

  // fakeWindow 对象（降级方案）
  const fakeWindow: Record<string, any> = {}

  /**
   * Proxy handler
   */
  const proxyHandler: ProxyHandler<Window> = {
    get(target: Window, key: string | symbol): unknown {
      // 优先从 fakeWindow 中读取
      if (useFakeWindow && typeof key === 'string' && key in fakeWindow) {
        return fakeWindow[key]
      }

      // 特殊处理
      if (key === 'window' || key === 'self' || key === 'globalThis') {
        return proxy
      }

      // 透传属性
      if (typeof key === 'string' && allPassThrough.has(key)) {
        const value = (target as any)[key]
        if (typeof value === 'function') {
          return value.bind(target)
        }
        return value
      }

      // 从 fakeWindow 读取（Proxy 模式）
      if (typeof key === 'string' && key in fakeWindow) {
        return fakeWindow[key]
      }

      // 从真实 window 读取
      const value = (target as any)[key]
      if (typeof value === 'function') {
        return value.bind(target)
      }
      return value
    },

    set(_target: Window, key: string | symbol, value: unknown): boolean {
      if (typeof key !== 'string') return true

      // 记录新增或修改的全局变量
      if (trackGlobals) {
        if (!(key in fakeWindow) && !(key in (window as any))) {
          addedGlobals.set(key, value)
        } else if (!(key in fakeWindow) && (key in (window as any))) {
          modifiedGlobals.set(key, (window as any)[key])
        }
      }

      // 写入 fakeWindow 而非真实 window
      fakeWindow[key] = value
      return true
    },

    has(_target: Window, key: string | symbol): boolean {
      if (typeof key === 'string') {
        return key in fakeWindow || key in (window as any)
      }
      return key in (window as any)
    },

    deleteProperty(_target: Window, key: string | symbol): boolean {
      if (typeof key === 'string') {
        delete fakeWindow[key]
        return true
      }
      return false
    },

    // 拦截 typeof 操作符
    getOwnPropertyDescriptor(_target: Window, key: string | symbol): PropertyDescriptor | undefined {
      if (typeof key === 'string' && key in fakeWindow) {
        return Object.getOwnPropertyDescriptor(fakeWindow, key)
      }
      return Object.getOwnPropertyDescriptor(_target, key as string)
    },

    // 拦截 in 操作符
    ownKeys(): ArrayLike<string | symbol> {
      return [...new Set([
        ...Object.keys(fakeWindow),
        ...Object.keys(window as any),
      ])]
    },
  }

  // 创建 proxy
  const proxy = useFakeWindow
    ? (fakeWindow as unknown as Window)
    : new Proxy(window, proxyHandler)

  /**
   * 激活沙箱
   */
  function activate(): void {
    if (status === 'active') return
    status = 'active'
  }

  /**
   * 停用沙箱
   */
  function deactivate(): void {
    if (status !== 'active') return
    status = 'inactive'

    // 清理新增的全局变量
    for (const key of addedGlobals.keys()) {
      delete fakeWindow[key]
    }
    addedGlobals.clear()

    // 恢复被修改的全局变量
    for (const [key, value] of modifiedGlobals) {
      fakeWindow[key] = value
    }
    modifiedGlobals.clear()
  }

  /**
   * 销毁沙箱
   */
  function destroy(): void {
    deactivate()
    // 清空 fakeWindow
    for (const key of Object.keys(fakeWindow)) {
      delete fakeWindow[key]
    }
    status = 'inactive'
  }

  return {
    get status() { return status },
    proxyWindow: proxy,
    activate,
    deactivate,
    destroy,
  }
}

// ============================================================
// CSS 沙箱实现
// ============================================================

/**
 * 生成唯一的 scope 前缀
 */
function generateScopePrefix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return `mf-${id}`
}

/**
 * 为 CSS 添加 scope 前缀
 *
 * 在所有选择器前添加 scope 前缀，实现 CSS 隔离。
 */
function addScopePrefix(css: string, prefix: string): string {
  return css.replace(
    /([^{}@/][^{}]*?)(\s*\{[^{}]*\})/g,
    (match, selector: string, body: string) => {
      // 跳过 @规则、:root、:host、html、body
      const trimmed = selector.trim()
      if (
        trimmed.startsWith('@') ||
        trimmed.includes(':root') ||
        trimmed.includes(':host') ||
        trimmed.startsWith('html') ||
        trimmed.startsWith('body') ||
        trimmed.startsWith('*')
      ) {
        return match
      }

      // 为选择器添加前缀
      const scopedSelector = selector
        .split(',')
        .map((part: string) => {
          const t = part.trim()
          if (!t || t.startsWith('@')) return part
          return `.${prefix} ${part}`
        })
        .join(', ')

      return scopedSelector + body
    }
  )
}

/**
 * 创建 CSS 沙箱
 *
 * 通过添加 scope 前缀实现 CSS 隔离，可选使用 Shadow DOM。
 *
 * @param options - CSS 沙箱配置选项
 * @returns StyleSandbox 实例
 *
 * @example
 * ```ts
 * const cssSandbox = createStyleSandbox({
 *   container: document.getElementById('app-container')!,
 * })
 *
 * // 注入样式
 * cssSandbox.inject('.button { color: red; }')
 *
 * // 清理
 * cssSandbox.removeAll()
 * cssSandbox.destroy()
 * ```
 */
export function createStyleSandbox(options: StyleSandboxOptions): StyleSandbox {
  const {
    container,
    prefix = generateScopePrefix(),
    useShadowDOM = false,
  } = options

  const styleElements: HTMLStyleElement[] = []
  let shadowRoot: ShadowRoot | null = null
  let styleContainer: HTMLElement | ShadowRoot = container

  // 如果使用 Shadow DOM，创建 Shadow Root
  if (useShadowDOM) {
    shadowRoot = container.attachShadow({ mode: 'open' })
    styleContainer = shadowRoot

    // 添加 scope class 到 host
    container.classList.add(prefix)
  } else {
    // 添加 scope class 到容器
    container.classList.add(prefix)
  }

  /**
   * 注入样式
   */
  function inject(css: string): HTMLStyleElement {
    const scopedCSS = addScopePrefix(css, prefix)

    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-scope', prefix)
    styleEl.textContent = scopedCSS

    if (shadowRoot) {
      shadowRoot.insertBefore(styleEl, shadowRoot.firstChild)
    } else {
      // 插入到 head 或容器前
      const target = document.head || document.documentElement
      target.appendChild(styleEl)
    }

    styleElements.push(styleEl)
    return styleEl
  }

  /**
   * 移除所有注入的样式
   */
  function removeAll(): void {
    for (const styleEl of styleElements) {
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl)
      }
    }
    styleElements.length = 0
  }

  /**
   * 销毁 CSS 沙箱
   */
  function destroy(): void {
    removeAll()
    container.classList.remove(prefix)
  }

  return {
    scopePrefix: prefix,
    get styleElements() { return [...styleElements] },
    inject,
    removeAll,
    destroy,
  }
}
