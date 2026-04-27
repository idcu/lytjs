/**
 * NativeRenderer - 移动端渲染器原型
 *
 * 将 VNode 映射为原生组件描述对象（可用于 React Native / Flutter / 原生 SDK 桥接）。
 * 纯原生零依赖 TypeScript 实现。
 *
 * 设计思路：
 *   - 不直接操作 DOM，而是生成描述性的 NativeNode 树
 *   - NativeNode 可序列化为 JSON，通过 JS Bridge 传递给原生端
 *   - 提供 HTML 标签到原生组件的映射、CSS 样式到原生样式的转换
 */

import type { LytRenderer } from '../renderer-interfaces';
import {
  insertChild,
  removeChild,
  replaceChild,
  getParentNode,
  getNextSibling,
  nextTick as sharedNextTick,
} from '../shared/abstract-renderer';

/* ================================================================
 *  LytRendererPlatform 标准接口
 * ================================================================ */

/**
 * LytRendererPlatform 标准接口
 *
 * 所有平台渲染器必须实现此接口。
 * 定义了渲染器与虚拟 DOM diff 算法对接所需的最小操作集。
 */
export interface LytRendererPlatform {
  createElement(tag: string): any
  createText(text: string): any
  createComment(text: string): any
  insert(child: any, parent: any, anchor?: any): void
  remove(child: any): void
  patchProp(el: any, key: string, prevValue: any, nextValue: any): void
  parentNode(child: any): any | null
  nextSibling(child: any): any | null
  setText(node: any, text: string): void
}

/* ================================================================
 *  原生节点描述
 * ================================================================ */

/**
 * 原生节点描述
 *
 * 描述一棵原生 UI 组件树，可序列化为 JSON 供原生端消费。
 */
export interface NativeNode {
  /** 原生组件类型（如 View, Text, Image） */
  type: string

  /** 原生属性（包含样式、事件等） */
  props: Record<string, any>

  /** 子节点列表 */
  children: NativeNode[]

  /** 原生视图标识，用于桥接时定位组件 */
  nativeId?: string

  /** 父节点引用（内部使用，不序列化） */
  _parent?: NativeNode
}

/* ================================================================
 *  标签到原生组件的映射表
 * ================================================================ */

/**
 * HTML 标签到原生组件类型的映射
 *
 * 将 Web 标签映射为移动端原生组件：
 *   - div / header / footer 等容器标签 → View
 *   - span / p / h1-h6 等文本标签 → Text
 *   - img → Image
 *   - input / textarea → TextInput
 *   - button / a → TouchableOpacity
 *   - scroll → ScrollView
 *   - list → FlatList
 */
const NATIVE_COMPONENT_MAP: Record<string, string> = {
  'div': 'View',
  'span': 'Text',
  'p': 'Text',
  'h1': 'Text', 'h2': 'Text', 'h3': 'Text',
  'h4': 'Text', 'h5': 'Text', 'h6': 'Text',
  'img': 'Image',
  'input': 'TextInput',
  'textarea': 'TextInput',
  'button': 'TouchableOpacity',
  'scroll': 'ScrollView',
  'list': 'FlatList',
  'a': 'TouchableOpacity',
  'ul': 'View', 'ol': 'View', 'li': 'View',
  'form': 'View',
  'header': 'View', 'footer': 'View', 'nav': 'View',
  'main': 'View', 'section': 'View',
  'article': 'View', 'aside': 'View',
};

/* ================================================================
 *  样式属性映射（CSS → 原生样式）
 * ================================================================ */

/**
 * CSS 样式属性到原生样式属性的映射
 *
 * React Native / Yoga 布局引擎支持大部分 CSS Flexbox 属性，
 * 此处列出常用的映射关系。未列出的属性会原样传递。
 */
const STYLE_MAP: Record<string, string> = {
  'flexDirection': 'flexDirection',
  'justifyContent': 'justifyContent',
  'alignItems': 'alignItems',
  'alignSelf': 'alignSelf',
  'flexWrap': 'flexWrap',
  'flex': 'flex',
  'flexGrow': 'flexGrow',
  'flexShrink': 'flexShrink',
  'flexBasis': 'flexBasis',
  'backgroundColor': 'backgroundColor',
  'color': 'color',
  'fontSize': 'fontSize',
  'fontWeight': 'fontWeight',
  'fontStyle': 'fontStyle',
  'textAlign': 'textAlign',
  'lineHeight': 'lineHeight',
  'letterSpacing': 'letterSpacing',
  'padding': 'padding',
  'paddingTop': 'paddingTop',
  'paddingBottom': 'paddingBottom',
  'paddingLeft': 'paddingLeft',
  'paddingRight': 'paddingRight',
  'paddingHorizontal': 'paddingHorizontal',
  'paddingVertical': 'paddingVertical',
  'margin': 'margin',
  'marginTop': 'marginTop',
  'marginBottom': 'marginBottom',
  'marginLeft': 'marginLeft',
  'marginRight': 'marginRight',
  'marginHorizontal': 'marginHorizontal',
  'marginVertical': 'marginVertical',
  'width': 'width',
  'height': 'height',
  'minWidth': 'minWidth',
  'maxWidth': 'maxWidth',
  'minHeight': 'minHeight',
  'maxHeight': 'maxHeight',
  'borderRadius': 'borderRadius',
  'borderWidth': 'borderWidth',
  'borderColor': 'borderColor',
  'overflow': 'overflow',
  'opacity': 'opacity',
  'position': 'position',
  'top': 'top',
  'left': 'left',
  'right': 'right',
  'bottom': 'bottom',
  'zIndex': 'zIndex',
  'shadowColor': 'shadowColor',
  'shadowOffset': 'shadowOffset',
  'shadowOpacity': 'shadowOpacity',
  'shadowRadius': 'shadowRadius',
};

/* ================================================================
 *  事件映射（DOM 事件 → 原生事件）
 * ================================================================ */

/**
 * DOM 事件名到原生事件名的映射
 *
 * Web 端的 click 在移动端通常映射为 onPress，
 * touchstart/touchend 保持语义一致。
 */
const EVENT_MAP: Record<string, string> = {
  'click': 'onPress',
  'touchstart': 'onTouchStart',
  'touchend': 'onTouchEnd',
  'touchmove': 'onTouchMove',
  'change': 'onChange',
  'input': 'onChangeText',
  'focus': 'onFocus',
  'blur': 'onBlur',
  'submit': 'onSubmitEditing',
  'scroll': 'onScroll',
  'longpress': 'onLongPress',
};

/* ================================================================
 *  自增 ID 生成器
 * ================================================================ */

/** 原生节点自增 ID，用于生成 nativeId */
let _nativeIdCounter = 0;

/** 生成唯一的原生视图标识 */
function generateNativeId(): string {
  return `native_${++_nativeIdCounter}`;
}

/* ================================================================
 *  NativeRenderer 实现
 * ================================================================ */

/**
 * NativeRenderer - 移动端渲染器
 *
 * 实现 LytRenderer 接口，将 VNode 映射为原生组件描述树。
 * 不依赖任何外部库，纯 TypeScript 实现。
 *
 * 使用示例：
 * ```ts
 * import { nativeRenderer } from './native/native-renderer'
 *
 * // 创建原生节点
 * const view = nativeRenderer.createElement('div')
 * nativeRenderer.setAttribute(view, 'style', { flexDirection: 'row' })
 *
 * const text = nativeRenderer.createText('Hello Native')
 * nativeRenderer.insert(view, text)
 *
 * // 序列化为 JSON（用于桥接传输）
 * const json = nativeRenderer.serializeToJSON(view)
 * ```
 */
export class NativeRenderer implements LytRenderer {
  /* --------------------------------------------------
   *  节点创建
   * -------------------------------------------------- */

  /**
   * 创建原生元素节点
   * @param tag HTML 标签名（如 'div', 'span'）
   * @returns NativeNode 描述对象
   */
  createElement(tag: string): NativeNode {
    const nativeType = this.getComponentType(tag);
    return {
      type: nativeType,
      props: {},
      children: [],
      nativeId: generateNativeId(),
    };
  }

  /**
   * 创建文本节点
   * @param text 文本内容
   * @returns 类型为 'RawText' 的 NativeNode
   */
  createText(text: string): NativeNode {
    return {
      type: 'RawText',
      props: { text },
      children: [],
      nativeId: generateNativeId(),
    };
  }

  /**
   * 创建注释节点
   * @param text 注释内容
   * @returns 类型为 '__Comment' 的 NativeNode（原生端通常忽略）
   */
  createComment(text: string): NativeNode {
    return {
      type: '__Comment',
      props: { text },
      children: [],
      nativeId: generateNativeId(),
    };
  }

  /* --------------------------------------------------
   *  属性操作
   * -------------------------------------------------- */

  /**
   * 设置元素属性
   * @param el  原生节点
   * @param key 属性名
   * @param val 属性值
   */
  setAttribute(el: NativeNode, key: string, val: any): void {
    if (!el) return;

    // 样式属性特殊处理：合并到 props.style 中
    if (key === 'style' && typeof val === 'object' && val !== null) {
      el.props.style = { ...(el.props.style as Record<string, any>), ...this.mapStyle(val) };
      return;
    }

    // className 映射为原生 style 中的特殊字段（简化处理）
    if (key === 'className' || key === 'class') {
      // 小程序/RN 中 class 通常通过 StyleSheet 处理，此处简化存储
      el.props.className = val;
      return;
    }

    // 事件属性（onClick → onPress）
    if (key.startsWith('on') && typeof val === 'function') {
      const domEvent = key.slice(2).toLowerCase();
      const nativeEvent = this.mapEvent(domEvent);
      el.props[nativeEvent] = val;
      return;
    }

    // src 属性映射为 source（Image 组件）
    if (key === 'src' && el.type === 'Image') {
      el.props.source = { uri: val };
      return;
    }

    // href 属性映射
    if (key === 'href') {
      el.props.href = val;
      return;
    }

    // placeholder 属性
    if (key === 'placeholder') {
      el.props.placeholder = val;
      return;
    }

    // 其他属性直接设置
    el.props[key] = val;
  }

  /**
   * 移除元素属性
   * @param el  原生节点
   * @param key 属性名
   */
  removeAttribute(el: NativeNode, key: string): void {
    if (!el) return;

    if (key === 'style') {
      delete el.props.style;
    } else if (key.startsWith('on')) {
      const domEvent = key.slice(2).toLowerCase();
      const nativeEvent = this.mapEvent(domEvent);
      delete el.props[nativeEvent];
    } else {
      delete el.props[key];
    }
  }

  /**
   * 设置元素样式
   * @param el    原生节点
   * @param style 样式对象
   */
  setStyle(el: NativeNode, style: object): void {
    if (!el) return;
    const nativeStyle = this.mapStyle(style as Record<string, string>);
    el.props.style = { ...(el.props.style as Record<string, any>), ...nativeStyle };
  }

  /**
   * 设置元素 class
   * @param el  原生节点
   * @param cls class 值（字符串或对象）
   */
  setClass(el: NativeNode, cls: string | object): void {
    if (!el) return;
    // 原生端通常使用 StyleSheet，此处简化为存储 className
    if (typeof cls === 'string') {
      el.props.className = cls;
    } else if (typeof cls === 'object' && cls !== null) {
      // 对象形式：{ active: true, disabled: false } → 'active'
      const classList: string[] = [];
      for (const [name, value] of Object.entries(cls)) {
        if (value) classList.push(name);
      }
      el.props.className = classList.join(' ');
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
  insert(parent: NativeNode, child: NativeNode, ref?: NativeNode): void {
    insertChild(parent, child, ref);
  }

  /**
   * 移除节点
   * @param child 要移除的节点
   */
  remove(child: NativeNode): void {
    removeChild(child);
  }

  /**
   * 替换子节点
   * @param parent   父节点
   * @param oldChild 被替换的旧节点
   * @param newChild 替换的新节点
   */
  replace(parent: NativeNode, oldChild: NativeNode, newChild: NativeNode): void {
    replaceChild(parent, oldChild, newChild);
  }

  /* --------------------------------------------------
   *  事件操作
   * -------------------------------------------------- */

  /**
   * 添加事件监听器
   * @param el      原生节点
   * @param event   DOM 事件名（如 'click'）
   * @param handler 事件处理函数
   * @param options 事件选项（可选）
   */
  addEventListener(el: NativeNode, event: string, handler: Function, _options?: any): void {
    if (!el) return;
    const nativeEvent = this.mapEvent(event);
    // 存储事件处理器到 props 中
    el.props[nativeEvent] = handler;
  }

  /**
   * 移除事件监听器
   * @param el      原生节点
   * @param event   DOM 事件名
   * @param handler 事件处理函数
   */
  removeEventListener(el: NativeNode, event: string, handler: Function): void {
    if (!el) return;
    const nativeEvent = this.mapEvent(event);
    // 仅当当前处理器匹配时才移除
    if (el.props[nativeEvent] === handler) {
      delete el.props[nativeEvent];
    }
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
   * @param el 原生节点
   * @returns 父节点，无父节点时返回 null
   */
  parentNode(el: NativeNode): NativeNode | null {
    return getParentNode(el) as NativeNode | null;
  }

  /**
   * 获取下一个兄弟节点
   * @param el 原生节点
   * @returns 下一个兄弟节点，无时返回 null
   */
  nextSibling(el: NativeNode): NativeNode | null {
    return getNextSibling(el) as NativeNode | null;
  }

  /**
   * 设置文本节点内容
   * @param node 文本节点
   * @param text 文本内容
   */
  setText(node: NativeNode, text: string): void {
    if (!node) return;
    if (node.type === 'RawText') {
      node.props.text = text;
    }
  }

  /**
   * 更新元素属性（diff 算法调用）
   *
   * 当 prevValue 为 null/undefined 时表示新增属性，
   * 当 nextValue 为 null/undefined 时表示移除属性，
   * 否则表示更新属性。
   *
   * @param el        原生节点
   * @param key       属性名
   * @param prevValue 旧属性值
   * @param nextValue 新属性值
   */
  patchProp(el: NativeNode, key: string, prevValue: any, nextValue: any): void {
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
      // 事件属性
      const domEvent = key.slice(2).toLowerCase();
      const nativeEvent = this.mapEvent(domEvent);
      el.props[nativeEvent] = nextValue;
    } else {
      this.setAttribute(el, key, nextValue);
    }
  }

  /**
   * 查询选择器（原型简化实现）
   * @param selector CSS 选择器（仅支持 tag 选择器）
   * @returns 匹配的第一个节点，未找到返回 null
   */
  querySelector(_selector: string): NativeNode | null {
    // 原型实现：仅支持简单的 tag 选择器
    // 完整实现需要遍历整棵树
    return null; // 需要持有根节点引用才能遍历，此处返回 null
  }

  /* --------------------------------------------------
   *  原生特有方法
   * -------------------------------------------------- */

  /**
   * 将 VNode 树转换为原生节点树
   *
   * 递归遍历 VNode，将每个节点转换为对应的 NativeNode 描述。
   *
   * @param vnode VNode 对象
   * @returns NativeNode 树
   */
  renderToNativeTree(vnode: any): NativeNode {
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
      // Fragment 本身不创建节点，直接展开子节点
      // 此处创建一个虚拟容器
      const fragment = this.createElement('__Fragment');
      if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
          const nativeChild = this.renderToNativeTree(child);
          this.insert(fragment, nativeChild);
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
            this.insert(node, this.renderToNativeTree(child));
          }
        }
      }

      return node;
    }

    // 组件节点（函数组件 / 有状态组件）
    if (typeof vnode.type === 'object' || typeof vnode.type === 'function') {
      // 原型中组件节点简化为 View 容器
      const node = this.createElement('div');
      if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
          this.insert(node, this.renderToNativeTree(child));
        }
      }
      return node;
    }

    return this.createComment('unknown vnode type');
  }

  /**
   * 序列化 NativeNode 为 JSON 字符串
   *
   * 用于调试输出或通过 JS Bridge 传递给原生端。
   * 序列化时会过滤掉内部字段（_parent）。
   *
   * @param node 原生节点
   * @returns JSON 字符串
   */
  serializeToJSON(node: NativeNode): string {
    // 递归清理内部字段并序列化
    const clean = (n: NativeNode): any => {
      const obj: any = {
        type: n.type,
        props: { ...n.props },
        children: n.children.map(clean),
      };
      if (n.nativeId) obj.nativeId = n.nativeId;
      return obj;
    };
    return JSON.stringify(clean(node), null, 2);
  }

  /**
   * 获取原生组件类型
   *
   * 将 HTML 标签名映射为原生组件类型名。
   * 未在映射表中的标签会使用 PascalCase 转换。
   *
   * @param tag HTML 标签名
   * @returns 原生组件类型名
   */
  getComponentType(tag: string): string {
    return NATIVE_COMPONENT_MAP[tag] || toPascalCase(tag);
  }

  /**
   * CSS 样式转原生样式
   *
   * 将 CSS 样式对象转换为原生样式对象。
   * 支持数值自动转换（如 '10px' → 10）。
   *
   * @param cssStyle CSS 样式对象
   * @returns 原生样式对象
   */
  mapStyle(cssStyle: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [cssKey, cssVal] of Object.entries(cssStyle)) {
      // 查找映射后的原生属性名
      const nativeKey = STYLE_MAP[cssKey] || cssKey;

      // 数值转换：'10px' → 10, '100%' → '100%'
      if (typeof cssVal === 'string' && /^\d+px$/.test(cssVal)) {
        result[nativeKey] = parseInt(cssVal, 10);
      } else {
        result[nativeKey] = cssVal;
      }
    }
    return result;
  }

  /**
   * DOM 事件转原生事件
   *
   * 将 Web DOM 事件名映射为原生平台事件名。
   * 未在映射表中的事件会添加 'on' 前缀并首字母大写。
   *
   * @param domEvent DOM 事件名（如 'click'）
   * @returns 原生事件名（如 'onPress'）
   */
  mapEvent(domEvent: string): string {
    return EVENT_MAP[domEvent] || `on${domEvent.charAt(0).toUpperCase()}${domEvent.slice(1)}`;
  }
}

/* ================================================================
 *  辅助函数
 * ================================================================ */

/**
 * 将 kebab-case 字符串转换为 PascalCase
 * @param str kebab-case 字符串（如 'my-component'）
 * @returns PascalCase 字符串（如 'MyComponent'）
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/* ================================================================
 *  工厂函数
 * ================================================================ */

/**
 * 创建原生渲染器实例
 *
 * 工厂函数，每次调用返回一个新的 NativeRenderer 实例。
 * 适用于需要多个独立渲染器实例的场景。
 *
 * @returns NativeRenderer 实例
 */
export function createNativeRenderer(): NativeRenderer {
  return new NativeRenderer();
}

/* ================================================================
 *  导出
 * ================================================================ */

/** 移动端渲染器单例 */
export const nativeRenderer = new NativeRenderer();
