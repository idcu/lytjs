/**
 * Lyt.js 微前端示例 - 子应用组件定义
 *
 * 本文件定义了三个子应用组件（计数器、待办事项、主题切换），
 * 演示如何使用 Web Component 方式封装 Lyt.js 组件作为微前端子应用。
 */

// ============================================================
// 简易 Lyt.js 渲染函数（用于示例，实际使用 @lytjs/core）
// ============================================================

/**
 * 简易 h 函数 - 创建虚拟节点
 */
function h(type, props, children) {
  return { type, props: props || {}, children: children || null }
}

/**
 * 将 VNode 渲染为 DOM
 */
function renderToDOM(vnode, container) {
  if (!vnode) return

  if (typeof vnode === 'string' || typeof vnode === 'number') {
    const textNode = document.createTextNode(String(vnode))
    container.appendChild(textNode)
    return
  }

  if (Array.isArray(vnode)) {
    vnode.forEach(child => renderToDOM(child, container))
    return
  }

  const el = document.createElement(vnode.type)

  if (vnode.props) {
    for (const [key, value] of Object.entries(vnode.props)) {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value)
      } else if (key === 'class') {
        el.className = value
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase()
        el.addEventListener(eventName, value)
      } else if (key === 'ref' && typeof value === 'function') {
        value(el)
      } else {
        el.setAttribute(key, String(value))
      }
    }
  }

  if (vnode.children) {
    if (typeof vnode.children === 'string') {
      el.textContent = vnode.children
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => renderToDOM(child, el))
    }
  }

  container.appendChild(el)
  return el
}

// ============================================================
// 子应用 1: 计数器
// ============================================================

const CounterApp = {
  name: 'counter',

  state() {
    return {
      count: 0,
      step: 1,
    }
  },

  methods: {
    increment() {
      this.count += this.step
      this._render()
    },
    decrement() {
      this.count -= this.step
      this._render()
    },
    reset() {
      this.count = 0
      this._render()
    },
    setStep(s) {
      this.step = s
    },
  },

  render() {
    return h('div', { class: 'counter-app' }, [
      h('h2', { style: { marginBottom: '16px', color: '#333' } }, [
        `Lyt.js 计数器子应用`
      ]),
      h('div', { style: { fontSize: '48px', fontWeight: 'bold', textAlign: 'center', margin: '20px 0', color: '#667eea' } }, [
        String(this.count)
      ]),
      h('div', { style: { display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' } }, [
        h('button', {
          style: { padding: '10px 24px', fontSize: '16px', border: 'none', borderRadius: '6px', background: '#ff4757', color: 'white', cursor: 'pointer' },
          onClick: () => this.decrement(),
        }, ['-']),
        h('button', {
          style: { padding: '10px 24px', fontSize: '16px', border: 'none', borderRadius: '6px', background: '#2ed573', color: 'white', cursor: 'pointer' },
          onClick: () => this.increment(),
        }, ['+']),
        h('button', {
          style: { padding: '10px 24px', fontSize: '16px', border: 'none', borderRadius: '6px', background: '#ffa502', color: 'white', cursor: 'pointer' },
          onClick: () => this.reset(),
        }, ['重置']),
      ]),
      h('div', { style: { textAlign: 'center', color: '#888', fontSize: '14px' } }, [
        `步长: ${this.step} | 使用 Web Component 封装`
      ]),
    ])
  },

  // 内部渲染方法
  _render() {
    if (this._container) {
      this._container.innerHTML = ''
      const vnode = this.render()
      renderToDOM(vnode, this._container)
    }
  },
}

// ============================================================
// 子应用 2: 待办事项
// ============================================================

const TodoApp = {
  name: 'todo',

  state() {
    return {
      todos: [
        { id: 1, text: '学习 Lyt.js 微前端', done: true },
        { id: 2, text: '创建子应用', done: false },
        { id: 3, text: '集成到主应用', done: false },
      ],
      newTodo: '',
      nextId: 4,
    }
  },

  methods: {
    addTodo() {
      if (!this.newTodo.trim()) return
      this.todos.push({
        id: this.nextId++,
        text: this.newTodo.trim(),
        done: false,
      })
      this.newTodo = ''
      this._render()
    },
    toggleTodo(id) {
      const todo = this.todos.find(t => t.id === id)
      if (todo) todo.done = !todo.done
      this._render()
    },
    removeTodo(id) {
      this.todos = this.todos.filter(t => t.id !== id)
      this._render()
    },
    onInput(e) {
      this.newTodo = e.target.value
    },
    onKeyDown(e) {
      if (e.key === 'Enter') this.addTodo()
    },
  },

  render() {
    const remaining = this.todos.filter(t => !t.done).length

    return h('div', { class: 'todo-app' }, [
      h('h2', { style: { marginBottom: '16px', color: '#333' } }, [
        `Lyt.js 待办事项子应用`
      ]),
      // 输入框
      h('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } }, [
        h('input', {
          type: 'text',
          placeholder: '添加新任务...',
          value: this.newTodo,
          style: { flex: 1, padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none' },
          onInput: (e) => this.onInput(e),
          onKeyDown: (e) => this.onKeyDown(e),
          ref: (el) => {
            if (el && this._inputRef !== el) {
              this._inputRef = el
            }
          },
        }),
        h('button', {
          style: { padding: '10px 20px', border: 'none', borderRadius: '6px', background: '#667eea', color: 'white', cursor: 'pointer', fontSize: '14px' },
          onClick: () => this.addTodo(),
        }, ['添加']),
      ]),
      // 统计
      h('div', { style: { marginBottom: '12px', color: '#888', fontSize: '13px' } }, [
        `共 ${this.todos.length} 项，已完成 ${this.todos.length - remaining} 项，剩余 ${remaining} 项`
      ]),
      // 列表
      h('ul', { style: { listStyle: 'none', padding: 0 } },
        this.todos.map(todo =>
          h('li', {
            key: todo.id,
            style: {
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', marginBottom: '8px',
              background: '#f8f9fa', borderRadius: '6px',
              textDecoration: todo.done ? 'line-through' : 'none',
              opacity: todo.done ? '0.6' : '1',
            },
          }, [
            h('input', {
              type: 'checkbox',
              checked: todo.done,
              style: { width: '18px', height: '18px', cursor: 'pointer' },
              onChange: () => this.toggleTodo(todo.id),
            }),
            h('span', { style: { flex: 1, fontSize: '14px' } }, [todo.text]),
            h('button', {
              style: { padding: '4px 10px', border: 'none', borderRadius: '4px', background: '#ff4757', color: 'white', cursor: 'pointer', fontSize: '12px' },
              onClick: () => this.removeTodo(todo.id),
            }, ['删除']),
          ])
        )
      ),
    ])
  },

  _render() {
    if (this._container) {
      this._container.innerHTML = ''
      const vnode = this.render()
      renderToDOM(vnode, this._container)
    }
  },
}

// ============================================================
// 子应用 3: 主题切换
// ============================================================

const ThemeApp = {
  name: 'theme',

  state() {
    return {
      theme: 'light',
      primaryColor: '#667eea',
      fontSize: 14,
    }
  },

  methods: {
    setTheme(t) {
      this.theme = t
      this._render()
    },
    setColor(c) {
      this.primaryColor = c
      this._render()
    },
    setFontSize(s) {
      this.fontSize = s
      this._render()
    },
  },

  render() {
    const isDark = this.theme === 'dark'
    const bg = isDark ? '#1a1a2e' : '#ffffff'
    const fg = isDark ? '#e0e0e0' : '#333333'
    const cardBg = isDark ? '#16213e' : '#f5f7fa'

    return h('div', { class: 'theme-app', style: { background: bg, color: fg, padding: '20px', borderRadius: '8px', transition: 'all 0.3s' } }, [
      h('h2', { style: { marginBottom: '16px' } }, [
        `Lyt.js 主题切换子应用`
      ]),
      // 主题选择
      h('div', { style: { marginBottom: '16px' } }, [
        h('span', { style: { marginRight: '12px', fontWeight: '500' } }, ['主题：']),
        h('button', {
          style: {
            padding: '6px 16px', marginRight: '8px', border: `2px solid ${this.primaryColor}`,
            borderRadius: '4px', background: !isDark ? this.primaryColor : 'transparent',
            color: !isDark ? 'white' : fg, cursor: 'pointer',
          },
          onClick: () => this.setTheme('light'),
        }, ['浅色']),
        h('button', {
          style: {
            padding: '6px 16px', border: `2px solid ${this.primaryColor}`,
            borderRadius: '4px', background: isDark ? this.primaryColor : 'transparent',
            color: isDark ? 'white' : fg, cursor: 'pointer',
          },
          onClick: () => this.setTheme('dark'),
        }, ['深色']),
      ]),
      // 颜色选择
      h('div', { style: { marginBottom: '16px' } }, [
        h('span', { style: { marginRight: '12px', fontWeight: '500' } }, ['主色：']),
        ...['#667eea', '#ff4757', '#2ed573', '#ffa502', '#1e90ff', '#a55eea'].map(color =>
          h('button', {
            key: color,
            style: {
              width: '32px', height: '32px', borderRadius: '50%', border: color === this.primaryColor ? '3px solid #333' : '3px solid transparent',
              background: color, cursor: 'pointer', marginRight: '8px',
            },
            onClick: () => this.setColor(color),
          }, [])
        ),
      ]),
      // 字体大小
      h('div', { style: { marginBottom: '16px' } }, [
        h('span', { style: { marginRight: '12px', fontWeight: '500' } }, [`字号：${this.fontSize}px`]),
        h('input', {
          type: 'range', min: '12', max: '24', value: String(this.fontSize),
          style: { width: '200px' },
          onChange: (e) => this.setFontSize(Number(e.target.value)),
        }),
      ]),
      // 预览卡片
      h('div', { style: { background: cardBg, padding: '16px', borderRadius: '8px', fontSize: `${this.fontSize}px` } }, [
        h('h3', { style: { color: this.primaryColor, marginBottom: '8px' } }, ['预览效果']),
        h('p', { style: { lineHeight: '1.6' } }, [
          '这是一段示例文本，展示了当前主题的效果。你可以通过上方的控制面板来调整主题、颜色和字体大小。'
        ]),
        h('button', {
          style: {
            marginTop: '12px', padding: '8px 20px', border: 'none',
            borderRadius: '4px', background: this.primaryColor, color: 'white',
            cursor: 'pointer', fontSize: `${this.fontSize}px`,
          },
          onClick: () => {},
        }, ['示例按钮']),
      ]),
    ])
  },

  _render() {
    if (this._container) {
      this._container.innerHTML = ''
      const vnode = this.render()
      renderToDOM(vnode, this._container)
    }
  },
}

// ============================================================
// 注册子应用组件
// ============================================================

window.LytChildApps = {
  counter: CounterApp,
  todo: TodoApp,
  theme: ThemeApp,
}

// ============================================================
// 简易微前端运行时（示例用，实际使用 @lytjs/micro-frontend）
// ============================================================

window.LytMicroFrontend = (function() {
  // ---- EventBus ----
  class EventBus {
    constructor() { this._listeners = new Map() }
    on(event, callback) {
      if (!this._listeners.has(event)) this._listeners.set(event, new Set())
      this._listeners.get(event).add(callback)
      return () => this.off(event, callback)
    }
    once(event, callback) {
      const unsub = this.on(event, (...args) => { unsub(); callback(...args) })
      return unsub
    }
    off(event, callback) {
      const listeners = this._listeners.get(event)
      if (listeners) { listeners.delete(callback); if (listeners.size === 0) this._listeners.delete(event) }
    }
    emit(event, ...data) {
      const listeners = this._listeners.get(event)
      if (listeners) listeners.forEach(cb => { try { cb(...data) } catch(e) { console.error(e) } })
      // 通配符
      const colonIdx = event.indexOf(':')
      if (colonIdx !== -1) {
        const wc = this._listeners.get(event.slice(0, colonIdx + 1) + '*')
        if (wc) wc.forEach(cb => { try { cb(...data, event) } catch(e) { console.error(e) } })
      }
      const all = this._listeners.get('*')
      if (all) all.forEach(cb => { try { cb(...data, event) } catch(e) { console.error(e) } })
    }
    clear() { this._listeners.clear() }
    destroy() { this.clear() }
  }

  // ---- SharedState ----
  class SharedState {
    constructor() { this._state = new Map(); this._watchers = new Map(); this._globalWatchers = new Set() }
    set(key, value) {
      const old = this._state.get(key)
      this._state.set(key, value)
      if (old !== value) {
        const w = this._watchers.get(key)
        if (w) w.forEach(cb => { try { cb(value, old) } catch(e) {} })
        this._globalWatchers.forEach(cb => { try { cb(key, value, old) } catch(e) {} })
      }
    }
    get(key, defaultValue) { return this._state.has(key) ? this._state.get(key) : defaultValue }
    has(key) { return this._state.has(key) }
    remove(key) {
      const old = this._state.get(key)
      this._state.delete(key)
      const w = this._watchers.get(key)
      if (w) w.forEach(cb => { try { cb(undefined, old) } catch(e) {} })
    }
    watch(key, callback) {
      if (!this._watchers.has(key)) this._watchers.set(key, new Set())
      this._watchers.get(key).add(callback)
      return () => { const w = this._watchers.get(key); if (w) { w.delete(callback); if (w.size === 0) this._watchers.delete(key) } }
    }
    watchAll(callback) { this._globalWatchers.add(callback); return () => this._globalWatchers.delete(callback) }
    batchSet(values) { for (const [k, v] of Object.entries(values)) this.set(k, v) }
    keys() { return [...this._state.keys()] }
    values() { return [...this._state.values()] }
    entries() { return [...this._state.entries()] }
    clear() { const keys = [...this._state.keys()]; this._state.clear(); keys.forEach(k => { const w = this._watchers.get(k); if (w) w.forEach(cb => { try { cb(undefined, undefined) } catch(e) {} }) }) }
    destroy() { this.clear(); this._watchers.clear(); this._globalWatchers.clear() }
  }

  // ---- Sandbox ----
  function createSandbox(options = {}) {
    const fakeWindow = {}
    const addedGlobals = new Map()
    let status = 'created'

    const proxy = typeof Proxy !== 'undefined'
      ? new Proxy(window, {
          get(target, key) {
            if (key === 'window' || key === 'self' || key === 'globalThis') return proxy
            if (key in fakeWindow) return fakeWindow[key]
            const value = target[key]
            return typeof value === 'function' ? value.bind(target) : value
          },
          set(_target, key, value) {
            if (!(key in fakeWindow) && !(key in window)) addedGlobals.set(key, value)
            fakeWindow[key] = value
            return true
          },
          has(_target, key) { return key in fakeWindow || key in window },
        })
      : fakeWindow

    return {
      get status() { return status },
      proxyWindow: proxy,
      activate() { status = 'active' },
      deactivate() { status = 'inactive'; for (const k of addedGlobals.keys()) delete fakeWindow[k]; addedGlobals.clear() },
      destroy() { this.deactivate(); for (const k of Object.keys(fakeWindow)) delete fakeWindow[k]; status = 'inactive' },
    }
  }

  // ---- StyleSandbox ----
  function createStyleSandbox(options) {
    const { container, prefix = 'mf-' + Math.random().toString(36).slice(2, 8) } = options
    const styleElements = []
    container.classList.add(prefix)

    function inject(css) {
      const scoped = css.replace(/([^{}@/][^{}]*?)(\s*\{[^{}]*\})/g, (m, sel, body) => {
        if (sel.trim().startsWith('@') || sel.includes(':host') || sel.includes(':root')) return m
        return sel.split(',').map(p => `.${prefix} ${p}`).join(',') + body
      })
      const el = document.createElement('style')
      el.setAttribute('data-scope', prefix)
      el.textContent = scoped
      document.head.appendChild(el)
      styleElements.push(el)
      return el
    }

    function removeAll() { styleElements.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el) }); styleElements.length = 0 }
    function destroy() { removeAll(); container.classList.remove(prefix) }

    return { scopePrefix: prefix, get styleElements() { return [...styleElements] }, inject, removeAll, destroy }
  }

  // ---- MicroApp ----
  class MicroApp {
    constructor(options) {
      this.name = options.name
      this.entry = options.entry
      this.lifecycle = options.lifecycle || {}
      this._props = options.props || {}
      this._sandbox = options.sandbox || null
      this._styleSandbox = options.styleSandbox || null
      this._eventBus = options.eventBus || null
      this._sharedState = options.sharedState || null
      this._status = 'not_loaded'
      this._error = null
      this._customMount = options.customMount
      this._customUnmount = options.customUnmount
      this._customUpdate = options.customUpdate

      if (typeof options.container === 'string') {
        this._container = document.querySelector(options.container)
      } else {
        this._container = options.container
      }
    }

    getStatus() { return this._status }
    getInfo() { return { name: this.name, status: this._status, container: this._container, props: { ...this._props }, error: this._error } }

    async mount(extraProps) {
      if (this._status === 'mounted' || this._status === 'mounting') return
      if (extraProps) this._props = { ...this._props, ...extraProps }

      try {
        this._setStatus('loading')
        await this.lifecycle.beforeLoad?.()
        this._setStatus('loaded')
        await this.lifecycle.afterLoad?.()

        this._setStatus('mounting')
        await this.lifecycle.beforeMount?.(this._props)
        if (this._sandbox) this._sandbox.activate()

        if (this._customMount) {
          await this._customMount(this._container, this._props)
        } else {
          await this._mountComponent(this.entry)
        }

        this._setStatus('mounted')
        await this.lifecycle.afterMount?.(this._props)
        this._eventBus?.emit('app:mounted', { name: this.name })
      } catch (e) {
        this._error = e instanceof Error ? e : new Error(String(e))
        this._setStatus('mount_error')
        throw this._error
      }
    }

    async update(props) {
      if (this._status !== 'mounted') return
      try {
        this._setStatus('updating')
        await this.lifecycle.beforeUpdate?.(props)
        this._props = { ...this._props, ...props }
        if (this._customUpdate) {
          await this._customUpdate(this._container, this._props)
        } else {
          this._container?.dispatchEvent(new CustomEvent('props:update', { detail: this._props, bubbles: true, composed: true }))
        }
        this._setStatus('mounted')
        await this.lifecycle.afterUpdate?.(this._props)
        this._eventBus?.emit('app:updated', { name: this.name, props: this._props })
      } catch (e) {
        this._error = e instanceof Error ? e : new Error(String(e))
        this._setStatus('mounted')
        throw this._error
      }
    }

    async unmount() {
      if (this._status !== 'mounted') return
      try {
        this._setStatus('unmounting')
        await this.lifecycle.beforeUnmount?.()
        if (this._customUnmount) {
          await this._customUnmount(this._container)
        } else {
          if (this._container) this._container.innerHTML = ''
        }
        if (this._sandbox) this._sandbox.deactivate()
        if (this._styleSandbox) this._styleSandbox.removeAll()
        this._setStatus('unmounted')
        await this.lifecycle.afterUnmount?.()
        this._eventBus?.emit('app:unmounted', { name: this.name })
      } catch (e) {
        this._error = e instanceof Error ? e : new Error(String(e))
        this._setStatus('unmounted')
        throw this._error
      }
    }

    async destroy() {
      await this.unmount()
      if (this._sandbox) { this._sandbox.destroy(); this._sandbox = null }
      if (this._styleSandbox) { this._styleSandbox.destroy(); this._styleSandbox = null }
      this._error = null
      this._setStatus('not_loaded')
    }

    async _mountComponent(componentOptions) {
      if (!this._container) return
      const wrapper = document.createElement('div')
      wrapper.setAttribute('data-micro-app', this.name)
      this._container.appendChild(wrapper)

      // 初始化组件状态
      const state = componentOptions.state ? componentOptions.state() : {}
      const methods = componentOptions.methods || {}
      const ctx = { ...this._props, ...state, _container: wrapper }

      // 绑定方法
      for (const [key, method] of Object.entries(methods)) {
        if (typeof method === 'function') {
          ctx[key] = method.bind(ctx)
        }
      }

      // 添加 _render 方法
      ctx._render = function() {
        if (this._container) {
          this._container.innerHTML = ''
          const vnode = componentOptions.render.call(this)
          renderToDOM(vnode, this._container)
        }
      }

      // 初始渲染
      const vnode = componentOptions.render.call(ctx)
      renderToDOM(vnode, wrapper)
    }

    _setStatus(status) {
      const old = this._status
      this._status = status
      this._eventBus?.emit('app:status-change', { name: this.name, oldStatus: old, newStatus: status })
    }
  }

  return { EventBus, SharedState, createSandbox, createStyleSandbox, MicroApp }
})()

console.log('[MicroFrontend] 子应用组件已加载')
