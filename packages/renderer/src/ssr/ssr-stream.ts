/**
 * @lytjs/renderer - SSR 流式渲染
 * 使用 Web Streams API 进行服务端流式渲染
 * FIX: P2-36 使用共享工具函数
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isArray, isFunction } from '@lytjs/common-is';
import { escapeHtml, isVoidElement } from '../utils';
import type { SSRInput } from './ssr-renderer';
import {
  isValidHTMLElementTag,
  renderAttributeToString,
  NAMED_ENTITIES,
} from './ssr-utils';
import { warn } from '@lytjs/common-error';

// 重新导出 NAMED_ENTITIES 以保持向后兼容
export { NAMED_ENTITIES };

// FIX: P2-batch2-1 单调递增计数器，用于生成唯一的 Suspense ID
let suspenseIdCounter = 0;

// ============================================================
// SSRStreamOptions
// ============================================================

export interface SSRStreamOptions {
  /** 是否在块之间插入注释标记（用于调试） */
  commentMarkers?: boolean;
}

// ============================================================
// Suspense 检测工具函数
// ============================================================

/** 函数式/有状态组件的 ShapeFlag（第 4-5 位） */
const COMPONENT_MASK = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT;

/** 检查 vnode 是否为组件类型（非 Fragment/Text/Comment/Element） */
function isComponentVNode(vnode: VNode): boolean {
  return !!(vnode.shapeFlag & COMPONENT_MASK);
}

/** 通过名称检查 vnode 是否为 Suspense 组件 */
function isSuspenseVNode(vnode: VNode): boolean {
  if (!isComponentVNode(vnode)) return false;
  const type = vnode.type;
  if (typeof type === 'object' && type !== null && 'name' in type) {
    return (type as { name?: string }).name === 'Suspense';
  }
  if (typeof type === 'function' && 'name' in type) {
    return (type as { name?: string }).name === 'Suspense';
  }
  return false;
}

// ============================================================
// renderToStream - 主入口（真正的异步流式渲染）
// ============================================================

/**
 * 将 VNode 树渲染为 HTML 块的 ReadableStream。
 *
 * 每个顶层元素和组件边界产生一个独立的块，
 * 实现渐进式 HTML 交付。支持 Suspense 边界：
 * 当遇到异步组件时，先流式输出 fallback，
 * 然后在解析完成后推送真实内容。
 *
 * 使用基于拉取的方式和微任务调度，每个 VNode
 * 节点独立入队，允许浏览器在微任务边界之间
 * 渐进式消费块。
 */
export function renderToStream(
  input: SSRInput,
  options?: SSRStreamOptions,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const commentMarkers = options?.commentMarkers ?? false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await streamVNodeAsync(input.vnode, controller, encoder, commentMarkers);
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });
}

// ============================================================
// pushChunk - 入队单个 HTML 块
// ============================================================

function pushChunk(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  html: string,
  commentMarkers: boolean,
  label?: string,
): void {
  if (commentMarkers && label) {
    const marker = `<!-- stream:${label} -->`;
    controller.enqueue(encoder.encode(marker));
  }
  controller.enqueue(encoder.encode(html));
}

// ============================================================
// streamVNodeAsync - 带微任务让出的异步流式渲染
// ============================================================

/**
 * 递归流式渲染 VNode 树，在兄弟节点之间通过微任务让出，
 * 实现真正的渐进式交付。
 */
async function streamVNodeAsync(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  const { type, shapeFlag, children } = vnode;

  // 处理 Fragment
  if (type === Fragment) {
    await streamFragmentAsync(vnode, controller, encoder, commentMarkers);
    return;
  }

  // 处理 Text
  if (type === Text) {
    const text = isFunction(children) ? '' : String(children ?? '');
    pushChunk(controller, encoder, escapeHtml(text), commentMarkers, 'text');
    return;
  }

  // 处理 Comment
  if (type === Comment) {
    const text = isFunction(children) ? '' : String(children ?? '');
    let safe = text.replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;');
    safe = safe.replace(/--/g, '- -');
    pushChunk(controller, encoder, `<!--${safe}-->`, commentMarkers, 'comment');
    return;
  }

  // 处理 Suspense 组件
  if (isSuspenseVNode(vnode)) {
    await streamSuspenseBoundary(vnode, controller, encoder, commentMarkers);
    return;
  }

  // 处理 Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    await streamElementAsync(vnode, controller, encoder, commentMarkers);
    return;
  }

  // 处理其他组件类型（有状态/函数式）
  if (isComponentVNode(vnode)) {
    await streamComponentAsync(vnode, controller, encoder, commentMarkers);
    return;
  }
}

// ============================================================
// streamFragmentAsync
// ============================================================

async function streamFragmentAsync(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  const children = vnode.children;
  if (isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        await streamVNodeAsync(child, controller, encoder, commentMarkers);
        // 在兄弟节点之间让出事件循环，实现真正的渐进式交付
        await yieldToMicrotask();
      }
    }
  }
}

// ============================================================
// streamSuspenseBoundary - Suspense 流式支持
// ============================================================

/**
 * 流式渲染 Suspense 边界：
 * 1. 立即流式输出 fallback 内容
 * 2. 解析异步子节点
 * 3. 用解析后的内容替换 fallback
 *
 * 使用注释标记来界定 Suspense 边界，以便客户端
 * 在真实内容到达时替换 fallback。
 */
async function streamSuspenseBoundary(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  // FIX: P2-batch2-1 使用单调递增计数器替代 Math.random()，
  // 避免 SSR 流式渲染中 Suspense ID 碰撞和不可预测行为
  const suspenseId = `suspense-${++suspenseIdCounter}`;

  // 打开 Suspense 边界标记
  pushChunk(controller, encoder, `<!--${suspenseId}-start-->`, commentMarkers, 'suspense:start');

  // 尝试解析默认插槽子节点
  const defaultSlot = vnode.props?.default as (() => unknown) | undefined;
  const fallbackSlot = vnode.props?.fallback as (() => unknown) | undefined;

  // 如果有 fallback 则先流式输出
  if (fallbackSlot) {
    pushChunk(controller, encoder, `<!--${suspenseId}-fallback-start-->`, commentMarkers, 'suspense:fallback');
    try {
      const fallbackResult = fallbackSlot();
      if (isArray(fallbackResult)) {
        for (const child of fallbackResult) {
          if (child != null && typeof child === 'object' && 'type' in child) {
            await streamVNodeAsync(child as VNode, controller, encoder, commentMarkers);
          }
        }
      } else if (fallbackResult != null && typeof fallbackResult === 'object' && 'type' in fallbackResult) {
        await streamVNodeAsync(fallbackResult as VNode, controller, encoder, commentMarkers);
      }
    } catch (_err) {
      // Fallback 渲染错误：静默跳过
    }
    pushChunk(controller, encoder, `<!--${suspenseId}-fallback-end-->`, commentMarkers, 'suspense:fallback-end');
  }

  // 现在尝试解析默认（异步）内容
  if (defaultSlot) {
    try {
      const result = defaultSlot();
      // 如果结果是 Promise，则等待解析
      const resolved = result instanceof Promise ? await result : result;

      pushChunk(controller, encoder, `<!--${suspenseId}-content-start-->`, commentMarkers, 'suspense:content');

      if (isArray(resolved)) {
        for (const child of resolved) {
          if (child != null && typeof child === 'object' && 'type' in child) {
            await streamVNodeAsync(child as VNode, controller, encoder, commentMarkers);
            await yieldToMicrotask();
          }
        }
      } else if (resolved != null && typeof resolved === 'object' && 'type' in resolved) {
        await streamVNodeAsync(resolved as VNode, controller, encoder, commentMarkers);
      }

      pushChunk(controller, encoder, `<!--${suspenseId}-content-end-->`, commentMarkers, 'suspense:content-end');
    } catch (_err) {
      // 异步内容解析失败；fallback 已流式输出
      pushChunk(controller, encoder, `<!--${suspenseId}-error-->`, commentMarkers, 'suspense:error');
    }
  }

  // 关闭 Suspense 边界标记
  pushChunk(controller, encoder, `<!--${suspenseId}-end-->`, commentMarkers, 'suspense:end');
}

// ============================================================
// streamComponentAsync - 通用组件流式渲染
// ============================================================

async function streamComponentAsync(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  // 对于组件 vnode，尝试渲染并流式输出结果
  const component = vnode.type as Record<string, unknown>;
  if (typeof component === 'object' && component !== null) {
    // 如果组件有 render 函数，调用它
    if (typeof component.render === 'function') {
      const result = component.render(vnode.props ?? {});
      if (result && typeof result === 'object' && 'type' in result) {
        await streamVNodeAsync(result as VNode, controller, encoder, commentMarkers);
        return;
      }
    }
    // 如果组件有 setup 且返回 VNode
    if (typeof component.setup === 'function') {
      const setupResult = component.setup(vnode.props ?? {});
      const resolved = setupResult instanceof Promise ? await setupResult : setupResult;
      if (resolved && typeof resolved === 'object' && 'type' in resolved) {
        await streamVNodeAsync(resolved as VNode, controller, encoder, commentMarkers);
        return;
      }
    }
  }
  // 回退：渲染为空注释
  if (__DEV__) {
    warn(`SSR stream: could not render component vnode`);
  }
}

// ============================================================
// streamElementAsync
// ============================================================

async function streamElementAsync(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  commentMarkers: boolean,
): Promise<void> {
  const tag = vnode.type as string;

  if (!isValidHTMLElementTag(tag)) {
    if (__DEV__) {
      warn(`Invalid SSR stream element tag: "${tag}"`);
    }
    return;
  }

  const props = vnode.props ?? {};
  const { shapeFlag, children } = vnode;

  // 构建带属性的开始标签
  let openTag = `<${tag}`;

  // 将 props 渲染为属性
  for (const key of Object.keys(props)) {
    if (key === 'key' || key === 'ref') continue;
    openTag += renderAttributeToString(key, props[key]);
  }

  // 自闭合元素
  if (isVoidElement(tag)) {
    openTag += ' />';
    pushChunk(controller, encoder, openTag, commentMarkers, `element:${tag}`);
    return;
  }

  openTag += '>';
  pushChunk(controller, encoder, openTag, commentMarkers, `element:${tag}:open`);

  // 流式渲染子节点
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    const text = isFunction(children) ? '' : String(children ?? '');
    pushChunk(controller, encoder, escapeHtml(text), commentMarkers, `element:${tag}:text`);
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        await streamVNodeAsync(child, controller, encoder, commentMarkers);
        await yieldToMicrotask();
      }
    }
  }

  // 闭合标签
  const closeTag = `</${tag}>`;
  pushChunk(controller, encoder, closeTag, commentMarkers, `element:${tag}:close`);
}

// ============================================================
// yieldToMicrotask - 让出控制权以实现渐进式交付
// ============================================================

// FIX: v7-P2-14 yieldToMicrotask 使用 queueMicrotask 替代 setTimeout
function yieldToMicrotask(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(resolve);
    } else {
      // 回退：使用 Promise.resolve().then() 作为微任务
      Promise.resolve().then(resolve);
    }
  });
}
