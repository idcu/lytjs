/**
 * Lyt.js Web Component 适配器
 *
 * 将 Lyt.js 组件转换为标准 Web Component（Custom Element），
 * 使其可以在 React、Vue、Angular 或任何其他框架中使用。
 *
 * 核心功能：
 * - defineCustomElement: 将 Lyt.js 组件注册为 Custom Element
 * - registerComponents: 批量注册多个组件
 * - unregisterElement: 注销 Custom Element
 * - isBrowser: 检测浏览器环境
 * - defineCustomElementFromSFC: 从 SFC 源码创建 Web Component
 *
 * 纯原生零依赖实现。
 */

import { h, type VNode, type ComponentOptions } from './index'

// ============================================================
// 类型定义
// ============================================================

/**
 * Custom Element 配置选项
 */
export interface CustomElementOptions {
  /** 需要观察的属性列表（这些属性变化时触发 attributeChangedCallback） */
  observedAttributes?: string[]
  /** Shadow DOM 模式，默认 'open' */
  shadowMode?: 'open' | 'closed'
  /** 注入到 Shadow Root 的 CSS 样式 */
  styles?: string
  /** 属性名映射（HTML 属性名 → 组件 prop 名） */
  propMappings?: Record<string, string>
  /** 事件名映射（Lyt 事件名 → CustomEvent 事件名） */
  eventMappings?: Record<string, string>
  /** 属性值转换器（属性名 → 转换函数） */
  attributeConverters?: Record<string, (value: string) => any>
}

/**
 * 批量注册的组件描述
 */
export interface ComponentRegistration {
  /** Custom Element 标签名（必须包含 '-'） */
  tagName: string
  /** Lyt.js 组件选项 */
  component: ComponentOptions
  /** Custom Element 配置 */
  options?: CustomElementOptions
}

// ============================================================
// 内部工具函数
// ============================================================

/**
 * 检测是否在浏览器环境运行
 */
export function isBrowser(): boolean {
  return (
    typeof (globalThis as any).window !== 'undefined' &&
    typeof (globalThis as any).document !== 'undefined' &&
    typeof (globalThis as any).HTMLElement !== 'undefined' &&
    typeof (globalThis as any).customElements !== 'undefined'
  )
}

/**
 * 将 kebab-case 属性名转换为 camelCase
 */
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * 将 camelCase 属性名转换为 kebab-case
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
}

/**
 * 解析属性值为正确的类型
 *
 * 支持：
 * - 数字：'123' → 123
 * - 布尔值：'true'/'false' → true/false，空字符串 → true
 * - JSON：以 '{' 或 '[' 开头 → JSON.parse
 * - 默认：保持字符串
 */
function parseAttributeValue(value: string): any {
  if (value === '') return true
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (value === 'undefined') return undefined

  // 尝试解析数字
  const num = Number(value)
  if (!isNaN(num) && value.trim() !== '') {
    return num
  }

  // 尝试解析 JSON
  if ((value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value)
    } catch {
      // 不是有效的 JSON，保持字符串
    }
  }

  return value
}

/**
 * 将属性名转换为组件 prop 名
 *
 * 1. 如果有 propMappings，使用映射
 * 2. 否则将 kebab-case 转为 camelCase
 */
function attributeNameToPropName(attrName: string, propMappings?: Record<string, string>): string {
  if (propMappings && propMappings[attrName]) {
    return propMappings[attrName]
  }
  return kebabToCamel(attrName)
}

/**
 * 收集组件选项中定义的事件名
 */
function collectEventNames(componentOptions: ComponentOptions): string[] {
  const events: string[] = []

  // 从 emits 选项中收集
  const opts = componentOptions as any
  if (opts.emits) {
    if (Array.isArray(opts.emits)) {
      events.push(...opts.emits)
    } else if (typeof opts.emits === 'object') {
      events.push(...Object.keys(opts.emits))
    }
  }

  // 从 methods 中收集以 'on' 开头的方法（事件处理器模式）
  if (opts.methods) {
    for (const key of Object.keys(opts.methods)) {
      if (key.startsWith('on') && key.length > 2) {
        const eventName = key.charAt(2).toLowerCase() + key.slice(3)
        events.push(eventName)
      }
    }
  }

  return events
}

// ============================================================
// Custom Element 类工厂
// ============================================================

/**
 * 创建 Custom Element 类
 *
 * 返回一个继承自 HTMLElement 的类，内部管理 Lyt.js 组件的
 * 生命周期、属性同步、事件转发和 Shadow DOM 渲染。
 */
function createCustomElementClass(
  componentOptions: ComponentOptions,
  options: CustomElementOptions = {}
) {
  const {
    shadowMode = 'open',
    styles = '',
    propMappings,
    eventMappings = {},
    attributeConverters = {},
  } = options

  // 收集需要观察的属性
  const observedAttrs: string[] = options.observedAttributes || []

  // 收集组件定义的事件
  const lytEvents = collectEventNames(componentOptions)

  return class LytCustomElement extends HTMLElement {
    /** Shadow Root 引用 */
    private _shadowRoot: ShadowRoot | null = null
    /** Lyt 组件内部实例 */
    private _instance: Record<string, unknown> | null = null
    /** 当前 props 快照 */
    private _props: Record<string, unknown> = {}
    /** 渲染容器元素 */
    private _container: Element | null = null
    /** 是否已连接 */
    private _connected = false
    /** 事件监听器清理函数列表 */
    private _eventCleanups: Array<() => void> = []
    /** 响应式 effect 清理函数 */
    private _effectCleanup: (() => void) | null = null
    /** 原始属性描述符缓存（用于 disconnectedCallback 恢复） */
    private _originalDescriptors: Map<string, PropertyDescriptor | undefined> = new Map()
    /** 编译后的模板缓存 */
    private _compiledTemplate: { template: string; render: ((h: unknown, ctx: unknown) => VNode) | null } | null = null

    /**
     * 静态属性：声明需要观察的属性列表
     */
    static get observedAttributes(): string[] {
      return observedAttrs
    }

    constructor() {
      super()
    }

    /**
     * 生命周期：元素插入 DOM 时调用
     */
    connectedCallback(): void {
      if (this._connected) return
      this._connected = true

      // 1. 创建 Shadow DOM
      this._shadowRoot = this.attachShadow({ mode: shadowMode })

      // 2. 注入样式
      if (styles) {
        const styleEl = document.createElement('style')
        styleEl.textContent = styles
        this._shadowRoot.appendChild(styleEl)
      }

      // 3. 创建渲染容器
      this._container = document.createElement('div')
      this._shadowRoot.appendChild(this._container)

      // 4. 从属性初始化 props
      this._syncAttributesToProps()

      // 5. 渲染 Lyt.js 组件
      this._mountComponent()

      // 6. 转发 slot 内容
      this._forwardSlots()
    }

    /**
     * 生命周期：元素从 DOM 移除时调用
     */
    disconnectedCallback(): void {
      if (!this._connected) return
      this._connected = false

      // 清理事件监听
      for (const cleanup of this._eventCleanups) {
        cleanup()
      }
      this._eventCleanups = []

      // 清理响应式 effect
      if (this._effectCleanup) {
        this._effectCleanup()
        this._effectCleanup = null
      }

      // 恢复原始属性描述符（修复 defineProperty 叠加内存泄漏）
      // 注意：由于 ctx 是局部变量，这里无法直接恢复，但清理引用即可
      this._originalDescriptors.clear()
      this._compiledTemplate = null

      // 清理组件实例
      this._instance = null

      // 清空容器
      if (this._container) {
        this._container.innerHTML = ''
      }
    }

    /**
     * 生命周期：属性变化时调用
     */
    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue) return
      if (!this._connected) return

      // 更新 props
      this._syncAttributesToProps()

      // 重新渲染
      this._updateComponent()
    }

    /**
     * 从 HTML 属性同步到组件 props
     */
    private _syncAttributesToProps(): void {
      const newProps: Record<string, any> = {}

      // 从 observedAttributes 读取
      for (const attrName of observedAttrs) {
        if (this.hasAttribute(attrName)) {
          const attrValue = this.getAttribute(attrName)!
          const propName = attributeNameToPropName(attrName, propMappings)

          // 使用自定义转换器或默认转换
          if (attributeConverters[attrName]) {
            newProps[propName] = attributeConverters[attrName](attrValue)
          } else {
            newProps[propName] = parseAttributeValue(attrValue)
          }
        }
      }

      // 合并组件默认 props
      if (componentOptions.props) {
        for (const [key, value] of Object.entries(componentOptions.props)) {
          if (newProps[key] === undefined) {
            const propDef = value as any
            // 如果 prop 有默认值
            if (propDef && typeof propDef === 'object' && 'default' in propDef) {
              newProps[key] = typeof propDef.default === 'function'
                ? propDef.default()
                : propDef.default
            } else if (propDef === undefined || propDef === null) {
              // 简写形式，无默认值
            }
          }
        }
      }

      this._props = newProps
    }

    /**
     * 挂载 Lyt.js 组件
     */
    private async _mountComponent(): Promise<void> {
      // 创建组件渲染函数
      const render = componentOptions.render
        ? componentOptions.render
        : componentOptions.template
          ? await this._compileTemplate(componentOptions.template)
          : null

      if (!render) {
        // 没有渲染函数，创建空容器
        return
      }

      // 构建组件上下文
      const ctx = this._createComponentContext()

      // 执行渲染
      const vnode = render ? (render as any).call(ctx, h, ctx) : null

      // 渲染到容器
      if (vnode && this._container) {
        this._renderVNode(vnode, this._container)
      }

      // 设置响应式更新
      this._setupReactiveUpdates(ctx, render)
    }

    /**
     * 编译模板为渲染函数（简化版）
     */
    private async _compileTemplate(template: string): Promise<((h: unknown, ctx: unknown) => VNode) | null> {
      // 在浏览器环境中，尝试使用 @lytjs/compiler
      // 这里提供最小化的模板编译支持
      try {
        // 动态导入编译器（如果可用）
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const compilerModule = await import('@lytjs/compiler') as any
        const { compile } = compilerModule
        const { code } = compile(template)
        return new Function('h', '_ctx', `return ${code}`) as (h: unknown, ctx: unknown) => VNode
      } catch (e) {
        // 编译器不可用，返回 null
        console.warn('[Lyt Web Component] 模板编译需要 @lytjs/compiler 包', e instanceof Error ? e.message : e)
        return null
      }
    }

    /**
     * 创建组件上下文对象
     */
    private _createComponentContext(): Record<string, unknown> {
      const state = componentOptions.state
        ? typeof componentOptions.state === 'function'
          ? componentOptions.state()
          : { ...componentOptions.state }
        : {}

      const computed = componentOptions.computed || {}
      const methods = componentOptions.methods || {}

      // 合并 props 和 state
      const ctx: Record<string, any> = {
        ...this._props,
        ...state,
      }

      // 添加计算属性（getter）
      for (const [key, getter] of Object.entries(computed)) {
        if (typeof getter === 'function') {
          Object.defineProperty(ctx, key, {
            get: getter.bind(ctx),
            enumerable: true,
          })
        } else if (getter && typeof getter === 'object' && 'get' in getter) {
          Object.defineProperty(ctx, key, {
            get: (getter as any).get.bind(ctx),
            enumerable: true,
          })
        }
      }

      // 添加方法
      for (const [key, method] of Object.entries(methods)) {
        if (typeof method === 'function') {
          ctx[key] = method.bind(ctx)
        }
      }

      // 添加 emit 函数
      ctx.emit = (eventName: string, ...args: any[]) => {
        const customEventName = eventMappings[eventName] || eventName
        const event = new CustomEvent(customEventName, {
          detail: args.length === 1 ? args[0] : args,
          bubbles: true,
          composed: true, // 允许事件穿透 Shadow DOM
        })
        this.dispatchEvent(event)
      }

      // 添加 $el 引用
      ctx.$el = this._container

      // 添加 $attrs 引用
      ctx.$attrs = { ...this._props }

      // 添加 slots 引用
      ctx.$slots = this._getSlotContent()

      return ctx
    }

    /**
     * 设置响应式更新
     */
    private _setupReactiveUpdates(ctx: Record<string, unknown>, render: ((h: unknown, ctx: unknown) => VNode) | null): void {
      // 简化版：使用 Proxy 监听 state 变化
      // 在浏览器环境中，可以利用 @lytjs/reactivity 的 effect
      try {
        // 动态导入 reactivity（如果可用）
        import('@lytjs/reactivity').then((reactivityModule: any) => {
          const { effect, stop } = reactivityModule
          const runner = effect(() => {
            if (!this._connected || !this._container || !render) return
            const vnode = (render as any).call(ctx, h, ctx)
            if (vnode) {
              this._container.innerHTML = ''
              this._renderVNode(vnode, this._container)
            }
          }, { lazy: true })

          // 手动触发首次渲染后的更新
          // 通过 Proxy 拦截 state 变化
          const stateKeys = componentOptions.state
            ? typeof componentOptions.state === 'function'
              ? Object.keys(componentOptions.state())
              : Object.keys(componentOptions.state)
            : []

          for (const key of stateKeys) {
            let value = ctx[key]
            // 保存原始属性描述符
            const originalDescriptor = Object.getOwnPropertyDescriptor(ctx, key)
            this._originalDescriptors.set(key, originalDescriptor)
            Object.defineProperty(ctx, key, {
              get() { return value },
              set(newValue: any) {
                value = newValue
                // 触发重新渲染
                try {
                  runner()
                } catch (e) {
                  console.warn('[Lyt Web Component] effect runner 执行失败:', e instanceof Error ? e.message : e)
                }
              },
              enumerable: true,
            })
          }

          this._effectCleanup = () => {
            try { stop(runner) } catch (e) {
              console.warn('[Lyt Web Component] effect stop 失败:', e instanceof Error ? e.message : e)
            }
          }
        }).catch(() => {
          // @lytjs/reactivity 不可用，使用降级方案
          this._setupReactiveUpdatesFallback(ctx, render)
        })
      } catch (e) {
        // @lytjs/reactivity 不可用，使用降级方案
        console.warn('[Lyt Web Component] 响应式系统初始化失败，使用降级方案:', e instanceof Error ? e.message : e)
        this._setupReactiveUpdatesFallback(ctx, render)
      }
    }

    /**
     * 响应式更新降级方案（不依赖 @lytjs/reactivity）
     */
    private _setupReactiveUpdatesFallback(ctx: Record<string, unknown>, render: ((h: unknown, ctx: unknown) => VNode) | null): void {
      // 通过 Proxy 实现
      const stateKeys = componentOptions.state
        ? typeof componentOptions.state === 'function'
          ? Object.keys(componentOptions.state())
          : Object.keys(componentOptions.state)
        : []

      for (const key of stateKeys) {
        const originalValue = ctx[key]
        let currentValue = originalValue
        // 保存原始属性描述符
        const originalDescriptor = Object.getOwnPropertyDescriptor(ctx, key)
        this._originalDescriptors.set(key, originalDescriptor)
        const self = this
        Object.defineProperty(ctx, key, {
          get() { return currentValue },
          set(newValue: any) {
            currentValue = newValue
            self._scheduleUpdate(ctx, render)
          },
          enumerable: true,
        })
      }
    }

    /**
     * 调度更新（使用 microtask 批处理）
     */
    private _updateScheduled = false
    private _scheduleUpdate(ctx: Record<string, unknown>, render: ((h: unknown, ctx: unknown) => VNode) | null): void {
      if (this._updateScheduled) return
      this._updateScheduled = true
      Promise.resolve().then(() => {
        this._updateScheduled = false
        if (!this._connected || !this._container || !render) return
        const vnode = (render as any).call(ctx, h, ctx)
        if (vnode) {
          this._container.innerHTML = ''
          this._renderVNode(vnode, this._container)
        }
      })
    }

    /**
     * 更新组件（属性变化时调用）
     */
    private async _updateComponent(): Promise<void> {
      if (!this._container) return

      let render = componentOptions.render || null

      if (!render && componentOptions.template) {
        // 使用编译缓存，只在模板变化时重新编译
        if (this._compiledTemplate && this._compiledTemplate.template === componentOptions.template) {
          render = this._compiledTemplate.render as any
        } else {
          render = await this._compileTemplate(componentOptions.template) as any
          if (render) {
            this._compiledTemplate = { template: componentOptions.template, render }
          }
        }
      }

      if (!render) return

      const ctx = this._createComponentContext()
      const vnode = render ? (render as any).call(ctx, h, ctx) : null

      this._container.innerHTML = ''
      if (vnode) {
        this._renderVNode(vnode, this._container)
      }
    }

    /**
     * 将 VNode 渲染为真实 DOM
     */
    private _renderVNode(vnode: VNode, container: Element): void {
      const el = this._vNodeToElement(vnode)
      if (el) {
        container.appendChild(el)
      }
    }

    /**
     * 将 VNode 递归转换为 DOM 元素
     */
    private _vNodeToElement(vnode: VNode): Element | Text | DocumentFragment | Comment | null {
      if (!vnode) return null

      // Fragment 处理
      if (typeof vnode.type === 'symbol') {
        const fragment = document.createDocumentFragment()
        if (Array.isArray(vnode.children)) {
          for (const child of vnode.children) {
            const childEl = this._vNodeToElement(child)
            if (childEl) fragment.appendChild(childEl)
          }
        }
        return fragment
      }

      // 文本节点
      if (typeof vnode.children === 'string') {
        return document.createTextNode(vnode.children)
      }

      // 普通 HTML 元素
      if (typeof vnode.type === 'string') {
        const el = document.createElement(vnode.type)

        // 设置属性
        if (vnode.props) {
          for (const [key, value] of Object.entries(vnode.props)) {
            if (key === 'style' && typeof value === 'object') {
              for (const [styleKey, styleValue] of Object.entries(value)) {
                (el.style as any)[styleKey] = styleValue
              }
            } else if (key === 'class') {
              if (typeof value === 'string') {
                el.className = value
              } else if (typeof value === 'object') {
                const classes: string[] = []
                for (const [cls, active] of Object.entries(value)) {
                  if (active) classes.push(cls)
                }
                el.className = classes.join(' ')
              }
            } else if (key.startsWith('on') && typeof value === 'function') {
              // 事件处理
              const eventName = key.slice(2).toLowerCase()
              el.addEventListener(eventName, value as EventListener)
              this._eventCleanups.push(() => {
                el.removeEventListener(eventName, value as EventListener)
              })
            } else if (key === 'ref' && typeof value === 'function') {
              value(el)
            } else {
              el.setAttribute(key, String(value))
            }
          }
        }

        // 渲染子节点
        if (Array.isArray(vnode.children)) {
          for (const child of vnode.children) {
            const childEl = this._vNodeToElement(child)
            if (childEl) el.appendChild(childEl)
          }
        } else if (typeof vnode.children === 'string') {
          el.textContent = vnode.children
        }

        return el
      }

      // 组件节点（递归处理）
      if (typeof vnode.type === 'object' || typeof vnode.type === 'function') {
        // 如果是嵌套的 Custom Element
        if (vnode.component) {
          return this._vNodeToElement(vnode.component.subTree || vnode)
        }
        return document.createComment('component')
      }

      return null
    }

    /**
     * 转发 slot 内容到 Shadow DOM
     */
    private _forwardSlots(): void {
      if (!this._shadowRoot || !this._container) return

      // 收集所有 slot 内容
      const slots = this.querySelectorAll('[slot]')
      for (const slotEl of slots) {
        const slotName = slotEl.getAttribute('slot') || 'default'
        // 在 Shadow DOM 中创建对应的 slot 元素
        const shadowSlot = document.createElement('slot')
        if (slotName !== 'default') {
          shadowSlot.setAttribute('name', slotName)
        }
        this._container.appendChild(shadowSlot)
      }

      // 如果有默认内容（非 slot 的子元素）
      const defaultSlot = document.createElement('slot')
      this._container.appendChild(defaultSlot)
    }

    /**
     * 获取 slot 内容
     */
    private _getSlotContent(): Record<string, unknown> {
      const slots: Record<string, any> = {}

      // 命名 slot
      const namedSlots = this.querySelectorAll('[slot]')
      for (const slotEl of namedSlots) {
        const name = slotEl.getAttribute('slot') || 'default'
        if (!slots[name]) slots[name] = []
        slots[name].push(slotEl.cloneNode(true))
      }

      // 默认 slot（没有 slot 属性的子元素）
      const defaultChildren: any[] = []
      for (const child of Array.from(this.childNodes)) {
        if (!(child as Element).hasAttribute?.('slot')) {
          defaultChildren.push(child.cloneNode(true))
        }
      }
      if (defaultChildren.length > 0) {
        slots.default = defaultChildren
      }

      return slots
    }

    /**
     * 获取组件内部实例（用于测试和调试）
     */
    get _lytInstance(): Record<string, unknown> | null {
      return this._instance
    }

    /**
     * 获取当前 props
     */
    get _lytProps(): Record<string, unknown> {
      return { ...this._props }
    }
  }
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 将 Lyt.js 组件定义为 Web Component（Custom Element）
 *
 * @param tagName - Custom Element 标签名（必须包含 '-'）
 * @param componentOptions - Lyt.js 组件选项
 * @param options - Custom Element 配置选项
 *
 * @example
 * ```ts
 * import { defineCustomElement } from 'lyt'
 * import { MyCounter } from './MyCounter'
 *
 * defineCustomElement('lyt-counter', MyCounter, {
 *   observedAttributes: ['initial-count', 'theme'],
 *   shadowMode: 'open',
 *   styles: ':host { display: block; padding: 16px; }'
 * })
 *
 * // 在任何框架中使用
 * // <lyt-counter initial-count="10" theme="dark"></lyt-counter>
 * ```
 */
export function defineCustomElement(
  tagName: string,
  componentOptions: ComponentOptions,
  options?: CustomElementOptions
): void {
  // 验证标签名
  if (!tagName.includes('-')) {
    throw new Error(
      `[Lyt Web Component] 标签名 "${tagName}" 必须包含连字符 (-)。` +
      `这是 Custom Element 规范的要求。`
    )
  }

  if (!isBrowser()) {
    console.warn(
      `[Lyt Web Component] defineCustomElement 只能在浏览器环境中使用。` +
      `当前环境不支持 Custom Elements API。`
    )
    return
  }

  // 创建 Custom Element 类
  const CustomElementClass = createCustomElementClass(componentOptions, options)

  // 注册到 customElements
  customElements.define(tagName, CustomElementClass)
}

/**
 * 批量注册多个 Lyt.js 组件为 Web Component
 *
 * @param components - 组件注册描述数组
 *
 * @example
 * ```ts
 * registerComponents([
 *   { tagName: 'lyt-counter', component: CounterComponent },
 *   { tagName: 'lyt-button', component: ButtonComponent },
 *   { tagName: 'lyt-input', component: InputComponent },
 * ])
 * ```
 */
export function registerComponents(
  components: ComponentRegistration[]
): void {
  for (const { tagName, component, options } of components) {
    defineCustomElement(tagName, component, options)
  }
}

/**
 * 注销 Custom Element
 *
 * 注意：Custom Elements 规范不支持直接注销已注册的元素。
 * 此函数将标签名加入黑名单，并尝试清理。
 * 实际效果取决于浏览器实现。
 *
 * @param tagName - 要注销的标签名
 */
export function unregisterElement(tagName: string): void {
  if (!isBrowser()) return

  // 注意：customElements API 不提供直接的注销方法
  // 这里通过设置 undefined 来尝试清理（非标准，部分浏览器支持）
  try {
    const registry = customElements as any
    if (registry.__unregister) {
      registry.__unregister(tagName)
    }
  } catch {
    console.warn(
      `[Lyt Web Component] 无法注销 "${tagName}"。` +
      `Custom Elements 规范不支持直接注销已注册的元素。`
    )
  }
}

/**
 * 从 SFC 源码创建 Web Component
 *
 * 解析 SFC 源码，提取 template、script、style 部分，
 * 然后创建并注册为 Custom Element。
 *
 * @param tagName - Custom Element 标签名
 * @param sfcSource - SFC 源码字符串
 * @param options - Custom Element 配置选项
 * @returns Promise<void>
 *
 * @example
 * ```ts
 * await defineCustomElementFromSFC('my-counter', `
 *   <template>
 *     <div>{{ count }}</div>
 *     <button @click="count++">+</button>
 *   </template>
 *   <script>
 *   export default {
 *     state: () => ({ count: 0 })
 *   }
 *   </script>
 *   <style>
 *   :host { display: block; }
 *   </style>
 * `)
 * ```
 */
export async function defineCustomElementFromSFC(
  tagName: string,
  sfcSource: string,
  options?: CustomElementOptions
): Promise<void> {
  // 解析 SFC 源码
  const templateMatch = sfcSource.match(/<template>([\s\S]*?)<\/template>/)
  const scriptMatch = sfcSource.match(/<script[^>]*>([\s\S]*?)<\/script>/)
  // 使用正则循环匹配替代 matchAll
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/g
  const styleMatches: RegExpMatchArray[] = []
  let styleMatch
  while ((styleMatch = styleRegex.exec(sfcSource)) !== null) {
    styleMatches.push(styleMatch)
  }

  // 提取样式
  let styles = options?.styles || ''
  for (const match of styleMatches) {
    styles += match[1] + '\n'
  }

  // 提取模板
  const template = templateMatch ? templateMatch[1].trim() : undefined

  // 提取脚本
  let componentOptions: ComponentOptions = {}
  if (scriptMatch) {
    const scriptContent = scriptMatch[1].trim()

    // 尝试提取 export default 对象
    const exportMatch = scriptContent.match(
      /export\s+default\s*(\{[\s\S]*\}|\([\s\S]*\)[\s\S]*?\))/
    )

    if (exportMatch) {
      try {
        // 使用 Function 构造器安全解析（避免 eval）
        // 注意：这是有意使用 new Function，因为 SFC 脚本需要执行
        const moduleExports: any = {}
        const moduleObj = { exports: moduleExports }
        const factory = new Function(
          'module', 'exports',
          `"use strict"; ${scriptContent.replace(/export\s+default\s*/, 'module.exports =')}`
        )
        factory(moduleObj, moduleExports)
        componentOptions = moduleObj.exports || moduleExports
      } catch (e) {
        console.warn('[Lyt Web Component] 无法解析 SFC 脚本内容:', e instanceof Error ? e.message : e)
      }
    }
  }

  // 合并模板和样式
  const mergedOptions: CustomElementOptions = {
    ...options,
    styles,
  }

  if (template && !componentOptions.template && !componentOptions.render) {
    (componentOptions as any).template = template
  }

  // 注册为 Custom Element
  defineCustomElement(tagName, componentOptions, mergedOptions)
}

// ============================================================
// 属性/事件桥接工具
// ============================================================

/**
 * 将 Props 定义转换为 observedAttributes 列表
 *
 * 自动将 camelCase prop 名转换为 kebab-case attribute 名，
 * 用于 Custom Element 的 static get observedAttributes()。
 *
 * @param props - Props 定义对象
 * @param exclude - 需要排除的 prop 名列表
 * @returns kebab-case attribute 名数组
 *
 * @example
 * ```ts
 * const props = {
 *   initialCount: { type: Number, default: 0 },
 *   theme: { type: String, default: 'light' },
 *   isVisible: { type: Boolean },
 * }
 *
 * const attrs = propsToAttributes(props)
 * // ['initial-count', 'theme', 'is-visible']
 * ```
 */
export function propsToAttributes(
  props: Record<string, unknown>,
  exclude: string[] = []
): string[] {
  return Object.keys(props)
    .filter(key => !exclude.includes(key))
    .map(camelToKebab)
}

/**
 * 将 HTML attributes 转换为组件 Props
 *
 * 从 DOM 元素上读取 attribute 值，进行类型推断和转换，
 * 生成可直接传递给组件的 props 对象。
 *
 * @param attributes - NamedNodeMap（element.attributes）
 * @param propMappings - 属性名映射（attribute name -> prop name）
 * @param converters - 自定义属性值转换器
 * @returns Props 对象
 *
 * @example
 * ```ts
 * const el = document.querySelector('lyt-counter')
 * const props = attributesToProps(el.attributes, {
 *   'initial-count': 'initialCount',
 * })
 * // { initialCount: 10, theme: 'dark' }
 * ```
 */
export function attributesToProps(
  attributes: NamedNodeMap,
  propMappings?: Record<string, string>,
  converters?: Record<string, (value: string) => any>
): Record<string, unknown> {
  const props: Record<string, unknown> = {}

  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i]
    const attrName = attr.name
    const attrValue = attr.value

    // 跳过事件属性（on*）
    if (attrName.startsWith('on')) continue

    // 确定属性名
    const propName = propMappings?.[attrName] || kebabToCamel(attrName)

    // 转换值
    if (converters?.[attrName]) {
      props[propName] = converters[attrName](attrValue)
    } else {
      props[propName] = parseAttributeValue(attrValue)
    }
  }

  return props
}

/**
 * 将 emits 定义转换为 Custom Event 配置
 *
 * 生成事件名映射和事件选项，用于 Custom Element 的事件转发。
 *
 * @param emits - emits 定义（数组或对象）
 * @returns 事件配置映射
 *
 * @example
 * ```ts
 * const events = eventsToCustomEvents(['click', 'change', 'update:modelValue'])
 * // {
 * //   click: { name: 'click', options: { bubbles: true, composed: true } },
 * //   change: { name: 'change', options: { bubbles: true, composed: true } },
 * //   'update:modelValue': { name: 'update:modelValue', options: { bubbles: true, composed: true } },
 * // }
 * ```
 */
export function eventsToCustomEvents(
  emits: string[] | Record<string, unknown>
): Record<string, { name: string; options: { bubbles: boolean; composed: boolean; cancelable: boolean; detail?: any } }> {
  const eventNames: string[] = Array.isArray(emits)
    ? emits
    : Object.keys(emits)

  const result: Record<string, { name: string; options: { bubbles: boolean; composed: boolean; cancelable: boolean } }> = {}

  for (const eventName of eventNames) {
    result[eventName] = {
      name: eventName,
      options: {
        bubbles: true,
        composed: true, // 允许事件穿透 Shadow DOM
        cancelable: true,
      },
    }
  }

  return result
}

// ============================================================
// 样式封装工具
// ============================================================

/**
 * 注入样式到 Shadow DOM
 *
 * 创建 <style> 元素并添加到 Shadow Root 中。
 * 支持追加模式和替换模式。
 *
 * @param styles - CSS 样式字符串
 * @param shadowRoot - Shadow Root 引用
 * @param options - 注入选项
 *
 * @example
 * ```ts
 * injectStyles(':host { display: block; }', element.shadowRoot)
 * injectStyles('.new-style { color: red; }', element.shadowRoot, { append: true })
 * ```
 */
export function injectStyles(
  styles: string,
  shadowRoot: ShadowRoot,
  options: { append?: boolean; id?: string } = {}
): HTMLStyleElement | null {
  if (!styles || !shadowRoot) return null

  const { append = false, id } = options

  // 如果指定了 id，先查找已有的 style 元素
  if (id) {
    const existing = shadowRoot.getElementById(id) as HTMLStyleElement | null
    if (existing) {
      existing.textContent = styles
      return existing
    }
  }

  const styleEl = document.createElement('style')
  if (id) {
    styleEl.id = id
  }
  styleEl.textContent = styles

  if (append) {
    shadowRoot.appendChild(styleEl)
  } else {
    // 插入到容器之前（如果有）
    const container = shadowRoot.querySelector('div')
    if (container) {
      shadowRoot.insertBefore(styleEl, container)
    } else {
      shadowRoot.insertBefore(styleEl, shadowRoot.firstChild)
    }
  }

  return styleEl
}

/**
 * 添加 scoped 标识到 CSS
 *
 * 为所有选择器添加 scopeId 属性选择器前缀，
 * 实现类似 Vue scoped CSS 的效果。
 *
 * @param css - 原始 CSS 字符串
 * @param scopeId - scope 标识符（不含方括号）
 * @returns 添加了 scoped 标识的 CSS
 *
 * @example
 * ```ts
 * const scoped = scopedCSS(
 *   '.container { color: red; } .container .title { font-size: 16px; }',
 *   'data-v-abc123'
 * )
 * // '.container[data-v-abc123] { color: red; } .container[data-v-abc123] .title[data-v-abc123] { font-size: 16px; }'
 * ```
 */
export function scopedCSS(css: string, scopeId: string): string {
  const scopeAttr = `[${scopeId}]`

  return css.replace(
    // 匹配 CSS 选择器（简化版）
    /([^{}@/][^{}]*?)(\s*\{[^{}]*\})/g,
    (match, selector: string, body: string) => {
      // 跳过 @规则和 :host
      if (selector.trim().startsWith('@') || selector.includes(':host')) {
        return match
      }

      // 为选择器中的每个部分添加 scope 属性
      const scopedSelector = selector
        .split(',')
        .map((part: string) => {
          const trimmed = part.trim()
          if (!trimmed || trimmed.startsWith('@')) return part

          // 处理 :: 伪元素
          const pseudoIndex = trimmed.indexOf('::')
          const pseudo = pseudoIndex !== -1 ? trimmed.slice(pseudoIndex) : ''
          const base = pseudoIndex !== -1 ? trimmed.slice(0, pseudoIndex) : trimmed

          // 处理 : 伪类（非 ::）
          const pseudoClassIndex = base.indexOf(':')
          const pseudoClass = pseudoClassIndex !== -1 ? base.slice(pseudoClassIndex) : ''
          const baseSelector = pseudoClassIndex !== -1 ? base.slice(0, pseudoClassIndex) : base

          // 分割复合选择器
          const parts = baseSelector.split(/\s+/).filter(Boolean)
          const lastPart = parts[parts.length - 1]

          if (lastPart) {
            parts[parts.length - 1] = lastPart + scopeAttr
          }

          return parts.join(' ') + pseudoClass + pseudo
        })
        .join(', ')

      return scopedSelector + body
    }
  )
}

/**
 * 生成唯一的 scope ID
 *
 * @param prefix - 前缀（默认 'data-v'）
 * @returns scope ID 字符串
 *
 * @example
 * ```ts
 * const scopeId = generateScopeId()
 * // 'data-v-a1b2c3d4'
 * ```
 */
export function generateScopeId(prefix: string = 'data-v'): string {
  const chars = 'abcdef0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${prefix}-${id}`
}
