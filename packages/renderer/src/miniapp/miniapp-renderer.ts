/**
 * MiniAppRenderer - 小程序渲染器原型
 *
 * 将 VNode 编译为小程序模板描述（可用于微信/支付宝/字节跳动小程序）。
 * 纯原生零依赖 TypeScript 实现。
 *
 * 设计思路：
 *   - 不直接操作 DOM，而是生成描述性的 MiniAppNode 树
 *   - MiniAppNode 可序列化为 WXML / AXML / TTML 模板字符串
 *   - 提供 Lyt.js 模板语法到小程序模板语法的转换
 *   - 支持条件渲染（wx:if / a:if / tt:if）、列表渲染（wx:for / a:for / tt:for）
 */

import type { LytRenderer } from '../renderer-interfaces';
import { MINIAPP_COMPONENT_MAP, EVENT_PREFIX_MAP } from './shared-constants';
import {
  insertChild,
  removeChild,
  replaceChild,
  getParentNode,
  getNextSibling,
  nextTick as sharedNextTick,
} from '../shared/abstract-renderer';

/* ================================================================
 *  小程序模板节点描述
 * ================================================================ */

/**
 * 小程序模板节点描述
 *
 * 描述一棵小程序模板组件树，可序列化为各平台模板字符串。
 */
export interface MiniAppNode {
  /** 标签名（如 'view', 'text', 'image'） */
  tag: string

  /** 属性集合 */
  attrs: Record<string, string>

  /** 子节点列表 */
  children: MiniAppNode[]

  /** 文本内容（文本节点使用） */
  text?: string

  /** wx:if 条件表达式 */
  wxIf?: string

  /** wx:for 列表数据源 */
  wxFor?: string

  /** wx:key 列表项标识 */
  wxForKey?: string

  /** 绑定事件（如 bindtap="handleTap"） */
  bindEvents: Record<string, string>

  /** 双向绑定（如 model:value="name"） */
  modelBindings: Record<string, string>

  /** 父节点引用（内部使用，不序列化） */
  _parent?: MiniAppNode
}

/* ================================================================
 *  Lyt.js 模板语法 → 小程序模板语法映射
 * ================================================================ */

/**
 * 指令映射表
 *
 * 将 Lyt.js 的模板指令映射为小程序模板属性。
 * 不同平台（微信/支付宝/字节）使用不同的前缀。
 */
const DIRECTIVE_MAP: Record<string, { attr: string; prefix?: string }> = {
  'if':         { attr: 'if' },
  'else':       { attr: 'else' },
  'each':       { attr: 'for', prefix: '' },
  'bind':       { attr: 'model:' },
  'on':         { attr: 'bind', prefix: '' },
  'ref':        { attr: '' },       // 小程序无 ref 概念
  'slot':       { attr: 'slot' },
  'class':      { attr: 'class' },
  'style':      { attr: 'style' },
  'show':       { attr: 'hidden' }, // v-show → hidden（取反）
};

/* ================================================================
 *  事件映射
 * ================================================================ */

/* ================================================================
 *  平台条件前缀配置
 * ================================================================ */

/** 各平台模板语法的条件/列表前缀 */
const PLATFORM_PREFIX: Record<string, { if: string; else: string; for: string; forKey: string; bind: string; catch: string }> = {
  wechat:    { if: 'wx:if',    else: 'wx:else',    for: 'wx:for',    forKey: 'wx:key',    bind: 'bind',    catch: 'catch' },
  alipay:    { if: 'a:if',     else: 'a:else',     for: 'a:for',     forKey: 'a:key',     bind: 'on',      catch: 'catchEvent' },
  bytedance: { if: 'tt:if',    else: 'tt:else',    for: 'tt:for',    forKey: 'tt:key',    bind: 'bind',    catch: 'catch' },
};

/* ================================================================
 *  MiniAppRenderer 实现
 * ================================================================ */

/**
 * MiniAppRenderer - 小程序渲染器
 *
 * 实现 LytRenderer 接口，将 VNode 映射为小程序模板描述树。
 * 不依赖任何外部库，纯 TypeScript 实现。
 *
 * 使用示例：
 * ```ts
 * import { miniAppRenderer } from './miniapp/miniapp-renderer'
 *
 * // 创建小程序节点
 * const view = miniAppRenderer.createElement('div')
 * miniAppRenderer.setAttribute(view, 'class', 'container')
 *
 * const text = miniAppRenderer.createText('Hello MiniApp')
 * miniAppRenderer.insert(view, text)
 *
 * // 序列化为 WXML（微信小程序模板）
 * const wxml = miniAppRenderer.serializeToWXML(view)
 * ```
 */
export class MiniAppRenderer implements LytRenderer {
  /* --------------------------------------------------
   *  节点创建
   * -------------------------------------------------- */

  /**
   * 创建小程序元素节点
   * @param tag HTML 标签名（如 'div', 'span'）
   * @returns MiniAppNode 描述对象
   */
  createElement(tag: string): MiniAppNode {
    const miniTag = MINIAPP_COMPONENT_MAP[tag] || tag;
    return {
      tag: miniTag,
      attrs: {},
      children: [],
      bindEvents: {},
      modelBindings: {},
    };
  }

  /**
   * 创建文本节点
   * @param text 文本内容
   * @returns tag 为 '__text__' 的 MiniAppNode
   */
  createText(text: string): MiniAppNode {
    return {
      tag: '__text__',
      attrs: {},
      children: [],
      text,
      bindEvents: {},
      modelBindings: {},
    };
  }

  /**
   * 创建注释节点
   * @param text 注释内容
   * @returns tag 为 '__comment__' 的 MiniAppNode
   */
  createComment(text: string): MiniAppNode {
    return {
      tag: '__comment__',
      attrs: {},
      children: [],
      text,
      bindEvents: {},
      modelBindings: {},
    };
  }

  /* --------------------------------------------------
   *  属性操作
   * -------------------------------------------------- */

  /**
   * 设置元素属性
   * @param el  小程序节点
   * @param key 属性名
   * @param val 属性值
   */
  setAttribute(el: MiniAppNode, key: string, val: any): void {
    if (!el) return;

    // Lyt.js 指令处理
    if (key.startsWith('lyt:')) {
      const directive = key.slice(4);
      this._applyDirective(el, directive, val);
      return;
    }

    // v-if / v-else 指令（兼容 Vue 风格）
    if (key === 'v-if' || key === 'if') {
      el.wxIf = String(val);
      return;
    }
    if (key === 'v-else' || key === 'else') {
      el.attrs['wx:else'] = '';
      return;
    }

    // v-for 指令
    if (key === 'v-for' || key === 'each') {
      // 解析 "item in list" 或 "(item, index) in list" 语法
      const forExpr = String(val);
      const match = forExpr.match(/(?:\((\w+),\s*(\w+)\)|(\w+))\s+in\s+(.+)/);
      if (match) {
        el.wxFor = match[4] || match[3];
        el.wxForKey = match[1] || match[3];
      } else {
        el.wxFor = forExpr;
      }
      return;
    }

    // 事件属性（onClick → 存储为 tap，序列化时按平台加前缀）
    if (key.startsWith('on') && typeof val === 'function') {
      const domEvent = key.slice(2).toLowerCase();
      const miniEvent = EVENT_PREFIX_MAP[domEvent] || domEvent;
      el.bindEvents[miniEvent] = val.name || 'handleEvent';
      return;
    }

    // v-model 双向绑定
    if (key === 'v-model' || key === 'model') {
      el.modelBindings['value'] = String(val);
      return;
    }

    // class / style 直接设置
    if (key === 'class' || key === 'className') {
      el.attrs['class'] = String(val);
      return;
    }
    if (key === 'style') {
      if (typeof val === 'object' && val !== null) {
        // 对象样式转字符串
        el.attrs['style'] = this._styleObjectToString(val);
      } else {
        el.attrs['style'] = String(val);
      }
      return;
    }

    // src → src（小程序 image 组件使用 src）
    // href → url（小程序 navigator 组件使用 url）
    if (key === 'href' && el.tag === 'navigator') {
      el.attrs['url'] = String(val);
      return;
    }

    // 其他属性直接设置
    el.attrs[key] = String(val);
  }

  /**
   * 移除元素属性
   * @param el  小程序节点
   * @param key 属性名
   */
  removeAttribute(el: MiniAppNode, key: string): void {
    if (!el) return;

    if (key === 'v-if' || key === 'if') {
      delete el.wxIf;
    } else if (key === 'v-for' || key === 'each') {
      delete el.wxFor;
      delete el.wxForKey;
    } else if (key.startsWith('on')) {
      const domEvent = key.slice(2).toLowerCase();
      const miniEvent = EVENT_PREFIX_MAP[domEvent] || domEvent;
      delete el.bindEvents[miniEvent];
    } else {
      delete el.attrs[key];
    }
  }

  /**
   * 设置元素样式
   * @param el    小程序节点
   * @param style 样式对象
   */
  setStyle(el: MiniAppNode, style: object): void {
    if (!el) return;
    const styleStr = this._styleObjectToString(style as Record<string, string>);
    el.attrs['style'] = styleStr;
  }

  /**
   * 设置元素 class
   * @param el  小程序节点
   * @param cls class 值（字符串或对象）
   */
  setClass(el: MiniAppNode, cls: string | object): void {
    if (!el) return;
    if (typeof cls === 'string') {
      el.attrs['class'] = cls;
    } else if (typeof cls === 'object' && cls !== null) {
      const classList: string[] = [];
      for (const [name, value] of Object.entries(cls)) {
        if (value) classList.push(name);
      }
      el.attrs['class'] = classList.join(' ');
    }
  }

  /* --------------------------------------------------
   *  结构操作
   * -------------------------------------------------- */

  /**
   * 插入子节点
   * @param parent 父节点
   * @param child  子节点
   * @param ref    参考节点（插入到其前面），可选
   */
  insert(parent: MiniAppNode, child: MiniAppNode, ref?: MiniAppNode): void {
    insertChild(parent, child, ref);
  }

  /**
   * 移除节点
   * @param child 要移除的节点
   */
  remove(child: MiniAppNode): void {
    removeChild(child);
  }

  /**
   * 替换子节点
   * @param parent   父节点
   * @param oldChild 被替换的旧节点
   * @param newChild 替换的新节点
   */
  replace(parent: MiniAppNode, oldChild: MiniAppNode, newChild: MiniAppNode): void {
    replaceChild(parent, oldChild, newChild);
  }

  /* --------------------------------------------------
   *  事件操作
   * -------------------------------------------------- */

  /**
   * 添加事件监听器
   * @param el      小程序节点
   * @param event   DOM 事件名（如 'click'）
   * @param handler 事件处理函数
   * @param options 事件选项（可选）
   */
  addEventListener(el: MiniAppNode, event: string, handler: Function, _options?: any): void {
    if (!el) return;
    // 存储为平台无关的事件名（如 tap），序列化时按平台加前缀
    const miniEvent = EVENT_PREFIX_MAP[event] || event;
    // 小程序中事件处理函数名必须是字符串（模板中引用）
    el.bindEvents[miniEvent] = handler.name || 'handleEvent';
  }

  /**
   * 移除事件监听器
   * @param el      小程序节点
   * @param event   DOM 事件名
   * @param handler 事件处理函数
   */
  removeEventListener(el: MiniAppNode, event: string, _handler: Function): void {
    if (!el) return;
    const miniEvent = EVENT_PREFIX_MAP[event] || event;
    delete el.bindEvents[miniEvent];
  }

  /* --------------------------------------------------
   *  其他 LytRenderer 接口方法
   * -------------------------------------------------- */

  /**
   * 在下一个微任务中执行回调
   * @param cb 回调函数
   */
  nextTick(cb: Function): void {
    sharedNextTick(cb);
  }

  /**
   * 获取父节点
   * @param el 小程序节点
   * @returns 父节点，无父节点时返回 null
   */
  parentNode(el: MiniAppNode): MiniAppNode | null {
    return getParentNode(el) as MiniAppNode | null;
  }

  /**
   * 获取下一个兄弟节点
   * @param el 小程序节点
   * @returns 下一个兄弟节点，无时返回 null
   */
  nextSibling(el: MiniAppNode): MiniAppNode | null {
    return getNextSibling(el) as MiniAppNode | null;
  }

  /**
   * 设置文本节点内容
   * @param node 文本节点
   * @param text 文本内容
   */
  setText(node: MiniAppNode, text: string): void {
    if (!node) return;
    if (node.tag === '__text__') {
      node.text = text;
    }
  }

  /**
   * 更新元素属性（diff 算法调用）
   *
   * @param el        小程序节点
   * @param key       属性名
   * @param prevValue 旧属性值
   * @param nextValue 新属性值
   */
  patchProp(el: MiniAppNode, key: string, prevValue: any, nextValue: any): void {
    if (!el) return;

    // 移除属性
    if (nextValue === null || nextValue === undefined) {
      this.removeAttribute(el, key);
      return;
    }

    // 新增或更新属性
    if (key === 'style') {
      this.setStyle(el, nextValue);
    } else if (key === 'class' || key === 'className') {
      this.setClass(el, nextValue);
    } else if (key.startsWith('on') && typeof nextValue === 'function') {
      const domEvent = key.slice(2).toLowerCase();
      const miniEvent = EVENT_PREFIX_MAP[domEvent] || domEvent;
      el.bindEvents[miniEvent] = nextValue.name || 'handleEvent';
    } else {
      this.setAttribute(el, key, nextValue);
    }
  }

  /**
   * 查询选择器（原型简化实现）
   * @param selector CSS 选择器
   * @returns 匹配的第一个节点，未找到返回 null
   */
  querySelector(_selector: string): MiniAppNode | null {
    // 原型实现：需要持有根节点引用才能遍历
    return null;
  }

  /* --------------------------------------------------
   *  小程序特有方法
   * -------------------------------------------------- */

  /**
   * 将 VNode 树转换为小程序节点树
   *
   * 递归遍历 VNode，将每个节点转换为对应的 MiniAppNode 描述。
   *
   * @param vnode VNode 对象
   * @returns MiniAppNode 树
   */
  renderToMiniAppTree(vnode: any): MiniAppNode {
    if (!vnode) {
      return this.createComment('empty vnode');
    }

    // 文本节点
    if (typeof vnode === 'string') {
      return this.createText(vnode);
    }

    // 注释节点
    if (vnode.type === Symbol.for('lyt.comment') || vnode.type === 'comment') {
      return this.createComment(vnode.children || '');
    }

    // 文本节点（Symbol 形式）
    if (vnode.type === Symbol.for('lyt.text') || vnode.type === 'text') {
      return this.createText(vnode.children || '');
    }

    // Fragment 节点
    if (vnode.type === Symbol.for('lyt.fragment') || vnode.type === 'fragment') {
      const fragment = this.createElement('__fragment__');
      if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
          this.insert(fragment, this.renderToMiniAppTree(child));
        }
      }
      return fragment;
    }

    // 普通 HTML 元素
    if (typeof vnode.type === 'string') {
      const node = this.createElement(vnode.type);

      // 处理 props
      if (vnode.props) {
        for (const [key, val] of Object.entries(vnode.props)) {
          if (key === 'key' || key === 'ref') continue;
          this.setAttribute(node, key, val);
        }
      }

      // 处理 children
      if (vnode.children) {
        if (typeof vnode.children === 'string') {
          this.insert(node, this.createText(vnode.children));
        } else if (Array.isArray(vnode.children)) {
          for (const child of vnode.children) {
            this.insert(node, this.renderToMiniAppTree(child));
          }
        }
      }

      return node;
    }

    // 组件节点
    if (typeof vnode.type === 'object' || typeof vnode.type === 'function') {
      const node = this.createElement('div');
      if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
          this.insert(node, this.renderToMiniAppTree(child));
        }
      }
      return node;
    }

    return this.createComment('unknown vnode type');
  }

  /**
   * 序列化为 WXML（微信小程序模板）
   *
   * @param node    小程序节点
   * @param indent  缩进级别（默认 0）
   * @returns WXML 模板字符串
   */
  serializeToWXML(node: MiniAppNode, indent: number = 0): string {
    return this._serializeToTemplate(node, indent, 'wechat');
  }

  /**
   * 序列化为 AXML（支付宝小程序模板）
   *
   * @param node    小程序节点
   * @param indent  缩进级别（默认 0）
   * @returns AXML 模板字符串
   */
  serializeToAXML(node: MiniAppNode, indent: number = 0): string {
    return this._serializeToTemplate(node, indent, 'alipay');
  }

  /**
   * 序列化为 TTML（字节跳动小程序模板）
   *
   * @param node    小程序节点
   * @param indent  缩进级别（默认 0）
   * @returns TTML 模板字符串
   */
  serializeToTTML(node: MiniAppNode, indent: number = 0): string {
    return this._serializeToTemplate(node, indent, 'bytedance');
  }

  /**
   * 根据平台获取模板字符串
   *
   * @param node     小程序节点
   * @param platform 平台标识：'wechat' | 'alipay' | 'bytedance'
   * @returns 对应平台的模板字符串
   */
  getPlatformTemplate(node: MiniAppNode, platform: 'wechat' | 'alipay' | 'bytedance'): string {
    return this._serializeToTemplate(node, 0, platform);
  }

  /**
   * 将 Lyt.js 指令映射为小程序模板属性
   *
   * @param lytDirective Lyt.js 指令名（如 'if', 'each'）
   * @param value        指令值
   * @param platform     平台标识
   * @returns 小程序模板属性字符串（如 'wx:if="{{condition}}"'）
   */
  mapDirective(lytDirective: string, value: string, platform: string = 'wechat'): string {
    const prefix = PLATFORM_PREFIX[platform] || PLATFORM_PREFIX.wechat;
    const dir = DIRECTIVE_MAP[lytDirective];
    if (!dir) return '';

    switch (lytDirective) {
      case 'if':
        return `${prefix.if}="{{${value}}}"`;
      case 'else':
        return `${prefix.else}`;
      case 'each': {
        // 解析 "item in list" 语法
        const match = value.match(/(?:\((\w+),\s*(\w+)\)|(\w+))\s+in\s+(.+)/);
        if (match) {
          const item = match[1] || match[3];
          const dataSource = match[4] || match[3];
          return `${prefix.for}="{{${dataSource}}}" ${prefix.forKey}="{{${item}}}"`;
        }
        return `${prefix.for}="{{${value}}}"`;
      }
      case 'show':
        return `hidden="{{!${value}}}"`;
      default:
        return `${dir.attr}="${value}"`;
    }
  }

  /**
   * 将 Lyt.js 事件映射为小程序事件绑定
   *
   * @param lytEvent Lyt.js 事件名（如 'click'）
   * @param platform 平台标识
   * @returns 小程序事件绑定字符串（如 'bindtap'）
   */
  mapEvent(lytEvent: string, platform: string = 'wechat'): string {
    const prefix = PLATFORM_PREFIX[platform] || PLATFORM_PREFIX.wechat;
    const miniEvent = EVENT_PREFIX_MAP[lytEvent] || lytEvent;
    // 支付宝小程序使用 onTap / onInput 等 camelCase 形式
    if (prefix.bind === 'on') {
      return `on${miniEvent.charAt(0).toUpperCase()}${miniEvent.slice(1)}`;
    }
    return `${prefix.bind}${miniEvent}`;
  }

  /* --------------------------------------------------
   *  内部辅助方法
   * -------------------------------------------------- */

  /**
   * 应用 Lyt.js 指令到节点
   */
  private _applyDirective(el: MiniAppNode, directive: string, value: any): void {
    switch (directive) {
      case 'if':
        el.wxIf = String(value);
        break;
      case 'else':
        el.attrs['wx:else'] = '';
        break;
      case 'each': {
        const forExpr = String(value);
        const match = forExpr.match(/(?:\((\w+),\s*(\w+)\)|(\w+))\s+in\s+(.+)/);
        if (match) {
          el.wxFor = match[4] || match[3];
          el.wxForKey = match[1] || match[3];
        } else {
          el.wxFor = forExpr;
        }
        break;
      }
      case 'show':
        el.attrs['hidden'] = String(value);
        break;
      default:
        el.attrs[directive] = String(value);
    }
  }

  /**
   * 将样式对象转换为内联样式字符串
   */
  private _styleObjectToString(style: Record<string, string>): string {
    return Object.entries(style)
      .map(([key, val]) => {
        // kebab-case 转换
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${val}`;
      })
      .join('; ');
  }

  /**
   * 通用模板序列化方法
   *
   * @param node     小程序节点
   * @param indent   缩进级别
   * @param platform 平台标识
   * @returns 模板字符串
   */
  private _serializeToTemplate(node: MiniAppNode, indent: number, platform: string): string {
    const spaces = '  '.repeat(indent);
    const prefix = PLATFORM_PREFIX[platform] || PLATFORM_PREFIX.wechat;

    // 文本节点
    if (node.tag === '__text__') {
      return `${spaces}${node.text || ''}`;
    }

    // 注释节点
    if (node.tag === '__comment__') {
      return `${spaces}<!-- ${node.text || ''} -->`;
    }

    // Fragment 节点：直接展开子节点
    if (node.tag === '__fragment__') {
      return node.children
        .map(child => this._serializeToTemplate(child, indent, platform))
        .join('\n');
    }

    // 构建属性字符串
    const attrParts: string[] = [];

    // 普通属性
    for (const [key, val] of Object.entries(node.attrs)) {
      // 转换平台特定的条件/列表属性
      if (key === 'wx:else') {
        attrParts.push(prefix.else);
        continue;
      }
      attrParts.push(`${key}="${val}"`);
    }

    // 条件渲染
    if (node.wxIf) {
      attrParts.unshift(`${prefix.if}="{{${node.wxIf}}}"`);
    }

    // 列表渲染
    if (node.wxFor) {
      attrParts.unshift(`${prefix.for}="{{${node.wxFor}}}"`);
      if (node.wxForKey) {
        attrParts.unshift(`${prefix.forKey}="{{${node.wxForKey}}}"`);
      }
    }

    // 事件绑定（存储为平台无关的事件名，序列化时加平台前缀）
    for (const [eventName, handlerName] of Object.entries(node.bindEvents)) {
      // 支付宝小程序使用 onTap / onInput 等 camelCase 形式
      const eventBinding = prefix.bind === 'on'
        ? `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`
        : `${prefix.bind}${eventName}`;
      attrParts.push(`${eventBinding}="${handlerName}"`);
    }

    // 双向绑定
    for (const [modelKey, modelVal] of Object.entries(node.modelBindings)) {
      attrParts.push(`model:${modelKey}="{{${modelVal}}}"`);
    }

    const attrStr = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';

    // 自闭合标签（无子节点且不是容器类标签）
    const selfClosingTags = new Set(['image', 'input']);
    if (node.children.length === 0 && selfClosingTags.has(node.tag)) {
      return `${spaces}<${node.tag}${attrStr} />`;
    }

    // 有子节点的标签
    if (node.children.length === 0) {
      return `${spaces}<${node.tag}${attrStr}></${node.tag}>`;
    }

    const childrenStr = node.children
      .map(child => this._serializeToTemplate(child, indent + 1, platform))
      .join('\n');

    return `${spaces}<${node.tag}${attrStr}>\n${childrenStr}\n${spaces}</${node.tag}>`;
  }
}

/* ================================================================
 *  工厂函数
 * ================================================================ */

/**
 * 支持的小程序平台类型
 */
export type MiniAppPlatform = 'wechat' | 'alipay' | 'bytedance'

/**
 * 创建小程序渲染器实例
 *
 * 工厂函数，每次调用返回一个新的 MiniAppRenderer 实例。
 * 适用于需要多个独立渲染器实例的场景。
 *
 * @returns MiniAppRenderer 实例
 */
export function createMiniAppRenderer(): MiniAppRenderer {
  return new MiniAppRenderer();
}

/* ================================================================
 *  导出
 * ================================================================ */

/** 小程序渲染器单例 */
export const miniAppRenderer = new MiniAppRenderer();
