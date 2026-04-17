/**
 * Lyt.js 渲染器 — 渲染器抽象接口
 *
 * 本模块定义了平台无关的渲染器接口 LytRenderer，以及渲染器实例接口 RendererInstance。
 */

import type { VNode } from './vnode'

/* ================================================================
 *  LytRenderer 接口
 * ================================================================ */

/**
 * LytRenderer — 平台无关的渲染器接口
 *
 * 定义了渲染器需要实现的所有平台操作。
 * 不同的平台（浏览器 DOM、SSR、小程序等）可以实现此接口来接入渲染器。
 *
 * 设计原则：
 *   - 所有方法接收 any 类型的元素引用，保持平台无关性
 *   - 方法签名简洁，每个方法只做一件事
 *   - 不包含任何业务逻辑，纯粹的平台操作抽象
 */
export interface LytRenderer {
  /**
   * 创建元素节点
   * @param tag 标签名（如 'div', 'span'）
   * @returns 平台特定的元素引用
   */
  createElement(tag: string): any

  /**
   * 创建文本节点
   * @param text 文本内容
   * @returns 平台特定的文本节点引用
   */
  createText(text: string): any

  /**
   * 创建注释节点
   * @param text 注释内容
   * @returns 平台特定的注释节点引用
   */
  createComment(text: string): any

  /**
   * 设置元素属性
   * @param el  元素引用
   * @param key 属性名
   * @param val 属性值
   */
  setAttribute(el: any, key: string, val: any): void

  /**
   * 移除元素属性
   * @param el  元素引用
   * @param key 属性名
   */
  removeAttribute(el: any, key: string): void

  /**
   * 设置元素样式
   * @param el    元素引用
   * @param style 样式对象或字符串
   */
  setStyle(el: any, style: object): void

  /**
   * 设置元素 class
   * @param el  元素引用
   * @param cls class 值（字符串或对象）
   */
  setClass(el: any, cls: string | object): void

  /**
   * 插入子节点
   * @param parent 父节点
   * @param child  子节点
   * @param ref    参考节点（插入到其前面），可选
   */
  insert(parent: any, child: any, ref?: any): void

  /**
   * 移除节点
   * @param child 要移除的节点
   */
  remove(child: any): void

  /**
   * 替换子节点
   * @param parent   父节点
   * @param oldChild 被替换的旧节点
   * @param newChild 替换的新节点
   */
  replace(parent: any, oldChild: any, newChild: any): void

  /**
   * 添加事件监听器
   * @param el      元素引用
   * @param event   事件名
   * @param handler 事件处理函数
   * @param options 事件选项（可选）
   */
  addEventListener(el: any, event: string, handler: Function, options?: any): void

  /**
   * 移除事件监听器
   * @param el      元素引用
   * @param event   事件名
   * @param handler 事件处理函数
   */
  removeEventListener(el: any, event: string, handler: Function): void

  /**
   * 在下一个微任务中执行回调
   * @param cb 回调函数
   */
  nextTick(cb: Function): void

  /**
   * 获取父节点
   * @param el 元素引用
   * @returns 父节点引用
   */
  parentNode(el: any): any

  /**
   * 获取下一个兄弟节点
   * @param el 元素引用
   * @returns 下一个兄弟节点引用
   */
  nextSibling(el: any): any

  /**
   * 查询选择器
   * @param selector CSS 选择器
   * @returns 匹配的元素引用
   */
  querySelector(selector: string): any
}

/* ================================================================
 *  渲染器实例接口
 * ================================================================ */

/**
 * RendererInstance — 渲染器实例
 *
 * createRenderer 工厂函数返回的对象类型。
 * 提供挂载、更新、卸载三个核心方法。
 */
export interface RendererInstance {
  /**
   * 挂载 VNode 到容器
   *
   * 将 VNode 树渲染为真实 DOM 并插入到容器中。
   * 如果容器中已有内容，会先清空。
   *
   * @param vnode     VNode 树
   * @param container 容器元素
   */
  mount(vnode: VNode, container: any): void

  /**
   * 对比更新新旧 VNode
   *
   * 对比新旧 VNode 树，计算出最小更新操作并应用到真实 DOM。
   *
   * @param oldVNode 旧 VNode
   * @param newVNode 新 VNode
   * @param container 容器元素（可选）
   */
  patch(oldVNode: VNode, newVNode: VNode, container?: any): void

  /**
   * 卸载 VNode
   *
   * 从容器中移除 VNode 对应的真实 DOM，并清理事件监听等资源。
   *
   * @param vnode     VNode
   * @param container 容器元素（可选）
   */
  unmount(vnode: VNode, container?: any): void
}
