/**
 * @lytjs/core/web-component — Web Component 适配器子路径入口
 *
 * 按需导入 Web Component API：
 *   import { defineCustomElement, registerComponents } from '@lytjs/core/web-component'
 */

export {
  defineCustomElement,
  registerComponents,
  unregisterElement,
  isBrowser,
  defineCustomElementFromSFC,
} from './web-component'

export type {
  CustomElementOptions,
  ComponentRegistration,
} from './web-component'
