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
