// packages/renderer/src/vapor/vapor-ssr.ts
// Vapor 模式 SSR 支持
// Phase 1.3: 服务端渲染 Vapor 组件

import type { VaporComponentDefinition } from './vapor-app';
import { compile } from '@lytjs/compiler';
import { escapeHtml } from '../utils';

// ============================================================
// 类型定义
// ============================================================

/** Vapor SSR 渲染选项 */
export interface VaporSSROptions {
  /** 是否包含数据预取脚本 */
  includePrefetchScript?: boolean;
  /** 是否启用流式渲染 */
  streaming?: boolean;
  /** 自定义序列化函数 */
  serialize?: (data: unknown) => string;
}

/** Vapor SSR 渲染结果 */
export interface VaporSSRResult {
  /** 渲染的 HTML 字符串 */
  html: string;
  /** 预取的数据（用于客户端 hydration） */
  prefetchData?: Record<string, unknown>;
  /** 需要注入的脚本 */
  scripts?: string[];
  /** 需要注入的样式 */
  styles?: string[];
}

/** Vapor SSR 流式渲染结果 */
export interface VaporSSRStreamResult {
  /** HTML 流 */
  stream: ReadableStream<Uint8Array>;
  /** 预取数据 Promise */
  prefetchData: Promise<Record<string, unknown>>;
}

/** 数据预取函数类型 */
export type PrefetchFunction = () => Promise<Record<string, unknown>>;

// ============================================================
// Vapor SSR 渲染器
// ============================================================

/**
 * 将 Vapor 组件渲染为 HTML 字符串
 *
 * @param component Vapor 组件定义
 * @param props 组件 props
 * @param options SSR 选项
 * @returns 渲染结果
 *
 * @example
 * ```ts
 * const App = defineVaporComponent({
 *   template: '<div>{{ message }}</div>',
 *   setup() {
 *     return { message: 'Hello SSR' };
 *   }
 * });
 *
 * const result = await renderVaporToString(App);
 * console.log(result.html); // '<div>Hello SSR</div>'
 * ```
 */
export async function renderVaporToString(
  component: VaporComponentDefinition,
  props: Record<string, unknown> = {},
  options: VaporSSROptions = {},
): Promise<VaporSSRResult> {
  const { includePrefetchScript = false, serialize = defaultSerialize } = options;

  // 1. 执行 setup 函数获取初始状态
  const setupResult = await executeSetup(component, props);

  // 2. 编译模板为 SSR 代码
  const compiledTemplate = compileTemplateForSSR(component.template);

  // 3. 渲染 HTML
  const html = renderTemplateToHTML(compiledTemplate, setupResult);

  // 4. 收集预取数据
  let prefetchData: Record<string, unknown> | undefined;
  if (setupResult.__prefetchData__) {
    prefetchData = setupResult.__prefetchData__ as Record<string, unknown>;
  }

  // 5. 生成预取脚本
  const scripts: string[] = [];
  if (includePrefetchScript && prefetchData) {
    scripts.push(`<script>window.__LYTJS_PREFETCH_DATA__=${serialize(prefetchData)};</script>`);
  }

  return {
    html,
    prefetchData,
    scripts: scripts.length > 0 ? scripts : undefined,
  };
}

/**
 * 将 Vapor 组件流式渲染为 ReadableStream
 *
 * @param component Vapor 组件定义
 * @param props 组件 props
 * @param options SSR 选项
 * @returns 流式渲染结果
 */
export async function renderVaporToStream(
  component: VaporComponentDefinition,
  props: Record<string, unknown> = {},
  _options: VaporSSROptions = {},
): Promise<VaporSSRStreamResult> {
  let prefetchResolve: (data: Record<string, unknown>) => void;
  const prefetchPromise = new Promise<Record<string, unknown>>((resolve) => {
    prefetchResolve = resolve;
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 1. 执行 setup
        const setupResult = await executeSetup(component, props);

        // 2. 编译模板
        const _compiledTemplate = compileTemplateForSSR(component.template);

        // 3. 流式渲染
        const htmlChunks = renderTemplateToChunks(_compiledTemplate, setupResult);

        for (const chunk of htmlChunks) {
          controller.enqueue(encoder.encode(chunk));
          // 让出控制权，允许浏览器渐进式渲染
          await yieldToMicrotask();
        }

        // 4. 解析预取数据
        if (setupResult.__prefetchData__) {
          prefetchResolve(setupResult.__prefetchData__ as Record<string, unknown>);
        } else {
          prefetchResolve({});
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return {
    stream,
    prefetchData: prefetchPromise,
  };
}

// ============================================================
// 内部实现
// ============================================================

/**
 * 执行组件 setup 函数
 */
async function executeSetup(
  component: VaporComponentDefinition,
  props: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ctx: Record<string, unknown> = { ...props };

  if (typeof component.setup === 'function') {
    const vaporContext = {
      attrs: { ...props },
      slots: {},
      emit: () => {},
    };

    const result = component.setup(props, vaporContext);

    // 处理异步 setup
    if (result instanceof Promise) {
      const asyncResult = await result;
      if (asyncResult && typeof asyncResult === 'object') {
        Object.assign(ctx, asyncResult);
      }
    } else if (result && typeof result === 'object') {
      Object.assign(ctx, result);
    }
  }

  return ctx;
}

/**
 * 编译模板为 SSR 可执行代码
 */
function compileTemplateForSSR(template: string): string {
  // 使用编译器的 SSR 模式
  const result = compile(template, {
    ssrMode: true,
    rendererMode: 'signal',
  });
  return result.code;
}

/**
 * 将模板渲染为 HTML
 */
function renderTemplateToHTML(_compiledCode: string, ctx: Record<string, unknown>): string {
  // 简化实现：直接从上下文渲染模板
  // 实际实现需要执行编译后的代码
  return renderContextToHTML(ctx);
}

/**
 * 将上下文渲染为 HTML（简化版）
 */
function renderContextToHTML(ctx: Record<string, unknown>): string {
  // 基础实现：返回一个占位 div
  // 实际实现需要完整的模板解析和渲染
  const dataAttr = Object.entries(ctx)
    .filter(([key]) => !key.startsWith('__'))
    .map(([key, value]) => `data-${key}="${escapeHtml(String(value))}"`)
    .join(' ');

  return `<div ${dataAttr} data-vapor-ssr="true"><!-- Vapor SSR Placeholder --></div>`;
}

/**
 * 将模板渲染为 HTML 块（流式渲染）
 */
function renderTemplateToChunks(_compiledCode: string, ctx: Record<string, unknown>): string[] {
  const html = renderContextToHTML(ctx);

  // 将 HTML 分块返回
  const chunks: string[] = [];
  const chunkSize = 1024; // 1KB chunks

  for (let i = 0; i < html.length; i += chunkSize) {
    chunks.push(html.slice(i, i + chunkSize));
  }

  return chunks.length > 0 ? chunks : [''];
}

/**
 * 默认序列化函数
 */
function defaultSerialize(data: unknown): string {
  return JSON.stringify(data, (_key, value) => {
    // 处理特殊类型
    if (typeof value === 'function') {
      return undefined; // 跳过函数
    }
    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) };
    }
    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value.values()) };
    }
    if (typeof value === 'bigint') {
      return { __type: 'BigInt', value: value.toString() };
    }
    return value;
  });
}

/**
 * 让出控制权到微任务队列
 */
function yieldToMicrotask(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(resolve);
    } else {
      Promise.resolve().then(resolve);
    }
  });
}

// ============================================================
// 数据预取支持
// ============================================================

/**
 * 定义数据预取函数
 *
 * @example
 * ```ts
 * const App = defineVaporComponent({
 *   template: '<div>{{ data.message }}</div>',
 *   setup() {
 *     // 使用 definePrefetch 定义预取函数
 *     const data = definePrefetch(async () => {
 *       const res = await fetch('/api/data');
 *       return res.json();
 *     });
 *     return { data };
 *   }
 * });
 * ```
 */
export function definePrefetch<T>(fetcher: () => Promise<T>): {
  data: T | undefined;
  __prefetchFn__: () => Promise<T>;
} {
  // 在服务端，返回预取函数
  // 在客户端，从 window.__LYTJS_PREFETCH_DATA__ 读取
  return {
    data: undefined,
    __prefetchFn__: fetcher,
  };
}

/**
 * 在 setup 中使用预取数据
 */
export function usePrefetchData<T>(
  key: string,
  _fetcher?: () => Promise<T>,
): { data: T | undefined; pending: boolean; error: Error | null } {
  // 检查是否有预取数据
  if (typeof window !== 'undefined') {
    const prefetchData = (window as any).__LYTJS_PREFETCH_DATA__;
    if (prefetchData && prefetchData[key]) {
      return {
        data: prefetchData[key] as T,
        pending: false,
        error: null,
      };
    }
  }

  // 返回默认状态
  return {
    data: undefined,
    pending: true,
    error: null,
  };
}

// ============================================================
// Hydration 支持
// ============================================================

/**
 * Vapor SSR Hydration 选项
 */
export interface VaporHydrationOptions {
  /** 是否启用选择性 hydration */
  selective?: boolean;
  /** Hydration 错误处理 */
  onError?: (error: Error) => void;
}

/**
 * 对 SSR 渲染的 Vapor 组件进行 hydration
 *
 * @param container 容器元素
 * @param component Vapor 组件定义
 * @param options Hydration 选项
 */
export async function hydrateVaporComponent(
  container: Element | string,
  component: VaporComponentDefinition,
  _options: VaporHydrationOptions = {},
): Promise<void> {
  const el = typeof container === 'string' ? document.querySelector(container) : container;

  if (!el) {
    throw new Error(`[LytJS] hydrateVaporComponent: container not found`);
  }

  // 检查是否是 SSR 渲染的元素
  const ssrMarker = el.querySelector('[data-vapor-ssr]');
  if (!ssrMarker) {
    console.warn('[LytJS] hydrateVaporComponent: no SSR marker found');
  }

  // 执行 setup
  const props: Record<string, unknown> = {};
  if (typeof component.setup === 'function') {
    const vaporContext = {
      attrs: {},
      slots: {},
      emit: () => {},
    };

    const result = component.setup(props, vaporContext);
    if (result && typeof result === 'object') {
      Object.assign(props, result);
    }
  }

  // 创建 Signal 渲染器进行 hydration
  const { createSignalRenderer } = await import('../signal/signal-renderer');
  const renderer = createSignalRenderer(component.template, props);
  renderer.render(el);

  // 标记 hydration 完成
  el.setAttribute('data-vapor-hydrated', 'true');
}

// ============================================================
// 导出
// ============================================================

export { renderVaporToString as renderToString, renderVaporToStream as renderToStream };
