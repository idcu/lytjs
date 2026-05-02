/**
 * @lytjs/renderer - SSR Renderer
 * Server-side rendering to string
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isString, isArray, isObject, isFunction, isNullish } from '@lytjs/common-is';
import { camelToKebab } from '@lytjs/common-string';
import { warn } from '@lytjs/common-error';
import { escapeHtml, isBooleanAttr, isVoidElement } from '../utils';

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

function isValidHTMLElementTag(tag: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(tag);
}

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

// ============================================================
// renderAttributeToString
// ============================================================

// Security: attributes that carry URLs and need protocol validation
// Extracted to module-level constant to avoid re-creation on every render
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'srcdoc']);

// ============================================================
// Named entity decoding constants (module-level to avoid re-creation)
// ============================================================

const NAMED_ENTITIES: Record<string, string> = {
  '&colon;': ':',
  '&tab;': '\t',
  '&newline;': '\n',
  '&lpar;': '(',
  '&rpar;': ')',
};
const NAMED_ENTITY_REGEX = new RegExp(
  Object.keys(NAMED_ENTITIES)
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g',
);

// Numeric entity regex (module-level to avoid re-creation on every isSafeURL call)
const NUMERIC_ENTITY_REGEX = /&#x?[0-9a-f]+;/gi;

function isSafeURL(url: string): boolean {
  // 循环解码 HTML 实体，直到字符串不再变化
  let decoded = url;
  let prev = '';
  let maxIterations = 10;
  while (decoded !== prev && maxIterations-- > 0) {
    prev = decoded;
    decoded = decoded.replace(NUMERIC_ENTITY_REGEX, (match) => {
      const codePoint = match.startsWith('&#x')
        ? parseInt(match.slice(3, -1), 16)
        : parseInt(match.slice(2, -1), 10);
      // Validate the parsed code point is within the valid Unicode range
      if (isNaN(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return match;
      }
      return String.fromCodePoint(codePoint);
    });
    // 命名实体解码（在数字实体解码之后）
    decoded = decoded.replace(NAMED_ENTITY_REGEX, (match) => NAMED_ENTITIES[match] || match);
  }
  // 使用 URL 构造函数进行额外验证
  try {
    const parsed = new URL(decoded, 'http://example.com');
    const protocol = parsed.protocol.toLowerCase().replace(':', '');
    if (protocol === 'javascript') {
      return false;
    }
    if (protocol === 'data') {
      // 禁止 data:image/svg+xml（可嵌入脚本，存在 XSS 风险）
      if (/^data:image\/svg\+xml/i.test(decoded)) {
        return false;
      }
      // 允许安全的 data:image/* MIME 类型（使用解码后的 URL 进行检查）
      return /^data:image\/(png|jpeg|jpg|gif|webp|bmp|ico|avif);/i.test(decoded);
    }
    return true;
  } catch {
    return false;
  }
}

function renderAttributeToString(key: string, value: unknown): string {
  // Skip null/undefined
  if (isNullish(value)) return '';

  // Skip event handlers
  if (/^on[A-Z]/.test(key)) return '';

  // Class handling
  if (key === 'class') {
    const classValue = value == null ? '' : String(value);
    if (!classValue) return '';
    return ` class="${escapeHtml(classValue)}"`;
  }

  // Style handling
  if (key === 'style') {
    if (isString(value)) {
      if (!value) return '';
      return ` style="${escapeHtml(value)}"`;
    }
    if (isObject(value)) {
      const styles: string[] = [];
      for (const k in value as Record<string, unknown>) {
        const val = (value as Record<string, unknown>)[k];
        if (val != null && val !== '') {
          styles.push(`${camelToKebab(k)}:${String(val)}`);
        }
      }
      if (styles.length === 0) return '';
      return ` style="${escapeHtml(styles.join(';'))}"`;
    }
    return '';
  }

  // Boolean attributes
  if (isBooleanAttr(key)) {
    if (value === false || value === '') return '';
    return ` ${key}`;
  }

  // Security: block dangerous URL protocols on URL attributes
  if (URL_ATTRS.has(key)) {
    if (!isSafeURL(String(value))) {
      if (__DEV__) {
        warn(`Blocked potentially dangerous attribute: ${key}="${String(value)}"`);
      }
      return '';
    }
  }

  // Regular attributes
  return ` ${key}="${escapeHtml(String(value))}"`;
}
