/**
 * Lyt.js 渲染器 — 属性处理
 *
 * 本模块包含属性挂载和更新的相关函数。
 */

import type { LytRenderer } from './renderer-interfaces'

/**
 * 挂载单个 prop
 */
export function mountProp(
  renderer: LytRenderer,
  el: any,
  key: string,
  value: any,
): void {
  if (key === 'class') {
    renderer.setClass(el, value)
  } else if (key === 'style') {
    renderer.setStyle(el, value)
  } else if (key.startsWith('on') || key.startsWith('@')) {
    // 事件处理
    const eventName = key.startsWith('@')
      ? key.slice(1).toLowerCase()
      : key.slice(2).toLowerCase()
    renderer.addEventListener(el, eventName, value)
  } else if (key === 'key' || key === 'ref') {
    // key 和 ref 不处理
  } else {
    renderer.setAttribute(el, key, value)
  }
}

/**
 * 更新单个 prop
 */
export function patchSingleProp(
  renderer: LytRenderer,
  el: any,
  key: string,
  newValue: any,
  oldValue: any,
): void {
  if (key === 'class') {
    renderer.setClass(el, newValue)
  } else if (key === 'style') {
    renderer.setStyle(el, newValue || {})
  } else if (key.startsWith('on') || key.startsWith('@')) {
    // 事件更新
    const eventName = key.startsWith('@')
      ? key.slice(1).toLowerCase()
      : key.slice(2).toLowerCase()
    if (oldValue) {
      renderer.removeEventListener(el, eventName, oldValue)
    }
    if (newValue) {
      renderer.addEventListener(el, eventName, newValue)
    }
  } else {
    renderer.setAttribute(el, key, newValue)
  }
}

/**
 * 全量对比更新所有 props
 */
export function patchAllProps(
  renderer: LytRenderer,
  el: any,
  oldProps: Record<string, any>,
  newProps: Record<string, any>,
): void {
  // 遍历新 props，更新变化的属性
  for (const key in newProps) {
    if (key === 'key' || key === 'ref') continue
    const oldValue = oldProps[key]
    const newValue = newProps[key]
    if (newValue !== oldValue) {
      patchSingleProp(renderer, el, key, newValue, oldValue)
    }
  }

  // 遍历旧 props，移除在新 props 中不存在的属性
  for (const key in oldProps) {
    if (key === 'key' || key === 'ref') continue
    if (!(key in newProps)) {
      if (key === 'class') {
        renderer.setClass(el, '')
      } else if (key === 'style') {
        renderer.setStyle(el, {})
      } else if (key.startsWith('on') || key.startsWith('@')) {
        const eventName = key.startsWith('@')
          ? key.slice(1).toLowerCase()
          : key.slice(2).toLowerCase()
        renderer.removeEventListener(el, eventName, oldProps[key])
      } else {
        renderer.removeAttribute(el, key)
      }
    }
  }
}
