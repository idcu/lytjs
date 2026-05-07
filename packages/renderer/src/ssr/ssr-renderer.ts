/**
 * @lytjs/renderer - SSR Renderer
 * Server-side rendering to string
 * FIX: P2-36 使用共享工具函数
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isArray, isFunction } from '@lytjs/common-is';
import { escapeHtml, isVoidElement } from '../utils';
import { isValidHTMLElementTag, renderAttributeToString } from './ssr-utils';
import { warn } from '@lytjs/common-error';

// ============================================================
// renderToString - main entry
// ============================================================

export interface SSRInput {
  vnode: VNode;
}

/**
 * Render a VNode to an HTML string.
 *
 * Returns a Promise for future Suspense/async component support.
 * When components contain async sub-components (e.g. Suspense boundaries),
 * the rendering process needs to wait for async data loading before
 * outputting HTML.
 */
export function renderToString(input: SSRInput): Promise<string> {
  return Promise.resolve(renderVNodeToString(input.vnode));
}

// ============================================================
// renderVNodeToString
// ============================================================

function renderVNodeToString(vnode: VNode): string {
  const { type, shapeFlag, children } = vnode;

  // Handle Fragment
  if (type === Fragment) {
    return renderFragmentToString(vnode);
  }

  // Handle Text
  if (type === Text) {
    const text = isFunction(children) ? '' : String(children ?? '');
    return escapeHtml(text);
  }

  // Handle Comment
  if (type === Comment) {
    const text = isFunction(children) ? '' : String(children ?? '');
    // 转义 <!-- 和 --> 防止注释注入导致 HTML 结构破坏
    // Sanitize comment delimiters first, then double-dash
    let safe = text.replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;');
    safe = safe.replace(/--/g, '- -');
    return `<!--${safe}-->`;
  }

  // Handle Element
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

  // Build opening tag with attributes
  let html = `<${tag}`;

  // Render props as attributes
  for (const key in props) {
    if (key === 'key' || key === 'ref') continue;
    html += renderAttributeToString(key, props[key]);
  }

  // Self-closing elements
  if (isVoidElement(tag)) {
    html += ' />';
    return html;
  }

  html += '>';

  // Render children
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
