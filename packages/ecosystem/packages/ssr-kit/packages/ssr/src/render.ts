/**
 * @lytjs/ssr - 服务端渲染
 *
 * 将 VNode 渲染为 HTML 字符串
 */

import { Fragment } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import {
  createComponentInstance,
  setupComponent,
  getTemplateCompiler,
  setCurrentInstance,
  getCurrentInstance,
} from '@lytjs/component';
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
    if (VOID_TAGS.includes(tag)) {
      return `<${tag}${renderAttributes(props)}>`;
    }

    // 渲染子元素
    // ★ 2026-11-02 修（P0）：`v-html` 在编译产物里是 **`innerHTML` prop**，
    //   此前 SSR 不认识它 ⇒ 被当成普通属性转义输出（内容丢失 + 非法属性）。
    //   与异步路径同一处修法：原样输出为子内容。
    const rawHtml = props['innerHTML'];
    const children =
      typeof rawHtml === 'string'
        ? rawHtml
        : renderToString(node.children as VNode | VNode[] | string | number | null | undefined);

    return `<${tag}${renderAttributes(props)}>${children}</${tag}>`;
  }

  return '';
}

/**
 * **异步**渲染：真正等待 `async setup` 的 SSR。
 *
 * ## 为什么需要它
 *
 * `renderToString()` 是同步 API，遇到 `async setup` 只能**抛错**（否则输出空页 + HTTP 200，
 * 是最难排查的失败方式）。但"服务端取数据"本身就是异步的 —— 之前那条错误信息里写的
 * 「用 useSuspense() 挂到边界上，并在服务端 await 后再渲染」**根本没有对应的 API**，
 * 用户照着改也做不到。
 *
 * 本函数补上这条路：
 * - 元素 / 文本 / Fragment 复用同步渲染（这些层级没有异步）；
 * - 组件：`setupComponent` 后若 `instance.asyncDep` 存在则 **await 它**，
 *   Promise 兑现时 `setupComponent` 内部的 `.then` 已经把 `instance.render` 填好
 *   （它先于我们注册，所以 await 返回时必然已完成）；
 * - 嵌套的异步组件同样逐层 await。
 *
 * 同步的 `renderToString` **行为不变**（继续明确抛错）—— 二者语义不同，不该混用。
 */
export async function renderToStringAsync(
  vnode: VNode | VNode[] | string | number | null | undefined,
): Promise<string> {
  if (vnode === null || vnode === undefined) return '';
  if (isString(vnode)) return escapeHtml(vnode);
  if (isNumber(vnode)) return String(vnode);

  if (isArray(vnode)) {
    const parts: string[] = [];
    for (const child of vnode) parts.push(await renderToStringAsync(child));
    return parts.join('');
  }

  if (!isObject(vnode)) return '';
  const node = vnode as VNode;

  if (node.type === Fragment) {
    if (!isArray(node.children)) return '';
    const parts: string[] = [];
    for (const child of node.children as VNode[]) parts.push(await renderToStringAsync(child));
    return parts.join('');
  }

  if (node.type === 'text' || typeof node.type === 'symbol') {
    return escapeHtml(String(node.children || ''));
  }

  // 元素：外壳同步拼，children 异步递归
  if (isString(node.type)) {
    const tag = node.type;
    const props = node.props || {};
    if (VOID_TAGS.includes(tag)) return `<${tag}${renderAttributes(props)}>`;
    // ★ 2026-11-02 修（P0）：`v-html` 在编译产物里是 **`innerHTML` prop**，
    //   此前 SSR 不认识它 ⇒ 被 `renderAttributes` 当成普通属性转义输出，
    //   实测产物 `<div class="h" innerHTML="&lt;b&gt;bold&lt;/b&gt;"></div>`
    //   （内容没渲染出来，还多了一个非法属性），与客户端完全不一致。
    //   现在：`innerHTML` 作为**原样子内容**输出（sanitize 已在编译产物里做过）。
    const rawHtml = props['innerHTML'];
    const inner =
      typeof rawHtml === 'string'
        ? rawHtml
        : await renderToStringAsync(
            node.children as VNode | VNode[] | string | number | null | undefined,
          );
    return `<${tag}${renderAttributes(props)}>${inner}</${tag}>`;
  }

  return renderComponentNodeAsync(node);
}

/**
 * 组件节点的异步渲染（`renderToStringAsync` 的组件分支）。
 */
async function renderComponentNodeAsync(node: VNode): Promise<string> {
  const type = node.type as {
    name?: string;
    render?: unknown;
    template?: unknown;
    inheritAttrs?: boolean;
  };
  const name = type.name ?? 'anonymous';

  // ⚠️ **函数式组件**：`type` 是函数时，同步渲染是直接调用它（`component(props, ctx)`），
  //   不走 setup 实例。异步路径必须保持同一语义，否则 `() => null` 这类函数组件会
  //   走到"没有渲染函数"的报错（实测 3 条 stream 用例因此失败）。
  if (typeof type === 'function') {
    const fn = type as unknown as (props: unknown, ctx: unknown) => unknown;
    const result = fn((node.props as Record<string, unknown>) ?? {}, {
      slots: (node.children as Record<string, unknown>) ?? {},
    });
    return renderToStringAsync(result as VNode | VNode[] | string | number | null | undefined);
  }

  if (typeof type.template === 'string' && !getTemplateCompiler()) {
    throw new Error(
      `[lytjs/ssr] 组件 "${name}" 提供了 template，但当前进程没有注入模板编译器。\n` +
        `  修法：在服务端入口**调用一次** createApp()，或显式 installTemplateCompiler()。`,
    );
  }

  const instance = createComponentInstance(node, null);
  setupComponent(instance);

  // ★ 关键：真正等待 async setup
  if (instance.asyncDep) {
    try {
      await instance.asyncDep;
    } catch (err) {
      throw new Error(
        `[lytjs/ssr] 组件 "${name}" 的 async setup 失败：${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const renderFn = instance.render ?? (type.render as typeof instance.render);
  if (typeof renderFn !== 'function') {
    throw new Error(
      `[lytjs/ssr] 组件 "${name}" 没有可用的渲染函数（setup 未返回 render，也没有 options.render）。`,
    );
  }

  // ============================================================
  // ★ 2026-11-02 修（P0）：渲染期间必须设置「当前实例」
  // ============================================================
  //
  // ## 缺陷
  //
  // `<component :is="which" />` 的编译产物是
  //   `createElementVNode(resolveDynamicComponent(_ctx.which), null)`
  // 而 `resolveDynamicComponent` → `resolveComponent` **依赖 `getCurrentInstance()`**
  // 才能查到 `type.components` / `appContext.components`。
  //
  // SSR 此前直接 `renderFn.call(...)`，**没有设置当前实例** ⇒ `resolveComponent`
  // 返回 undefined ⇒ 退化成原始字符串 ⇒ 把组件名当成 HTML 标签输出：
  //
  //   SSR:  <div><A></A></div>          ← 把组件名当标签，组件根本没渲染
  //   客户端: <div><span class="ca">A</span></div>
  //
  // 这同时也是 hydrate 的必然错位源（两端结构不同）。
  //
  // ## 修法
  //
  // 与客户端渲染一致：渲染函数调用期间 `setCurrentInstance(instance)`，
  // 结束后恢复上一个值（SSR 是递归的，必须恢复而不是置 null）。
  const prevInstance = getCurrentInstance();
  let subTree: unknown;
  setCurrentInstance(instance);
  try {
    subTree = renderFn.call(instance.ctx, instance.ctx);
  } finally {
    setCurrentInstance(prevInstance);
  }
  subTree = applyAttrsToRoot(instance, subTree, type);
  instance.subTree = subTree as typeof instance.subTree;

  // ★ 2026-11-03 新增（P0）：**SSR 必须主动释放组件副作用**。
  //
  //   服务端每次渲染都会 `createComponentInstance()` 造一个新实例，而这些实例
  //   **永远不会被 unmount**（没有 KeepAlive、没有 app.unmount）。客户端靠
  //   `unmount → callUnmountedHook → scope.stop()` 释放，SSR 没有任何等价时机。
  //
  //   实测（修复前）：同一组件渲染 50 次后改一次共享状态 ⇒ **50 个回调全部被调用**
  //   （`scripts/check-lifecycle-release.mjs` 的 [12] 组）。长跑服务器上这会随
  //   请求量线性增长：每个请求泄漏的 watcher 都持有自己的组件实例 → subTree。
  //
  //   放在 `finally` 里：即使子树的递归渲染抛错，也不留下半渲染实例的副作用。
  try {
    return await renderToStringAsync(
      subTree as VNode | VNode[] | string | number | null | undefined,
    );
  } finally {
    instance.scope?.stop();
  }
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

  // ★ 2026-11-02 修（P0）：同步路径同样必须设置当前实例 ——
  //   否则 `resolveDynamicComponent` / `resolveComponent` 在 SSR 下恒失败，
  //   `<component :is>` 会把组件名当 HTML 标签输出。详见异步路径处的完整说明。
  const prevInstance = getCurrentInstance();
  let subTree: unknown;
  setCurrentInstance(instance);
  try {
    subTree = renderFn.call(instance.ctx, instance.ctx);
  } finally {
    setCurrentInstance(prevInstance);
  }

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
  subTree = applyAttrsToRoot(instance, subTree, type as { inheritAttrs?: boolean });

  instance.subTree = subTree as typeof instance.subTree;
  // ★ 2026-11-03（P0）：与异步路径同理 —— SSR 实例永不被 unmount，
  //   必须在渲染完成后主动 `scope.stop()`，否则每个请求泄漏一份副作用。
  try {
    return renderToString(subTree as VNode | VNode[] | string | number | null | undefined);
  } finally {
    instance.scope?.stop();
  }
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

/** HTML 自闭合标签 */
const VOID_TAGS = [
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

/**
 * 把组件的 attrs 透传到渲染结果的**根 vnode** 上。
 * `class` / `style` 合并，其余属性覆盖；`inheritAttrs: false` 时只继承 class/style。
 * 同步与异步两条渲染路径共用这一份实现。
 *
 * ⚠️ **返回新的 vnode，不原地修改**（2026-11-02 修，P0）。
 *
 * 编译器会把**完全静态的模板**提升成模块级常量：
 *
 *   const _hoisted_1 = createElementVNode("div", { class: "own" }, "inner")
 *   function render() { return _hoisted_1 }   // 每次返回**同一个对象**
 *
 * 此前这里是 `rootVNode.props = merged` —— 原地改那个共享对象，于是：
 *   · SSR 渲染一次后，提升对象上就永久带着这次的 attrs；
 *   · 同一个模板的**下一个实例**（或客户端的同模板组件）再合并一次 ⇒ attrs 累积：
 *       第 1 次 → class="own passed"
 *       第 2 次 → class="own passed passed"
 *
 * 实测正是「SSR 先跑一遍、客户端再跑一遍」的差分场景里 `passed` 出现两次。
 * 客户端侧的同族缺陷已在 `vdom/patch-component.ts` 一并修掉（改为 cloneVNode）。
 */
function applyAttrsToRoot(
  instance: { attrs?: Record<string, unknown> },
  subTree: unknown,
  type: { inheritAttrs?: boolean },
): unknown {
  const attrs = instance.attrs;
  if (
    !attrs ||
    Object.keys(attrs).length === 0 ||
    !subTree ||
    typeof subTree !== 'object' ||
    Array.isArray(subTree)
  ) {
    return subTree;
  }

  const inheritAll = type.inheritAttrs !== false;
  const rootVNode = subTree as VNode;
  const existing = (rootVNode.props ?? {}) as Record<string, unknown>;
  const effectiveAttrs: Record<string, unknown> = inheritAll
    ? attrs
    : Object.fromEntries(Object.entries(attrs).filter(([k]) => k === 'class' || k === 'style'));

  if (Object.keys(effectiveAttrs).length === 0) return subTree;

  const merged: Record<string, unknown> = { ...existing, ...effectiveAttrs };
  if (existing['class'] != null && effectiveAttrs['class'] != null) {
    merged['class'] = [existing['class'], effectiveAttrs['class']];
  }
  if (existing['style'] != null && effectiveAttrs['style'] != null) {
    merged['style'] = [existing['style'], effectiveAttrs['style']];
  }

  // 浅拷贝 vnode（保留 type/children/shapeFlag 等），只替换 props。
  // el/anchor 一并清空：SSR 不需要，但避免把"上一次渲染的节点引用"带进新产物。
  return { ...rootVNode, props: merged, el: null, anchor: null } as VNode;
}

function renderAttributes(props: Record<string, unknown>): string {
  const attrs: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    // 跳过事件处理器和内部属性
    if (key.startsWith('on') || key === 'key' || key === 'ref') {
      continue;
    }

    // ★ 2026-11-02：`innerHTML` 不是属性，而是「原样子内容」的载体
    //   （`v-html` 的编译产物就是 `innerHTML: sanitizeHTML(expr)`）。
    //   必须在这里跳过，否则会被当普通属性转义输出：
    //     `<div class="h" innerHTML="&lt;b&gt;bold&lt;/b&gt;"></div>`
    //   真正的内容由调用方（renderToString / renderToStringAsync）写进标签内。
    if (key === 'innerHTML') {
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
