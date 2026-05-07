// src/create-app.ts
// @lytjs/core-vnode - createApp 工厂函数（仅 VNode 模式）
// FIX: DTS build error - 声明 __DEV__ 全局变量
declare const __DEV__: boolean;

import { createVNode } from '@lytjs/vdom';
import { createDOMRenderer } from '@lytjs/renderer';
import { error, warn } from '@lytjs/common-error';
import type {
  App,
  AppOptions,
  Plugin,
  Component,
  ComponentPublicInstance,
  DOMRenderer,
  ComponentOptions,
} from './types';
import { createAppContext, createContextConfig } from './app-context';
import {
  createComponentInstance,
  setupComponent,
  createComponentPublicInstance,
  callUnmountedHook,
} from '@lytjs/component';
import type { AppContext as ComponentAppContext } from '@lytjs/component';

export function createApp(
  rootComponent: Component,
  rootProps: Record<string, unknown> | null = null,
  _options?: AppOptions,
): App {
  const context = createAppContext();
  const installedPlugins = new Set<Plugin | ((app: App, ...options: unknown[]) => void)>();
  let _isUnmounted = false;
  let _isMounted = false;

  const app: App = {
    config: createContextConfig(context),

    use(plugin: Plugin | ((app: App, ...options: unknown[]) => void), ...options: unknown[]) {
      if (installedPlugins.has(plugin)) return app;
      try {
        if (typeof plugin === 'function') {
          (plugin as (app: App, ...options: unknown[]) => void)(app, ...options);
        } else {
          plugin.install(app, ...options);
        }
        installedPlugins.add(plugin);
      } catch (err) {
        error(
          `Plugin failed to install: ${typeof plugin === 'function' ? plugin.name || 'anonymous function' : (plugin as Plugin).install?.name || 'plugin'}: ${err}`,
        );
        throw err;
      }
      return app;
    },

    mount(rootContainer: string | Element) {
      if (_isUnmounted) {
        throw new Error(
          `[LytJS] App has been unmounted and cannot be remounted. Create a new app instance instead.`,
        );
      }

      if (!rootComponent) {
        if (__DEV__) {
          warn('App.mount() expects a root component.');
        }
        return null;
      }

      if (context._container) {
        throw new Error(
          `[LytJS] App is already mounted. Call app.unmount() first before mounting again.`,
        );
      }

      const container =
        typeof rootContainer === 'string' ? document.querySelector(rootContainer) : rootContainer;

      if (!container) {
        throw new Error(
          `[LytJS] Failed to mount app: cannot find element matching selector "${rootContainer}". ` +
            `Make sure the target element exists in the DOM before calling app.mount().`,
        );
      }

      context._container = container;

      try {
        // Create root vnode through the component system's standard flow
        const rootVNode = createVNode(rootComponent, rootProps);

        // Create component instance using the standardized component system
        const instance = createComponentInstance(rootVNode, null);

        // Replace appContext: createComponentInstance creates a new empty context
        // when parent is null, but we need the core-level context with plugins,
        // components, directives, and provides registered on the app.
        instance.appContext = context as ComponentAppContext;

        // Copy app-level provides into the root instance
        if (context.provides) {
          const rootProvides = instance.provides;
          for (const key in context.provides) {
            if (!(key in rootProvides)) {
              rootProvides[key] = context.provides[key];
            }
          }
        }

        // Set up the component (runs setup, init props/slots, data, lifecycle)
        setupComponent(instance);

        // Store component instance on vnode so patch can access it
        // FIX: DTS build error - 跨包类型不兼容
        (rootVNode as any).component = instance;

        // Save root instance reference for unmount lifecycle hooks
        context._instance = instance;

        // Render using the DOM renderer
        const renderer = createDOMRenderer();
        context.renderer = renderer as unknown as DOMRenderer;
        context._vnode = rootVNode;

        // Mount the vnode
        renderer.mount(rootVNode, container);

        // Create and return the public instance
        const publicInstance = createComponentPublicInstance(instance);

        _isMounted = true;

        return publicInstance as ComponentPublicInstance;
      } catch (err) {
        if (app.errorHandler) {
          app.errorHandler(err, null, 'mount');
        } else {
          error(
            `[LytJS] Failed to mount app: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        throw err;
      }
    },

    unmount() {
      if (!context.renderer || !context._vnode) return;

      const instance = context._instance;
      if (instance) {
        callUnmountedHook(instance);
      }

      context.renderer.unmount(context._vnode);
      context._vnode = null;

      // 标记 app 为已卸载
      _isUnmounted = true;
      _isMounted = false;

      context._container = null;

      // 清理插件资源：调用插件的 cleanup 方法（如果存在）
      for (const plugin of installedPlugins) {
        if (
          typeof plugin !== 'function' &&
          plugin != null &&
          typeof (plugin as unknown as Record<string, unknown>).cleanup === 'function'
        ) {
          try {
            const cleanup = (plugin as unknown as Record<string, unknown>).cleanup;
            if (typeof cleanup === 'function') cleanup();
          } catch (err) {
            error(
              `Plugin cleanup failed: ${typeof plugin === 'object' && plugin !== null && 'name' in plugin ? (plugin as { name?: string }).name : 'unknown'}: ${err}`,
            );
          }
        }
      }
      installedPlugins.clear();

      // 清理 app context
      context.mixins.length = 0;
      context.components = {};
      context.directives = {};
      context.provides = {};

      // 清理 globalProperties
      context.config.globalProperties = {};

      context._instance = null;
      context.renderer = null;
    },

    provide(key, value) {
      if (__DEV__ && _isMounted) {
        warn(
          'app.provide() cannot be called after the app has been mounted. ' +
            'Register provides before calling app.mount().',
        );
      }
      context.provides[key as string] = value;
      return app;
    },

    inject<T = unknown>(key: string | symbol): T | undefined {
      return context.provides[key as string] as T | undefined;
    },

    component(name, component) {
      context.components[name] = component as unknown as ComponentOptions;
      return app;
    },

    directive(name, directive) {
      context.directives[name] = directive;
      return app;
    },

    mixin(mixin) {
      context.mixins.push(mixin);
      return app;
    },
  };

  return app;
}
