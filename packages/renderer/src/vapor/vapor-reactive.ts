/**
 * Lyt.js Vapor Mode - 响应式绑定
 *
 * 在 Vapor Mode 中，响应式信号直接绑定到 DOM 属性上，
 * 无需虚拟 DOM 中间层。当信号值变化时，直接更新对应的 DOM 节点。
 *
 * 每个绑定函数返回一个清理函数，用于在卸载时取消订阅。
 */

import type { Signal } from '@lytjs/reactivity/signal'
import { effect } from '@lytjs/reactivity/signal'

// ================================================================
//  类型定义
// ================================================================

/** DOM 元素接口（兼容真实 DOM 和 Mock DOM） */
export interface VaporElement {
  tagName: string
  nodeType: number
  textContent: string
  className: string
  childNodes: VaporElement[]
  parentNode: VaporElement | null
  style: Record<string, string> | CSSStyleDeclaration
  setAttribute(key: string, value: string): void
  removeAttribute(key: string): void
  addEventListener(event: string, handler: Function): void
  removeEventListener(event: string, handler: Function): void
  appendChild(child: VaporElement): void
  insertBefore(child: VaporElement, ref: VaporElement | null): void
  removeChild(child: VaporElement): void
  nextSibling: VaporElement | null
  firstChild: VaporElement | null
  innerHTML?: string
  hidden?: boolean
  value?: string
  checked?: boolean
  disabled?: boolean
  [key: string]: any
}

/** 绑定清理函数 */
export type BindingCleanup = () => void

// ================================================================
//  文本绑定
// ================================================================

/**
 * 将信号值绑定到元素的 textContent
 *
 * @param el    目标 DOM 元素
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindText(
  el: VaporElement,
  sig: Signal<any>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig()
    el.textContent = value == null ? '' : String(value)
  })
  return dispose
}

// ================================================================
//  属性绑定
// ================================================================

/**
 * 将信号值绑定到元素的 DOM 属性（如 value, checked, disabled 等）
 *
 * @param el    目标 DOM 元素
 * @param prop  属性名
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindProp(
  el: VaporElement,
  prop: string,
  sig: Signal<any>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig()
    ;(el as any)[prop] = value
  })
  return dispose
}

// ================================================================
//  HTML 属性绑定
// ================================================================

/**
 * 将信号值绑定到元素的 HTML 属性（通过 setAttribute）
 *
 * @param el    目标 DOM 元素
 * @param attr  属性名
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindAttr(
  el: VaporElement,
  attr: string,
  sig: Signal<any>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig()
    if (value == null || value === false) {
      el.removeAttribute(attr)
    } else {
      el.setAttribute(attr, value === true ? '' : String(value))
    }
  })
  return dispose
}

// ================================================================
//  Class 绑定
// ================================================================

/**
 * 将信号值绑定到元素的 className
 *
 * 支持三种形式：
 *   - 字符串：直接设置为 className
 *   - 对象：{ active: true, disabled: false } -> "active"
 *   - 数组：["class-a", "class-b"] -> "class-a class-b"
 *
 * @param el    目标 DOM 元素
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindClass(
  el: VaporElement,
  sig: Signal<any>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig()
    if (typeof value === 'string') {
      el.className = value
    } else if (Array.isArray(value)) {
      el.className = value.filter(Boolean).join(' ')
    } else if (typeof value === 'object' && value !== null) {
      const classes: string[] = []
      for (const key of Object.keys(value)) {
        if (value[key]) {
          classes.push(key)
        }
      }
      el.className = classes.join(' ')
    } else {
      el.className = ''
    }
  })
  return dispose
}

// ================================================================
//  事件绑定
// ================================================================

/**
 * 将事件处理器绑定到元素
 *
 * @param el      目标 DOM 元素
 * @param event   事件名
 * @param handler 事件处理函数
 * @returns 清理函数
 */
export function bindEvent(
  el: VaporElement,
  event: string,
  handler: Function
): BindingCleanup {
  el.addEventListener(event, handler)
  return () => {
    el.removeEventListener(event, handler)
  }
}

// ================================================================
//  条件渲染绑定
// ================================================================

/**
 * 根据信号值控制元素的显示/隐藏
 *
 * 当信号值为真值时显示元素，假值时隐藏元素。
 * 使用 display: none 方式隐藏，保留 DOM 结构。
 *
 * @param el    目标 DOM 元素
 * @param sig   响应式信号
 * @returns 清理函数
 */
export function bindIf(
  el: VaporElement,
  sig: Signal<any>
): BindingCleanup {
  const dispose = effect(() => {
    const value = sig()
    if (value) {
      (el as any).style = (el as any).style || {}
      if ((el as any).style.display === 'none') {
        (el as any).style.display = ''
      }
      (el as any).hidden = false
    } else {
      (el as any).style = (el as any).style || {}
      ;(el as any).style.display = 'none'
      ;(el as any).hidden = true
    }
  })
  return dispose
}

// ================================================================
//  列表渲染绑定
// ================================================================

/**
 * 根据信号数组渲染列表
 *
 * 当数组变化时，智能 diff 并更新 DOM。
 * 使用 key 进行高效的增删改操作。
 *
 * @param container   容器元素
 * @param sig         响应式信号（返回数组）
 * @param renderItem  渲染单项的函数，接收 (item, index) 返回 VaporElement
 * @param keyFn       可选的 key 提取函数，用于高效 diff
 * @returns 清理函数
 */
export function bindEach<T>(
  container: VaporElement,
  sig: Signal<T[]>,
  renderItem: (item: T, index: number) => VaporElement,
  keyFn?: (item: T, index: number) => string | number
): BindingCleanup {
  // 当前渲染的元素和 key 映射
  let currentElements: VaporElement[] = []
  let currentKeys: (string | number)[] = []
  const elementByKey = new Map<string | number, VaporElement>()

  const dispose = effect(() => {
    const items = sig()
    if (!Array.isArray(items)) return

    const newKeys = items.map((item, i) =>
      keyFn ? keyFn(item, i) : i
    )

    // 快速路径：长度相同且所有 key 相同 -> 原地更新
    if (newKeys.length === currentKeys.length) {
      let allSame = true
      for (let i = 0; i < newKeys.length; i++) {
        if (newKeys[i] !== currentKeys[i]) {
          allSame = false
          break
        }
      }
      if (allSame) {
        // 原地更新
        for (let i = 0; i < items.length; i++) {
          const newEl = renderItem(items[i], i)
          const oldEl = currentElements[i]
          if (oldEl && oldEl.parentNode === container) {
            container.replaceChild(newEl, oldEl)
          }
          currentElements[i] = newEl
        }
        return
      }
    }

    // 完整重建（简化实现，实际可用 keyed diff 优化）
    // 清除旧元素
    for (const el of currentElements) {
      if (el.parentNode === container) {
        container.removeChild(el)
      }
    }
    elementByKey.clear()
    currentElements = []
    currentKeys = []

    // 创建新元素
    for (let i = 0; i < items.length; i++) {
      const el = renderItem(items[i], i)
      container.appendChild(el)
      currentElements.push(el)
      currentKeys.push(newKeys[i])
      elementByKey.set(newKeys[i], el)
    }
  })

  return () => {
    dispose()
    // 清除所有子元素
    for (const el of currentElements) {
      if (el.parentNode === container) {
        container.removeChild(el)
      }
    }
    currentElements = []
    currentKeys = []
    elementByKey.clear()
  }
}
