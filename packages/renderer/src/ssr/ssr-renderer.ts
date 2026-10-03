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
// ⚠️ 2026-10-02：改用与流式 SSR / hydration **共用**的组件解析助手，
// 删掉本文件自带的第 4 份副本（此前各入口各写一份，见 ssr-island.ts 的注释）。
import { resolveComponentRootVNodeAsync } from './ssr-island';
import type { ComponentOptions } from './ssr-island';

// ============================================================
// renderToString - 主入口
// ============================================================

export interface SSRInput {
  vnode: VNode;
  /**
   * ★ 2026-10-04 新增（**默认 false ⇒ 对现有输出零影响**）：
   * 是否给每个元素写 `data-hydrate="lyt-hydrate-N"` 标记。
   *
   * 为什么需要：选择性水合（`hydrateVisible` / `hydrateOnIdle` 等）靠这个标记
   * 挑选元素，而**本函数此前从不写它** ⇒ 走主 SSR 产物时那些 API 连元素都
   * **选不出来**。此前只有 `ssr-kit` 会写，而它不在主链路上。
   *
   * 为什么默认关：标记会改变所有人的 HTML 输出（含体积），
   * 不应作为 breaking change。**要用水合就得显式打开。**
   */
  hydrateMarkers?: boolean;
}

/** 渲染过程内部传递的选项（计数器随渲染调用创建，避免跨调用串号） */
interface RenderOptions {
  /** 是否输出水合标记 */
  markers: boolean;
  /** 标记序号（每个元素 +1） */
  seq: { n: number };
}

/**
 * 将 VNode 渲染为 HTML 字符串。
 *
 * 返回 Promise 以支持 Suspense/异步组件 —— **2026-10-02 起该 Promise 是真的**：
 * 内部递归已改为 async，`setup` 返回 Promise 时会被 `await`（此前同步实现会把
 * Promise 对象直接当成 ctx，静默渲染出 undefined）。
 */
export function renderToString(input: SSRInput): Promise<string> {
  return renderVNodeToString(input.vnode, {
    markers: input.hydrateMarkers === true,
    seq: { n: 0 },
  });
}

// ============================================================
// renderVNodeToString
// ============================================================

/** 有状态/函数式组件的 ShapeFlag（第 2-3 位） */
const COMPONENT_MASK = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT;

async function renderVNodeToString(vnode: VNode, opts: RenderOptions): Promise<string> {
  const { type, shapeFlag, children } = vnode;

  // 处理 Fragment
  if (type === Fragment) {
    return renderFragmentToString(vnode, opts);
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
    return renderElementToString(vnode, opts);
  }

  // ⚠️ 2026-10-02 修复：此前**没有**组件分支 ⇒ 组件 vnode 一律落到 `return ''`，
  // 静默输出空串（与同包 `ssr-stream.ts` 的 `COMPONENT_MASK` 分支不对称）。
  if (shapeFlag & COMPONENT_MASK) {
    return renderComponentToString(vnode, opts);
  }

  return '';
}

/**
 * 把组件 vnode 渲染为 HTML 字符串。
 *
 * **2026-10-02 起不再自带解析逻辑** —— 直接复用 `resolveComponentRootVNodeAsync`
 * （与流式 SSR 共用同一份实现），因此本入口**也支持 `setup` 返回 Promise**。
 * 此前本函数是「组件 → 根 vnode」的第 4 份副本，且不处理 Promise（把 Promise 当 ctx）。
 *
 * 无法渲染时告警并返回空串，**不抛错**（避免一个坏组件中断整棵树）。
 *
 * 注：`COMPONENT_MASK` 含 `FUNCTIONAL_COMPONENT` 以与流式版一致，但**实测**
 * `vdom.getShapeFlag()` 对函数 type 返回的是 `STATEFUL_COMPONENT`（4）——
 * 其内部 `isObject()` 把函数也视为对象，故该位**从未被设置**。函数 type 因此
 * 同样会进入本分支，只是组件形态约定为 options 对象（`setup`/`render`），
 * 函数 type 两者皆无 ⇒ 告警并返回空串。「函数式组件」在**本仓所有渲染路径
 * （含客户端 `mountComponent`，它要求 `vnode.component` 实例）都不被支持**，
 * 属独立缺口，另行处理。
 */
async function renderComponentToString(vnode: VNode, opts: RenderOptions): Promise<string> {
  const resolved = await resolveComponentRootVNodeAsync(
    vnode.type as unknown as ComponentOptions,
    (vnode.props ?? {}) as Record<string, unknown>,
  );

  if (resolved) return renderVNodeToString(resolved, opts);

  if (__DEV__) {
    warn('SSR renderToString: could not render component vnode');
  }
  return '';
}

// ============================================================
// renderFragmentToString
// ============================================================

async function renderFragmentToString(vnode: VNode, opts: RenderOptions): Promise<string> {
  const children = vnode.children;
  if (isArray(children)) {
    // ⚠️ 刻意**顺序** await（而非 Promise.all）：保持与同步实现一致的求值顺序，
    // 避免组件内的副作用（如自增计数器）因并发求值而改变次序。
    let html = '';
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        html += await renderVNodeToString(child, opts);
      }
    }
    return html;
  }
  return '';
}

// ============================================================
// renderElementToString
// ============================================================

async function renderElementToString(vnode: VNode, opts: RenderOptions): Promise<string> {
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

  // ★ 水合标记（仅当调用方显式开启）：格式与 `ssr-kit` 的 HYDRATE_ATTR 一致，
  //   取值 `lyt-hydrate-N`（N 为**本次渲染内**的序号）。
  if (opts.markers) {
    opts.seq.n += 1;
    html += ` data-hydrate="lyt-hydrate-${opts.seq.n}"`;
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
        html += await renderVNodeToString(child, opts);
      }
    }
  }

  html += `</${tag}>`;
  return html;
}
