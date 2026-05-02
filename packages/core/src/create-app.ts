// src/create-app.ts
// @lytjs/core - createApp 工厂函数

import { createVNode } from '@lytjs/vdom';
import { createDOMRenderer, createSignalRenderer } from '@lytjs/renderer';
import type { SignalRenderer } from '@lytjs/renderer';
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
  options?: AppOptions,
): App {
  const context = createAppContext();
  const installedPlugins = new Set<Plugin | ((app: App, ...options: unknown[]) => void)>();
  let _isUnmounted = false;
  let _isMounted = false;

  // 确定渲染模式
  const rendererMode = options?.rendererMode ?? 'vnode';

  // Signal 模式下的渲染器引用
  let signalRenderer: SignalRenderer | null = null;

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

      // 根据渲染模式选择不同的渲染路径
      if (rendererMode === 'signal') {
        return mountWithSignalMode(container);
      }

      // 默认 VNode 模式
      return mountWithVNodeMode(container);
    },

    unmount() {
      if (rendererMode === 'signal') {
        // Signal 模式卸载
        if (signalRenderer) {
          signalRenderer.unmount();
          signalRenderer = null;
        }
      } else {
        // VNode 模式卸载
        if (!context.renderer || !context._vnode) return;

        const instance = context._instance;
        if (instance) {
          callUnmountedHook(instance);
        }

        context.renderer.unmount(context._vnode);
        context._vnode = null;
      }

      // 标记 app 为已卸载
      _isUnmounted = true;

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
      context.provides.clear();

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
      context.provides.set(key, value);
      return app;
    },

    inject<T = unknown>(key: string | symbol): T | undefined {
      return context.provides.get(key) as T | undefined;
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

  // ==================== VNode 模式挂载 ====================

  function mountWithVNodeMode(container: Element): ComponentPublicInstance {
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
      for (const [key, value] of context.provides) {
        if (!rootProvides.has(key)) {
          rootProvides.set(key, value);
        }
      }
    }

    // Set up the component (runs setup, init props/slots, data, lifecycle)
    setupComponent(instance);

    // Save root instance reference for unmount lifecycle hooks
    context._instance = instance;

    // Render using the enhanced renderer
    const renderer = createDOMRenderer();
    context.renderer = renderer as unknown as DOMRenderer;
    context._vnode = rootVNode;

    // Mount the vnode
    renderer.mount(rootVNode, container);

    // Create and return the public instance
    const publicInstance = createComponentPublicInstance(instance);

    _isMounted = true;

    return publicInstance as ComponentPublicInstance;
  }

  // ==================== Signal 模式挂载 ====================

  function mountWithSignalMode(container: Element): ComponentPublicInstance {
    // Signal 模式下，rootComponent 应该包含 template 属性
    // 或者是一个包含 template 和 setup/data 的组件选项对象
    const componentOptions = rootComponent as Record<string, unknown>;
    const template = componentOptions.template as string | undefined;

    if (!template) {
      throw new Error(
        `[LytJS] Signal mode requires a template string in the root component. ` +
          `Provide a 'template' property in your component options.`,
      );
    }

    // 构建上下文对象：合并 data、setup 返回值和 props
    const ctx: Record<string, unknown> = { ...rootProps };

    // 执行 data 函数
    if (typeof componentOptions.data === 'function') {
      const dataResult = (componentOptions.data as () => Record<string, unknown>)();
      Object.assign(ctx, dataResult);
    }

    // 执行 setup 函数
    if (typeof componentOptions.setup === 'function') {
      const setupResult = (componentOptions.setup as Function)(rootProps ?? {}, {});
      if (setupResult && typeof setupResult === 'object') {
        Object.assign(ctx, setupResult);
      }
    }

    // 创建 Signal 渲染器
    signalRenderer = createSignalRenderer(template, ctx);
    signalRenderer.render(container);

    _isMounted = true;

    // Signal 模式返回一个简化的公共实例
    // 通过 Proxy 实现对 ctx 的访问
    return new Proxy({} as ComponentPublicInstance, {
      get(_, key: string | symbol) {
        if (key === '$el') return container;
        if (key === '$options') return componentOptions;
        return (ctx as Record<string | symbol, unknown>)[key];
      },
      set(_, key: string | symbol, value: unknown) {
        (ctx as Record<string | symbol, unknown>)[key] = value;
        return true;
      },
    }) as ComponentPublicInstance;
  }

  return app;
}
