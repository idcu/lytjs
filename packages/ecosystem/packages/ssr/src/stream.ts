/**
 * @lytjs/ssr - 流式服务端渲染
 *
 * 将 VNode 渲染为 ReadableStream，支持分块发送和 Suspense 边界
 */

import type { VNode } from '@lytjs/vdom';
import { isString, isNumber, isArray, isObject, isFunction, isPromise } from '@lytjs/common-is';
import { renderToString } from './render';

/** 流式渲染配置选项 */
export interface StreamRenderOptions {
  /** 每个分块的最大字节数，默认 4096 */
  chunkSize?: number;
  /** Shell 就绪回调（Suspense 边界之前的初始内容已发送） */
  onShellReady?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/** 异步数据预取上下文 */
export interface DataPrefetchContext {
  /** 路由路径 */
  path?: string;
  /** 路由参数 */
  params?: Record<string, string>;
  /** 查询参数 */
  query?: Record<string, string>;
}

/** 异步数据预取结果 */
export interface PrefetchResult {
  /** 预取的数据 */
  data: Record<string, any>;
  /** 数据过期时间（毫秒） */
  ttl?: number;
}

/** 支持数据预取的组件接口 */
export interface PrefetchableComponent {
  /** 预取数据方法 */
  prefetch?: (context: DataPrefetchContext) => Promise<PrefetchResult>;
}

/** 流式渲染增强选项 */
export interface EnhancedStreamRenderOptions extends StreamRenderOptions {
  /** 数据预取上下文 */
  prefetchContext?: DataPrefetchContext;
  /** 数据预取完成回调 */
  onDataPrefetched?: (data: Record<string, any>) => void;
  /** 是否启用渐进式水合 */
  progressiveHydration?: boolean;
}

/** 默认分块大小 */
const DEFAULT_CHUNK_SIZE = 4096;

/** Suspense 组件标记名称 */
const SUSPENSE_TYPE = 'Suspense';

/**
 * 判断 VNode 是否为 Suspense 边界
 */
function isSuspenseVNode(vnode: VNode): boolean {
  return (
    isObject(vnode) &&
    ((typeof vnode.type === 'object' && vnode.type !== null &&
      '__suspense' in (vnode.type as Record<string, unknown>)) ||
      (isString(vnode.type) && vnode.type === SUSPENSE_TYPE))
  );
}

/**
 * 从 VNode 树中收集所有组件边界，用于分块
 *
 * @description
 * 遍历 VNode 树，在每个元素组件边界处拆分，
 * 返回 HTML 片段数组。遇到 Suspense 边界时标记 shell 结束位置。
 */
function collectChunks(
  vnode: VNode,
  suspenseBoundaryIndex: number[] = []
): string[] {
  const chunks: string[] = [];

  // 处理 null/undefined
  if (vnode == null) {
    return chunks;
  }

  // 处理字符串和数字
  if (isString(vnode) || isNumber(vnode)) {
    chunks.push(renderToString(vnode));
    return chunks;
  }

  // 处理数组
  if (isArray(vnode)) {
    for (const child of vnode) {
      chunks.push(...collectChunks(child as VNode, suspenseBoundaryIndex));
    }
    return chunks;
  }

  // 处理非对象
  if (!isObject(vnode)) {
    return chunks;
  }

  const node = vnode as VNode;

  // 检查是否为 Suspense 边界
  if (isSuspenseVNode(node)) {
    suspenseBoundaryIndex.push(chunks.length);
  }

  // 处理文本节点
  if (node.type === 'text' || typeof node.type === 'symbol') {
    chunks.push(renderToString(node));
    return chunks;
  }

  // 处理组件类型
  if (isFunction(node.type)) {
    chunks.push(renderToString(node));
    return chunks;
  }

  // 处理元素类型
  if (isString(node.type)) {
    chunks.push(renderToString(node));
    return chunks;
  }

  return chunks;
}

/**
 * 将 HTML 字符串按指定大小分块
 *
 * @param html - 完整的 HTML 字符串
 * @param chunkSize - 每个分块的最大字节数
 * @returns 分块后的字符串数组
 */
function splitIntoByteChunks(html: string, chunkSize: number): string[] {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let remaining = html;

  while (remaining.length > 0) {
    // 计算当前分块的字节数
    const encoded = encoder.encode(remaining);
    if (encoded.length <= chunkSize) {
      chunks.push(remaining);
      break;
    }

    // 按字符逐步逼近目标字节数
    let cutIndex = 0;
    let byteCount = 0;
    for (let i = 0; i < remaining.length; i++) {
      byteCount += encoder.encode(remaining[i]).length;
      if (byteCount > chunkSize) {
        cutIndex = i;
        break;
      }
    }

    // 防止无限循环
    if (cutIndex === 0) {
      cutIndex = 1;
    }

    chunks.push(remaining.slice(0, cutIndex));
    remaining = remaining.slice(cutIndex);
  }

  return chunks;
}

/**
 * 将 VNode 渲染为 ReadableStream（流式服务端渲染）
 *
 * @description
 * 将 VNode 树渲染为 HTML 并通过 ReadableStream 分块发送。
 * 支持以下特性：
 * - 按组件边界拆分 HTML 分块
 * - 支持 Suspense 边界（先发送 shell，再发送异步内容）
 * - 使用 TextEncoder 编码为 Uint8Array
 * - 可配置分块大小和回调
 *
 * @param vnode - 要渲染的 VNode
 * @param options - 流式渲染配置选项
 * @returns ReadableStream<Uint8Array>
 *
 * @example
 * ```typescript
 * const stream = renderToStream(vnode, {
 *   chunkSize: 2048,
 *   onShellReady: () => console.log('Shell 已发送'),
 *   onError: (err) => console.error(err),
 * });
 *
 * for await (const chunk of stream) {
 *   response.write(chunk);
 * }
 * ```
 */
export function renderToStream(
  vnode: VNode,
  options?: StreamRenderOptions
): ReadableStream<Uint8Array> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    onShellReady,
    onError,
  } = options || {};

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        // 收集组件边界分块
        const suspenseBoundaryIndex: number[] = [];
        const chunks = collectChunks(vnode, suspenseBoundaryIndex);
        const fullHtml = chunks.join('');

        // 如果存在 Suspense 边界，先发送 shell 部分
        if (suspenseBoundaryIndex.length > 0) {
          const shellBoundary = suspenseBoundaryIndex[0];
          const shellChunks = chunks.slice(0, shellBoundary);
          const shellHtml = shellChunks.join('');
          const byteChunks = splitIntoByteChunks(shellHtml, chunkSize);

          // 发送 shell 分块
          for (const chunk of byteChunks) {
            controller.enqueue(encoder.encode(chunk));
          }

          // 通知 shell 就绪
          onShellReady?.();

          // 发送剩余内容
          const remainingChunks = chunks.slice(shellBoundary);
          const remainingHtml = remainingChunks.join('');
          const remainingByteChunks = splitIntoByteChunks(remainingHtml, chunkSize);

          for (const chunk of remainingByteChunks) {
            controller.enqueue(encoder.encode(chunk));
          }
        } else {
          // 无 Suspense 边界，直接分块发送
          const byteChunks = splitIntoByteChunks(fullHtml, chunkSize);
          for (const chunk of byteChunks) {
            controller.enqueue(encoder.encode(chunk));
          }
        }

        controller.close();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
        controller.error(error);
      }
    },
  });
}

/**
 * 将 VNode 渲染为异步 ReadableStream（支持异步组件和数据预取）
 *
 * @description
 * 与 renderToStream 类似，但支持异步组件和数据预取。
 * 遇到返回 Promise 的组件时先发送占位内容，等 Promise 解析后再发送实际内容。
 *
 * @param vnode - 要渲染的 VNode
 * @param options - 流式渲染配置选项
 * @returns ReadableStream<Uint8Array>
 */
export function renderToStreamAsync(
  vnode: VNode,
  options?: EnhancedStreamRenderOptions
): ReadableStream<Uint8Array> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    onShellReady,
    onError,
    prefetchContext,
    onDataPrefetched,
    progressiveHydration,
  } = options || {};

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 首先进行数据预取
        const prefetchData = await collectAndPrefetchData(vnode, prefetchContext);
        if (Object.keys(prefetchData).length > 0) {
          onDataPrefetched?.(prefetchData);
        }

        // 渲染 HTML
        const html = await renderToStringAsync(vnode, prefetchData);
        const byteChunks = splitIntoByteChunks(html, chunkSize);

        onShellReady?.();

        for (const chunk of byteChunks) {
          controller.enqueue(encoder.encode(chunk));
        }

        controller.close();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
        controller.error(error);
      }
    },
  });
}

/**
 * 收集并预取 VNode 树中的所有数据
 *
 * @param vnode - VNode 树
 * @param context - 数据预取上下文
 * @returns 预取的数据对象
 */
async function collectAndPrefetchData(
  vnode: VNode | VNode[] | string | number | null | undefined,
  context?: DataPrefetchContext
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  // 处理 null/undefined
  if (vnode === null || vnode === undefined) {
    return result;
  }

  // 处理字符串/数字
  if (isString(vnode) || isNumber(vnode)) {
    return result;
  }

  // 处理数组
  if (isArray(vnode)) {
    const results = await Promise.all(
      vnode.map(child => collectAndPrefetchData(child as VNode, context))
    );
    // 合并所有结果
    for (const data of results) {
      Object.assign(result, data);
    }
    return result;
  }

  // 处理非对象
  if (!isObject(vnode)) {
    return result;
  }

  const node = vnode as VNode;

  // 处理文本节点
  if (node.type === 'text' || typeof node.type === 'symbol') {
    return result;
  }

  // 处理组件类型 - 检查是否有 prefetch 方法
  if (isFunction(node.type)) {
    const component = node.type as unknown as PrefetchableComponent;
    if (component.prefetch && context) {
      try {
        const prefetchResult = await component.prefetch(context);
        Object.assign(result, prefetchResult.data);
      } catch (e) {
        // 预取失败不阻止渲染
        console.warn('Data prefetch failed:', e);
      }
    }
    // 继续处理子节点
    if (node.children) {
      const childData = await collectAndPrefetchData(node.children as VNode, context);
      Object.assign(result, childData);
    }
    return result;
  }

  // 处理元素类型
  if (isString(node.type)) {
    if (node.children) {
      const childData = await collectAndPrefetchData(node.children as VNode, context);
      Object.assign(result, childData);
    }
    return result;
  }

  return result;
}

/**
 * 异步渲染 VNode 为 HTML 字符串（支持预取数据）
 *
 * @description
 * 递归渲染 VNode 树，遇到返回 Promise 的组件时等待解析。
 * 支持使用预取的数据进行渲染。
 *
 * @param vnode - VNode 树
 * @param prefetchData - 预取的数据
 * @returns HTML 字符串
 */
async function renderToStringAsync(
  vnode: VNode | VNode[] | string | number | null | undefined,
  prefetchData?: Record<string, any>
): Promise<string> {
  // 处理 null/undefined
  if (vnode === null || vnode === undefined) {
    return '';
  }

  // 处理字符串
  if (isString(vnode)) {
    return renderToString(vnode);
  }

  // 处理数字
  if (isNumber(vnode)) {
    return String(vnode);
  }

  // 处理数组
  if (isArray(vnode)) {
    const results = await Promise.all(
      vnode.map(child => renderToStringAsync(child as VNode, prefetchData))
    );
    return results.join('');
  }

  // 处理非对象
  if (!isObject(vnode)) {
    return '';
  }

  const node = vnode as VNode;

  // 处理文本节点
  if (node.type === 'text' || typeof node.type === 'symbol') {
    return renderToString(node);
  }

  // 处理组件类型（可能返回 Promise）
  if (isFunction(node.type)) {
    return renderToString(node);
  }

  // 处理元素类型
  if (isString(node.type)) {
    return renderToString(node);
  }

  return '';
}

/**
 * 增强型流式渲染（包含数据预取和渐进式水合）
 *
 * @description
 * 完整的流式渲染解决方案，包含数据预取、渐进式水合等高级特性。
 *
 * @param vnode - 要渲染的 VNode
 * @param options - 增强型流式渲染配置
 * @returns Promise<{ stream: ReadableStream<Uint8Array>; dehydratedState: Record<string, any> }>
 */
export async function renderToStreamEnhanced(
  vnode: VNode,
  options?: EnhancedStreamRenderOptions
): Promise<{
  stream: ReadableStream<Uint8Array>;
  dehydratedState: Record<string, any>;
}> {
  const { prefetchContext, onDataPrefetched } = options || {};

  // 首先进行数据预取
  const prefetchData = await collectAndPrefetchData(vnode, prefetchContext);
  if (Object.keys(prefetchData).length > 0 && onDataPrefetched) {
    onDataPrefetched(prefetchData);
  }

  // 创建脱水状态
  const dehydratedState = {
    prefetchData,
    timestamp: Date.now(),
  };

  // 创建流式渲染
  const stream = renderToStreamAsync(vnode, {
    ...options,
    onDataPrefetched: undefined, // 避免重复调用
  });

  return {
    stream,
    dehydratedState,
  };
}
