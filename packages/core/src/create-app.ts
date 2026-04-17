/**
 * Lyt.js 核心入口 — 应用创建（createApp）
 *
 * 提供应用实例的创建、挂载、卸载等核心功能。
 *
 * 核心功能：
 * - createApp(rootComponent, rootProps?) 创建应用实例
 * - app.mount(container) 挂载到 DOM
 * - app.unmount() 卸载应用
 * - app.use(plugin) 安装插件
 * - app.provide(key, value) / app.inject(key) 依赖注入
 * - app.component(name, component) 全局组件注册
 * - app.directive(name, directive) 全局指令注册
 * - 支持模板字符串编译（通过 @lytjs/compiler）
 * - 支持响应式 state 自动代理（通过 @lytjs/reactivity）
 *
 * 设计说明：
 * - 组件实例创建委托给 @lytjs/component 的 defineComponent / createComponentInstance / setupComponent / mountComponent
 * - DOM 渲染委托给 @lytjs/renderer 的 createRenderer
 * - 响应式更新通过 @lytjs/reactivity 的 effect 实现
 * - h.ts 中直接定义最小 VNode 结构
 */

import { h, type VNode, type Props, type Children, Fragment } from './h';
import {
  createProvidesContext,
  installPlugin,
  uninstallPlugin,
  type Plugin,
  type AppConfig,
} from './plugin';
import { reactive, nextTick, effect, stop } from '@lytjs/reactivity';
import { compile } from '@lytjs/compiler';
import {
  defineComponent,
  createComponentInstance as componentCreateInstance,
  setupComponent,
  mountComponent as componentMountComponent,
  updateComponent,
  unmountComponent,
  type ComponentInternalInstance,
  type ComponentDefine,
} from '@lytjs/component';
import { createRenderer, type LytRenderer, type RendererInstance } from '@lytjs/renderer';

// ============================================================
// 模板编译缓存
// ============================================================

/**
 * 编译后的 render 函数缓存（模板字符串 → render 函数）
 *
 * TODO: 未来考虑添加 LRU 淘汰策略，避免内存泄漏
 */
const compileCache = new Map<string, (h: any, _ctx: any) => VNode>();

/**
 * 编译模板并缓存 render 函数
 *
 * 将模板字符串编译为可执行的 render 函数，并缓存以避免重复编译。
 * 生成的代码不使用 `with` 语句，所有上下文变量通过 `_ctx.` 前缀访问，
 * 兼容 CSP（Content Security Policy）。
 *
 * @param template 模板字符串
 * @returns 编译后的 render 函数
 */
function compileToFunction(template: string): (h: any, _ctx: any) => VNode {
  let renderFn = compileCache.get(template);
  if (renderFn) {
    return renderFn;
  }

  const { code } = compile(template);
  // 使用 new Function 但不使用 with，所有上下文通过 _ctx 参数传入
  renderFn = new Function('h', '_ctx', `return ${code}`) as (h: any, _ctx: any) => VNode;
  compileCache.set(template, renderFn);
  return renderFn;
}

// ============================================================
// 类型定义
// ============================================================

/**
 * 组件定义（本地别名）
 *
 * 保留此接口以维持向后兼容性，现有代码可能从此模块导入 ComponentOptions。
 * 内部实现委托给 @lytjs/component 的 ComponentOptions。
 *
 * 注意：此接口比 @lytjs/component 的 ComponentOptions 更宽松，
 * 支持旧式的 state 对象形式和 render(ctx) 签名。
 */
export interface ComponentOptions {
  /** 组件名称 */
  name?: string;
  /** Props 定义 */
  props?: Record<string, any>;
  /** 响应式状态（对象或工厂函数） */
  state?: Record<string, any> | (() => Record<string, any>);
  /** 计算属性 */
  computed?: Record<string, () => any>;
  /** 方法 */
  methods?: Record<string, (...args: any[]) => any>;
  /** 模板字符串 */
  template?: string;
  /** 渲染函数（优先于 template） */
  render?: (ctx: any) => VNode;
  /** setup 函数（组合式 API） */
  setup?: (props: Record<string, any>, ctx: any) => Record<string, any> | void;
  /** 初始化函数 */
  init?: (this: any, props: Record<string, any>) => void;
  /** mounted 生命周期 */
  mounted?: (this: any) => void;
  /** beforeUnmount 生命周期 */
  beforeUnmount?: (this: any) => void;
  /** unmounted 生命周期 */
  unmounted?: (this: any) => void;
  /** 子组件 */
  components?: Record<string, any>;
  /** 标记为组件定义 */
  _isComponentDefine?: true;
}

/** 指令钩子 */
export interface DirectiveHooks {
  /** 指令绑定到元素时 */
  created?: (el: any, binding: DirectiveBinding) => void;
  /** 元素插入 DOM 前 */
  beforeMount?: (el: any, binding: DirectiveBinding) => void;
  /** 元素插入 DOM 后 */
  mounted?: (el: any, binding: DirectiveBinding) => void;
  /** 更新前 */
  beforeUpdate?: (el: any, binding: DirectiveBinding) => void;
  /** 更新后 */
  updated?: (el: any, binding: DirectiveBinding) => void;
  /** 卸载前 */
  beforeUnmount?: (el: any, binding: DirectiveBinding) => void;
  /** 卸载后 */
  unmounted?: (el: any, binding: DirectiveBinding) => void;
}

/** 指令绑定信息 */
export interface DirectiveBinding {
  /** 指令值 */
  value: any;
  /** 旧值 */
  oldValue: any;
  /** 传递给指令的参数 */
  arg?: string;
  /** 指令修饰符 */
  modifiers: Record<string, boolean>;
  /** 指令所在实例 */
  instance: any;
}

/** 应用实例接口 */
export interface App {
  /** 挂载应用 */
  mount(container: string | Element): App;
  /** 卸载应用 */
  unmount(): void;
  /** 安装插件（同步时返回 App，异步时返回 Promise<App>） */
  use(plugin: Plugin, ...options: any[]): App | Promise<App>;
  /** 卸载插件（同步时返回 App，异步时返回 Promise<App>） */
  unuse(plugin: Plugin): App | Promise<App>;
  /** 查询插件是否已安装 */
  isInstalled(plugin: Plugin): boolean;
  /** 提供依赖 */
  provide<T = any>(key: string | symbol, value: T): App;
  /** 注入依赖 */
  inject<T = any>(key: string | symbol, defaultValue?: T): T | undefined;
  /** 注册或获取全局组件 */
  component(name: string, component?: ComponentOptions): App | ComponentOptions | undefined;
  /** 注册或获取全局指令 */
  directive(name: string, directive?: DirectiveHooks): App | DirectiveHooks | undefined;
  /** 全局配置 */
  config: AppConfig;
  /** 全局属性 */
  globalProperties: Record<string, any>;
  /** 获取根组件实例 */
  _instance: any;
}

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 判断值是否为函数
 */
function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

/**
 * 判断值是否为普通对象
 */
function isPlainObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 将用户传入的 ComponentOptions（旧式 API）适配为 @lytjs/component 的 ComponentOptions
 *
 * 主要转换：
 * 1. state 对象形式 → state 工厂函数形式
 * 2. render(ctx) 签名 → render(h, instance) 签名
 * 3. computed 简写形式 → computed { get } 对象形式
 * 4. init(this, props) 签名 → init(this, props, state) 签名
 */
function adaptComponentOptions(raw: ComponentOptions): any {
  const adapted: any = { ...raw };

  // 适配 state：对象形式 → 工厂函数形式
  if (raw.state && typeof raw.state !== 'function') {
    const stateObj = raw.state;
    adapted.state = () => ({ ...stateObj });
  }

  // 适配 render：render(ctx) → render(h, instance)
  if (typeof raw.render === 'function') {
    const originalRender = raw.render;
    adapted.render = (h: any, instance: ComponentInternalInstance) => {
      // 将 instance.renderProxy 作为 ctx 传入，保持旧式 API 兼容
      return originalRender(instance.renderProxy);
    };
  }

  // 适配 computed：简写形式 { double() { return this.count * 2 } } → 对象形式 { double: { get() { ... } } }
  if (raw.computed) {
    const adaptedComputed: Record<string, any> = {};
    for (const key of Object.keys(raw.computed)) {
      const val = raw.computed[key];
      if (typeof val === 'function') {
        adaptedComputed[key] = { get: val };
      } else {
        adaptedComputed[key] = val;
      }
    }
    adapted.computed = adaptedComputed;
  }

  // 适配 init：init(this, props) → init(this, props, state)
  if (typeof raw.init === 'function') {
    const originalInit = raw.init;
    adapted.init = function(this: any, props: Record<string, any>, state: Record<string, any>) {
      return originalInit.call(this, props);
    };
  }

  // 适配 mounted/beforeUnmount/unmounted：这些由组件系统生命周期管理
  // @lytjs/component 使用 onMounted/onBeforeUnmount/onUnmounted 注册
  // 我们将旧式生命周期钩子保留在选项中，由组件系统自动调用

  return adapted;
}

/**
 * 创建最小化 DOM 渲染器适配器
 *
 * 提供 LytRenderer 接口所需的最小 DOM 操作实现。
 * 用于 createRenderer 工厂函数。
 */
function createMinimalDOMRenderer(): LytRenderer {
  return {
    createElement(tag: string): any {
      return document.createElement(tag);
    },
    createText(text: string): any {
      return document.createTextNode(text);
    },
    createComment(text: string): any {
      return document.createComment(text);
    },
    setAttribute(el: any, key: string, val: any): void {
      el.setAttribute(key, String(val));
    },
    removeAttribute(el: any, key: string): void {
      el.removeAttribute(key);
    },
    setStyle(el: any, style: object): void {
      if (typeof style === 'string') {
        el.style.cssText = style;
      } else if (style && typeof style === 'object') {
        for (const key in style) {
          (el.style as any)[key] = (style as any)[key];
        }
      }
    },
    setClass(el: any, cls: string | object): void {
      if (typeof cls === 'string') {
        el.className = cls;
      } else if (cls && typeof cls === 'object') {
        const classList: string[] = [];
        for (const [k, v] of Object.entries(cls)) {
          if (v) classList.push(k);
        }
        el.className = classList.join(' ');
      } else {
        el.className = '';
      }
    },
    insert(parent: any, child: any, ref?: any): void {
      if (ref != null) {
        parent.insertBefore(child, ref);
      } else {
        parent.appendChild(child);
      }
    },
    remove(child: any): void {
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
    },
    replace(parent: any, oldChild: any, newChild: any): void {
      parent.replaceChild(newChild, oldChild);
    },
    addEventListener(el: any, event: string, handler: Function, options?: any): void {
      el.addEventListener(event, handler as EventListener, options);
    },
    removeEventListener(el: any, event: string, handler: Function): void {
      el.removeEventListener(event, handler as EventListener);
    },
    nextTick(cb: Function): void {
      Promise.resolve().then(cb as () => void);
    },
    parentNode(el: any): any {
      return el.parentNode;
    },
    nextSibling(el: any): any {
      return el.nextSibling;
    },
    querySelector(selector: string): any {
      return document.querySelector(selector);
    },
  };
}

// ============================================================
// 应用创建
// ============================================================

/**
 * 创建应用实例
 *
 * @param rootComponent - 根组件（组件选项对象或函数）
 * @param rootProps - 传递给根组件的 props（可选）
 * @returns 应用实例
 *
 * @example
 * ```ts
 * import { createApp, h } from '@lytjs/core'
 *
 * const app = createApp({
 *   name: 'App',
 *   state: () => ({
 *     count: 0,
 *     message: 'Hello Lyt.js',
 *   }),
 *   render() {
 *     return h('div', { class: 'app' }, [
 *       h('h1', null, this.message),
 *       h('p', null, `Count: ${this.count}`),
 *       h('button', { onClick: () => this.count++ }, 'Increment'),
 *     ])
 *   },
 * })
 *
 * // 安装插件
 * app.use(myPlugin)
 *
 * // 提供依赖
 * app.provide('config', { theme: 'dark' })
 *
 * // 注册全局组件
 * app.component('MyButton', MyButtonComponent)
 *
 * // 挂载到 DOM
 * app.mount('#app')
 * ```
 */
export function createApp(
  rootComponent: ComponentOptions | (() => VNode),
  rootProps?: Record<string, any>
): App {
  // 已安装的插件集合（防止重复安装）
  const installedPlugins = new Set<Plugin>();

  // 全局组件注册表
  const components: Record<string, ComponentOptions> = {};

  // 全局指令注册表
  const directives: Record<string, DirectiveHooks> = {};

  // 依赖注入容器
  const provides = createProvidesContext();

  // 全局配置
  const config: AppConfig = {};

  // 全局属性
  const globalProperties: Record<string, any> = {};

  // 根组件内部实例
  let rootInstance: ComponentInternalInstance | null = null;

  // 渲染器实例
  let renderer: RendererInstance | null = null;

  // 响应式 effect runner（用于停止更新）
  let updateRunner: ReturnType<typeof effect> | null = null;

  // 挂载的容器
  let mountedContainer: Element | null = null;

  // 是否已挂载
  let isMounted = false;

  // 标准化根组件：将旧式 ComponentOptions 适配为 @lytjs/component 的格式
  const normalizedRootComponent: ComponentOptions =
    typeof rootComponent === 'function'
      ? { render: rootComponent as any }
      : rootComponent;

  // 将用户选项适配为 @lytjs/component 兼容的格式
  const adaptedOptions = adaptComponentOptions(normalizedRootComponent);

  // 使用 defineComponent 包装为标准组件定义
  const componentDefine = defineComponent(adaptedOptions);

  // ============================================================
  // 应用实例
  // ============================================================

  const app: App = {
    /** 全局配置 */
    config,

    /** 全局属性 */
    globalProperties,

    /** 根组件实例引用 */
    get _instance() {
      return rootInstance;
    },

    /**
     * 挂载应用
     *
     * 将根组件渲染为真实 DOM 并挂载到指定容器。
     * 使用 @lytjs/renderer 的 createRenderer 进行 DOM 操作，
     * 使用 @lytjs/component 的组件系统管理组件实例，
     * 使用 @lytjs/reactivity 的 effect 实现响应式更新。
     *
     * @param container - 挂载目标（CSS 选择器或 DOM 元素）
     * @returns 应用实例（支持链式调用）
     */
    mount(container: string | Element): App {
      if (isMounted) {
        console.warn('[Lyt] 应用已经挂载，不能重复挂载。');
        return app;
      }

      // 获取挂载容器
      let el: Element;
      if (typeof container === 'string') {
        el = document.querySelector(container);
        if (!el) {
          throw new Error(`[Lyt] 找不到挂载目标: "${container}"`);
        }
      } else {
        el = container;
      }

      mountedContainer = el;

      // 1. 创建渲染器
      const domRenderer = createMinimalDOMRenderer();
      renderer = createRenderer(domRenderer);

      // 2. 创建组件内部实例（使用 @lytjs/component 的 createComponentInstance）
      rootInstance = componentCreateInstance(componentDefine);

      // 3. 初始化组件（设置 props、state、setup 等）
      setupComponent(rootInstance, rootProps || {}, null);

      // 4. 如果组件有模板但没有渲染函数，编译模板并设置渲染函数
      const options = rootInstance.type as any;
      if (!options.render && options.template) {
        const renderFn = compileToFunction(options.template);
        options.render = (hFn: any, inst: ComponentInternalInstance) => {
          return renderFn(hFn, inst.renderProxy);
        };
      }

      // 5. 挂载组件（执行渲染函数生成子树）
      componentMountComponent(rootInstance, h as any);

      // 6. 将子树渲染到 DOM
      if (rootInstance.subTree) {
        renderer.mount(rootInstance.subTree, el);
      }

      // 7. 设置响应式更新机制
      //    使用 effect 包装重新渲染逻辑，当响应式状态变化时自动触发更新
      updateRunner = effect(() => {
        if (!rootInstance || !rootInstance.isMounted || !renderer) return;

        // 重新渲染组件
        updateComponent(rootInstance, h as any);

        // 将新的子树 patch 到 DOM
        if (rootInstance.subTree && mountedContainer) {
          // 获取旧的 DOM 根节点用于替换
          const oldEl = mountedContainer.firstChild;
          const newVNode = rootInstance.subTree;

          // 清空容器并重新挂载（简化版更新策略）
          mountedContainer.innerHTML = '';
          renderer.mount(newVNode, mountedContainer);
        }
      }, { lazy: true });

      // 标记为已挂载
      isMounted = true;

      return app;
    },

    /**
     * 卸载应用
     *
     * 停止响应式 effect → 卸载组件 → 清理 DOM。
     */
    unmount(): void {
      if (!isMounted) {
        console.warn('[Lyt] 应用未挂载，无法卸载。');
        return;
      }

      // 1. 停止响应式更新 effect
      if (updateRunner) {
        stop(updateRunner);
        updateRunner = null;
      }

      // 2. 卸载组件（触发 beforeUnmount/unmounted 生命周期）
      if (rootInstance) {
        unmountComponent(rootInstance);
      }

      // 3. 清空挂载容器
      if (mountedContainer) {
        mountedContainer.innerHTML = '';
      }

      // 4. 清理引用
      rootInstance = null;
      renderer = null;
      mountedContainer = null;
      isMounted = false;
    },

    /**
     * 安装插件
     *
     * 支持同步和异步插件。当插件的 install 方法返回 Promise 时，
     * app.use() 也返回 Promise。
     *
     * @param plugin - 插件（对象或函数）
     * @param options - 插件选项
     * @returns 应用实例（支持链式调用），异步插件返回 Promise<App>
     */
    use(plugin: Plugin, ...options: any[]): App | Promise<App> {
      // 防止重复安装
      if (installedPlugins.has(plugin)) {
        console.warn('[Lyt] 插件已经安装，不能重复安装。');
        return app;
      }

      installedPlugins.add(plugin);

      // 安装插件
      const result = installPlugin(
        {
          use: app.use.bind(app),
          unuse: app.unuse.bind(app),
          isInstalled: app.isInstalled.bind(app),
          provide: app.provide.bind(app),
          inject: app.inject.bind(app),
          config,
          globalProperties,
        },
        plugin,
        ...options
      );

      // 如果安装结果是 Promise，返回 Promise<App>
      if (result instanceof Promise) {
        return result.then(() => app);
      }

      return app;
    },

    /**
     * 卸载插件
     *
     * 从已安装插件集合中移除插件，并调用插件的 uninstall 方法（如果定义了）。
     *
     * @param plugin - 要卸载的插件
     * @returns 应用实例（支持链式调用），异步卸载返回 Promise<App>
     */
    unuse(plugin: Plugin): App | Promise<App> {
      if (!installedPlugins.has(plugin)) {
        console.warn('[Lyt] 插件未安装，无法卸载。');
        return app;
      }

      // 从已安装集合中移除
      installedPlugins.delete(plugin);

      // 调用卸载逻辑
      const result = uninstallPlugin(
        {
          use: app.use.bind(app),
          unuse: app.unuse.bind(app),
          isInstalled: app.isInstalled.bind(app),
          provide: app.provide.bind(app),
          inject: app.inject.bind(app),
          config,
          globalProperties,
        },
        plugin
      );

      // 如果卸载结果是 Promise，返回 Promise<App>
      if (result instanceof Promise) {
        return result.then(() => app);
      }

      return app;
    },

    /**
     * 查询插件是否已安装
     *
     * @param plugin - 插件
     * @returns 是否已安装
     */
    isInstalled(plugin: Plugin): boolean {
      return installedPlugins.has(plugin);
    },

    /**
     * 提供依赖
     *
     * 在应用级别提供值，所有后代组件都可以通过 inject 注入。
     *
     * @param key - 依赖的键
     * @param value - 依赖的值
     * @returns 应用实例（支持链式调用）
     */
    provide<T = any>(key: string | symbol, value: T): App {
      provides[key] = value;
      return app;
    },

    /**
     * 注入依赖
     *
     * 获取祖先组件通过 provide 提供的值。
     *
     * @param key - 依赖的键
     * @param defaultValue - 默认值（可选）
     * @returns 依赖的值
     */
    inject<T = any>(key: string | symbol, defaultValue?: T): T | undefined {
      const value = provides[key];
      if (value !== undefined) {
        return value;
      }
      return defaultValue;
    },

    /**
     * 注册全局组件
     *
     * @param name - 组件名称
     * @param component - 组件定义
     * @returns 应用实例（支持链式调用）
     */
    component(name: string, component?: ComponentOptions): App | ComponentOptions | undefined {
      if (!component) {
        // 获取组件
        return components[name];
      }
      // 注册组件
      components[name] = component;
      return app;
    },

    /**
     * 注册全局指令
     *
     * @param name - 指令名称
     * @param directive - 指令钩子
     * @returns 应用实例（支持链式调用）
     */
    directive(name: string, directive?: DirectiveHooks): App | DirectiveHooks | undefined {
      if (!directive) {
        // 获取指令
        return directives[name];
      }
      // 注册指令
      directives[name] = directive;
      return app;
    },
  };

  return app;
}
