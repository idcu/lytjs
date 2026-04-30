// src/app-context.ts
// @lytjs/core - AppContext 创建和配置

import type { App, AppConfig, Plugin, Component, Directive, Renderer } from "./types";

export interface AppContext {
  config: AppConfig;
  provides: Record<string, unknown>;
  components: Record<string, Component>;
  directives: Record<string, Directive>;
  mixins: ComponentOptions[];
  renderer: Renderer | null;
  _vnode: VNode | null;
  _container: Element | null;
}

// 需要延迟导入避免循环依赖
type VNode = import("./types").VNode;
type ComponentOptions = import("./types").ComponentOptions;

/**
 * 创建应用上下文对象
 */
export function createAppContext(): AppContext {
  return {
    config: {
      performance: false,
      globalProperties: {},
    } as AppConfig,
    provides: Object.create(null) as Record<string, unknown>,
    components: {},
    directives: {},
    mixins: [],
    renderer: null,
    _vnode: null,
    _container: null,
  };
}

/**
 * 创建代理配置对象，读写操作映射到 context.config
 */
export function createContextConfig(context: AppContext): AppConfig {
  return new Proxy({} as AppConfig, {
    get(_, key: string) {
      if (key === "globalProperties") {
        return context.config.globalProperties;
      }
      return (context.config as Record<string, unknown>)[key];
    },
    set(_, key: string, value: unknown) {
      if (key === "globalProperties") {
        context.config.globalProperties = value as Record<string, unknown>;
        return true;
      }
      (context.config as Record<string, unknown>)[key] = value;
      return true;
    },
  });
}
