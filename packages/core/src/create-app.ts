// src/create-app.ts
// @lytjs/core - createApp 工厂函数

import { createVNode } from '@lytjs/vdom';
import { reactive } from '@lytjs/reactivity';
import type { VNode } from '@lytjs/vdom';
import { error, warn } from '@lytjs/common-error';
import type {
  App,
  AppOptions,
  AppMountOptions,
  Plugin,
  PluginWithCleanup,
  PluginFunctionWithCleanup,
  EnhancedPlugin,
  Component,
  ComponentPublicInstance,
  ComponentOptions,
  DOMRenderer as CoreDOMRenderer,
} from './types';
import { createAppContext, createContextConfig } from './app-context';
import { PluginRegistry } from './plugin-registry';
import { PluginValidator } from './plugin-validator';
import {
  createComponentInstance,
  setupComponent,
  createComponentPublicInstance,
  callUnmountedHook,
  callMountedHook,
  callUpdatedHook,
  callBeforeUnmountHook,
  initProps,
  initSlots,
  setAppFactory,
  hasAppFactory,
  setCurrentInstance,
  callLifecycleHook,
} from '@lytjs/component';
import type {
  AppContext as ComponentAppContext,
  ComponentInternalInstance,
} from '@lytjs/component';
import type { SignalRenderer } from '@lytjs/renderer';
// ---------------------------------------------------------------------------
// ⚠️ 2026-10-27 改（P1-N）：**本模块不再 import `./template-compiler`**。
//
// 原因：`template-compiler.ts` 静态 `import { compile } from '@lytjs/compiler'`，
//   而本模块是 `createApp` 的实现 ⇒ 任何 `import { createApp } from '@lytjs/core'`
//   的应用都会被强制打上 52 KB 编译器（实测最小 app 94.3 KB gzip）。
//
// 现在注入点移到 `./create-app-with-compiler.ts`：
//   · 主入口 `@lytjs/core` 的 `createApp` 来自那个模块（含编译器，`template` 可用）；
//   · 新入口 `@lytjs/core/runtime` 直接用本模块（不含编译器，需 AOT 预编译）。
// 这样「只用 ref/h、不调 createApp」的包也能被完整 tree-shake 掉编译器。
//
// ⚠️ 2026-11-13（打包契约）：**signal 模板编译也走同一条注入缝**，但它必须
//   按 app 实例传入，而不是模块全局注册 —— 同进程里先调用主入口、再调用
//   runtime 入口时，全局注册会让 runtime 静默拿到编译器（实测同一 vitest 进程
//   即可复现），「runtime 不含编译器」就名存实亡。现在 runtime 恒传 `null`，
//   signal 模式会得到一条指向正确路径的错误（见 `mountWithSignalMode`）。
//
//   vnode 主路径的 DOM 渲染器同理不再取 `@lytjs/renderer` 的 namespace
//   （那会让 barrel 全部导出保持 live，signal/vapor 发射链顶层 import
//   `@lytjs/compiler`，把整个编译器拖进 runtime 产物）。
// ---------------------------------------------------------------------------

/**
 * Signal 模式渲染器的注入点。
 *
 * `@lytjs/core/runtime` **不提供**运行时 signal 模板编译：它的 createApp 以
 * `null` 传入（见 `createApp`）。主入口 `@lytjs/core` 由
 * `./create-app-with-compiler` 在调用时注入 `@lytjs/renderer/signal` 的同步实现。
 */
export type SignalRendererFactory = (
  template: string,
  ctx: Record<string, unknown>,
) => Promise<SignalRenderer>;

/**
 * DOM 渲染器的**惰性加载器**。
 *
 * 由入口注入而不是在本模块里写死 `import('@lytjs/renderer/dom')`：
 * `@lytjs/core` 主入口需要把 DOM 与 signal 收进**同一个**动态入口（见
 * `@lytjs/renderer/app`），而 `@lytjs/core/runtime` 只能加载 DOM —— 两者若共用同一条
 * 写死的动态 import，主入口要么多出一个 entry point（静态闭包被切成 3 个 chunk，
 * 实测 gzip +807 B），要么让 runtime 的产物被内联进 signal 的编译器。
 */
export type DOMRendererLoader = () => Promise<typeof import('@lytjs/renderer/dom')>;

// ── 类型层守门（编译期，零运行时）──────────────────────────────────────────
// 两个渲染器入口的模块类型必须都能喂给 `DOMRendererLoader`；任一不再满足时
// 此处编译失败，防止有人为过编译又把双重断言补回来。
type AssertAssignable<T extends U, U> = T;
declare const _domEntryModuleSatisfiesLoader: AssertAssignable<
  typeof import('@lytjs/renderer/dom'),
  Awaited<ReturnType<DOMRendererLoader>>
>;
declare const _appEntryModuleSatisfiesLoader: AssertAssignable<
  typeof import('@lytjs/renderer/app'),
  Awaited<ReturnType<DOMRendererLoader>>
>;

/**
 * 注入 App 工厂（供 `@lytjs/renderer` 的 `hydrateApp` / `hydrateVisible` / `safeHydrate`）。
 *
 * ⚠️ 2026-10-27（P1-N 前置）：此前 renderer 里写的是 `await import('@lytjs/core')`
 *   来拿 `createApp` —— **分层倒置**（renderer 是 core 的下层）+ **幽灵依赖**
 *   （renderer 的 package.json 从未声明 core，严格安装下直接解析不到）。
 *   现在方向反转：core 注入，renderer 从注入缝取用。
 *
 * ⚠️ 注册点为什么在 `createApp` 体内、而不是模块顶层：
 *   模块顶层的 `setAppFactory((c) => createApp(c))` 是一条**有副作用的顶层语句**，
 *   它会强制把整个 `create-app` 模块（以及它动态 import 的 renderer）留在产物里 ——
 *   实测「只 `import { ref } from '@lytjs/core'`」的最小包从 8.9 KB 涨到 82 KB gzip。
 *   放进函数体后，未使用 `createApp` 的包可以把它完整 tree-shake 掉。
 *
 * 代价：`hydrateApp` 若在**从未调用过 `createApp`** 的情况下被使用，拿到的 `app` 为 null
 *   （水合本身不受影响，见 renderer 的 `tryCreateApp`）。
 */
function installAppFactoryOnce(
  signalRendererFactory: SignalRendererFactory | null,
  loadDOMRenderer: DOMRendererLoader | null,
): void {
  if (!hasAppFactory()) {
    setAppFactory((component) =>
      createAppInternal(
        component as never,
        null,
        undefined,
        signalRendererFactory,
        loadDOMRenderer,
      ),
    );
  }
}

/**
 * 不含编译器（`@lytjs/core/runtime`）入口的 `createApp`。
 *
 * vnode 模式完全可用；`template` 是否可用取决于 `@lytjs/component` 的编译器
 * 注入点（runtime 入口不注入）；signal 模式没有渲染器工厂 ⇒ `mount()` 明确抛错。
 *
 * 实际入口包装在 `./runtime.ts`（它负责注入 DOM 加载器）。
 */

/**
 * @internal 承载 createApp 的实现。
 *
 * `signalRendererFactory` 为 `null` 表示当前入口不提供 signal 模板编译能力
 * （`@lytjs/core/runtime`）；主入口由 `./create-app-with-compiler` 注入。
 */
export function createAppInternal(
  rootComponent: Component,
  rootProps: Record<string, unknown> | null,
  options: AppOptions | undefined,
  signalRendererFactory: SignalRendererFactory | null,
  loadDOMRenderer: DOMRendererLoader | null,
): App {
  // 注册 App 工厂（幂等，仅首次生效）—— 供 renderer 的水合 API 取用。
  // 这里直接复用 createAppInternal 与同一份注入参数：不要再引用 runtime 的
  // `createApp` 包装，否则主入口的闭包会无谓地保留一条 runtime 专用边。
  installAppFactoryOnce(signalRendererFactory, loadDOMRenderer);

  // FIX: P2-36 全局配置继承机制：
  // 如果提供了父 app context，子 app 继承父 app 的全局配置
  const context = createAppContext();
  const installedPlugins = new Set<Plugin | ((app: App, ...options: unknown[]) => void)>();
  const pluginRegistry = new PluginRegistry();
  const pluginValidator = new PluginValidator();
  let _isUnmounted = false;
  let _isMounted = false;

  // 跟踪挂载期间注册的全局事件监听器，以便卸载时清理
  const _globalListeners: Array<{
    target: EventTarget;
    event: string;
    handler: EventListener;
    options?: AddEventListenerOptions;
  }> = [];

  // 确定渲染模式（'vapor' 是 'signal' 的别名）
  const rendererMode = options?.rendererMode ?? 'vnode';
  const effectiveMode = rendererMode === 'vapor' ? 'signal' : rendererMode;

  // Signal 模式下的渲染器引用
  let signalRenderer: SignalRenderer | null = null;

  const app: App = {
    config: createContextConfig(context),

    use(plugin: Plugin | ((app: App, ...options: unknown[]) => void), ...options: unknown[]) {
      // 处理 null/undefined 的情况
      if (plugin == null) {
        return app;
      }
      if (installedPlugins.has(plugin)) return app;
      try {
        // 对 EnhancedPlugin 进行验证和注册
        if (
          typeof plugin !== 'function' &&
          'name' in plugin &&
          typeof (plugin as EnhancedPlugin).name === 'string'
        ) {
          const enhancedPlugin = plugin as EnhancedPlugin;

          // 验证插件
          const report = pluginValidator.validate(enhancedPlugin);
          if (!report.valid) {
            const errorMessages = report.issues
              .filter((i) => i.level === 'error')
              .map((i) => `[${i.rule}] ${i.message}`)
              .join('; ');
            throw new Error(`Plugin "${enhancedPlugin.name}" validation failed: ${errorMessages}`);
          }

          // 注册到 Registry
          const regResult = pluginRegistry.register(enhancedPlugin, options);
          if (!regResult.success) {
            throw new Error(regResult.error);
          }

          // 检查依赖
          const depResult = pluginRegistry.checkDependencies(enhancedPlugin);
          if (!depResult.satisfied && depResult.missing.length > 0) {
            const missingNames = depResult.missing.map((d) => d.name).join(', ');
            throw new Error(
              `Plugin "${enhancedPlugin.name}" has unsatisfied dependencies: ${missingNames}`,
            );
          }

          // 触发 beforeInstall 生命周期钩子
          if (enhancedPlugin.beforeInstall) {
            const shouldContinue = enhancedPlugin.beforeInstall(app);
            // 处理异步 beforeInstall
            if (shouldContinue instanceof Promise) {
              throw new Error(
                'Plugin beforeInstall hook cannot be async when using synchronous app.use(). Use await app.use() for async plugins.',
              );
            }
            if (shouldContinue === false) {
              pluginRegistry.unregister(enhancedPlugin.name);
              return app;
            }
          }

          // 执行安装 - 检查是否存在 install 方法
          //
          // ⚠️ 2026-10-27 修（P1）：`install` 常常是 `async`（例如 `definePlugin` 的默认实现
          //   内部会 `await` 配置校验）。此前直接丢弃返回值 ⇒ 失败变成
          //   **unhandledRejection**（Node 默认直接退出进程，浏览器只剩一条 console 记录），
          //   而且「已安装」标记在真正装完之前就置位了。
          //   `use()` 是同步 API，不能 await；这里改为「检测 thenable → 完成后才 markInstalled，
          //   失败则交给 app.config.errorHandler（没配就 error 留痕）」。
          const finishInstall = (): void => {
            pluginRegistry.markInstalled(enhancedPlugin.name);
            if (enhancedPlugin.afterInstall) {
              enhancedPlugin.afterInstall(app);
            }
          };

          let installResult: unknown;
          if (typeof plugin.install === 'function') {
            installResult = plugin.install(app, ...options);
          }

          const thenable = installResult as { then?: unknown } | undefined;
          if (thenable && typeof thenable.then === 'function') {
            void (installResult as Promise<unknown>).then(finishInstall).catch((err: unknown) => {
              const e = err instanceof Error ? err : new Error(String(err));
              const cfg = context.config as { errorHandler?: unknown } | undefined;
              if (cfg && typeof cfg.errorHandler === 'function') {
                (cfg.errorHandler as (err: Error, instance: null, info: string) => void)(
                  e,
                  null,
                  `plugin "${enhancedPlugin.name}" install`,
                );
              } else {
                error(`[lytjs] 插件 "${enhancedPlugin.name}" 安装失败: ${e.message}`);
              }
            });
          } else {
            finishInstall();
          }
        } else {
          // 基础 Plugin 或函数式插件，保持原有行为
          if (typeof plugin === 'function') {
            (plugin as (app: App, ...options: unknown[]) => void)(app, ...options);
          } else if (
            plugin &&
            typeof (plugin as unknown as Record<string, unknown>).install === 'function'
          ) {
            (
              (plugin as unknown as Record<string, unknown>).install as (
                app: App,
                ...options: unknown[]
              ) => void
            )(app, ...options);
          }
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

    /**
     * 获取插件注册表实例
     * @description 提供对 PluginRegistry 的访问，用于高级插件管理
     */
    get _pluginRegistry() {
      return pluginRegistry;
    },

    /**
     * 获取插件验证器实例
     * @description 提供对 PluginValidator 的访问，用于自定义验证
     */
    get _pluginValidator() {
      return pluginValidator;
    },

    async mount(rootContainer: string | Element, mountOptions?: AppMountOptions) {
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

      // 没有 DOM 渲染器加载器的 App 只能用于插件安装（PluginTester），挂载会明确失败，
      // 而不是拖着一个不存在的渲染路径跑到一半。
      if (effectiveMode !== 'signal' && !loadDOMRenderer) {
        throw new Error(
          `[LytJS] 该 App 未配置 DOM 渲染器（PluginTester 创建的测试 App 只用于 ` +
            `app.use()/config，不加载渲染器）。需要挂载请使用 @lytjs/core 或 ` +
            `@lytjs/core/runtime 的 createApp()。`,
        );
      }

      context._container = container;

      // ⚠️ 2026-11-04 新增：容器里已有内容、却没开 `hydrate` ⇒ 内容会被**追加**。
      //
      //   这是 SSR 页面最常见的误用：指南里写的是 `app.mount('#app')`，而它
      //   **不会**水合（水合要显式 `{ hydrate: true }`）⇒ 服务端那份 HTML 留着，
      //   客户端又渲染一份 ⇒ 页面出现两份相同内容（连 `id` 都重复）。
      //   实测：容器 `<div id="root">server</div>` + `mount('#app')` ⇒
      //   `<div id="root">server</div><div id="root">client</div>`。
      //
      //   不自动改走水合：`mount()` 到「有内容的容器」也可能是用户有意为之
      //   （比如先清空 loading 占位），静默改变语义更危险。这里只提示。
      if (mountOptions?.hydrate !== true && container.firstChild) {
        warn(
          'App.mount(): 容器里已有内容，但未启用 hydrate —— 新内容会被**追加**，' +
            '已有节点不会被复用（典型症状：页面出现两份相同内容）。' +
            '若这是 SSR 产物，请用 app.mount(el, { hydrate: true })。',
        );
      }

      try {
        // 根据渲染模式选择不同的渲染路径
        if (effectiveMode === 'signal') {
          if (mountOptions?.hydrate && __DEV__) {
            warn('[LytJS] App.mount(): `hydrate` 仅在 vnode 模式生效，signal 模式将忽略该选项。');
          }
          // ★ 2026-10-19 修复：这里必须 `await`。
          //   原先写的是 `return mountWithSignalMode(container)` —— 在 `try` 里**直接 return 一个
          //   rejected promise** 是**不会**被下面的 `catch` 捕获的（经典陷阱）⇒ signal 模式下
          //   ① `app.errorHandler` **永远不触发**（`mount` 的错误回调形同虚设）；
          //   ② 失败后 `context._container` 仍指向容器 ⇒ app 被永久留在"已挂载"状态。
          return await mountWithSignalMode(container);
        }

        // 默认 VNode 模式
        return await mountWithVNodeMode(container, mountOptions?.hydrate === true);
      } catch (err) {
        // ★ 2026-10-19 修复：**挂载失败不能把 app 留在"已挂载"状态**。
        //   此前 `context._container` 在 `try` **之前**就赋值，一旦 `mountWithSignalMode` /
        //   `mountWithVNodeMode` 抛错，`_container` 仍然指向容器 ⇒ 用户修好问题（比如补上
        //   `template`、修掉渲染异常）后**重试挂载**只会得到
        //   「App is already mounted. Call app.unmount() first」——而实际上什么都没挂上。
        //   更糟的是此时调 `unmount()` 会把 `_isUnmounted` 置真，app 永久不可用。
        context._container = null;

        if (app.errorHandler) {
          app.errorHandler(err, null, 'mount');
        } else {
          error(`[LytJS] Failed to mount app: ${err instanceof Error ? err.message : String(err)}`);
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
          // FIX: P2-41 错误日志不完整：添加更多上下文信息
          if (__DEV__) {
            warn(
              `Failed to remove global event listener "${listener.event}" ` +
                `from target ${listener.target.constructor.name}: ${err instanceof Error ? err.message : String(err)}`,
            );
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
            // FIX: P2-41 错误日志不完整：添加更多上下文信息
            const pluginName =
              pluginWithCleanup.name ?? (typeof plugin === 'function' ? plugin.name : 'unknown');
            error(
              `Plugin cleanup failed for "${pluginName}": ${err instanceof Error ? err.message : String(err)}. ` +
                `This may cause memory leaks.`,
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

        // ⚠️ 不要在这里再调 `callUnmountedHook(instance)`：
        // vdom 的 `unmount()` 现在会通过注入的 `invokeBeforeUnmountHook` /
        // `invokeUnmountedHook` 回调触发钩子（顺序：beforeUnmount → 移除 DOM → unmounted）。
        // 两处都调会**重复触发**（2026-09-26 实测：beforeUnmount ×3、unmounted ×2）。
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
    on(
      target: EventTarget,
      event: string,
      handler: EventListener,
      options?: AddEventListenerOptions,
    ) {
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
    off(
      target: EventTarget,
      event: string,
      handler: EventListener,
      options?: AddEventListenerOptions,
    ) {
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

  async function mountWithVNodeMode(
    container: Element,
    hydrate: boolean = false,
  ): Promise<ComponentPublicInstance> {
    // 先把 DOM 渲染器模块取进来，**再**跑 setup：
    // 渲染器是惰性子路径（`@lytjs/renderer/app`），首次挂载要等模块加载；
    // 若在 setup 之后才 await，`async setup` 的定时器会在模块加载期间兑现，
    // 首帧就会跳过「兑现前」的状态（实测 10ms setup 对 24ms 冷加载）。
    const { createDOMRenderer } = await loadDOMRenderer!();

    // 通过组件系统的标准流程创建根 vnode
    const rootVNode = createVNode(rootComponent, rootProps);

    // 使用标准化的组件系统创建组件实例
    const instance = createComponentInstance(rootVNode, null);

    // 替换 appContext：createComponentInstance 会创建新的空上下文
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

    // 将组件实例存储到 vnode 上，以便 patch 时访问
    // FIX: DTS build error - 跨包 ComponentInternalInstance 类型不兼容（component vs common-vnode），
    // 使用类型断言绕过，运行时类型是正确的
    rootVNode.component = instance as unknown as typeof rootVNode.component;

    // 使用增强的渲染器进行渲染
    if (effectiveMode !== 'vnode') {
      throw new Error('[LytJS] Invalid renderer mode');
    }
    const renderer = createDOMRenderer({
      setupChildComponent(childVNode: VNode, parentComponent: ComponentInternalInstance | null) {
        const childInstance = createComponentInstance(childVNode, parentComponent);
        // 从父组件或根组件继承 appContext
        if (parentComponent) {
          childInstance.appContext = parentComponent.appContext;
        } else {
          childInstance.appContext = context as ComponentAppContext;
        }
        setupComponent(childInstance);
        (childVNode as unknown as { component: ComponentInternalInstance }).component =
          childInstance;
      },
      normalizeProps(inst: ComponentInternalInstance, rawProps: Record<string, unknown> | null) {
        initProps(inst, rawProps);
      },
      // ⚠️ 2026-10-27 新增（P0）：更新时重建插槽。
      // 此前 initSlots 只在首次挂载调用 ⇒ 父组件重渲染后子组件仍渲染旧插槽内容。
      initSlots(inst: ComponentInternalInstance, children: unknown) {
        initSlots(inst, children);
      },
      // ── 组件生命周期钩子的实现注入 ──────────────────────────────────────
      // vdom 不能反向依赖 @lytjs/component（会循环），因此钩子的**实现**由 core 注入，
      // 与上面的 setupChildComponent / normalizeProps 同模式。
      //
      // ⚠️ 2026-09-26 修复：此前这里**完全没有**注入 mounted / updated / beforeUnmount，
      // 而 vdom 侧读的 `component.bum` 在全仓**无任何写入点** ⇒
      // `onMounted` / `onUpdated` / `onBeforeUnmount` 在生产 VNode 路径**永不执行**
      // （`callMountedHook` 的调用点此前仅存在于 component 的导出/文档/测试里）。
      // 受影响功能举例：error-boundary 的异步错误监听器永不安装、
      // async component 的定时器永不清理。
      invokeMountedHook(inst: ComponentInternalInstance) {
        callMountedHook(inst);
      },
      invokeUpdatedHook(inst: ComponentInternalInstance) {
        callUpdatedHook(inst);
      },
      invokeBeforeUnmountHook(inst: ComponentInternalInstance) {
        callBeforeUnmountHook(inst);
      },
      invokeUnmountedHook(inst: ComponentInternalInstance) {
        callUnmountedHook(inst);
      },
      // ⚠️ 2026-10-31 新增：渲染期设置 currentInstance。
      //   否则 `resolveDirective()` / `resolveComponent()` 在渲染函数里恒拿到 null
      //   ⇒ 自定义指令解析成 undefined（写了等于没写）。
      setRenderingInstance(inst: ComponentInternalInstance | null) {
        setCurrentInstance(inst);
      },
    }) as {
      mount: (vnode: VNode, container: Node) => void;
      hydrate?: (vnode: VNode, container: Node) => void;
    };
    // FIX: P2-batch2-7 跨包类型断言说明：
    // context.renderer 的类型为 Renderer | null（来自 core 包），
    // 而 DOMRenderer 类型定义在 dom 包中。此处通过 unknown 桥接是安全的，
    // 因为 renderer 实例在 createRenderer() 中已正确初始化为 DOMRenderer。
    context.renderer = renderer as unknown as CoreDOMRenderer;
    context._vnode = rootVNode;

    // 挂载 vnode
    if (hydrate && typeof renderer.hydrate === 'function') {
      // 水合：复用容器内既有的 SSR DOM（不重建），但**照常建立渲染 effect**
      // ⇒ 挂载完成后由客户端接管响应式更新
      renderer.hydrate(rootVNode, container);
    } else {
      if (hydrate && __DEV__) {
        warn(
          '[LytJS] App.mount({ hydrate: true })：当前渲染器未提供 hydrate 能力，已退化为普通挂载。',
        );
      }
      renderer.mount(rootVNode, container);
    }

    // 创建并返回公共实例
    const publicInstance = createComponentPublicInstance(instance);

    _isMounted = true;

    return publicInstance as ComponentPublicInstance;
  }

  // ==================== Signal 模式挂载 ====================

  async function mountWithSignalMode(container: Element): Promise<ComponentPublicInstance> {
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

    // ⚠️ 2026-11-13：runtime 入口不再静默借用 renderer 的编译器。
    //   没有工厂 ⇒ 直接给出可操作的错误，而不是挂载到一半才失败。
    if (!signalRendererFactory) {
      throw new Error(
        `[LytJS] rendererMode: 'signal' 需要运行时模板编译器，但当前 createApp 来自 ` +
          `'@lytjs/core/runtime'（不含编译器）。请改用以下任一方式：\n` +
          `  ① import { createApp } from '@lytjs/core'（主入口自带编译器）；\n` +
          `  ② 用 @lytjs/compiler 预编译模板；\n` +
          `  ③ 显式引入 '@lytjs/renderer/signal' 的 createSignalRenderer 自行驱动渲染。`,
      );
    }

    // 构建上下文对象：合并 data、setup 返回值和 props
    //
    // ⚠️ 2026-10-27 修（P1-6）：此前是**普通对象** `{ ...rootProps }`，`data()` 的返回值
    //   只是被 `Object.assign` 拷进去 —— 模板里读到的是一次性快照，
    //   后续修改 `ctx.count` **不会**触发 signal 重渲染（实测「模板永不更新」）。
    //   现在 ctx 本身是 `reactive`：`Object.assign(ctx, dataResult)` 写的是代理的属性，
    //   编译产物里的读取会被 effect 追踪。
    const ctx: Record<string, unknown> = reactive({ ...rootProps }) as Record<string, unknown>;

    // 执行 data 函数
    if (typeof componentOptions.data === 'function') {
      try {
        const dataResult = (componentOptions.data as () => Record<string, unknown>)();
        Object.assign(ctx, dataResult);
      } catch (e) {
        // FIX: P2-42 静默失败：确保错误被正确抛出而不是静默吞掉
        // FIX: P2-41 错误日志不完整：添加更多上下文信息
        const enhancedError = new Error(
          `[LytJS] Failed to execute data() in Signal mode: ${e instanceof Error ? e.message : String(e)}. ` +
            `Component: ${(rootComponent as Record<string, unknown>).name ?? 'anonymous'}`,
        );
        (enhancedError as Error & { cause: unknown }).cause = e;
        error(enhancedError.message);
        throw enhancedError;
      }
    }

    // 执行 setup 函数
    //
    // ⚠️ 2026-10-27 修（P1-5）：此前直接调 `setup()`，**没有设置 currentInstance**。
    //   而 `onMounted` / `onUnmounted` / `onBeforeMount` 全靠 `currentInstance` 才能
    //   把回调登记进实例 ⇒ signal 模式下这些钩子**永不触发**（只有一条 DEV warn）。
    //   现在建一个真实组件实例承载钩子，与 vnode 模式同一套语义。
    const lifecycleInstance = createComponentInstance(
      createVNode(rootComponent as never, rootProps) as unknown as VNode,
      null,
    );
    // 让 `app.config.errorHandler` 在钩子里抛错时也能生效
    lifecycleInstance.appContext = context as unknown as ComponentAppContext;

    if (typeof componentOptions.setup === 'function') {
      setCurrentInstance(lifecycleInstance);
      try {
        const setupResult = (
          componentOptions.setup as (
            props: Record<string, unknown>,
            ctx: Record<string, unknown>,
          ) => unknown
        )(rootProps ?? {}, {});
        if (setupResult && typeof setupResult === 'object') {
          Object.assign(ctx, setupResult);
        }
      } catch (e) {
        // FIX: P2-42 静默失败：确保错误被正确抛出而不是静默吞掉
        // FIX: P2-41 错误日志不完整：添加更多上下文信息
        const enhancedError = new Error(
          `[LytJS] Failed to execute setup() in Signal mode: ${e instanceof Error ? e.message : String(e)}. ` +
            `Component: ${(rootComponent as Record<string, unknown>).name ?? 'anonymous'}`,
        );
        (enhancedError as Error & { cause: unknown }).cause = e;
        error(enhancedError.message);
        throw enhancedError;
      } finally {
        // 必须复位：否则后续任意代码里的 onMounted 都会错误地挂到这个实例上
        setCurrentInstance(null);
      }
    }

    // 调用 beforeMount 生命周期钩子（`onBeforeMount` 注册的 + 选项式 beforeMount）
    callLifecycleHook(lifecycleInstance, 'beforeMount');
    const beforeMount = componentOptions.beforeMount as (() => void) | undefined;
    if (typeof beforeMount === 'function') {
      beforeMount.call(ctx);
    }

    // 创建 Signal 渲染器（工厂已在入口处判空）
    signalRenderer = await signalRendererFactory(template, ctx);
    signalRenderer.render(container);

    _isMounted = true;

    // 调用 mounted 生命周期钩子（`onMounted` 注册的 + 选项式 mounted）
    callLifecycleHook(lifecycleInstance, 'mounted');
    lifecycleInstance.isMounted = true;
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
