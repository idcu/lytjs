// src/app-context.ts
// @lytjs/core - AppContext 创建和配置

import type { AppConfig, DOMRenderer, VNode } from './types';
import { createAppContext as createBaseAppContext } from '@lytjs/component';
import type { AppContext as BaseAppContext, ComponentInternalInstance } from '@lytjs/component';

/**
 * Core AppContext extends the base AppContext from @lytjs/component
 * with runtime fields needed by the app lifecycle (renderer, _vnode, _container).
 */
export interface AppContext extends BaseAppContext {
  renderer: DOMRenderer | null;
  _vnode: VNode | null;
  _container: Element | null;
  _instance: ComponentInternalInstance | null;
}

/**
 * 创建应用上下文对象
 * 基于 @lytjs/component 的 createAppContext 扩展运行时字段
 */
export function createAppContext(): AppContext {
  return {
    ...createBaseAppContext(),
    config: {
      performance: false,
      globalProperties: {},
    } as AppConfig,
    renderer: null,
    _vnode: null,
    _container: null,
    _instance: null,
  };
}

/**
 * 创建代理配置对象，读写操作映射到 context.config
 *
 * @note 此 Proxy 对象不实现 ownKeys / getOwnPropertyDescriptor trap，
 * 因此 Object.keys()、for...in、JSON.stringify 等依赖枚举的操作
 * 将返回空结果。如需枚举 config 属性，请直接访问 context.config。
 */
export function createContextConfig(context: AppContext): AppConfig {
  return new Proxy({} as AppConfig, {
    get(_, key: string) {
      if (key === 'globalProperties') {
        return context.config.globalProperties;
      }
      return (context.config as Record<string, unknown>)[key];
    },
    set(_, key: string, value: unknown) {
      if (key === 'globalProperties') {
        context.config.globalProperties = value as Record<string, unknown>;
        return true;
      }
      (context.config as Record<string, unknown>)[key] = value;
      return true;
    },
  });
}
