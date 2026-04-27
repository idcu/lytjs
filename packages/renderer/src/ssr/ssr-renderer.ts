/**
 * Lyt.js SSR 字符串渲染器
 *
 * 将 VNode 树渲染为 HTML 字符串，用于服务端渲染（SSR）场景。
 * 纯原生零依赖实现，不依赖任何外部库。
 *
 * 核心功能：
 *   - renderToString(vnode) — 将 VNode 树同步序列化为完整 HTML 字符串
 *   - renderToStream(vnode, options?) — 将 VNode 树异步流式序列化（逐步输出 HTML）
 *   - createElement(tag) — 创建轻量描述对象（SSR 环境无真实 DOM）
 *   - createText(text) — 创建文本描述对象
 *   - insert(parent, child) — 将子节点添加到父节点的 children 数组
 *
 * 支持的 VNode 类型：
 *   - Element VNode：输出 HTML 标签 + 属性 + 子节点
 *   - Text VNode：输出转义后的文本内容
 *   - Comment VNode：输出 HTML 注释 <!-- -->
 *   - Fragment VNode：只输出子节点（无包裹标签）
 *   - Component VNode（函数式/有状态）：递归渲染组件 render 函数输出
 *   - Slot VNode：渲染插槽内容
 *   - Null/Undefined：不输出任何内容
 *
 * 特殊处理：
 *   - class/style/event 属性的序列化
 *   - 自闭合标签（br/hr/img/input 等）
 *   - HTML 转义（防 XSS）
 *   - Fragment 多根节点支持
 *   - data-* 自定义属性
 *   - aria-* 无障碍属性
 *   - dangerouslySetInnerHTML 支持
 *   - Suspense 组件集成（流式渲染 fallback → resolved）
 *   - Islands Architecture（Partial Hydration）标记支持
 */

// ================================================================
//  类型定义
// ================================================================

/** SSR 轻量元素描述对象 */
export interface SSRVNode {
  /** 标签名 */
  tag: string
  /** 属性 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>
  /** 子节点 */
  children: (SSRVNode | SSRTextVNode)[]
}

/** SSR 文本描述对象 */
export interface SSRTextVNode {
  /** 类型标记 */
  type: 'text'
  /** 文本内容 */
  value: string
}

/** VNode 兼容类型（与 @lytjs/vdom 和 @lytjs/renderer 的 VNode 对齐） */
export interface VNode {
  type: string | object | symbol
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any> | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: string | VNode[] | Record<string, any> | null
  key: string | number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any
  shapeFlag: number
  patchFlag: number
  dynamicChildren: VNode[] | null
  dynamicProps: string[] | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anchor: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/** 组件类型接口（有状态组件） */
export interface ComponentOptions {
  /** 组件名称 */
  name?: string
  /** setup 函数 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setup?: (...args: any[]) => any
  /** render 函数 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (...args: any[]) => VNode
  /** props 定义 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>
  /** slots */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slots?: Record<string, any>
  /** 其他组件选项 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/** renderToStream 选项 */
export interface RenderToStreamOptions {
  /** Suspense 边界 ID 前缀，默认 'suspense' */
  suspenseIdPrefix?: string
}

// ================================================================
//  常量定义
// ================================================================

/**
 * HTML 自闭合标签集合
 * 这些标签不需要闭合标签，渲染为 <tag /> 形式
 */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * HTML 实体转义映射
 * 用于防止 XSS 攻击
 */
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * 需要转义的 HTML 特殊字符正则
 */
const ESCAPE_RE = /[&<>"']/g;

import { ShapeFlags } from '@lytjs/vdom';
import { normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle } from '@lytjs/common';

/** Re-export normalizeClass and normalizeStyle for external use */
export { _normalizeClass as normalizeClass, _normalizeStyle as normalizeStyle };

/** Suspense 边界计数器 */
let suspenseBoundaryId = 0;

/**
 * 重置 Suspense 边界 ID 计数器
 *
 * 在服务端渲染多个独立页面时调用，避免 ID 跨请求泄漏。
 */
export function resetSuspenseBoundaryId(): void {
  suspenseBoundaryId = 0;
}

// ================================================================
//  HTML 转义工具
// ================================================================

/**
 * HTML 转义 — 将特殊字符替换为 HTML 实体
 *
 * 防止 XSS 攻击，确保用户输入的内容不会被当作 HTML 解析。
 *
 * @param str 需要转义的字符串
 * @returns 转义后的安全字符串
 *
 * @example
 *   escapeHTML('<script>alert("xss")</script>')
 *   // → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHTML(str: string): string {
  return str.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]);
}

// ================================================================
//  属性序列化
// ================================================================

/**
 * 序列化属性值为字符串
 *
 * 对不同类型的属性值进行特殊处理：
 *   - class：支持字符串、数组、对象形式
 *   - style：支持字符串、对象形式
 *   - 事件（on*）：SSR 环境下不序列化事件
 *   - ref/key：内部属性，不序列化
 *   - innerHTML/dangerouslySetInnerHTML：特殊处理
 *   - data-* 属性：直接序列化
 *   - aria-* 属性：直接序列化
 *   - 布尔属性：值为 true 时只输出属性名
 *   - 其他：直接转为字符串
 *
 * @param key   属性名
 * @param value 属性值
 * @returns 序列化后的属性字符串（格式：key="value"），不需要序列化时返回空字符串
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeProp(key: string, value: any): string {
  // 事件属性在 SSR 环境下不序列化（客户端注水时绑定）
  if (key.startsWith('on') || key.startsWith('@')) {
    return '';
  }

  // key 和 ref 不序列化（内部属性）
  if (key === 'key' || key === 'ref') {
    return '';
  }

  // 内部属性不序列化
  if (key === '__vccOpts' || key.startsWith('__')) {
    return '';
  }

  // 布尔属性（值为 true 时只输出属性名）
  if (value === true) {
    return key;
  }

  // 值为 false 或 null/undefined，不输出
  if (value === false || value === null || value === undefined) {
    return '';
  }

  // class 特殊处理
  if (key === 'class') {
    return `class="${escapeHTML(_normalizeClass(value))}"`;
  }

  // style 特殊处理
  if (key === 'style') {
    return `style="${escapeHTML(_normalizeStyle(value))}"`;
  }

  // dangerouslySetInnerHTML 特殊处理（不序列化到属性中，由 renderElementToString 处理）
  if (key === 'dangerouslySetInnerHTML') {
    return '';
  }

  // innerHTML 特殊处理（不序列化到属性中，由 renderElementToString 处理）
  if (key === 'innerHTML') {
    return '';
  }

  // 普通属性
  return `${key}="${escapeHTML(String(value))}"`;
}

/**
 * 序列化所有属性
 *
 * 将 props 对象转换为 HTML 属性字符串
 *
 * @param props 属性对象
 * @returns HTML 属性字符串（如 'class="foo" id="bar"'）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeProps(props: Record<string, any> | null): string {
  if (!props) return '';

  const attrs: string[] = [];

  for (const key in props) {
    const value = props[key];
    const attr = serializeProp(key, value);
    if (attr) {
      attrs.push(attr);
    }
  }

  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

// ================================================================
//  StringRenderer 类
// ================================================================

/**
 * SSR 字符串渲染器
 *
 * 将 VNode 树渲染为 HTML 字符串。实现了 LytRenderer 接口的 SSR 版本。
 * 在 SSR 环境中，没有真实 DOM，所有操作都是基于轻量描述对象。
 *
 * @example
 *   const renderer = new StringRenderer()
 *   const parent = renderer.createElement('div')
 *   const child = renderer.createText('Hello')
 *   renderer.insert(parent, child)
 *   // parent.children = [{ type: 'text', value: 'Hello' }]
 */
export class StringRenderer {
  /**
   * 创建元素节点
   *
   * SSR 环境中没有真实 DOM，返回轻量描述对象。
   *
   * @param tag 标签名（如 'div', 'span'）
   * @returns 轻量元素描述对象
   */
  createElement(tag: string): SSRVNode {
    return {
      tag,
      props: {},
      children: [],
    };
  }

  /**
   * 创建文本节点
   *
   * @param text 文本内容
   * @returns 文本描述对象
   */
  createText(text: string): SSRTextVNode {
    return {
      type: 'text',
      value: text,
    };
  }

  /**
   * 创建注释节点
   *
   * SSR 中注释节点用文本描述对象表示
   *
   * @param text 注释内容
   * @returns 注释描述对象
   */
  createComment(text: string): SSRTextVNode {
    return {
      type: 'comment',
      value: text,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * 插入子节点到父节点
   *
   * SSR 中简单地将子节点添加到父节点的 children 数组。
   *
   * @param parent 父节点
   * @param child  子节点
   * @param _ref   参考节点（SSR 中忽略）
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(parent: SSRVNode, child: SSRVNode | SSRTextVNode, _ref?: any): void {
    parent.children.push(child);
  }

  /**
   * 将 VNode 渲染为 HTML 字符串（同步）
   *
   * 递归遍历 VNode 树，将每个节点序列化为对应的 HTML 字符串。
   *
   * @param vnode VNode 节点
   * @returns 完整的 HTML 字符串
   *
   * @example
   *   const vnode = {
   *     type: 'div',
   *     props: { class: 'app', id: 'root' },
   *     children: [
   *       { type: 'span', props: null, children: 'Hello', shapeFlag: 8 },
   *     ],
   *     shapeFlag: 17, // ELEMENT | ARRAY_CHILDREN
   *   }
   *   renderToString(vnode)
   *   // → '<div class="app" id="root"><span>Hello</span></div>'
   */
  renderToString(vnode: VNode): string {
    return renderVNodeToString(vnode);
  }

  /**
   * 将 VNode 渲染为异步生成器（流式渲染）
   *
   * 逐步输出 HTML 字符串片段，适用于大页面或需要尽早发送响应的场景。
   * 每个节点渲染完成后立即 yield，而不是等待整棵树渲染完成。
   *
   * @param vnode VNode 节点
   * @returns 异步生成器，逐步产出 HTML 字符串片段
   *
   * @example
   *   for await (const chunk of renderer.renderToStream(vnode)) {
   *     res.write(chunk)
   *   }
   *   res.end()
   */
  async *renderToStream(vnode: VNode): AsyncGenerator<string> {
    yield* renderVNodeToStream(vnode);
  }
}

// ================================================================
//  内部渲染函数
// ================================================================

/**
 * 将 VNode 渲染为 HTML 字符串（内部实现）
 *
 * 根据 VNode 的类型分发到不同的渲染逻辑：
 *   - null/undefined → 空字符串
 *   - 字符串 type → HTML 元素
 *   - Symbol('Fragment') → Fragment（只渲染子节点）
 *   - Symbol('Text') → 文本内容
 *   - Symbol('Comment') → HTML 注释
 *   - 对象 type（有 render/setup） → 组件
 *   - 函数 type → 函数式组件
 *   - 其他 → 空字符串
 *
 * @param vnode VNode 节点
 * @returns HTML 字符串
 */
function renderVNodeToString(vnode: VNode): string {
  // null 或 undefined 节点
  if (vnode === null || vnode === undefined) {
    return '';
  }

  const { type, props, children } = vnode;

  // Fragment 类型 — 只渲染子节点，不生成包裹元素
  if (typeof type === 'symbol' && String(type) === 'Symbol(Fragment)') {
    if (Array.isArray(children)) {
      return children.map(child => renderVNodeToString(child as VNode)).join('');
    }
    return '';
  }

  // 文本类型
  if (typeof type === 'symbol' && String(type).includes('Text')) {
    return escapeHTML(String(children || ''));
  }

  // 注释类型
  if (typeof type === 'symbol' && String(type).includes('Comment')) {
    return `<!--${String(children || '')}-->`;
  }

  // 字符串类型 → HTML 元素
  if (typeof type === 'string') {
    return renderElementToString(type, props, children, vnode);
  }

  // 对象类型 → 组件
  if (typeof type === 'object' && type !== null) {
    return renderComponentToString(vnode);
  }

  // 函数类型 → 函数式组件
  if (typeof type === 'function') {
    return renderComponentToString(vnode);
  }

  return '';
}

/**
 * 渲染 HTML 元素为字符串
 *
 * @param tag      标签名
 * @param props    属性对象
 * @param children 子节点
 * @param vnode    原始 VNode（用于读取 shapeFlag）
 * @returns HTML 字符串
 */
function renderElementToString(
  tag: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any,
  vnode: VNode
): string {
  // 序列化属性
  const propsStr = serializeProps(props);

  // 自闭合标签
  if (VOID_TAGS.has(tag)) {
    return `<${tag}${propsStr} />`;
  }

  // 处理 dangerouslySetInnerHTML / innerHTML
  if (props && (props.dangerouslySetInnerHTML || props.innerHTML)) {
    const htmlContent = props.dangerouslySetInnerHTML
      ? props.dangerouslySetInnerHTML.__html || props.dangerouslySetInnerHTML
      : props.innerHTML;
    return `<${tag}${propsStr}>${escapeHTML(String(htmlContent))}</${tag}>`;
  }

  // 序列化子节点
  let childrenStr = '';

  // 根据 shapeFlag 判断子节点类型
  const shapeFlag = vnode.shapeFlag || 0;

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 文本子节点
    childrenStr = escapeHTML(String(children || ''));
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && Array.isArray(children)) {
    // 数组子节点
    childrenStr = children.map(child => renderVNodeToString(child as VNode)).join('');
  } else if (shapeFlag & ShapeFlags.SLOTS_CHILDREN && typeof children === 'object' && children !== null) {
    // 插槽子节点 — 渲染默认插槽
    childrenStr = renderSlotsToString(children);
  } else if (typeof children === 'string') {
    // 字符串子节点（无 shapeFlag 时的兜底）
    childrenStr = escapeHTML(children);
  } else if (Array.isArray(children)) {
    // 数组子节点（无 shapeFlag 时的兜底）
    childrenStr = children.map(child => renderVNodeToString(child as VNode)).join('');
  } else if (typeof children === 'number') {
    // 数字子节点
    childrenStr = escapeHTML(String(children));
  }

  return `<${tag}${propsStr}>${childrenStr}</${tag}>`;
}

/**
 * 渲染插槽为字符串
 *
 * 插槽对象格式：{ default: () => VNode[], header: () => VNode[], ... }
 * 遍历所有具名插槽并渲染其内容。
 *
 * @param slots 插槽对象
 * @returns 所有插槽内容的 HTML 字符串拼接
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderSlotsToString(slots: Record<string, any>): string {
  const parts: string[] = [];

  for (const slotName in slots) {
    const slotFn = slots[slotName];

    if (typeof slotFn === 'function') {
      // 调用插槽函数获取 VNode 数组
      const slotContent = slotFn();
      if (Array.isArray(slotContent)) {
        parts.push(slotContent.map(vnode => renderVNodeToString(vnode as VNode)).join(''));
      } else if (slotContent !== null && slotContent !== undefined) {
        parts.push(renderVNodeToString(slotContent as VNode));
      }
    } else if (Array.isArray(slotFn)) {
      // 插槽已经是 VNode 数组
      parts.push(slotFn.map(vnode => renderVNodeToString(vnode as VNode)).join(''));
    } else if (slotFn !== null && slotFn !== undefined) {
      // 插槽是单个 VNode
      parts.push(renderVNodeToString(slotFn as VNode));
    }
  }

  return parts.join('');
}

/**
 * 渲染组件为字符串
 *
 * 支持三种组件形式：
 *   1. 有状态组件（对象，带 render 方法）：调用 render 获取子 VNode
 *   2. 有状态组件（对象，带 setup 方法）：调用 setup 后获取 render 输出
 *   3. 函数式组件（函数）：调用函数获取子 VNode
 *   4. 已挂载组件（vnode.component.subTree）：直接使用 subTree
 *
 * @param vnode 组件 VNode
 * @returns HTML 字符串
 */
function renderComponentToString(vnode: VNode): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component = vnode.type as any;

  // 检查是否为 Island 组件（带 __island 标记）
  if (component && component.__island) {
    return renderIslandToString(vnode, component);
  }

  // 如果组件是函数 → 函数式组件
  if (typeof component === 'function') {
    const subTree = component(vnode.props || {}, {
      slots: vnode.children || {},
    });
    return renderVNodeToString(subTree);
  }

  // 如果组件是对象
  if (typeof component === 'object' && component !== null) {
    // 优先使用 render 方法
    if (typeof component.render === 'function') {
      const subTree = component.render(
        vnode.props || {},
        {
          slots: vnode.children || {},
          emit: () => {}, // SSR 环境下 emit 为空操作
        }
      );
      return renderVNodeToString(subTree);
    }

    // 如果有 setup，尝试调用 setup 获取 render 函数
    if (typeof component.setup === 'function') {
      const setupResult = component.setup(vnode.props || {}, {
        emit: () => {}, // SSR 环境下 emit 为空操作
        slots: vnode.children || {},
      });

      // setup 返回渲染函数
      if (typeof setupResult === 'function') {
        const subTree = setupResult();
        return renderVNodeToString(subTree);
      }

      // setup 返回对象（响应式状态），需要调用 render
      if (typeof component.render === 'function') {
        const subTree = component.render(setupResult || {}, {
          slots: vnode.children || {},
          emit: () => {},
        });
        return renderVNodeToString(subTree);
      }
    }
  }

  // 如果组件实例已有 subTree（已挂载的组件）
  if (vnode.component && vnode.component.subTree) {
    return renderVNodeToString(vnode.component.subTree);
  }

  // 兜底：输出空注释节点
  return '<!---->';
}

// ================================================================
//  Island 渲染（服务端）
// ================================================================

/**
 * 渲染 Island 组件为 HTML 字符串
 *
 * Island 组件在服务端渲染时，会生成带有 data-hydrate 属性的 HTML，
 * 以及关联的 props JSON script 标签，供客户端选择性注水。
 *
 * @param vnode     Island 组件 VNode
 * @param component 组件定义（带 __island 标记）
 * @returns 完整的 island HTML 字符串
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderIslandToString(vnode: VNode, component: any): string {
  const islandId = component.name || vnode.props?.['data-island-id'] || 'anonymous';
  const props = vnode.props || {};
  const hydrateWhen = props['data-hydrate-when'] || component.__hydrateWhen || '';
  const islandTag = component.__islandTag || 'div';

  // 序列化 props（排除 island 内部属性）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const islandProps: Record<string, any> = {};
  for (const key in props) {
    if (key === 'data-hydrate-when' || key === 'data-island-id') continue;
    islandProps[key] = props[key];
  }

  const propsJSON = JSON.stringify(islandProps);
  const propsAttr = escapeHTML(propsJSON);

  // 渲染组件内容
  let content = '';
  if (typeof component.render === 'function') {
    const subTree = component.render(props, {
      slots: vnode.children || {},
      emit: () => {},
    });
    content = renderVNodeToString(subTree);
  } else if (typeof component === 'function') {
    const subTree = component(props, {
      slots: vnode.children || {},
    });
    content = renderVNodeToString(subTree);
  }

  // 构建 data-hydrate-when 属性
  const whenAttr = hydrateWhen ? ` data-hydrate-when="${escapeHTML(hydrateWhen)}"` : '';

  // 构建 island HTML
  const html = `<${islandTag} data-hydrate="${escapeHTML(islandId)}" data-props="${propsAttr}"${whenAttr}>${content}</${islandTag}>`;

  // 构建 props script 标签
  const scriptTag = `<script type="application/json" data-hydrate-props="${escapeHTML(islandId)}">${propsJSON}</script>`;

  return html + scriptTag;
}

// ================================================================
//  流式渲染
// ================================================================

/**
 * 将 VNode 渲染为异步生成器（流式渲染内部实现）
 *
 * 与 renderVNodeToString 类似，但使用 yield 逐步输出，
 * 而不是拼接为完整字符串后一次性返回。
 *
 * @param vnode VNode 节点
 * @yields HTML 字符串片段
 */
async function* renderVNodeToStream(vnode: VNode): AsyncGenerator<string> {
  // null 或 undefined 节点
  if (vnode === null || vnode === undefined) {
    return;
  }

  const { type, props, children } = vnode;

  // Fragment 类型
  if (typeof type === 'symbol' && String(type) === 'Symbol(Fragment)') {
    if (Array.isArray(children)) {
      for (const child of children) {
        yield* renderVNodeToStream(child as VNode);
      }
    }
    return;
  }

  // 文本类型
  if (typeof type === 'symbol' && String(type).includes('Text')) {
    yield escapeHTML(String(children || ''));
    return;
  }

  // 注释类型
  if (typeof type === 'symbol' && String(type).includes('Comment')) {
    yield `<!--${String(children || '')}-->`;
    return;
  }

  // 字符串类型 → HTML 元素
  if (typeof type === 'string') {
    yield* renderElementToStream(type, props, children, vnode);
    return;
  }

  // 对象/函数类型 → 组件
  if (typeof type === 'object' || typeof type === 'function') {
    yield renderComponentToString(vnode);
    return;
  }
}

/**
 * 流式渲染 HTML 元素
 *
 * 分三个阶段 yield：
 *   1. 开始标签（含属性）
 *   2. 子节点内容
 *   3. 闭合标签
 *
 * @param tag      标签名
 * @param props    属性对象
 * @param children 子节点
 * @param vnode    原始 VNode
 * @yields HTML 字符串片段
 */
async function* renderElementToStream(
  tag: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any,
  vnode: VNode
): AsyncGenerator<string> {
  // 序列化属性
  const propsStr = serializeProps(props);

  // 自闭合标签
  if (VOID_TAGS.has(tag)) {
    yield `<${tag}${propsStr} />`;
    return;
  }

  // 处理 dangerouslySetInnerHTML / innerHTML
  if (props && (props.dangerouslySetInnerHTML || props.innerHTML)) {
    const htmlContent = props.dangerouslySetInnerHTML
      ? props.dangerouslySetInnerHTML.__html || props.dangerouslySetInnerHTML
      : props.innerHTML;
    yield `<${tag}${propsStr}>${escapeHTML(String(htmlContent))}</${tag}>`;
    return;
  }

  // 输出开始标签
  yield `<${tag}${propsStr}>`;

  // 输出子节点
  const shapeFlag = vnode.shapeFlag || 0;

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    yield escapeHTML(String(children || ''));
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && Array.isArray(children)) {
    for (const child of children) {
      yield* renderVNodeToStream(child as VNode);
    }
  } else if (shapeFlag & ShapeFlags.SLOTS_CHILDREN && typeof children === 'object' && children !== null) {
    yield renderSlotsToString(children);
  } else if (typeof children === 'string') {
    yield escapeHTML(children);
  } else if (Array.isArray(children)) {
    for (const child of children) {
      yield* renderVNodeToStream(child as VNode);
    }
  } else if (typeof children === 'number') {
    yield escapeHTML(String(children));
  }

  // 输出闭合标签
  yield `</${tag}>`;
}

// ================================================================
//  独立导出函数
// ================================================================

/**
 * 将 VNode 树渲染为完整 HTML 字符串（同步）
 *
 * 独立函数形式，方便直接调用而无需实例化 StringRenderer。
 *
 * @param vnode VNode 节点
 * @returns 完整的 HTML 字符串
 *
 * @example
 *   const html = renderToString(vnode)
 *   // → '<div>Hello</div>'
 */
export function renderToString(vnode: VNode): string {
  return renderVNodeToString(vnode);
}

/**
 * 将 VNode 树异步流式渲染为 ReadableStream
 *
 * 返回一个 Node.js ReadableStream，逐步输出 HTML 字符串片段。
 * 支持与 Suspense 集成：遇到 Suspense 边界时，先输出 fallback 内容，
 * 异步组件解析完成后再输出真实内容（通过占位注释标记实现替换）。
 *
 * @param vnode   VNode 节点
 * @param options 流式渲染选项
 * @returns ReadableStream<string>，逐步产出 HTML 字符串片段
 *
 * @example
 *   const stream = renderToStream(vnode)
 *   // 在 Node.js HTTP 响应中使用
 *   Readable.fromWeb(stream).pipe(res)
 *
 *   // 或手动消费
 *   for await (const chunk of stream) {
 *     process.stdout.write(chunk)
 *   }
 */
export function renderToStream(
  vnode: VNode,
  options?: RenderToStreamOptions
): ReadableStream<string> {
  const idPrefix = options?.suspenseIdPrefix || 'suspense';

  // 使用异步生成器创建 ReadableStream
  const generator = createStreamGenerator(vnode, idPrefix);

  return new ReadableStream<string>({
    async pull(controller) {
      const { value, done } = await generator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },

    async cancel() {
      await generator.return(undefined);
    },
  });
}

/**
 * 将 VNode 树异步流式渲染为异步生成器
 *
 * 与 renderToStream 类似，但返回 AsyncGenerator 而非 ReadableStream。
 * 更轻量级，适合直接在 async 函数中使用 for-await-of 消费。
 *
 * @param vnode   VNode 节点
 * @param options 流式渲染选项
 * @yields HTML 字符串片段
 *
 * @example
 *   for await (const chunk of renderToStreamGenerator(vnode)) {
 *     res.write(chunk)
 *   }
 *   res.end()
 */
export async function* renderToStreamGenerator(
  vnode: VNode,
  options?: RenderToStreamOptions
): AsyncGenerator<string> {
  const idPrefix = options?.suspenseIdPrefix || 'suspense';
  yield* createStreamGenerator(vnode, idPrefix);
}

/**
 * 创建流式渲染的异步生成器（内部实现）
 *
 * @param vnode     VNode 节点
 * @param idPrefix  Suspense 边界 ID 前缀
 * @yields HTML 字符串片段
 */
async function* createStreamGenerator(
  vnode: VNode,
  idPrefix: string
): AsyncGenerator<string> {
  if (vnode === null || vnode === undefined) {
    return;
  }

  const { type, props, children } = vnode;

  // Fragment 类型
  if (typeof type === 'symbol' && String(type) === 'Symbol(Fragment)') {
    if (Array.isArray(children)) {
      for (const child of children) {
        yield* createStreamGenerator(child as VNode, idPrefix);
      }
    }
    return;
  }

  // 文本类型
  if (typeof type === 'symbol' && String(type).includes('Text')) {
    yield escapeHTML(String(children || ''));
    return;
  }

  // 注释类型
  if (typeof type === 'symbol' && String(type).includes('Comment')) {
    yield `<!--${String(children || '')}-->`;
    return;
  }

  // 字符串类型 → HTML 元素
  if (typeof type === 'string') {
    yield* createStreamElement(type, props, children, vnode, idPrefix);
    return;
  }

  // 组件类型 → 检查是否为 Suspense 组件
  if (typeof type === 'object' && type !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const component = type as any;

    // 检测 Suspense 组件
    if (component.name === 'Suspense' || component._isSuspense) {
      yield* renderSuspenseBoundary(vnode, idPrefix);
      return;
    }

    // 检测异步组件
    if (component._isAsyncComponent || component.__asyncSetup) {
      yield* renderAsyncComponent(vnode, idPrefix);
      return;
    }

    // 普通组件 → 同步渲染
    yield renderComponentToString(vnode);
    return;
  }

  // 函数类型 → 函数式组件
  if (typeof type === 'function') {
    yield renderComponentToString(vnode);
    return;
  }
}

/**
 * 流式渲染 HTML 元素（内部实现，支持 Suspense 子节点）
 *
 * @param tag       标签名
 * @param props     属性对象
 * @param children  子节点
 * @param vnode     原始 VNode
 * @param idPrefix  Suspense 边界 ID 前缀
 * @yields HTML 字符串片段
 */
async function* createStreamElement(
  tag: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any,
  vnode: VNode,
  idPrefix: string
): AsyncGenerator<string> {
  const propsStr = serializeProps(props);

  // 自闭合标签
  if (VOID_TAGS.has(tag)) {
    yield `<${tag}${propsStr} />`;
    return;
  }

  // 处理 dangerouslySetInnerHTML / innerHTML
  if (props && (props.dangerouslySetInnerHTML || props.innerHTML)) {
    const htmlContent = props.dangerouslySetInnerHTML
      ? props.dangerouslySetInnerHTML.__html || props.dangerouslySetInnerHTML
      : props.innerHTML;
    yield `<${tag}${propsStr}>${escapeHTML(String(htmlContent))}</${tag}>`;
    return;
  }

  // 输出开始标签
  yield `<${tag}${propsStr}>`;

  // 输出子节点
  const shapeFlag = vnode.shapeFlag || 0;

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    yield escapeHTML(String(children || ''));
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && Array.isArray(children)) {
    for (const child of children) {
      yield* createStreamGenerator(child as VNode, idPrefix);
    }
  } else if (shapeFlag & ShapeFlags.SLOTS_CHILDREN && typeof children === 'object' && children !== null) {
    yield renderSlotsToString(children);
  } else if (typeof children === 'string') {
    yield escapeHTML(children);
  } else if (Array.isArray(children)) {
    for (const child of children) {
      yield* createStreamGenerator(child as VNode, idPrefix);
    }
  } else if (typeof children === 'number') {
    yield escapeHTML(String(children));
  }

  // 输出闭合标签
  yield `</${tag}>`;
}

/**
 * 渲染 Suspense 边界（流式）
 *
 * 工作流程：
 * 1. 输出 Suspense 开始占位注释
 * 2. 输出 fallback 内容
 * 3. 等待所有异步子组件解析
 * 4. 输出完整的真实内容
 *
 * @param vnode    Suspense 组件 VNode
 * @param idPrefix ID 前缀
 * @yields HTML 字符串片段
 */
async function* renderSuspenseBoundary(
  vnode: VNode,
  idPrefix: string
): AsyncGenerator<string> {
  const id = `${idPrefix}-${suspenseBoundaryId++}`;
  const props = vnode.props || {};

  // 获取 fallback 内容
  const fallback = props.fallback;
  let fallbackHtml = '';

  if (fallback) {
    // fallback 可能是 VNode 或组件
    if (typeof fallback === 'object' && fallback !== null) {
      fallbackHtml = renderVNodeToString(fallback as VNode);
    } else if (typeof fallback === 'string') {
      fallbackHtml = fallback;
    }
  }

  // 获取子组件（default slot）
  const children = vnode.children;
  let childVNodes: VNode[] = [];

  if (typeof children === 'object' && children !== null) {
    if (Array.isArray(children)) {
      childVNodes = children as VNode[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else if (typeof (children as any).default === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slotResult = (children as any).default();
      if (Array.isArray(slotResult)) {
        childVNodes = slotResult;
      } else if (slotResult !== null && slotResult !== undefined) {
        childVNodes = [slotResult];
      }
    }
  }

  // 收集异步 Promise
  const asyncPromises: Promise<void>[] = [];

  function collectAsyncPromises(vnodes: VNode[]) {
    for (const child of vnodes) {
      if (child === null || child === undefined) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childType = child.type as any;
      if (childType && (childType._isAsyncComponent || childType.__asyncSetup || child.__asyncSetup)) {
        const promise = child.__asyncPromise || childType.__asyncPromise;
        if (promise) {
          asyncPromises.push(promise.then(() => {}));
        }
      }
    }
  }

  collectAsyncPromises(childVNodes);

  // 如果没有异步子组件，直接渲染真实内容
  if (asyncPromises.length === 0) {
    for (const child of childVNodes) {
      yield* createStreamGenerator(child, idPrefix);
    }
    return;
  }

  // 有异步子组件：先输出 fallback，再等待解析后输出真实内容
  // 1. 输出 fallback 占位
  yield `<!--${id}-fallback-->`;
  yield fallbackHtml;

  // 2. 等待所有异步子组件解析
  await Promise.all(asyncPromises);

  // 3. 输出真实内容
  yield `<!--${id}-resolved-->`;
  for (const child of childVNodes) {
    yield* createStreamGenerator(child, idPrefix);
  }
  yield `<!--/${id}-->`;
}

/**
 * 渲染异步组件（流式）
 *
 * @param vnode    异步组件 VNode
 * @param idPrefix ID 前缀
 * @yields HTML 字符串片段
 */
async function* renderAsyncComponent(
  vnode: VNode,
  _idPrefix: string
): AsyncGenerator<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component = vnode.type as any;
  const promise = vnode.__asyncPromise || component.__asyncPromise;

  if (promise) {
    try {
      await promise;
    } catch (e) {
      // 异步组件加载失败，输出空注释
      console.warn('[Lyt SSR] 异步组件加载失败:', e instanceof Error ? e.message : e);
      yield '<!--async-component-error-->';
      return;
    }
  }

  // 异步组件解析完成后，渲染真实内容
  yield renderComponentToString(vnode);
}

// ================================================================
//  导出
// ================================================================

/** 默认渲染器实例 */
export const ssrRenderer = new StringRenderer();
