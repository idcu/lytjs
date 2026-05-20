/**
 * @lytjs/renderer
 * LytJS 框架的渲染后端
 * 提供 DOM、SSR 和 Vapor 渲染
 * FIX: P2-10 RENDERER-NEW-03 - 渲染器插件系统
 * FIX: P2-26 懒加载优化 - 大型模块使用动态导入
 */

// 从 vdom 重新导出
/** 创建渲染器 */
export { createRenderer } from '@lytjs/vdom';
export type { VNode, RendererOptions } from '@lytjs/vdom';

// ==================== 渲染器插件系统 ====================

import type { VNode as VNodeType } from '@lytjs/vdom';
import { warn, error } from '@lytjs/common-error';

/**
 * 渲染器插件接口
 * 插件可以挂载到渲染生命周期的各个阶段
 */
export interface RendererPlugin {
  /** 插件名称 */
  name: string;

  /** 插件安装时调用 */
  install: (context: PluginContext) => void;

  /** 可选：在 mount vnode 之前调用 */
  beforeMount?: (vnode: VNodeType) => void;

  /** 可选：在 mount vnode 之后调用 */
  afterMount?: (vnode: VNodeType, container: unknown) => void;

  /** 可选：在 patch vnode 之前调用 */
  beforePatch?: (oldVNode: VNodeType, newVNode: VNodeType) => void;

  /** 可选：在 patch vnode 之后调用 */
  afterPatch?: (vnode: VNodeType) => void;

  /** 可选：在 unmount vnode 之前调用 */
  beforeUnmount?: (vnode: VNodeType) => void;

  /** 可选：在 unmount vnode 之后调用 */
  afterUnmount?: (vnode: VNodeType) => void;
}

/**
 * 插件安装时传递的上下文
 */
export interface PluginContext {
  /** 为特定的生命周期事件注册钩子 */
  on: (event: LifecycleEvent, handler: HookHandler) => void;

  /** 移除已注册的钩子 */
  off: (event: LifecycleEvent, handler: HookHandler) => void;
}

/** 插件可以挂载的生命周期事件 */
export type LifecycleEvent =
  | 'beforeMount'
  | 'afterMount'
  | 'beforePatch'
  | 'afterPatch'
  | 'beforeUnmount'
  | 'afterUnmount';

/** 钩子处理函数类型 */
export type HookHandler = (...args: unknown[]) => void;

/** 插件注册表 */
const installedPlugins: RendererPlugin[] = [];

/** 钩子注册表 */
const hooks: Record<LifecycleEvent, Set<HookHandler>> = {
  beforeMount: new Set(),
  afterMount: new Set(),
  beforePatch: new Set(),
  afterPatch: new Set(),
  beforeUnmount: new Set(),
  afterUnmount: new Set(),
};

/**
 * 安装渲染器插件。
 * 插件可以通过挂载生命周期事件来扩展渲染器的功能。
 *
 * @example
 * ```ts
 * // 创建插件
 * const myPlugin: RendererPlugin = {
 *   name: 'MyPlugin',
 *   install(context) {
 *     context.on('beforeMount', (vnode) => {
 *       console.log('Before mount:', vnode);
 *     });
 *   },
 * };
 *
 * // 使用插件
 * use(myPlugin);
 * ```
 */
export function use(plugin: RendererPlugin): void {
  if (installedPlugins.includes(plugin)) {
    if (__DEV__) {
      warn(`Plugin "${plugin.name}" has already been installed.`);
    }
    return;
  }

  // 创建插件上下文
  const context: PluginContext = {
    on: (event, handler) => {
      hooks[event].add(handler);
    },
    off: (event, handler) => {
      hooks[event].delete(handler);
    },
  };

  // 安装插件
  plugin.install(context);
  installedPlugins.push(plugin);

  // 注册插件的生命周期钩子（如果提供）
  // FIX: DTS build error - 类型断言
  if (plugin.beforeMount) hooks.beforeMount.add(plugin.beforeMount as HookHandler);
  if (plugin.afterMount) hooks.afterMount.add(plugin.afterMount as HookHandler);
  if (plugin.beforePatch) hooks.beforePatch.add(plugin.beforePatch as HookHandler);
  if (plugin.afterPatch) hooks.afterPatch.add(plugin.afterPatch as HookHandler);
  if (plugin.beforeUnmount) hooks.beforeUnmount.add(plugin.beforeUnmount as HookHandler);
  if (plugin.afterUnmount) hooks.afterUnmount.add(plugin.afterUnmount as HookHandler);
}

/**
 * 获取所有已安装的插件
 */
export function getInstalledPlugins(): readonly RendererPlugin[] {
  return [...installedPlugins];
}

/**
 * 检查插件是否已安装
 */
export function isPluginInstalled(pluginName: string): boolean {
  return installedPlugins.some((p) => p.name === pluginName);
}

/**
 * 按名称移除插件
 */
export function removePlugin(pluginName: string): boolean {
  const index = installedPlugins.findIndex((p) => p.name === pluginName);
  if (index === -1) return false;

  const plugin = installedPlugins[index]!;

  // 移除钩子
  // FIX: DTS build error - 类型断言
  if (plugin.beforeMount) hooks.beforeMount.delete(plugin.beforeMount as HookHandler);
  if (plugin.afterMount) hooks.afterMount.delete(plugin.afterMount as HookHandler);
  if (plugin.beforePatch) hooks.beforePatch.delete(plugin.beforePatch as HookHandler);
  if (plugin.afterPatch) hooks.afterPatch.delete(plugin.afterPatch as HookHandler);
  if (plugin.beforeUnmount) hooks.beforeUnmount.delete(plugin.beforeUnmount as HookHandler);
  if (plugin.afterUnmount) hooks.afterUnmount.delete(plugin.afterUnmount as HookHandler);

  installedPlugins.splice(index, 1);
  return true;
}

/**
 * 内部：执行生命周期事件的钩子
 * 由渲染器在适当的生命周期节点调用
 * FIX: P2-29 数组遍历优化 - 使用 for 循环替代 forEach
 */
export function executeHooks(event: LifecycleEvent, ...args: unknown[]): void {
  const handlers = hooks[event];
  // FIX: P2-29 使用 for 循环替代 forEach，避免函数调用开销
  // FIX: DTS build error - 类型断言
  for (const handler of handlers) {
    try {
      (handler as (...args: unknown[]) => void)(...args);
    } catch (e) {
      if (__DEV__) {
        error(`Error in ${event} hook: ${String(e)}`);
      }
    }
  }
}

// 导出类型
// FIX: DTS build error - 删除重复的类型导出
export type { RendererPlugin as Plugin };

// 从 reactivity 重新导出首次渲染优化
/** 首次渲染优化 */
export {
  withFirstRenderOptimization,
  shouldSkipTracking,
  getSkippedTrackingCount,
  resetSkippedTrackingCount,
} from '@lytjs/reactivity';

// DOM 渲染器 - 从 @lytjs/adapter-web 重新导出
/** 创建 DOM 渲染器 */
export { createDOMRenderer } from '@lytjs/adapter-web';
export type { DOMRenderer } from '@lytjs/adapter-web';

// DOM 属性补丁操作 - 从 @lytjs/adapter-web 重新导出
/** DOM 属性补丁操作 */
export {
  patchProp,
  patchClass,
  patchStyle,
  patchEvent,
  patchAttr,
  normalizeEventName,
  getEventKey,
  parseEventModifier,
  createInvoker,
  removeAllEventListeners,
} from '@lytjs/adapter-web';
export type { ParsedEvent, EventInvoker } from '@lytjs/adapter-web';
/** 事件名检测 */
export { isOn } from '@lytjs/common-events';

// Hydration - 从 @lytjs/adapter-web 重新导出
/** 创建水合（hydration）函数 */
export { createHydrationFunctions } from '@lytjs/adapter-web';
export type { HydrationRenderer } from '@lytjs/adapter-web';

// 增强 Hydration API (Phase 1.15-1.17)
/** Hydration 完善：全应用、选择性、错误恢复 */
export async function getEnhancedHydrationFunctions() {
  const hydration = await import('./hydration/enhanced-hydration');
  return {
    hydrateApp: hydration.hydrateApp,
    hydrateVisible: hydration.hydrateVisible,
    queueHydration: hydration.queueHydration,
    safeHydrate: hydration.safeHydrate,
    createHydrationErrorHandler: hydration.createHydrationErrorHandler,
  };
}
export type {
  HydrationMode,
  HydrationOptions,
  HydrationError,
  HydrationMismatch,
  HydrationStats,
  RecoveryStrategy,
} from './hydration/enhanced-hydration';
export { HydrationErrorHandler } from './hydration/enhanced-hydration';

// 从 @lytjs/host-contract 重新导出
/** 渲染器宿主抽象类型 */
export type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  TransitionDurationInfo,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
} from '@lytjs/host-contract';

// 从 @lytjs/adapter-web 重新导出
/** Web 渲染器宿主实现 */
export { WebRendererHost, createWebHost, wrapDOMEvent } from '@lytjs/adapter-web';

// FIX: P2-26 懒加载优化 - SSR 相关函数使用动态导入
// SSR 渲染器
/** 将组件渲染为字符串（SSR） */
export async function renderToString(input: { vnode: VNodeType }): Promise<string> {
  const { renderToString: _renderToString } = await import('./ssr/ssr-renderer');
  return _renderToString(input);
}
export type { SSRInput } from './ssr/ssr-renderer';

// SSR 流式渲染
/** 将 VNode 树流式渲染为 ReadableStream（SSR Streaming） */
export async function renderToStream(
  input: { vnode: unknown },
  options?: { commentMarkers?: boolean },
): Promise<ReadableStream> {
  const { renderToStream: _renderToStream } = await import('./ssr/ssr-stream');
  return _renderToStream(input as { vnode: VNodeType }, options);
}
export type { SSRStreamOptions } from './ssr/ssr-stream';

// 优化的流式渲染 (Phase 1.5)
/** 优化的流式渲染 - TTFB 降低 50%+ */
export async function createOptimizedStream(
  vnode: unknown,
  options?: unknown,
): Promise<ReadableStream> {
  const { createOptimizedStream: _createOptimizedStream } =
    await import('./ssr/ssr-stream-optimized');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return _createOptimizedStream(vnode as VNodeType, options as any);
}
export async function renderDocumentToStream(
  vnode: unknown,
  options?: unknown,
): Promise<ReadableStream> {
  const { renderDocumentToStream: _renderDocumentToStream } =
    await import('./ssr/ssr-stream-optimized');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return _renderDocumentToStream(vnode as VNodeType, options as any);
}
export type { OptimizedStreamOptions, PreloadHint, StreamStats } from './ssr/ssr-stream-optimized';
export { OptimizedSSRStream } from './ssr/ssr-stream-optimized';

// SSR Island 架构
/** Island Architecture 相关函数 */
import type { ComponentOptions } from './ssr/ssr-island';
export async function hydrateIsland(
  el: Element,
  component: ComponentOptions,
  props?: Record<string, unknown>,
): Promise<void> {
  const { hydrateIsland: _hydrateIsland } = await import('./ssr/ssr-island');
  return _hydrateIsland(el, component, props);
}
export async function registerIslandComponent(
  name: string,
  component: ComponentOptions,
): Promise<void> {
  const { registerIslandComponent: _registerIslandComponent } = await import('./ssr/ssr-island');
  return _registerIslandComponent(name, component);
}
export async function createIslandSSRContent(
  name: string,
  props: Record<string, unknown> = {},
): Promise<string> {
  const { createIslandSSRContent: _createIslandSSRContent } = await import('./ssr/ssr-island');
  return _createIslandSSRContent(name, props);
}
export type { ComponentOptions as IslandComponentOptions } from './ssr/ssr-island';

// Signal 渲染器
/** 创建 Signal 模式渲染器（细粒度 DOM 更新） */
// FIX: DTS build error - 修复参数数量
export async function createSignalRenderer(
  template: string = '',
  context: Record<string, unknown> = {},
) {
  const { createSignalRenderer: _createSignalRenderer } = await import('./signal/signal-renderer');
  return _createSignalRenderer(template, context);
}
export type { SignalRenderer } from './signal/signal-renderer';

// Vapor 渲染器（Signal 渲染器的别名）
/** 创建 Vapor 模式渲染器（Signal 渲染器的别名） */
// FIX: DTS build error - 修复参数数量
export async function createVaporRenderer(
  template: string = '',
  context: Record<string, unknown> = {},
) {
  const { createSignalRenderer: _createSignalRenderer } = await import('./signal/signal-renderer');
  return _createSignalRenderer(template, context);
}
export type { SignalRenderer as VaporRenderer } from './signal/signal-renderer';

// Vapor 应用 API
/** 定义 Vapor 模式组件 */
// FIX: DTS build error - 添加类型断言
export async function defineVaporComponent(options: unknown) {
  const { defineVaporComponent: _defineVaporComponent } = await import('./vapor/vapor-app');
  return _defineVaporComponent(options as Parameters<typeof _defineVaporComponent>[0]);
}
export async function createVaporApp(rootComponent: unknown, props?: Record<string, unknown>) {
  const { createVaporApp: _createVaporApp } = await import('./vapor/vapor-app');
  return _createVaporApp(rootComponent as Parameters<typeof _createVaporApp>[0], props);
}
export type {
  VaporComponentOptions,
  VaporComponentDefinition,
  VaporApp,
  VaporAppOptions,
  VaporContext,
  PropOptions as VaporPropOptions,
} from './vapor/vapor-app';

// Vapor HMR API (Phase 1.2)
/** Vapor 模式 HMR 支持 */
export async function getVaporHMRFunctions() {
  const vaporHMR = await import('./vapor/vapor-hmr');
  return {
    generateComponentId: vaporHMR.generateComponentId,
    registerComponent: vaporHMR.registerComponent,
    unregisterComponent: vaporHMR.unregisterComponent,
    handleComponentUpdate: vaporHMR.handleComponentUpdate,
    createVaporHMRHandler: vaporHMR.createVaporHMRHandler,
    isHMRAvailable: vaporHMR.isHMRAvailable,
    forceRerender: vaporHMR.forceRerender,
    clearHMRState: vaporHMR.clearHMRState,
    onHMRUpdate: vaporHMR.onHMRUpdate,
  };
}
export type { HMRUpdateType, HMRUpdate, HMRStatePreservation } from './vapor/vapor-hmr';
export { DEFAULT_STATE_PRESERVATION } from './vapor/vapor-hmr';

// Vapor SSR API (Phase 1.3)
/** Vapor 模式 SSR 支持 */
export async function renderVaporToString(
  component: unknown,
  props?: Record<string, unknown>,
  options?: unknown,
) {
  const { renderVaporToString: _renderVaporToString } = await import('./vapor/vapor-ssr');
  return _renderVaporToString(
    component as Parameters<typeof _renderVaporToString>[0],
    props as Parameters<typeof _renderVaporToString>[1],
    options as Parameters<typeof _renderVaporToString>[2],
  );
}
export async function renderVaporToStream(
  component: unknown,
  props?: Record<string, unknown>,
  options?: unknown,
) {
  const { renderVaporToStream: _renderVaporToStream } = await import('./vapor/vapor-ssr');
  return _renderVaporToStream(
    component as Parameters<typeof _renderVaporToStream>[0],
    props as Parameters<typeof _renderVaporToStream>[1],
    options as Parameters<typeof _renderVaporToStream>[2],
  );
}
export async function hydrateVaporComponent(
  container: Element | string,
  component: unknown,
  options?: unknown,
) {
  const { hydrateVaporComponent: _hydrateVaporComponent } = await import('./vapor/vapor-ssr');
  return _hydrateVaporComponent(
    container,
    component as Parameters<typeof _hydrateVaporComponent>[1],
    options as Parameters<typeof _hydrateVaporComponent>[2],
  );
}
export type {
  VaporSSROptions,
  VaporSSRResult,
  VaporSSRStreamResult,
  VaporHydrationOptions,
} from './vapor/vapor-ssr';
export { definePrefetch, usePrefetchData } from './vapor/vapor-ssr';

// 组件资源清理
/** 组件资源自动清理：注册事件监听器、effect 订阅、cleanup 钩子，卸载时自动释放 */
export {
  registerComponentEventListener,
  registerComponentEffectSubscription,
  registerComponentCleanup,
  cleanupComponentResources,
} from './unmount';
export type { ResourceCleanupRenderer } from './unmount';

// 工具函数
/** HTML 转义、布尔属性判断等工具函数 */
export { escapeHtml, isBooleanAttr, isVoidElement } from './utils';

// Server Components API (Phase 1.4)
/** Server Components 服务端运行时 */
export async function getServerComponentFunctions() {
  const serverComponents = await import('./server/server-components');
  return {
    registerServerComponent: serverComponents.registerServerComponent,
    registerServerFunction: serverComponents.registerServerFunction,
    getServerComponent: serverComponents.getServerComponent,
    getServerFunction: serverComponents.getServerFunction,
    handleServerAction: serverComponents.handleServerAction,
    createServerActionHandler: serverComponents.createServerActionHandler,
    serializeServerData: serverComponents.serializeServerData,
    deserializeServerData: serverComponents.deserializeServerData,
    renderServerComponent: serverComponents.renderServerComponent,
    defineServerComponent: serverComponents.defineServerComponent,
  };
}
export type {
  ServerComponentDefinition,
  ServerActionRequest,
  ServerActionResponse,
} from './server/server-components';

/** Server Components 客户端运行时 */
export async function getServerComponentClientFunctions() {
  const client = await import('./client/server-components-client');
  return {
    callServer: client.callServer,
    createServerFunction: client.createServerFunction,
    getServerData: client.getServerData,
    hasServerData: client.hasServerData,
    isHydrated: client.isHydrated,
    markHydrated: client.markHydrated,
    getHydrationState: client.getHydrationState,
    autoHydrate: client.autoHydrate,
    configureServerAction: client.configureServerAction,
  };
}

// 数据获取 API (Phase 1.7)
/** 数据获取集成 */
export async function getDataFetchingFunctions() {
  const data = await import('./data/data-fetching');
  return {
    serializeData: data.serializeData,
    deserializeData: data.deserializeData,
    createPrefetchManager: data.createPrefetchManager,
    useFetch: data.useFetch,
    useAsyncData: data.useAsyncData,
    injectPrefetchData: data.injectPrefetchData,
    getPrefetchData: data.getPrefetchData,
  };
}
export type {
  DataFetchState,
  DataFetchOptions,
  PrefetchDataEntry,
  PrefetchManager,
} from './data/data-fetching';
