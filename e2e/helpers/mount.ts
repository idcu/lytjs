/**
 * e2e/helpers/mount.ts
 * E2E 测试工具函数 - 提供在浏览器中挂载/卸载 LytJS 组件的辅助方法
 *
 * 这些函数通过 page.evaluate 在浏览器环境中执行 LytJS 代码
 */
import type { Page } from '@playwright/test'

/**
 * 组件定义类型（浏览器端）
 */
export interface ComponentOptions {
  render?: () => any
  setup?: () => Record<string, any>
  data?: () => Record<string, any>
  methods?: Record<string, (...args: any[]) => any>
  [key: string]: any
}

/**
 * 挂载选项
 */
export interface MountOptions {
  /** 根容器选择器，默认 '#app' */
  container?: string
  /** 根属性 */
  props?: Record<string, unknown>
}

/**
 * 在页面中挂载 LytJS 组件
 *
 * @param page - Playwright Page 对象
 * @param component - 组件定义（函数或对象）
 * @param options - 挂载选项
 * @returns 挂载结果
 */
export async function mount(
  page: Page,
  component: string | ComponentOptions,
  options: MountOptions = {},
) {
  const container = options.container ?? '#app'
  const props = options.props ?? {}

  // 将组件定义序列化传入浏览器
  const componentStr =
    typeof component === 'string' ? component : JSON.stringify(component)

  return page.evaluate(
    async ({ componentStr, container, props }) => {
      const { createApp, h, defineComponent } = (window as any).LytJS

      // 解析组件
      let rootComponent: any
      if (typeof componentStr === 'string' && componentStr.startsWith('(')) {
        // 函数形式的组件 - 通过 Function 构造器还原
        rootComponent = new Function(
          'h',
          'ref',
          'reactive',
          'computed',
          'watch',
          'watchEffect',
          'onMounted',
          'onUnmounted',
          'onUpdated',
          'nextTick',
          'Fragment',
          `return (${componentStr})`,
        )(
          h,
          (window as any).LytJS.ref,
          (window as any).LytJS.reactive,
          (window as any).LytJS.computed,
          (window as any).LytJS.watch,
          (window as any).LytJS.watchEffect,
          (window as any).LytJS.onMounted,
          (window as any).LytJS.onUnmounted,
          (window as any).LytJS.onUpdated,
          (window as any).LytJS.nextTick,
          (window as any).LytJS.Fragment,
        )
      } else {
        // 对象形式的组件
        const compObj = JSON.parse(componentStr)
        if (compObj.render) {
          // render 是字符串形式，需要还原为函数
          if (typeof compObj.render === 'string') {
            compObj.render = new Function(
              'h',
              'ref',
              'reactive',
              'computed',
              'watch',
              'onMounted',
              'onUnmounted',
              'nextTick',
              `return (${compObj.render})`,
            )(
              h,
              (window as any).LytJS.ref,
              (window as any).LytJS.reactive,
              (window as any).LytJS.computed,
              (window as any).LytJS.watch,
              (window as any).LytJS.onMounted,
              (window as any).LytJS.onUnmounted,
              (window as any).LytJS.nextTick,
            )
          }
        }
        rootComponent = compObj
      }

      // 创建并挂载应用
      const app = createApp(rootComponent, props)
      const vm = app.mount(container)

      // 存储 app 实例引用，供 unmount 使用
      ;(window as any).__lytjs_app__ = app

      return {
        el: vm.$el,
        app: true, // 标记 app 已创建（不可序列化，仅作标记）
      }
    },
    { componentStr, container, props },
  )
}

/**
 * 卸载当前应用
 *
 * @param page - Playwright Page 对象
 */
export async function unmount(page: Page) {
  return page.evaluate(() => {
    // 从 window 上获取存储的 app 实例引用，调用 app.unmount() 正确卸载
    const app = (window as any).__lytjs_app__
    if (app) {
      app.unmount()
      ;(window as any).__lytjs_app__ = null
    } else {
      // 回退：直接清空容器内容
      const container = document.querySelector('#app')
      if (container) {
        container.innerHTML = ''
      }
    }
  })
}

/**
 * 触发 DOM 事件
 *
 * @param page - Playwright Page 对象
 * @param selector - 目标元素选择器
 * @param eventType - 事件类型（如 'click', 'input'）
 * @param options - 事件选项
 */
export async function triggerEvent(
  page: Page,
  selector: string,
  eventType: string,
  options: Record<string, any> = {},
) {
  return page.evaluate(
    ({ selector, eventType, options }) => {
      const el = document.querySelector(selector)
      if (!el) {
        throw new Error(`Element not found: ${selector}`)
      }
      const event = new Event(eventType, { bubbles: true, cancelable: true })
      Object.assign(event, options)
      el.dispatchEvent(event)
    },
    { selector, eventType, options },
  )
}

/**
 * 获取元素的文本内容
 *
 * @param page - Playwright Page 对象
 * @param selector - 目标元素选择器，默认 '#app'
 * @returns 元素的文本内容
 */
export async function getText(page: Page, selector = '#app'): Promise<string> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? el.textContent ?? '' : ''
  }, selector)
}

/**
 * 获取元素的 innerHTML
 *
 * @param page - Playwright Page 对象
 * @param selector - 目标元素选择器，默认 '#app'
 * @returns 元素的 innerHTML
 */
export async function getHTML(
  page: Page,
  selector = '#app',
): Promise<string> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? el.innerHTML : ''
  }, selector)
}

/**
 * 在浏览器中执行任意 LytJS 代码
 *
 * @param page - Playwright Page 对象
 * @param fn - 要执行的函数字符串
 * @param args - 传递给函数的参数
 * @returns 函数执行结果
 */
export async function evaluateInBrowser<T = any>(
  page: Page,
  fn: string,
  args: Record<string, any> = {},
): Promise<T> {
  return page.evaluate(
    (params) => {
      const { h, ref, reactive, computed, watch, watchEffect, onMounted, onUnmounted, onUpdated, nextTick, createApp, defineComponent, Fragment } =
        (window as any).LytJS
      const fn = new Function(
        'h',
        'ref',
        'reactive',
        'computed',
        'watch',
        'watchEffect',
        'onMounted',
        'onUnmounted',
        'onUpdated',
        'nextTick',
        'createApp',
        'defineComponent',
        'Fragment',
        'args',
        `return (${fn})(args)`,
      )
      return fn(h, ref, reactive, computed, watch, watchEffect, onMounted, onUnmounted, onUpdated, nextTick, createApp, defineComponent, Fragment, params)
    },
    args,
  )
}

/**
 * 等待下一个 DOM 更新周期
 *
 * @param page - Playwright Page 对象
 */
export async function nextTick(page: Page): Promise<void> {
  return page.evaluate(async () => {
    const { nextTick } = (window as any).LytJS
    await nextTick()
  })
}
