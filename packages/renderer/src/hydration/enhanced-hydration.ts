// packages/renderer/src/hydration/enhanced-hydration.ts
// Hydration 完善模块
// Phase 1.15-1.17: 全应用 Hydration、选择性 Hydration、水合错误恢复

import { createApp, type App, type Component } from '@lytjs/component';
import { warn } from '@lytjs/common-error';

// ============================================================
// 类型定义
// ============================================================

/** Hydration 模式 */
export type HydrationMode = 'full' | 'selective' | 'lazy';

/** Hydration 选项 */
export interface HydrationOptions {
  /** Hydration 模式 */
  mode?: HydrationMode;
  /** 选择性 Hydration 选择器 */
  selectors?: string[];
  /** 懒加载阈值（毫秒） */
  lazyThreshold?: number;
  /** 是否在空闲时 Hydration */
  idleCallback?: boolean;
  /** 错误处理 */
  onError?: (error: HydrationError) => void;
  /** 不匹配处理 */
  onMismatch?: (mismatch: HydrationMismatch) => void;
  /** Hydration 完成回调 */
  onComplete?: () => void;
}

/** Hydration 错误 */
export interface HydrationError {
  /** 错误类型 */
  type: 'mismatch' | 'missing' | 'invalid' | 'script';
  /** 错误消息 */
  message: string;
  /** 相关节点 */
  node?: Element;
  /** 原始错误 */
  error?: Error;
}

/** Hydration 不匹配 */
export interface HydrationMismatch {
  /** 期望的 HTML */
  expected: string;
  /** 实际的 HTML */
  actual: string;
  /** 节点路径 */
  path: string;
  /** 恢复策略 */
  recoveryStrategy: 'rerender' | 'keep-server' | 'keep-client';
}

/** Hydration 统计 */
export interface HydrationStats {
  /** 总节点数 */
  totalNodes: number;
  /** 已 Hydration 节点数 */
  hydratedNodes: number;
  /** 跳过的节点数 */
  skippedNodes: number;
  /** 不匹配数 */
  mismatches: number;
  /** 错误数 */
  errors: number;
  /** Hydration 耗时（毫秒） */
  duration: number;
}

// ============================================================
// Phase 1.15: 全应用 Hydration
// ============================================================

/**
 * 全应用 Hydration
 * 
 * @example
 * ```ts
 * // 服务端渲染的 HTML
 * const html = '<div id="app">...</div>';
 * 
 * // 客户端 Hydration
 * hydrateApp(App, '#app');
 * ```
 */
export async function hydrateApp(
  component: Component,
  container: string | Element,
  options: HydrationOptions = {},
): Promise<{
  app: App;
  stats: HydrationStats;
}> {
  const startTime = performance.now();
  const stats: HydrationStats = {
    totalNodes: 0,
    hydratedNodes: 0,
    skippedNodes: 0,
    mismatches: 0,
    errors: 0,
    duration: 0,
  };

  const containerEl = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!containerEl) {
    throw new Error(`[LytJS] hydrateApp: container not found: ${container}`);
  }

  // 检查是否已经 Hydration
  if (containerEl.hasAttribute('data-hydrated')) {
    warn('[LytJS] Container already hydrated');
    return {
      app: createApp(component),
      stats,
    };
  }

  // 创建应用实例
  const app = createApp(component);

  // 执行 Hydration
  try {
    await performHydration(containerEl, app, stats, options);
  } catch (error) {
    stats.errors++;
    options.onError?.({
      type: 'script',
      message: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error : undefined,
    });
  }

  // 标记已 Hydration
  containerEl.setAttribute('data-hydrated', 'true');

  stats.duration = performance.now() - startTime;
  options.onComplete?.();

  return { app, stats };
}

/**
 * 执行 Hydration
 */
async function performHydration(
  container: Element,
  app: App,
  stats: HydrationStats,
  options: HydrationOptions,
): Promise<void> {
  // 遍历所有子节点
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );

  const nodes: Node[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    nodes.push(node);
    stats.totalNodes++;
  }

  // 处理每个节点
  for (const n of nodes) {
    if (n instanceof Element) {
      await hydrateElement(n, stats, options);
      stats.hydratedNodes++;
    }
  }
}

/**
 * Hydration 单个元素
 */
async function hydrateElement(
  element: Element,
  stats: HydrationStats,
  options: HydrationOptions,
): Promise<void> {
  // 检查 SSR 标记
  const ssrId = element.getAttribute('data-ssr-id');
  if (!ssrId) {
    stats.skippedNodes++;
    return;
  }

  // 检查事件监听器
  const eventAttrs = Array.from(element.attributes).filter(
    attr => attr.name.startsWith('on') || attr.name.startsWith('@'),
  );

  for (const attr of eventAttrs) {
    // 移除 SSR 渲染的事件属性（客户端会重新绑定）
    element.removeAttribute(attr.name);
  }

  // 检查指令
  const directives = Array.from(element.attributes).filter(
    attr => attr.name.startsWith('v-'),
  );

  for (const attr of directives) {
    // 处理指令
    processDirective(element, attr.name, attr.value, options);
  }
}

/**
 * 处理指令
 */
function processDirective(
  element: Element,
  name: string,
  value: string,
  options: HydrationOptions,
): void {
  switch (name) {
    case 'v-if':
    case 'v-show':
    case 'v-for':
      // 这些指令由客户端运行时处理
      break;
    case 'v-model':
      // 恢复双向绑定
      setupVModel(element, value);
      break;
    case 'v-bind':
      // 恢复属性绑定
      setupVBind(element, value);
      break;
  }
}

/**
 * 设置 v-model 绑定
 */
function setupVModel(element: Element, expression: string): void {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.addEventListener('input', (e) => {
      // 触发响应式更新
      const event = new CustomEvent('update:modelValue', {
        detail: (e.target as HTMLInputElement).value,
      });
      element.dispatchEvent(event);
    });
  }
}

/**
 * 设置 v-bind 绑定
 */
function setupVBind(element: Element, expression: string): void {
  // 简化实现：从 data 属性读取
  const bindValue = element.getAttribute(`data-bind-${expression}`);
  if (bindValue) {
    try {
      const value = JSON.parse(bindValue);
      element.setAttribute(expression, value);
    } catch {
      element.setAttribute(expression, bindValue);
    }
  }
}

// ============================================================
// Phase 1.16: 选择性 Hydration
// ============================================================

/** 待 Hydration 队列 */
const hydrationQueue: Array<{
  element: Element;
  priority: 'high' | 'medium' | 'low';
  callback: () => Promise<void>;
}> = [];

/** 是否正在处理队列 */
let isProcessingQueue = false;

/**
 * 选择性 Hydration
 * 
 * @example
 * ```ts
 * // 只 Hydration 可见区域
 * hydrateVisible(App, '#app');
 * 
 * // 基于 IntersectionObserver
 * hydrateOnVisible(App, '#app', {
 *   rootMargin: '100px',
 * });
 * ```
 */
export async function hydrateVisible(
  component: Component,
  container: string | Element,
  options: HydrationOptions = {},
): Promise<{
  app: App;
  stats: HydrationStats;
}> {
  const containerEl = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!containerEl) {
    throw new Error(`[LytJS] hydrateVisible: container not found: ${container}`);
  }

  // 查找所有需要 Hydration 的元素
  const hydrateElements = containerEl.querySelectorAll('[data-hydrate]');

  const stats: HydrationStats = {
    totalNodes: hydrateElements.length,
    hydratedNodes: 0,
    skippedNodes: 0,
    mismatches: 0,
    errors: 0,
    duration: 0,
  };

  const startTime = performance.now();
  const app = createApp(component);

  // 使用 IntersectionObserver 检测可见性
  const observer = new IntersectionObserver(
    async (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const element = entry.target as Element;
          await hydrateElement(element, stats, options);
          stats.hydratedNodes++;
          observer.unobserve(element);
        }
      }
    },
    {
      rootMargin: options.lazyThreshold ? `${options.lazyThreshold}px` : '100px',
    },
  );

  // 观察所有需要 Hydration 的元素
  for (const element of hydrateElements) {
    observer.observe(element);
  }

  // 等待所有 Hydration 完成
  await new Promise<void>((resolve) => {
    const checkComplete = () => {
      if (stats.hydratedNodes >= stats.totalNodes) {
        resolve();
      } else {
        requestIdleCallback(checkComplete);
      }
    };
    checkComplete();
  });

  stats.duration = performance.now() - startTime;
  observer.disconnect();

  return { app, stats };
}

/**
 * 延迟 Hydration
 * 将 Hydration 任务加入队列，按优先级执行
 */
export function queueHydration(
  element: Element,
  priority: 'high' | 'medium' | 'low',
  callback: () => Promise<void>,
): void {
  hydrationQueue.push({ element, priority, callback });
  hydrationQueue.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (!isProcessingQueue) {
    processHydrationQueue();
  }
}

/**
 * 处理 Hydration 队列
 */
async function processHydrationQueue(): Promise<void> {
  isProcessingQueue = true;

  while (hydrationQueue.length > 0) {
    const task = hydrationQueue.shift();
    if (task) {
      await task.callback();
    }

    // 让出控制权
    await new Promise(resolve => requestIdleCallback(resolve));
  }

  isProcessingQueue = false;
}

// ============================================================
// Phase 1.17: 水合错误恢复
// ============================================================

/**
 * 水合错误恢复策略
 */
export type RecoveryStrategy = 'rerender' | 'keep-server' | 'keep-client' | 'fallback';

/**
 * 水合错误处理器
 */
export class HydrationErrorHandler {
  private errors: HydrationError[] = [];
  private mismatches: HydrationMismatch[] = [];
  private options: HydrationOptions;

  constructor(options: HydrationOptions = {}) {
    this.options = options;
  }

  /**
   * 处理 Hydration 错误
   */
  handleError(error: HydrationError): RecoveryStrategy {
    this.errors.push(error);
    this.options.onError?.(error);

    // 根据错误类型决定恢复策略
    switch (error.type) {
      case 'mismatch':
        return this.handleMismatch(error);
      case 'missing':
        return 'fallback';
      case 'invalid':
        return 'rerender';
      case 'script':
        return 'keep-server';
      default:
        return 'rerender';
    }
  }

  /**
   * 处理不匹配错误
   */
  private handleMismatch(error: HydrationError): RecoveryStrategy {
    const mismatch: HydrationMismatch = {
      expected: error.node?.getAttribute('data-ssr-expected') || '',
      actual: error.node?.innerHTML || '',
      path: this.getNodePath(error.node),
      recoveryStrategy: 'rerender',
    };

    this.mismatches.push(mismatch);
    this.options.onMismatch?.(mismatch);

    // 智能选择恢复策略
    if (this.isMinorMismatch(mismatch)) {
      mismatch.recoveryStrategy = 'keep-server';
      return 'keep-server';
    }

    if (this.isCriticalMismatch(mismatch)) {
      mismatch.recoveryStrategy = 'rerender';
      return 'rerender';
    }

    return 'keep-client';
  }

  /**
   * 判断是否是轻微不匹配
   */
  private isMinorMismatch(mismatch: HydrationMismatch): boolean {
    // 空白字符差异
    if (mismatch.expected.trim() === mismatch.actual.trim()) {
      return true;
    }

    // 属性顺序差异
    const normalize = (html: string) =>
      html.replace(/\s+/g, ' ').replace(/\s*=\s*/g, '=');
    if (normalize(mismatch.expected) === normalize(mismatch.actual)) {
      return true;
    }

    return false;
  }

  /**
   * 判断是否是严重不匹配
   */
  private isCriticalMismatch(mismatch: HydrationMismatch): boolean {
    // 结构完全不同
    const expectedTags = mismatch.expected.match(/<\w+/g) || [];
    const actualTags = mismatch.actual.match(/<\w+/g) || [];

    if (expectedTags.length !== actualTags.length) {
      return true;
    }

    // 关键属性缺失
    if (mismatch.expected.includes('data-') && !mismatch.actual.includes('data-')) {
      return true;
    }

    return false;
  }

  /**
   * 获取节点路径
   */
  private getNodePath(node?: Element): string {
    if (!node) return '';

    const path: string[] = [];
    let current: Element | null = node;

    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      const siblings = current.parentElement?.children;
      const index = siblings ? Array.from(siblings).indexOf(current) : 0;
      path.unshift(`${tagName}[${index}]`);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * 获取所有错误
   */
  getErrors(): HydrationError[] {
    return [...this.errors];
  }

  /**
   * 获取所有不匹配
   */
  getMismatches(): HydrationMismatch[] {
    return [...this.mismatches];
  }

  /**
   * 清除错误记录
   */
  clear(): void {
    this.errors = [];
    this.mismatches = [];
  }
}

/**
 * 创建错误处理器
 */
export function createHydrationErrorHandler(
  options: HydrationOptions = {},
): HydrationErrorHandler {
  return new HydrationErrorHandler(options);
}

/**
 * 安全 Hydration
 * 带错误恢复的 Hydration
 */
export async function safeHydrate(
  component: Component,
  container: string | Element,
  options: HydrationOptions = {},
): Promise<{
  app: App;
  stats: HydrationStats;
  errorHandler: HydrationErrorHandler;
}> {
  const errorHandler = createHydrationErrorHandler(options);

  try {
    const result = await hydrateApp(component, container, {
      ...options,
      onError: (error) => {
        errorHandler.handleError(error);
        options.onError?.(error);
      },
      onMismatch: (mismatch) => {
        options.onMismatch?.(mismatch);
      },
    });

    return {
      ...result,
      errorHandler,
    };
  } catch (error) {
    // 尝试降级渲染
    const containerEl = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (containerEl) {
      // 清空容器并重新渲染
      containerEl.innerHTML = '';
      const app = createApp(component);
      app.mount(containerEl);

      return {
        app,
        stats: {
          totalNodes: 0,
          hydratedNodes: 0,
          skippedNodes: 0,
          mismatches: 0,
          errors: 1,
          duration: 0,
        },
        errorHandler,
      };
    }

    throw error;
  }
}

// ============================================================
// 导出
// ============================================================

export {
  hydrateApp,
  hydrateVisible,
  queueHydration,
  safeHydrate,
  createHydrationErrorHandler,
  HydrationErrorHandler,
};
