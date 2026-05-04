// src/create-app.ts
// @lytjs/core-signal - createApp 工厂函数（仅 Signal 模式）

import { createSignalRenderer } from '@lytjs/renderer';
import type { SignalRenderer } from '@lytjs/renderer';
import { error, warn } from '@lytjs/common-error';
import type {
  App,
  AppOptions,
  Plugin,
  Component,
  ComponentPublicInstance,
  ComponentOptions,
} from './types';

export function createApp(
  rootComponent: Component,
  rootProps: Record<string, unknown> | null = null,
  _options?: AppOptions,
): App {
  const installedPlugins = new Set<Plugin | ((app: App, ...options: unknown[]) => void)>();
  let _isUnmounted = false;
  let _isMounted = false;

  // Signal 模式下的渲染器引用
  let signalRenderer: SignalRenderer | null = null;
  let _container: Element | null = null;

  // App context with provides and config
  const context = {
    provides: Object.create(null) as Record<string | symbol, unknown>,
    config: {
      errorHandler: undefined as ((err: unknown, instance: unknown, info: string) => boolean | void) | undefined,
      warnHandler: undefined as ((msg: string, instance: unknown, trace: string) => void) | undefined,
      performance: false,
    },
  };

  const app: App = {
    config: {
      performance: false,
      globalProperties: {},
      isCustomElement: undefined,
      compilerOptions: undefined,
    },

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

      if (_container) {
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

      _container = container;

      try {
        // Signal 模式挂载
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
      // Signal 模式卸载
      const componentOptions = rootComponent as Record<string, unknown>;
      const beforeUnmount = componentOptions.beforeUnmount as (() => void) | undefined;
      if (typeof beforeUnmount === 'function') {
        beforeUnmount.call(componentOptions);
      }
      if (signalRenderer) {
        signalRenderer.unmount();
        signalRenderer = null;
      }
      const unmounted = componentOptions.unmounted as (() => void) | undefined;
      if (typeof unmounted === 'function') {
        unmounted.call(componentOptions);
      }

      // 标记 app 为已卸载
      _isUnmounted = true;
      _isMounted = false;

      _container = null;

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
    },

    provide(key, value) {
      if (__DEV__ && _isMounted) {
        warn(
          'app.provide() cannot be called after the app has been mounted. ' +
            'Register provides before calling app.mount().',
        );
      }
      context.provides[key] = value;
      return app;
    },

    inject<T = unknown>(key: string | symbol, defaultValue?: T): T {
      const provides = context.provides;
      if (key in provides) {
        return provides[key] as T;
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      if (__DEV__) {
        warn(`Injection "${String(key)}" not found.`);
      }
      return undefined as T;
    },

    component(name, component) {
      // Signal 模式下组件注册暂不支持
      if (__DEV__) {
        warn(
          `app.component() is not fully supported in Signal mode. ` +
            `Use template-based component composition instead.`,
        );
      }
      return app;
    },

    directive(name, directive) {
      // Signal 模式下指令注册暂不支持
      if (__DEV__) {
        warn(
          `app.directive() is not fully supported in Signal mode. ` +
            `Use template-based event handling instead.`,
        );
      }
      return app;
    },

    mixin(mixin) {
      // Signal 模式下 mixin 暂不支持
      if (__DEV__) {
        warn(
          `app.mixin() is not supported in Signal mode. ` +
            `Use composition API (setup function) instead.`,
        );
      }
      return app;
    },
  };

  return app;
}
