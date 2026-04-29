// src/app-context.ts
// @lytjs/core - AppContext 创建和配置

import type { App, AppConfig, Plugin, Component } from './types';

export interface AppContext {
  config: AppConfig;
  provides: Record<string, any>;
  components: Record<string, Component>;
  directives: Record<string, any>;
  mixins: any[];
  renderer: any;
  _vnode: any;
  _container: any;
}

/**
 * 创建应用上下文对象
 */
export function createAppContext(): AppContext {
  return {
    config: {
      performance: false,
      globalProperties: {} as Record<string, any>,
    } as AppConfig,
    provides: Object.create(null),
    components: {} as Record<string, Component>,
    directives: {} as Record<string, any>,
    mixins: [] as any[],
    renderer: null as any,
    _vnode: null as any,
    _container: null as any,
  };
}

/**
 * 创建代理配置对象，读写操作映射到 context.config
 */
export function createContextConfig(context: AppContext): AppConfig {
  return new Proxy({} as AppConfig, {
    get(_, key: string) {
      if (key === 'globalProperties') {
        return context.config.globalProperties;
      }
      return context.config[key];
    },
    set(_, key: string, value: any) {
      if (key === 'globalProperties') {
        context.config.globalProperties = value;
        return true;
      }
      context.config[key] = value;
      return true;
    },
  });
}
