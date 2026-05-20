/**
 * @lytjs/ssr - 服务端渲染
 *
 * 将 VNode 渲染为 HTML 字符串
 */

import type { VNode } from '@lytjs/vdom';
import { isString, isNumber, isArray, isObject, isFunction } from '@lytjs/common-is';

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 渲染 VNode 为 HTML 字符串
 */
export function renderToString(vnode: VNode | VNode[] | string | number | null | undefined): string {
  // 处理 null/undefined
  if (vnode === null || vnode === undefined) {
    return '';
  }

  // 处理字符串
  if (isString(vnode)) {
    return escapeHtml(vnode);
  }

  // 处理数字
  if (isNumber(vnode)) {
    return String(vnode);
  }

  // 处理数组
  if (isArray(vnode)) {
    return vnode.map(child => renderToString(child)).join('');
  }

  // 处理 VNode 对象
  if (!isObject(vnode)) {
    return '';
  }

  const node = vnode as VNode;

  // 处理文本节点
  if (node.type === 'text' || typeof node.type === 'symbol') {
    return escapeHtml(String(node.children || ''));
  }

  // 处理组件
  if (isFunction(node.type)) {
    // 简化处理：组件返回空字符串
    return '';
  }

  // 处理元素
  if (isString(node.type)) {
    const tag = node.type;
    const props = node.props || {};
    
    // 自闭合标签
    const voidTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    if (voidTags.includes(tag)) {
      return `<${tag}${renderAttributes(props)}>`;
    }

    // 渲染子元素
    const children = renderToString(node.children as VNode | VNode[] | string | number | null | undefined);

    return `<${tag}${renderAttributes(props)}>${children}</${tag}>`;
  }

  return '';
}

/**
 * 渲染属性为 HTML 属性字符串
 */
function renderAttributes(props: Record<string, unknown>): string {
  const attrs: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    // 跳过事件处理器和内部属性
    if (key.startsWith('on') || key === 'key' || key === 'ref') {
      continue;
    }

    // 处理 class
    if (key === 'class' || key === 'className') {
      if (value) {
        const classValue = isObject(value) 
          ? Object.entries(value).filter(([, v]) => v).map(([k]) => k).join(' ')
          : String(value);
        if (classValue) {
          attrs.push(` class="${escapeHtml(classValue)}"`);
        }
      }
      continue;
    }

    // 处理 style
    if (key === 'style') {
      if (value) {
        const styleValue = isObject(value)
          ? Object.entries(value).map(([k, v]) => `${k}:${v}`).join(';')
          : String(value);
        if (styleValue) {
          attrs.push(` style="${escapeHtml(styleValue)}"`);
        }
      }
      continue;
    }

    // 处理布尔属性
    if (value === true) {
      attrs.push(` ${key}`);
      continue;
    }

    // 跳过 false 和 null
    if (value === false || value === null || value === undefined) {
      continue;
    }

    // 普通属性
    attrs.push(` ${key}="${escapeHtml(String(value))}"`);
  }

  return attrs.join('');
}

/**
 * 渲染完整的 HTML 页面
 */
export function renderToHtml(
  vnode: VNode | VNode[],
  options: {
    title?: string;
    lang?: string;
    head?: string;
    bodyAttrs?: Record<string, string>;
  } = {}
): string {
  const { title = 'LytJS App', lang = 'zh-CN', head = '', bodyAttrs = {} } = options;

  const content = renderToString(vnode);
  const bodyAttrsStr = Object.entries(bodyAttrs)
    .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${head}
</head>
<body${bodyAttrsStr}>
  <div id="app">${content}</div>
</body>
</html>`;
}

export default {
  renderToString,
  renderToHtml,
};
