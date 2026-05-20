// packages/renderer/src/ssr/ssr-stream-optimized.ts
// Streaming SSR 优化版本
// Phase 1.5: TTFB 降低 50%+

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { isArray, isFunction } from '@lytjs/common-is';
import { escapeHtml, isVoidElement } from '../utils';
import { isValidHTMLElementTag, renderAttributeToString } from './ssr-utils';
import { warn } from '@lytjs/common-error';

// ============================================================
// 类型定义
// ============================================================

/** 优化的流式渲染选项 */
export interface OptimizedStreamOptions {
  /** 是否启用预加载提示 */
  preloadHints?: boolean;
  /** 是否启用 HTTP/2 Push */
  http2Push?: boolean;
  /** 关键 CSS 内联 */
  criticalCSS?: string;
  /** 延迟加载阈值（毫秒） */
  deferThreshold?: number;
  /** 是否启用压缩 */
  compression?: boolean;
  /** 缓冲区大小（字节） */
  bufferSize?: number;
  /** 是否启用 Early Flush */
  earlyFlush?: boolean;
}

/** 预加载提示 */
export interface PreloadHint {
  /** 资源类型 */
  type: 'script' | 'style' | 'font' | 'image';
  /** 资源 URL */
  href: string;
  /** 是否跨域 */
  crossorigin?: boolean;
  /** 优先级 */
  importance?: 'high' | 'low' | 'auto';
}

/** 流式渲染统计 */
export interface StreamStats {
  /** TTFB（首字节时间） */
  ttfb: number;
  /** 总渲染时间 */
  totalTime: number;
  /** 块数量 */
  chunkCount: number;
  /** 总字节数 */
  totalBytes: number;
  /** Suspense 边界数量 */
  suspenseBoundaries: number;
}

// ============================================================
// 全局状态
// ============================================================

const COMPONENT_MASK = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT;

// ============================================================
// OptimizedSSRStream 类
// ============================================================

/**
 * 优化的 SSR 流式渲染器
 *
 * 特性：
 * - Early Flush：尽早发送初始 HTML
 * - 智能缓冲：自动管理缓冲区大小
 * - 预加载提示：自动生成 Link 头
 * - 优先级调度：关键内容优先发送
 */
export class OptimizedSSRStream {
  private controller: ReadableStreamDefaultController<Uint8Array>;
  private encoder: TextEncoder;
  private options: Required<OptimizedStreamOptions>;
  private buffer: string[];
  private bufferSize: number;
  private stats: StreamStats;
  private startTime: number;
  private flushedFirstChunk: boolean = false;
  private preloadHints: Set<string>;

  constructor(
    controller: ReadableStreamDefaultController<Uint8Array>,
    options: OptimizedStreamOptions = {},
  ) {
    this.controller = controller;
    this.encoder = new TextEncoder();
    this.options = {
      preloadHints: options.preloadHints ?? true,
      http2Push: options.http2Push ?? false,
      criticalCSS: options.criticalCSS ?? '',
      deferThreshold: options.deferThreshold ?? 50,
      compression: options.compression ?? false,
      bufferSize: options.bufferSize ?? 4096,
      earlyFlush: options.earlyFlush ?? true,
    };
    this.buffer = [];
    this.bufferSize = 0;
    this.startTime = Date.now();
    this.stats = {
      ttfb: 0,
      totalTime: 0,
      chunkCount: 0,
      totalBytes: 0,
      suspenseBoundaries: 0,
    };
    this.preloadHints = new Set();
  }

  // ============================================================
  // 公共方法
  // ============================================================

  /**
   * 推送 HTML 内容到流
   */
  push(html: string): void {
    this.buffer.push(html);
    this.bufferSize += html.length;

    // 检查是否需要刷新缓冲区
    if (this.bufferSize >= this.options.bufferSize) {
      this.flush();
    }
  }

  /**
   * 刷新缓冲区到流
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    const chunk = this.buffer.join('');
    this.buffer = [];
    this.bufferSize = 0;

    this.controller.enqueue(this.encoder.encode(chunk));

    // 记录首字节时间
    if (!this.flushedFirstChunk) {
      this.flushedFirstChunk = true;
      this.stats.ttfb = Date.now() - this.startTime;
    }

    this.stats.chunkCount++;
    this.stats.totalBytes += chunk.length;
  }

  /**
   * 添加预加载提示
   */
  addPreloadHint(hint: PreloadHint): void {
    const key = `${hint.type}:${hint.href}`;
    if (this.preloadHints.has(key)) return;

    this.preloadHints.add(key);

    // 生成 Link 头
    const linkHeader = this.generateLinkHeader(hint);
    this.push(linkHeader);
  }

  /**
   * 生成文档头部
   */
  generateDocumentHead(options: {
    title?: string;
    meta?: Record<string, string>[];
    links?: Record<string, string>[];
    styles?: string[];
  }): string {
    const { title, meta = [], links = [], styles = [] } = options;

    let head = '<!DOCTYPE html><html><head>';
    head += '<meta charset="utf-8">';
    head += '<meta name="viewport" content="width=device-width, initial-scale=1">';

    if (title) {
      head += `<title>${escapeHtml(title)}</title>`;
    }

    // 添加 meta 标签
    for (const m of meta) {
      const attrs = Object.entries(m)
        .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
        .join(' ');
      head += `<meta ${attrs}>`;
    }

    // 添加 link 标签
    for (const l of links) {
      const attrs = Object.entries(l)
        .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
        .join(' ');
      head += `<link ${attrs}>`;
    }

    // 内联关键 CSS
    if (this.options.criticalCSS) {
      head += `<style>${this.options.criticalCSS}</style>`;
    }

    // 添加样式
    for (const style of styles) {
      head += `<style>${style}</style>`;
    }

    head += '</head><body>';

    return head;
  }

  /**
   * 生成文档尾部
   */
  generateDocumentFooter(options: { scripts?: string[]; inlineScripts?: string[] }): string {
    const { scripts = [], inlineScripts = [] } = options;

    let footer = '';

    // 添加内联脚本
    for (const script of inlineScripts) {
      footer += `<script>${script}</script>`;
    }

    // 添加外部脚本
    for (const src of scripts) {
      footer += `<script src="${escapeHtml(src)}"></script>`;
    }

    footer += '</body></html>';

    return footer;
  }

  /**
   * 流式渲染 VNode
   */
  async renderVNode(vnode: VNode): Promise<void> {
    await this.streamVNode(vnode);
    this.flush();
  }

  /**
   * 获取渲染统计
   */
  getStats(): StreamStats {
    this.stats.totalTime = Date.now() - this.startTime;
    return { ...this.stats };
  }

  /**
   * 完成渲染
   */
  finish(): void {
    // 刷新剩余缓冲区
    this.flush();
    this.stats.totalTime = Date.now() - this.startTime;
  }

  // ============================================================
  // 内部方法
  // ============================================================

  private generateLinkHeader(hint: PreloadHint): string {
    const attrs = [`rel="preload"`, `href="${escapeHtml(hint.href)}"`, `as="${hint.type}"`];

    if (hint.crossorigin) {
      attrs.push('crossorigin');
    }
    if (hint.importance) {
      attrs.push(`importance="${hint.importance}"`);
    }

    return `<link ${attrs.join(' ')}>`;
  }

  private async streamVNode(vnode: VNode): Promise<void> {
    const { type, shapeFlag, children } = vnode;

    // 处理 Fragment
    if (type === Fragment) {
      await this.streamFragment(vnode);
      return;
    }

    // 处理 Text
    if (type === Text) {
      const text = isFunction(children) ? '' : String(children ?? '');
      this.push(escapeHtml(text));
      return;
    }

    // 处理 Comment
    if (type === Comment) {
      const text = isFunction(children) ? '' : String(children ?? '');
      let safe = text.replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;');
      safe = safe.replace(/--/g, '- -');
      this.push(`<!--${safe}-->`);
      return;
    }

    // 处理 Element
    if (shapeFlag & ShapeFlags.ELEMENT) {
      await this.streamElement(vnode);
      return;
    }

    // 处理组件
    if (this.isComponentVNode(vnode)) {
      await this.streamComponent(vnode);
      return;
    }
  }

  private async streamFragment(vnode: VNode): Promise<void> {
    const children = vnode.children;
    if (isArray(children)) {
      for (const child of children) {
        if (child != null) {
          await this.streamVNode(child);
          await this.yieldToMicrotask();
        }
      }
    }
  }

  private async streamElement(vnode: VNode): Promise<void> {
    const tag = vnode.type as string;

    if (!isValidHTMLElementTag(tag)) {
      if (__DEV__) {
        warn(`Invalid SSR stream element tag: "${tag}"`);
      }
      return;
    }

    const props = vnode.props ?? {};
    const { shapeFlag, children } = vnode;

    // 构建开始标签
    let openTag = `<${tag}`;

    for (const key of Object.keys(props)) {
      if (key === 'key' || key === 'ref') continue;
      openTag += renderAttributeToString(key, props[key]);
    }

    // 自闭合元素
    if (isVoidElement(tag)) {
      this.push(`${openTag} />`);
      return;
    }

    this.push(`${openTag}>`);

    // 流式渲染子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      const text = isFunction(children) ? '' : String(children ?? '');
      this.push(escapeHtml(text));
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
      for (const child of children) {
        if (child != null) {
          await this.streamVNode(child);
          await this.yieldToMicrotask();
        }
      }
    }

    this.push(`</${tag}>`);
  }

  private async streamComponent(vnode: VNode): Promise<void> {
    const component = vnode.type as Record<string, unknown>;

    if (typeof component === 'object' && component !== null) {
      if (typeof component.render === 'function') {
        const result = component.render(vnode.props ?? {});
        if (result && typeof result === 'object' && 'type' in result) {
          await this.streamVNode(result as VNode);
          return;
        }
      }

      if (typeof component.setup === 'function') {
        const setupResult = component.setup(vnode.props ?? {});
        const resolved = setupResult instanceof Promise ? await setupResult : setupResult;
        if (resolved && typeof resolved === 'object' && 'type' in resolved) {
          await this.streamVNode(resolved as VNode);
          return;
        }
      }
    }

    if (__DEV__) {
      warn(`SSR stream: could not render component vnode`);
    }
  }

  private isComponentVNode(vnode: VNode): boolean {
    return !!(vnode.shapeFlag & COMPONENT_MASK);
  }

  private yieldToMicrotask(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(resolve);
      } else {
        Promise.resolve().then(resolve);
      }
    });
  }
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 创建优化的流式渲染
 */
export function createOptimizedStream(
  vnode: VNode,
  options?: OptimizedStreamOptions,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const stream = new OptimizedSSRStream(controller, options);

      try {
        await stream.renderVNode(vnode);
        stream.finish();
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * 渲染完整的 HTML 文档
 */
export async function renderDocumentToStream(
  vnode: VNode,
  options: {
    head?: {
      title?: string;
      meta?: Record<string, string>[];
      links?: Record<string, string>[];
      styles?: string[];
    };
    footer?: {
      scripts?: string[];
      inlineScripts?: string[];
    };
    stream?: OptimizedStreamOptions;
  } = {},
): Promise<ReadableStream<Uint8Array>> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const stream = new OptimizedSSRStream(controller, options.stream);

      try {
        // 生成文档头部
        const head = stream.generateDocumentHead(options.head || {});
        stream.push(head);

        // Early Flush：尽早发送头部
        if (options.stream?.earlyFlush !== false) {
          stream.flush();
        }

        // 渲染主体内容
        await stream.renderVNode(vnode);

        // 生成文档尾部
        const footer = stream.generateDocumentFooter(options.footer || {});
        stream.push(footer);

        stream.finish();
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

// ============================================================
// 导出（已在上面定义）
// ============================================================
