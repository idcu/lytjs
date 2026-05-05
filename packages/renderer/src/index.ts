/**
 * @lytjs/renderer
 * Rendering backend for the LytJS framework
 * Provides DOM, SSR, and Vapor rendering
 * FIX: P2-10 RENDERER-NEW-03 - 渲染器插件系统
 */

// Re-export from vdom
/** 创建渲染器 */
export { createRenderer } from '@lytjs/vdom';
export type { VNode, RendererOptions } from '@lytjs/vdom';

// ==================== Renderer Plugin System ====================

import type { VNode as VNodeType } from '@lytjs/vdom';

/**
 * Renderer plugin interface
 * Plugins can hook into various stages of the rendering lifecycle
 */
export interface RendererPlugin {
  /** Plugin name */
  name: string;

  /** Called when plugin is installed */
  install: (context: PluginContext) => void;

  /** Optional: Called before mounting a vnode */
  beforeMount?: (vnode: VNodeType) => void;

  /** Optional: Called after mounting a vnode */
  afterMount?: (vnode: VNodeType, container: unknown) => void;

  /** Optional: Called before patching a vnode */
  beforePatch?: (oldVNode: VNodeType, newVNode: VNodeType) => void;

  /** Optional: Called after patching a vnode */
  afterPatch?: (vnode: VNodeType) => void;

  /** Optional: Called before unmounting a vnode */
  beforeUnmount?: (vnode: VNodeType) => void;

  /** Optional: Called after unmounting a vnode */
  afterUnmount?: (vnode: VNodeType) => void;
}

/**
 * Context passed to plugins during installation
 */
export interface PluginContext {
  /** Register a hook for a specific lifecycle event */
  on: (event: LifecycleEvent, handler: HookHandler) => void;

  /** Remove a registered hook */
  off: (event: LifecycleEvent, handler: HookHandler) => void;
}

/** Lifecycle events that plugins can hook into */
export type LifecycleEvent =
  | 'beforeMount'
  | 'afterMount'
  | 'beforePatch'
  | 'afterPatch'
  | 'beforeUnmount'
  | 'afterUnmount';

/** Hook handler type */
export type HookHandler = (...args: unknown[]) => void;

/** Plugin registry */
const installedPlugins: RendererPlugin[] = [];

/** Hook registry */
const hooks: Record<LifecycleEvent, Set<HookHandler>> = {
  beforeMount: new Set(),
  afterMount: new Set(),
  beforePatch: new Set(),
  afterPatch: new Set(),
  beforeUnmount: new Set(),
  afterUnmount: new Set(),
};

/**
 * Install a renderer plugin.
 * Plugins can extend the renderer's functionality by hooking into lifecycle events.
 *
 * @example
 * ```ts
 * // Create a plugin
 * const myPlugin: RendererPlugin = {
 *   name: 'MyPlugin',
 *   install(context) {
 *     context.on('beforeMount', (vnode) => {
 *       console.log('Before mount:', vnode);
 *     });
 *   },
 * };
 *
 * // Use the plugin
 * use(myPlugin);
 * ```
 */
export function use(plugin: RendererPlugin): void {
  if (installedPlugins.includes(plugin)) {
    if (__DEV__) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { warn } = require('@lytjs/common-error');
      warn(`Plugin "${plugin.name}" has already been installed.`);
    }
    return;
  }

  // Create plugin context
  const context: PluginContext = {
    on: (event, handler) => {
      hooks[event].add(handler);
    },
    off: (event, handler) => {
      hooks[event].delete(handler);
    },
  };

  // Install the plugin
  plugin.install(context);
  installedPlugins.push(plugin);

  // Register plugin's lifecycle hooks if provided
  if (plugin.beforeMount) hooks.beforeMount.add(plugin.beforeMount);
  if (plugin.afterMount) hooks.afterMount.add(plugin.afterMount);
  if (plugin.beforePatch) hooks.beforePatch.add(plugin.beforePatch);
  if (plugin.afterPatch) hooks.afterPatch.add(plugin.afterPatch);
  if (plugin.beforeUnmount) hooks.beforeUnmount.add(plugin.beforeUnmount);
  if (plugin.afterUnmount) hooks.afterUnmount.add(plugin.afterUnmount);
}

/**
 * Get all installed plugins
 */
export function getInstalledPlugins(): readonly RendererPlugin[] {
  return [...installedPlugins];
}

/**
 * Check if a plugin is installed
 */
export function isPluginInstalled(pluginName: string): boolean {
  return installedPlugins.some((p) => p.name === pluginName);
}

/**
 * Remove a plugin by name
 */
export function removePlugin(pluginName: string): boolean {
  const index = installedPlugins.findIndex((p) => p.name === pluginName);
  if (index === -1) return false;

  const plugin = installedPlugins[index];

  // Remove hooks
  if (plugin.beforeMount) hooks.beforeMount.delete(plugin.beforeMount);
  if (plugin.afterMount) hooks.afterMount.delete(plugin.afterMount);
  if (plugin.beforePatch) hooks.beforePatch.delete(plugin.beforePatch);
  if (plugin.afterPatch) hooks.afterPatch.delete(plugin.afterPatch);
  if (plugin.beforeUnmount) hooks.beforeUnmount.delete(plugin.beforeUnmount);
  if (plugin.afterUnmount) hooks.afterUnmount.delete(plugin.afterUnmount);

  installedPlugins.splice(index, 1);
  return true;
}

/**
 * Internal: Execute hooks for a lifecycle event
 * This is called by the renderer at appropriate lifecycle points
 */
export function executeHooks(event: LifecycleEvent, ...args: unknown[]): void {
  hooks[event].forEach((handler) => {
    try {
      handler(...args);
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { error } = require('@lytjs/common-error');
        error(`Error in ${event} hook:`, e);
      }
    }
  });
}

// Export types
export type { RendererPlugin as Plugin, PluginContext, LifecycleEvent };

// Re-export first render optimization from reactivity
/** 首次渲染优化 */
export {
  withFirstRenderOptimization,
  shouldSkipTracking,
  getSkippedTrackingCount,
  resetSkippedTrackingCount,
} from '@lytjs/reactivity';

// DOM renderer - re-export from @lytjs/adapter-web
/** 创建 DOM 渲染器 */
export { createDOMRenderer } from '@lytjs/adapter-web';
export type { DOMRenderer } from '@lytjs/adapter-web';

// DOM property patching - re-export from @lytjs/adapter-web
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

// Hydration - re-export from @lytjs/adapter-web
/** 创建水合（hydration）函数 */
export { createHydrationFunctions } from '@lytjs/adapter-web';
export type { HydrationRenderer } from '@lytjs/adapter-web';

// Re-export from @lytjs/host-contract
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

// Re-export from @lytjs/adapter-web
/** Web 渲染器宿主实现 */
export { WebRendererHost, createWebHost, wrapDOMEvent } from '@lytjs/adapter-web';

// SSR renderer
/** 将组件渲染为字符串（SSR） */
export { renderToString } from './ssr/ssr-renderer';
export type { SSRInput } from './ssr/ssr-renderer';

// SSR streaming
/** 将 VNode 树流式渲染为 ReadableStream（SSR Streaming） */
export { renderToStream } from './ssr/ssr-stream';
export type { SSRStreamOptions } from './ssr/ssr-stream';

// SSR island architecture
/** Island Architecture 相关函数 */
export { hydrateIsland, registerIslandComponent, createIslandSSRContent } from './ssr/ssr-island';
export type { ComponentOptions as IslandComponentOptions } from './ssr/ssr-island';

// Signal renderer
/** 创建 Signal 模式渲染器（细粒度 DOM 更新） */
export { createSignalRenderer } from './signal/signal-renderer';
export type { SignalRenderer } from './signal/signal-renderer';

// Vapor renderer (alias for Signal renderer)
/** 创建 Vapor 模式渲染器（Signal 渲染器的别名） */
export { createSignalRenderer as createVaporRenderer } from './signal/signal-renderer';
export type { SignalRenderer as VaporRenderer } from './signal/signal-renderer';

// Vapor app API
/** 定义 Vapor 模式组件 */
export { defineVaporComponent, createVaporApp } from './vapor/vapor-app';
export type {
  VaporComponentOptions,
  VaporComponentDefinition,
  VaporApp,
  VaporAppOptions,
  VaporContext,
  PropOptions as VaporPropOptions,
} from './vapor/vapor-app';

// Component resource cleanup
/** 组件资源自动清理：注册事件监听器、effect 订阅、cleanup 钩子，卸载时自动释放 */
export {
  registerComponentEventListener,
  registerComponentEffectSubscription,
  registerComponentCleanup,
  cleanupComponentResources,
} from './unmount';
export type { ResourceCleanupRenderer } from './unmount';

// Utilities
/** HTML 转义、布尔属性判断等工具函数 */
export { escapeHtml, isBooleanAttr, isVoidElement } from './utils';
