/**
 * @lytjs/ssr - 服务端渲染
 *
 * 将 VNode 渲染为 HTML 字符串
 */

import { Fragment } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import { createComponentInstance, setupComponent, getTemplateCompiler } from '@lytjs/component';
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

  // ⚠️ 2026-10-27 修（P0）：Fragment 的 type 是 `Symbol.for('Fragment')`，
  //   此前被下面的「symbol 即文本」分支接住 ⇒ 整棵多根子树被 `String(children)`
  //   转成 `[object Object],[object Object]` 输出（实测）。
  //   Fragment 必须**展开 children**，而不是当文本转义。
  if (node.type === Fragment) {
    if (!isArray(node.children)) return '';
    return (node.children as VNode[]).map((child) => renderToString(child)).join('');
  }

  // 处理文本节点（Text 的 type 也是 symbol）
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
  const type = node.type as { name?: string; render?: unknown; template?: unknown };
  const name = type.name ?? 'anonymous';

  // ⚠️ 2026-10-31 修（P0）：**空页 + HTTP 200 是最难排查的失败方式**。
  //   此前只装了 `@lytjs/ssr`（没装 `@lytjs/core`）时，`template` 组件会走到
  //   `resolveTemplateRender` 的「无编译器 ⇒ 返回 () => null」分支 ⇒ SSR 输出空串、
  //   状态码仍是 200，线上表现为"白屏但不报错"。
  //   现在：**明确抛错**并给出修法，让问题在构建/启动阶段就暴露。
  if (typeof type.template === 'string' && !getTemplateCompiler()) {
    throw new Error(
      `[lytjs/ssr] 组件 "${name}" 提供了 template，但当前进程没有注入模板编译器。\n` +
        `  继续渲染只会得到空白页（HTTP 200），因此这里直接失败。\n` +
        `  修法（任选其一）：\n` +
        `    ① 在服务端入口**调用一次** createApp()，或显式 installTemplateCompiler()\n` +
        `       —— 注意：只 import '@lytjs/core' 不够，编译器是**调用时**注入的；\n` +
        `    ② 给该组件提供 setup() 返回的 render 函数（AOT / 手写 render）。`,
    );
  }

  // `async setup` 在 setupComponent 阶段就不会产出 render（返回的是 Promise），
  // 之后只会落到「没有渲染函数 ⇒ 告警 + 渲染插槽」分支，输出空页。
  // 这里**在渲染前**就判定并抛出，避免"200 空页"。
  const setupFn = (type as { setup?: unknown }).setup;
  const isAsyncSetup =
    typeof setupFn === 'function' &&
    Object.prototype.toString.call(setupFn) === '[object AsyncFunction]';
  if (isAsyncSetup && !type.render) {
    throw new Error(
      `[lytjs/ssr] 组件 "${name}" 使用了 async setup。\n` +
        `  renderToString() 是同步 API，无法等待 Promise —— 继续渲染只会得到空白页。\n` +
        `  修法（任选其一）：\n` +
        `    ① 用 useSuspense() 把异步数据挂到边界上，并在服务端 await 后再渲染；\n` +
        `    ② 在 SSR 之前预取数据，把 async setup 改为同步 setup。`,
    );
  }

  const instance = createComponentInstance(node, null);
  setupComponent(instance);

  const renderFn = instance.render ?? (type.render as typeof instance.render);
  if (typeof renderFn !== 'function') {
    // 不静默输出空串：明确告警并退化为渲染默认插槽内容
    if (typeof console !== 'undefined') {
      console.warn(
        `[lytjs/ssr] 组件 "${name}" 没有可用的渲染函数，` +
          'SSR 需要 setup 返回渲染函数或提供 options.render；已退化为渲染其默认插槽。',
      );
    }
    const slots = instance.slots as Record<string, unknown> | undefined;
    const defaultSlot = slots?.default as (() => unknown) | undefined;
    const children = typeof defaultSlot === 'function' ? defaultSlot() : node.children;
    return renderToString(children as VNode | VNode[] | null | undefined);
  }

  const subTree = renderFn.call(instance.ctx, instance.ctx);

  // ⚠️ 2026-10-31 修（P0）：`async setup` 返回 Promise，此前被当成 vnode 交给
  //   renderToString ⇒ 类型不认识 ⇒ 输出空串。`renderToString` 是**同步** API，
  //   无法 await，所以这里必须明确失败，而不是渲染半成品。
  if (subTree && typeof (subTree as { then?: unknown }).then === 'function') {
    throw new Error(
      `[lytjs/ssr] 组件 "${name}" 的 setup 返回了 Promise（async setup）。\n` +
        `  renderToString() 是同步 API，无法等待它 —— 继续渲染只会得到空白页。\n` +
        `  修法（任选其一）：\n` +
        `    ① 用 useSuspense() 把异步数据挂到边界上，并在服务端 await 后再渲染；\n` +
        `    ② 在 SSR 之前预取数据，把 async setup 改为同步 setup。`,
    );
  }

  // ⚠️ 2026-11-01 修（P0）：**SSR 此前完全不做 attrs 透传**。
  //
  //   `<Inner title="T" class="extra" data-x="1" />` 的 SSR 产物是
  //   `<div class="inner">T</div>` —— `class` 与 `data-x` **整条丢失**；
  //   而客户端产物是 `<div class="inner extra" data-x="1">T</div>`。
  //   ⇒ 首屏 HTML 与客户端首帧**不一致**，hydrate 必然错位（样式丢失、属性丢失）。
  //
  //   规则与客户端（patch-component 的 inheritAttrs 处理）保持一致：
  //   `class` / `style` **合并**，其余属性透传到根元素；`inheritAttrs: false` 时只继承 class/style。
  const attrs = instance.attrs as Record<string, unknown> | undefined;
  if (
    attrs &&
    Object.keys(attrs).length > 0 &&
    subTree &&
    typeof subTree === 'object' &&
    !Array.isArray(subTree)
  ) {
    const inheritAll = (type as { inheritAttrs?: boolean }).inheritAttrs !== false;
    const rootVNode = subTree as VNode;
    const existing = (rootVNode.props ?? {}) as Record<string, unknown>;
    const effectiveAttrs: Record<string, unknown> = inheritAll
      ? attrs
      : Object.fromEntries(Object.entries(attrs).filter(([k]) => k === 'class' || k === 'style'));

    if (Object.keys(effectiveAttrs).length > 0) {
      const merged: Record<string, unknown> = { ...existing, ...effectiveAttrs };
      if (existing['class'] != null && effectiveAttrs['class'] != null) {
        merged['class'] = [existing['class'], effectiveAttrs['class']];
      }
      if (existing['style'] != null && effectiveAttrs['style'] != null) {
        merged['style'] = [existing['style'], effectiveAttrs['style']];
      }
      rootVNode.props = merged;
    }
  }

  instance.subTree = subTree as typeof instance.subTree;
  return renderToString(subTree as VNode | VNode[] | string | number | null | undefined);
}

/**
 * 渲染属性为 HTML 属性字符串
 */
/**
 * 把 class 的任意合法形态归一成字符串（字符串 / 数组 / 对象 / 嵌套数组）。
 * 与客户端的 `normalizeClass` 语义一致 —— SSR 与客户端必须产出同样的 class。
 */
function normalizeClassValue(value: unknown): string {
  if (value == null || value === false) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => normalizeClassValue(v))
      .filter(Boolean)
      .join(' ');
  }
  if (isObject(value)) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ');
  }
  return String(value);
}

/**
 * 把 style 的任意合法形态归一成 CSS 文本（字符串 / 数组 / 对象）。
 */
function normalizeStyleValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => normalizeStyleValue(v))
      .filter(Boolean)
      .join('; ');
  }
  if (isObject(value)) {
    return (
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v != null && v !== '')
        // ⚠️ CSS 属性名必须转成 kebab-case：`fontSize` → `font-size`。
        //   此前直接输出 `fontSize: 12px`（浏览器不认），与客户端产物也不一致。
        .map(
          ([k, v]) =>
            `${k.startsWith('--') ? k : k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${String(v)}`,
        )
        .join('; ')
    );
  }
  return String(value);
}

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
        // ⚠️ 2026-11-01 修（P0）：必须支持**数组**形态。
        //   attrs 透传时 class 会被合并成 `[原有, 传入]`（与客户端一致），
        //   而此前 `String(value)` 会把它变成 `"0 1"` —— 实测 SSR 产物 `class="0 1"`。
        const classValue = normalizeClassValue(value);
        if (classValue) {
          attrs.push(` class="${escapeHtml(classValue)}"`);
        }
      }
      continue;
    }

    // 处理 style
    if (key === 'style') {
      if (value) {
        // 同样必须支持数组（attrs 透传时 style 也会被合并成 `[原有, 传入]`）
        const styleValue = normalizeStyleValue(value);
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
