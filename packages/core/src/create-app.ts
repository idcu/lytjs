// src/create-app.ts
// @lytjs/core - createApp 工厂函数

import { createVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import { createDOMRenderer, createSignalRenderer } from '@lytjs/renderer';
import type { SignalRenderer } from '@lytjs/renderer';
import { error, warn } from '@lytjs/common-error';
import type {
  App,
  AppOptions,
  Plugin,
  PluginWithCleanup,
  PluginFunctionWithCleanup,
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
  initProps,
} from '@lytjs/component';
import type { AppContext as ComponentAppContext, ComponentInternalInstance } from '@lytjs/component';

export function createApp(
  rootComponent: Component,
  rootProps: Record<string, unknown> | null = null,
  options?: AppOptions,
): App {
  // FIX: P2-36 全局配置继承机制：
  // 如果提供了父 app context，子 app 继承父 app 的全局配置
  const context = createAppContext();
  const installedPlugins = new Set<Plugin | ((app: App, ...options: unknown[]) => void)>();
  let _isUnmounted = false;
  let _isMounted = false;

  // 跟踪挂载期间注册的全局事件监听器，以便卸载时清理
  const _globalListeners: Array<{ target: EventTarget; event: string; handler: EventListener; options?: AddEventListenerOptions }> = [];

  // 确定渲染模式（'vapor' 是 'signal' 的别名）
  const rendererMode = options?.rendererMode ?? 'vnode';
  const effectiveMode = rendererMode === 'vapor' ? 'signal' : rendererMode;

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

      try {
        // 根据渲染模式选择不同的渲染路径
        if (effectiveMode === 'signal') {
          return mountWithSignalMode(container);
        }

        // 默认 VNode 模式
        return mountWithVNodeMode(container);
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
      // 清理全局事件监听器（document、window 等上注册的监听器）
      for (const listener of _globalListeners) {
        try {
          listener.target.removeEventListener(listener.event, listener.handler, listener.options);
        } catch (err) {
          if (__DEV__) {
            warn(`Failed to remove global event listener "${listener.event}": ${err}`);
          }
        }
      }
      _globalListeners.length = 0;

      // 清理插件资源：调用插件的 cleanup 方法（如果存在）
      // FIX: P2-40 使用 PluginWithCleanup 类型替代类型断言链
      for (const plugin of installedPlugins) {
        const pluginWithCleanup = plugin as PluginWithCleanup | PluginFunctionWithCleanup;
        if (typeof pluginWithCleanup?.cleanup === 'function') {
          try {
            pluginWithCleanup.cleanup();
          } catch (err) {
            const pluginName = pluginWithCleanup.name ??
              (typeof plugin === 'function' ? plugin.name : 'unknown');
            error(
              `Plugin cleanup failed: ${pluginName}: ${err}`,
            );
          }
        }
      }
      installedPlugins.clear();

      if (effectiveMode === 'signal') {
        // Signal 模式卸载
        // FIX: P2-batch2-8 添加类型守卫，确保 rootComponent 是有效对象后再访问属性
        const componentOptions = rootComponent as Record<string, unknown>;
        if (componentOptions != null && typeof componentOptions === 'object') {
          const beforeUnmount = componentOptions.beforeUnmount as (() => void) | undefined;
          if (typeof beforeUnmount === 'function') {
            beforeUnmount.call(componentOptions);
          }
        }
        if (signalRenderer) {
          signalRenderer.unmount();
          signalRenderer = null;
        }
        // FIX: P1-40 Signal 模式卸载时清理容器 DOM 内容，
        // 避免卸载后残留的 DOM 元素导致内存泄漏和视觉异常
        if (context._container) {
          const container = context._container;
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
        }
        const unmounted = componentOptions.unmounted as (() => void) | undefined;
        if (typeof unmounted === 'function') {
          unmounted.call(componentOptions);
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
      _isMounted = false;

      context._container = null;

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
      // FIX: P1-41 inject symbol key 保持类型，使用 string | symbol 作为键类型
      context.provides[key as string | symbol] = value;
      return app;
    },

    inject<T = unknown>(key: string | symbol): T | undefined {
      // FIX: P1-41 inject symbol key 保持类型，支持 symbol 类型的键
      return context.provides[key as string | symbol] as T | undefined;
    },

    component(name, component) {
      // FIX: P2 运行时类型检查：确保 component 参数是有效的组件选项对象
      if (component != null && typeof component !== 'object' && typeof component !== 'function') {
        if (__DEV__) {
          warn(`app.component() expects an object or function, but received ${typeof component}.`);
        }
        return app;
      }
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

    /**
     * Register a global event listener that will be automatically cleaned up on unmount.
     * This ensures no leaked event listeners when the app is destroyed.
     */
    on(target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions) {
      target.addEventListener(event, handler, options);
      _globalListeners.push({ target, event, handler, options });
      return app;
    },

    /**
     * Remove a previously registered global event listener.
     * FIX: P2-v11-06 off() 使用引用相等性匹配 handler，
     * 这意味着传入的 handler 必须与 on() 注册时使用同一个函数引用。
     * 如果使用匿名函数或箭头函数，将无法匹配。请保存函数引用后再传入。
     */
    off(target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions) {
      target.removeEventListener(event, handler, options);
      const idx = _globalListeners.findIndex(
        (l) => l.target === target && l.event === event && l.handler === handler,
      );
      if (idx !== -1) {
        _globalListeners.splice(idx, 1);
      }
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
    // FIX: P2-39 使用 Object.keys 替代 for...in，避免遍历到原型链上的属性
    if (context.provides) {
      const rootProvides = instance.provides;
      for (const key of Object.keys(context.provides)) {
        if (!(key in rootProvides)) {
          rootProvides[key] = context.provides[key];
        }
      }
    }

    // Set up the component (runs setup, init props/slots, data, lifecycle)
    setupComponent(instance);

    // Store component instance on vnode so patch can access it
    rootVNode.component = instance;

    // Save root instance reference for unmount lifecycle hooks
    context._instance = instance;

    // Render using the enhanced renderer
    // Provide setupChildComponent callback so the renderer can create and setup
    // child component instances when it encounters component vnodes during patching
    const renderer = createDOMRenderer({
      setupChildComponent(childVNode: VNode, parentComponent: ComponentInternalInstance | null) {
        const childInstance = createComponentInstance(
          childVNode,
          parentComponent,
        );
        // Inherit appContext from parent or root
        if (parentComponent) {
          childInstance.appContext = parentComponent.appContext;
        } else {
          childInstance.appContext = context as ComponentAppContext;
        }
        setupComponent(childInstance);
        childVNode.component = childInstance;
      },
      // FIX: P1-4 组件更新时规范化 props，避免绕过 initProps 的声明 props 验证和 attrs 分离
      normalizeProps(instance: ComponentInternalInstance, rawProps: Record<string, unknown> | null) {
        initProps(instance, rawProps);
      },
    });
    // FIX: P2-batch2-7 跨包类型断言说明：
    // context.renderer 的类型为 Renderer | null（来自 core 包），
    // 而 DOMRenderer 类型定义在 dom 包中。此处通过 unknown 桥接是安全的，
    // 因为 renderer 实例在 createRenderer() 中已正确初始化为 DOMRenderer。
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
    // FIX: P2-v11-07 Signal 模式下添加类型守卫，验证 rootComponent
    // 是否包含 template 属性，避免对非组件对象进行不安全的属性访问
    if (!rootComponent || typeof rootComponent !== 'object') {
      throw new Error(
        `[LytJS] Signal mode requires rootComponent to be a valid component options object.`,
      );
    }

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
      try {
        const dataResult = (componentOptions.data as () => Record<string, unknown>)();
        Object.assign(ctx, dataResult);
      } catch (e) {
        error(
          `[LytJS] Failed to execute data() in Signal mode: ${e instanceof Error ? e.message : String(e)}`,
        );
        throw e;
      }
    }

    // 执行 setup 函数
    if (typeof componentOptions.setup === 'function') {
      try {
        const setupResult = (componentOptions.setup as (props: Record<string, unknown>, ctx: Record<string, unknown>) => unknown)(rootProps ?? {}, {});
        if (setupResult && typeof setupResult === 'object') {
          Object.assign(ctx, setupResult);
        }
      } catch (e) {
        error(
          `[LytJS] Failed to execute setup() in Signal mode: ${e instanceof Error ? e.message : String(e)}`,
        );
        throw e;
      }
    }

    // 调用 beforeMount 生命周期钩子
    const beforeMount = componentOptions.beforeMount as (() => void) | undefined;
    if (typeof beforeMount === 'function') {
      beforeMount.call(ctx);
    }

    // 创建 Signal 渲染器
    signalRenderer = createSignalRenderer(template, ctx);
    signalRenderer.render(container);

    _isMounted = true;

    // 调用 mounted 生命周期钩子
    const mounted = componentOptions.mounted as (() => void) | undefined;
    if (typeof mounted === 'function') {
      mounted.call(ctx);
    }

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
