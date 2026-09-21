/**
 * @lytjs/ssr - 服务端渲染
 *
 * 将 VNode 渲染为 HTML 字符串
 */

import type { VNode } from '@lytjs/vdom';
import { createComponentInstance, setupComponent } from '@lytjs/component';
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
export function renderToString(
  vnode: VNode | VNode[] | string | number | null | undefined,
): string {
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
    return vnode.map((child) => renderToString(child)).join('');
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

  // 处理函数式组件
  if (isFunction(node.type)) {
    const component = node.type as unknown as (props: unknown, ctx: unknown) => unknown;
    const result = component((node.props as Record<string, unknown>) ?? {}, {
      slots: (node.children as Record<string, unknown>) ?? {},
    });
    return renderToString(result as VNode | VNode[] | string | number | null | undefined);
  }

  // 处理选项式组件（defineComponent 返回的是选项对象，因此 type 为 object）
  if (isObject(node.type)) {
    return renderComponentNode(node);
  }

  // 处理元素
  if (isString(node.type)) {
    const tag = node.type;
    const props = node.props || {};

    // 自闭合标签
    const voidTags = [
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'param',
      'source',
      'track',
      'wbr',
    ];
    if (voidTags.includes(tag)) {
      return `<${tag}${renderAttributes(props)}>`;
    }

    // 渲染子元素
    const children = renderToString(
      node.children as VNode | VNode[] | string | number | null | undefined,
    );

    return `<${tag}${renderAttributes(props)}>${children}</${tag}>`;
  }

  return '';
}

/**
 * 渲染选项式组件节点
 *
 * 修复说明：旧实现对组件一律 `return ''`，而 defineComponent 返回的是选项对象，
 * 于是**任何由组件构成的页面 SSR 输出都是空壳**（只有 <div id="app"></div>）。
 * 现在走组件实例：createComponentInstance → setupComponent（执行 setup、初始化
 * props/slots）→ 取渲染函数产出 subTree → 递归渲染。
 *
 * 渲染函数契约遵循本框架约定：优先 instance.render（setup 返回的函数），
 * 其次 options.render。
 */
function renderComponentNode(node: VNode): string {
  const type = node.type as { name?: string; render?: unknown };

  const instance = createComponentInstance(node, null);
  setupComponent(instance);

  const renderFn = instance.render ?? (type.render as typeof instance.render);
  if (typeof renderFn !== 'function') {
    // 不静默输出空串：明确告警并退化为渲染默认插槽内容
    if (typeof console !== 'undefined') {
      console.warn(
        `[lytjs/ssr] 组件 "${type.name ?? 'anonymous'}" 没有可用的渲染函数，` +
          'SSR 需要 setup 返回渲染函数或提供 options.render；已退化为渲染其默认插槽。',
      );
    }
    const slots = instance.slots as Record<string, unknown> | undefined;
    const defaultSlot = slots?.default as (() => unknown) | undefined;
    const children = typeof defaultSlot === 'function' ? defaultSlot() : node.children;
    return renderToString(children as VNode | VNode[] | null | undefined);
  }

  const subTree = renderFn.call(instance.ctx, instance.ctx);
  instance.subTree = subTree as typeof instance.subTree;
  return renderToString(subTree as VNode | VNode[] | string | number | null | undefined);
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
          ? Object.entries(value)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(' ')
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
          ? Object.entries(value)
              .map(([k, v]) => `${k}:${v}`)
              .join(';')
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
  } = {},
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
