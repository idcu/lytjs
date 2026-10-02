/**
 * @lytjs/renderer - SSR 渲染器
 * 服务端渲染为字符串
 * FIX: P2-36 使用共享工具函数
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isArray, isFunction } from '@lytjs/common-is';
import { escapeHtml, isVoidElement } from '../utils';
import { isValidHTMLElementTag, renderAttributeToString } from './ssr-utils';
import { warn } from '@lytjs/common-error';

// ============================================================
// renderToString - 主入口
// ============================================================

export interface SSRInput {
  vnode: VNode;
}

/**
 * 将 VNode 渲染为 HTML 字符串。
 *
 * 返回 Promise 以支持未来的 Suspense/异步组件。
 * 当组件包含异步子组件（如 Suspense 边界）时，
 * 渲染过程需要等待异步数据加载完成后才能输出 HTML。
 */
export function renderToString(input: SSRInput): Promise<string> {
  return Promise.resolve(renderVNodeToString(input.vnode));
}

// ============================================================
// renderVNodeToString
// ============================================================

/** 有状态/函数式组件的 ShapeFlag（第 2-3 位） */
const COMPONENT_MASK = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT;

/** 形如 VNode（有 `type` 字段的对象） */
function isVNodeLike(value: unknown): boolean {
  return !!value && typeof value === 'object' && 'type' in (value as object);
}

function renderVNodeToString(vnode: VNode): string {
  const { type, shapeFlag, children } = vnode;

  // 处理 Fragment
  if (type === Fragment) {
    return renderFragmentToString(vnode);
  }

  // 处理 Text
  if (type === Text) {
    const text = isFunction(children) ? '' : String(children ?? '');
    return escapeHtml(text);
  }

  // 处理 Comment
  if (type === Comment) {
    const text = isFunction(children) ? '' : String(children ?? '');
    // 转义 <!-- 和 --> 防止注释注入导致 HTML 结构破坏
    // 先清理注释分隔符，再处理双连字符
    let safe = text.replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;');
    safe = safe.replace(/--/g, '- -');
    return `<!--${safe}-->`;
  }

  // 处理 Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    return renderElementToString(vnode);
  }

  // ⚠️ 2026-10-02 修复：此前**没有**组件分支 ⇒ 组件 vnode 一律落到 `return ''`，
  // 静默输出空串（与同包 `ssr-stream.ts` 的 `COMPONENT_MASK` 分支不对称）。
  if (shapeFlag & COMPONENT_MASK) {
    return renderComponentToString(vnode);
  }

  return '';
}

/**
 * 把组件 vnode 渲染为 HTML 字符串。
 *
 * 语义与 `ssr-stream.ts` 的 `streamComponentAsync` 严格同构（同一 API 族必须同构）：
 * 先跑 `setup`（若直接返回 VNode 就用它），再调用 `render`；props 作为默认 ctx。
 * 无法渲染时告警并返回空串，**不抛错**（避免一个坏组件中断整棵树）。
 *
 * 注：`COMPONENT_MASK` 含 `FUNCTIONAL_COMPONENT` 以与流式版一致，但**实测**
 * `vdom.getShapeFlag()` 对函数 type 返回的是 `STATEFUL_COMPONENT`（4）——
 * 其内部 `isObject()` 把函数也视为对象，故该位**从未被设置**。函数 type 因此
 * 同样会进入本分支，只是组件形态约定为 options 对象（`setup`/`render`），
 * 函数 type 两者皆无 ⇒ 告警并返回空串（与 `ssr-stream.ts` 行为一致）。
 * 「函数式组件」支持属独立缺口，另行处理。
 */
function renderComponentToString(vnode: VNode): string {
  const component = vnode.type as unknown;
  const props = (vnode.props ?? {}) as Record<string, unknown>;

  if (component && typeof component === 'object') {
    const options = component as { setup?: unknown; render?: unknown };
    let ctx: Record<string, unknown> = props;

    if (isFunction(options.setup)) {
      const setupResult = (options.setup as (p: unknown) => unknown)(props);
      // setup 直接返回 VNode ⇒ 用它，跳过 render
      if (isVNodeLike(setupResult)) {
        return renderVNodeToString(setupResult as VNode);
      }
      if (setupResult && typeof setupResult === 'object') {
        ctx = setupResult as Record<string, unknown>;
      }
    }

    if (isFunction(options.render)) {
      const result = (options.render as (c: unknown) => unknown)(ctx);
      return isVNodeLike(result) ? renderVNodeToString(result as VNode) : '';
    }
  }

  if (__DEV__) {
    warn('SSR renderToString: could not render component vnode');
  }
  return '';
}

// ============================================================
// renderFragmentToString
// ============================================================

function renderFragmentToString(vnode: VNode): string {
  const children = vnode.children;
  if (isArray(children)) {
    return children.map((child) => (child != null ? renderVNodeToString(child) : '')).join('');
  }
  return '';
}

// ============================================================
// renderElementToString
// ============================================================

function renderElementToString(vnode: VNode): string {
  const tag = vnode.type as string;

  if (!isValidHTMLElementTag(tag)) {
    if (__DEV__) {
      warn(`Invalid SSR element tag: "${tag}"`);
    }
    return '';
  }

  const props = vnode.props ?? {};
  const { shapeFlag, children } = vnode;

  // 构建带属性的开始标签
  let html = `<${tag}`;

  // 将 props 渲染为属性
  for (const key in props) {
    if (key === 'key' || key === 'ref') continue;
    html += renderAttributeToString(key, props[key]);
  }

  // 自闭合元素
  if (isVoidElement(tag)) {
    html += ' />';
    return html;
  }

  html += '>';

  // 渲染子节点
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    const text = isFunction(children) ? '' : String(children ?? '');
    html += escapeHtml(text);
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        html += renderVNodeToString(child);
      }
    }
  }

  html += `</${tag}>`;
  return html;
}
