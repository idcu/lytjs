// src/vapor/vapor-app.ts
// @lytjs/renderer - Vapor 模式应用 API
// Vapor 是 Signal 模式的高级封装，提供 defineVaporComponent 和 createVaporApp

import { compile } from '@lytjs/compiler';
import { createSignalRenderer } from '../signal/signal-renderer';
import type { SignalRenderer } from '../signal/signal-renderer';
import {
  generateComponentId,
  registerComponent,
  unregisterComponent,
  generateHMRCode,
  isHMRAvailable,
} from './vapor-hmr';

// __DEV__ 已在 env.d.ts 中全局声明，无需重复声明

// ============================================================
// VaporContext 接口
// ============================================================

/** Vapor 组件的上下文对象 */
export interface VaporContext {
  attrs: Record<string, unknown>;
  slots: Record<string, () => Node>;
  emit: (event: string, ...args: unknown[]) => void;
}

// ============================================================
// VaporComponentOptions 接口
// ============================================================

/** Prop 定义选项 */
export interface PropOptions {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function';
  default?: unknown;
  required?: boolean;
  validator?: (value: unknown) => boolean;
}

/** Vapor 组件定义选项 */
export interface VaporComponentOptions {
  name?: string;
  props?: Record<string, PropOptions>;
  setup?: (props: Record<string, unknown>, context: VaporContext) => Record<string, unknown> | void;
  template: string;
}

// ============================================================
// VaporComponentDefinition 接口
// ============================================================

/** Vapor 组件定义（编译后的结果） */
export interface VaporComponentDefinition {
  name?: string;
  props?: Record<string, PropOptions>;
  setup?: (props: Record<string, unknown>, context: VaporContext) => Record<string, unknown> | void;
  template: string;
  compiledCode?: string;
}

// ============================================================
// VaporAppOptions 接口
// ============================================================

/** Vapor 应用配置选项 */
export interface VaporAppOptions {
  /** 根容器属性（传递给根组件的 props） */
  rootProps?: Record<string, unknown>;
}

// ============================================================
// VaporApp 接口
// ============================================================

/** Vapor 应用实例 */
export interface VaporApp {
  mount(container: Element | string): void;
  unmount(): void;
  provide(key: string | symbol, value: unknown): void;
  component(name: string, component: VaporComponentDefinition): VaporApp;
}

// ============================================================
// defineVaporComponent
// ============================================================

/**
 * 定义一个 Vapor 模式的组件
 *
 * 将模板编译结果缓存到闭包中，返回组件定义对象。
 *
 * @param options - 组件定义选项
 * @returns VaporComponentDefinition
 *
 * @example
 * ```ts
 * const MyComponent = defineVaporComponent({
 *   name: 'MyComponent',
 *   props: {
 *     message: { type: String, default: 'hello' }
 *   },
 *   setup(props, { emit }) {
 *     return { count: 0, onClick: () => emit('click') };
 *   },
 *   template: '<div @click="onClick">{{ message }}</div>'
 * });
 * ```
 */
export function defineVaporComponent(
  options: VaporComponentOptions,
): VaporComponentDefinition {
  const { name, props, setup, template } = options;

  // 预编译模板，将编译结果缓存到闭包中
  let compiledCode: string | undefined;
  try {
    const compileResult = compile(template, { rendererMode: 'signal' });
    compiledCode = compileResult.code;
  } catch (e) {
    // FIX: P2-v11-01 生产环境编译错误不再静默吞没，
    // 在非 DEV 环境下将错误记录到 console.error，确保问题可追踪
    if (__DEV__) {
      console.warn(
        `[LytJS] defineVaporComponent: template compilation failed for "${name || 'anonymous'}". ` +
        `Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    } else {
      console.error(
        `[LytJS] defineVaporComponent: template compilation failed for "${name || 'anonymous'}". ` +
        `Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return {
    name,
    props,
    setup,
    template,
    compiledCode,
  };
}

// ============================================================
// createVaporApp
// ============================================================

/**
 * 创建一个 Vapor 模式的应用实例
 *
 * 内部使用 createSignalRenderer 进行渲染。
 *
 * @param rootComponent - 根组件定义
 * @param options - 应用配置选项
 * @returns VaporApp 实例
 *
 * @example
 * ```ts
 * const App = defineVaporComponent({
 *   template: '<div>{{ message }}</div>',
 *   setup() {
 *     return { message: 'Hello Vapor' };
 *   }
 * });
 *
 * const app = createVaporApp(App);
 * app.mount('#app');
 * ```
 */
export function createVaporApp(
  rootComponent: VaporComponentDefinition,
  options?: VaporAppOptions,
): VaporApp {
  const provides = new Map<string | symbol, unknown>();
  const components = new Map<string, VaporComponentDefinition>();

  let signalRenderer: SignalRenderer | null = null;
  let isMounted = false;
  let isUnmounted = false;
  
  // Phase 1.2: HMR 组件 ID
  const componentId = generateComponentId();
  let containerEl: Element | null = null;

  const vaporApp: VaporApp = {
    mount(container: Element | string) {
      if (isUnmounted) {
        throw new Error(
          `[LytJS] VaporApp has been unmounted and cannot be remounted. ` +
          `Create a new app instance instead.`,
        );
      }

      if (isMounted) {
        throw new Error(
          `[LytJS] VaporApp is already mounted. Call app.unmount() first before mounting again.`,
        );
      }

      // 解析容器
      const el =
        typeof container === 'string'
          ? document.querySelector(container)
          : container;

      if (!el) {
        throw new Error(
          `[LytJS] VaporApp: cannot find element matching "${container}".`,
        );
      }
      
      containerEl = el;

      // 构建上下文对象
      const rootProps = options?.rootProps ?? {};
      const ctx: Record<string, unknown> = { ...rootProps };

      // 创建 VaporContext
      const vaporContext: VaporContext = {
        attrs: { ...rootProps },
        slots: {},
        emit(_event: string, ..._args: unknown[]) {
          // 事件发射占位符
        },
      };

      // 执行 setup 函数
      if (typeof rootComponent.setup === 'function') {
        const setupResult = rootComponent.setup(rootProps, vaporContext);
        if (setupResult && typeof setupResult === 'object') {
          Object.assign(ctx, setupResult);
        }
      }

      // FIX: P2-v11-02 createVaporApp 验证 template 存在性，
      // 避免缺少 template 时在运行时产生难以调试的错误
      if (!rootComponent.template) {
        throw new Error(
          `[LytJS] createVaporApp: rootComponent must have a 'template' property. ` +
          `Received: ${typeof rootComponent.template}`,
        );
      }

      // 创建 Signal 渲染器
      signalRenderer = createSignalRenderer(rootComponent.template, ctx);
      signalRenderer.render(el);
      
      // Phase 1.2: 注册组件实例用于 HMR
      if (__DEV__ || isHMRAvailable()) {
        registerComponent(componentId, rootComponent, el);
      }

      isMounted = true;
    },

    unmount() {
      if (signalRenderer) {
        signalRenderer.unmount();
        signalRenderer = null;
      }
      
      // Phase 1.2: 注销组件实例
      if (__DEV__ || isHMRAvailable()) {
        unregisterComponent(componentId);
      }

      isMounted = false;
      isUnmounted = true;
      containerEl = null;

      // 清理注册的资源
      provides.clear();
      components.clear();
    },

    provide(key: string | symbol, value: unknown): void {
      if (__DEV__ && isMounted) {
        console.warn(
          '[LytJS] VaporApp.provide() cannot be called after the app has been mounted. ' +
          'Register provides before calling app.mount().',
        );
      }
      provides.set(key, value);
    },

    component(name: string, component: VaporComponentDefinition): VaporApp {
      components.set(name, component);
      return vaporApp;
    },
  };

  return vaporApp;
}
