// src/create-app.ts
// @lytjs/core-vnode - createApp 工厂函数（仅 VNode 模式）
// FIX: DTS build error - 声明 __DEV__ 全局变量
declare const __DEV__: boolean;

import { createVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
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
  callMountedHook,
  callUpdatedHook,
  callBeforeUnmountHook,
  callUnmountedHook,
  initProps,
} from '@lytjs/component';
import type {
  AppContext as ComponentAppContext,
  ComponentInternalInstance,
} from '@lytjs/component';

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
        // 通过组件系统的标准流程创建根 vnode
        const rootVNode = createVNode(rootComponent, rootProps);

        // 使用标准化的组件系统创建组件实例
        const instance = createComponentInstance(rootVNode, null);

        // 替换 appContext：createComponentInstance 会创建新的空上下文
        // when parent is null, but we need the core-level context with plugins,
        // components, directives, and provides registered on the app.
        instance.appContext = context as ComponentAppContext;

        // Copy app-level provides into the root instance
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

        // 将组件实例存储到 vnode 上，以便 patch 时访问
        // FIX: DTS build error - 跨包类型不兼容
        (rootVNode as { component: unknown }).component = instance;

        // 保存根实例引用，用于卸载生命周期钩子
        context._instance = instance;

        // 使用 DOM 渲染器进行渲染 - 添加 setupChildComponent 和 normalizeProps 选项
        // 说明：@lytjs/component 与 @lytjs/vdom（经 @lytjs/common-vnode）各自声明了一份
        // 同名的 ComponentInternalInstance，二者结构不等价。渲染器选项走的是 vdom 那份，
        // 因此这里先把选项对象按 vdom 契约断言传入，回调内部再转回 component 的类型使用
        // （core 包也是同样的跨包桥接思路）。
        type RendererOptionsArg = NonNullable<Parameters<typeof createDOMRenderer>[0]>;
        const rendererOptions = {
          setupChildComponent(childVNode: VNode, parentComponent: unknown) {
            const parent = parentComponent as ComponentInternalInstance | null;
            const childInstance = createComponentInstance(childVNode, parent);
            // 从父组件或根组件继承 appContext
            if (parent) {
              childInstance.appContext = parent.appContext;
            } else {
              childInstance.appContext = context as ComponentAppContext;
            }
            setupComponent(childInstance);
            (childVNode as unknown as { component: ComponentInternalInstance }).component =
              childInstance;
          },
          normalizeProps(instance: unknown, rawProps: Record<string, unknown> | null) {
            initProps(instance as ComponentInternalInstance, rawProps);
          },
          // ── 组件生命周期钩子的实现注入 ──────────────────────────────────────
          // vdom 不能反向依赖 @lytjs/component（会循环），因此钩子的**实现**由本包注入，
          // 与上面的 setupChildComponent / normalizeProps 同模式。
          //
          // ⚠️ 2026-10-10 修复（P0-2）：此前这里**完全没有**注入这 4 个回调，
          // 而 vdom 侧只在 `ctx.invokeXxxHook?.()` 处消费它们（可选调用 ⇒ 静默跳过）⇒
          // `onMounted` / `onUpdated` / `onBeforeUnmount` / `onUnmounted`
          // 在 **core-vnode 这条 VNode 生产路径上永不执行**，且不报错、不警告。
          //
          // 判据（硬约束 8：打到被验证对象）：`packages/vdom/src/patch-component.ts:262`
          // 与 `packages/vdom/src/patch.ts:592,601` 是仅有的消费点；全仓对
          // `invokeMountedHook` 的**写入点**此前只有 `core/src/create-app.ts`。
          // 本包与 core 是两条平行的 createApp 实现，core 修了、core-vnode 漏了。
          invokeMountedHook(inst: unknown) {
            callMountedHook(inst as ComponentInternalInstance);
          },
          invokeUpdatedHook(inst: unknown) {
            callUpdatedHook(inst as ComponentInternalInstance);
          },
          invokeBeforeUnmountHook(inst: unknown) {
            callBeforeUnmountHook(inst as ComponentInternalInstance);
          },
          invokeUnmountedHook(inst: unknown) {
            callUnmountedHook(inst as ComponentInternalInstance);
          },
        } as unknown as RendererOptionsArg;

        const renderer = createDOMRenderer(rendererOptions) as unknown as {
          mount: (vnode: VNode, container: Node) => void;
        };
        context.renderer = renderer as unknown as DOMRenderer;
        context._vnode = rootVNode;

        // 挂载 vnode
        renderer.mount(rootVNode, container);

        // 创建并返回公共实例
        const publicInstance = createComponentPublicInstance(instance);

        _isMounted = true;

        return publicInstance as ComponentPublicInstance;
      } catch (err) {
        if (app.errorHandler) {
          app.errorHandler(err, null, 'mount');
        } else {
          error(`[LytJS] Failed to mount app: ${err instanceof Error ? err.message : String(err)}`);
        }
        throw err;
      }
    },

    unmount() {
      if (!context.renderer || !context._vnode) return;

      // ⚠️ 2026-10-10（P0-2 修复的连带改动）：**不要**在这里再手动调
      // `callBeforeUnmountHook` / `callUnmountedHook`。
      // 本包现已向 vdom 注入 `invokeBeforeUnmountHook` / `invokeUnmountedHook`
      // （见 mount() 里的 rendererOptions），vdom 的 `unmount()` 会自行触发它们
      // （顺序：beforeUnmount → 移除 DOM → unmounted）。
      // 两处都调会**重复触发** —— core 包 2026-09-26 实测过：beforeUnmount ×3、unmounted ×2。
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
