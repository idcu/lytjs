/**
 * Lyt.js 渲染器 — DOM 渲染器实现
 *
 * 本模块实现了 LytRenderer 接口，将所有操作映射到浏览器原生 DOM API。
 * 这是 Lyt.js 在浏览器环境下的默认渲染器。
 *
 * 实现要点：
 *   - createElement → document.createElement
 *   - createText → document.createTextNode
 *   - createComment → document.createComment
 *   - setAttribute → el.setAttribute / el[key] = val（特殊处理 class/style/event）
 *   - setStyle → el.style.cssText 或逐项设置
 *   - setClass → el.className
 *   - insert → parent.insertBefore(child, ref)
 *   - remove → parent.removeChild(child)
 *   - addEventListener → el.addEventListener
 *   - nextTick → Promise.resolve().then()
 *
 * 同时实现了 PatchDOMOperations 接口，用于向 @lytjs/vdom 的 patch 系统注册。
 */

import type { LytRenderer } from '../renderer-interfaces';
import { setDOMProp, removeDOMProp, isSVGElement } from './dom-ops';
import { patchClass, patchStyle, patchProp, patchAllProps as _patchAllProps, patchElementProps as _patchElementProps } from './patch-props';
import { patchEvent as _patchEvent, removeAllEventListeners } from './patch-events';

/* ================================================================
 *  DOMRenderer 实现
 * ================================================================ */

/**
 * DOMRenderer — 浏览器 DOM 渲染器
 *
 * 实现 LytRenderer 接口，所有操作直接映射到浏览器 DOM API。
 * 同时提供 PatchDOMOperations 接口所需的方法，用于注册到 vdom 的 patch 系统。
 */
export class DOMRenderer implements LytRenderer {
  /* ---- LytRenderer 接口实现 ---- */

  /**
   * 创建元素节点
   *
   * @param tag HTML 标签名
   * @returns DOM 元素
   */
  createElement(tag: string): any {
    // SVG 元素需要使用 createElementNS
    if (isSVGElement(tag)) {
      return document.createElementNS('http://www.w3.org/2000/svg', tag);
    }
    return document.createElement(tag);
  }

  /**
   * 创建文本节点
   *
   * @param text 文本内容
   * @returns DOM 文本节点
   */
  createText(text: string): any {
    return document.createTextNode(text);
  }

  /**
   * 创建注释节点
   *
   * @param text 注释内容
   * @returns DOM 注释节点
   */
  createComment(text: string): any {
    return document.createComment(text);
  }

  /**
   * 设置元素属性
   *
   * 智能区分 property 和 attribute：
   *   - class/style/event → 特殊处理
   *   - 布尔属性 → el.setAttribute(key, '') 或 el.removeAttribute(key)
   *   - DOM property → el[key] = val
   *   - 其他 → el.setAttribute(key, val)
   *
   * @param el  DOM 元素
   * @param key 属性名
   * @param val 属性值
   */
  setAttribute(el: any, key: string, val: any): void {
    setDOMProp(el, key, val);
  }

  /**
   * 移除元素属性
   *
   * @param el  DOM 元素
   * @param key 属性名
   */
  removeAttribute(el: any, key: string): void {
    removeDOMProp(el, key);
  }

  /**
   * 设置元素样式
   *
   * 支持字符串和对象两种形式：
   *   - 字符串：'color: red; font-size: 14px' → el.style.cssText
   *   - 对象：{ color: 'red', fontSize: '14px' } → 逐项设置
   *
   * @param el    DOM 元素
   * @param style 样式值
   */
  setStyle(el: any, style: object): void {
    if (typeof style === 'string') {
      el.style.cssText = style;
    } else if (style && typeof style === 'object') {
      for (const key in style) {
        el.style[key] = (style as Record<string, string>)[key];
      }
    }
  }

  /**
   * 设置元素 class
   *
   * 支持字符串和对象两种形式：
   *   - 字符串：'foo bar baz' → el.className
   *   - 对象：{ foo: true, bar: false } → 规范化为字符串
   *
   * @param el  DOM 元素
   * @param cls class 值
   */
  setClass(el: any, cls: string | object): void {
    if (typeof cls === 'string') {
      el.className = cls;
    } else if (cls && typeof cls === 'object') {
      // 对象形式：收集值为 truthy 的 key
      let result = '';
      for (const key in cls) {
        if ((cls as Record<string, unknown>)[key]) {
          result += (result ? ' ' : '') + key;
        }
      }
      el.className = result;
    } else {
      el.className = '';
    }
  }

  /**
   * 将子节点插入到父节点中
   *
   * @param parent 父节点
   * @param child  子节点
   * @param ref    参考节点（插入到其前面），如果为 null 则追加到末尾
   */
  insert(parent: any, child: any, ref?: any): void {
    if (ref !== null && ref !== undefined) {
      parent.insertBefore(child, ref);
    } else {
      parent.appendChild(child);
    }
  }

  /**
   * 从 DOM 中移除节点
   *
   * @param child 要移除的节点
   */
  remove(child: any): void {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
  }

  /**
   * 替换子节点
   *
   * @param parent   父节点
   * @param oldChild 被替换的旧节点
   * @param newChild 替换的新节点
   */
  replace(parent: any, oldChild: any, newChild: any): void {
    parent.replaceChild(newChild, oldChild);
  }

  /**
   * 添加事件监听器
   *
   * @param el      DOM 元素
   * @param event   事件名
   * @param handler 事件处理函数
   * @param options 事件选项（可选）
   */
  addEventListener(el: unknown, event: string, handler: (...args: unknown[]) => void, options?: unknown): void {
    (el as Element).addEventListener(event, handler as EventListener, options as AddEventListenerOptions);
  }

  /**
   * 移除事件监听器
   *
   * @param el      DOM 元素
   * @param event   事件名
   * @param handler 事件处理函数
   */
  removeEventListener(el: unknown, event: string, handler: (...args: unknown[]) => void): void {
    (el as Element).removeEventListener(event, handler as EventListener);
  }

  /**
   * 在下一个微任务中执行回调
   *
   * 使用 Promise.resolve().then() 实现微任务延迟。
   *
   * @param cb 回调函数
   */
  nextTick(cb: (...args: unknown[]) => void): void {
    Promise.resolve().then(cb);
  }

  /**
   * 获取父节点
   *
   * @param el DOM 元素
   * @returns 父节点，如果没有则返回 null
   */
  parentNode(el: any): any {
    return el.parentNode;
  }

  /**
   * 获取下一个兄弟节点
   *
   * @param el DOM 元素
   * @returns 下一个兄弟节点，如果没有则返回 null
   */
  nextSibling(el: any): any {
    return el.nextSibling;
  }

  /**
   * 查询选择器
   *
   * @param selector CSS 选择器
   * @returns 匹配的第一个元素，如果没有则返回 null
   */
  querySelector(selector: string): any {
    return document.querySelector(selector);
  }

  /* ---- PatchDOMOperations 接口实现 ---- */

  /**
   * 设置元素的 class（带新旧值对比）
   *
   * @param el      DOM 元素
   * @param value   新的 class 值
   * @param oldValue 旧的 class 值
   */
  setClassWithOld(el: any, value: any, oldValue: any): void {
    patchClass(el, value, oldValue);
  }

  /**
   * 设置元素的 style（带新旧值对比）
   *
   * @param el      DOM 元素
   * @param value   新的 style 值
   * @param oldValue 旧的 style 值
   */
  setStyleWithOld(el: any, value: any, oldValue: any): void {
    patchStyle(el, value, oldValue);
  }

  /**
   * 设置元素的 DOM 属性（带新旧值对比）
   *
   * @param el      DOM 元素
   * @param key     属性名
   * @param value   新值
   * @param oldValue 旧值
   */
  setAttributeWithOld(el: any, key: string, value: any, oldValue: any): void {
    patchProp(el, key, value, oldValue);
  }

  /**
   * 设置元素文本内容
   *
   * @param el   DOM 元素
   * @param text 文本内容
   */
  setElementText(el: any, text: string): void {
    el.textContent = text;
  }

  /**
   * 设置节点文本内容
   *
   * @param node 文本节点或注释节点
   * @param text 文本内容
   */
  setText(node: any, text: string): void {
    node.nodeValue = text;
  }

  /**
   * 将元素插入到参考节点之前
   *
   * @param parent 父节点
   * @param child  子节点
   * @param anchor 参考节点
   */
  insertBefore(parent: any, child: any, anchor: any): void {
    if (anchor !== null && anchor !== undefined) {
      parent.insertBefore(child, anchor);
    } else {
      parent.appendChild(child);
    }
  }

  /**
   * 从父容器中移除子节点
   *
   * @param parent 父节点
   * @param child  子节点
   */
  removeChild(parent: any, child: any): void {
    parent.removeChild(child);
  }

  /**
   * 设置 VNode 的锚点
   *
   * @param vnode  VNode
   * @param anchor 锚点 DOM 元素
   */
  setAnchor(vnode: any, anchor: any): void {
    vnode.anchor = anchor;
  }

  /**
   * 获取下一个兄弟节点
   *
   * @param node DOM 节点
   * @returns 下一个兄弟节点
   */
  getNextSibling(node: any): any {
    return node.nextSibling;
  }

  /**
   * 移除节点上的所有事件监听
   *
   * @param el DOM 元素
   */
  cleanupEvents(el: any): void {
    removeAllEventListeners(el);
  }
}

/* ================================================================
 *  单例导出
 * ================================================================ */

/**
 * 默认 DOM 渲染器实例（单例）
 *
 * 大多数场景下只需要一个 DOMRenderer 实例，
 * 因此导出一个预创建的单例供直接使用。
 */
export const domRenderer = new DOMRenderer();
