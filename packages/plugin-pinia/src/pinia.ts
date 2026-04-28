/**
 * @lytjs/plugin-pinia — Pinia 类实现
 *
 * Pinia 实例管理器，负责：
 * - 安装为 Vue 插件 (install)
 * - 管理已注册的 Store (_s)
 * - 管理插件列表 (_p)
 * - 提供全局 Pinia 实例
 */

import type { PiniaStore } from './store';

// ============================================================
// 类型定义
// ============================================================

/** Pinia 插件接口 */
export interface PiniaPlugin {
  install: (pinia: Pinia) => void;
}

/** Pinia 实例接口 */
export interface Pinia {
  /** 已注册的 Store Map */
  _s: Map<string, PiniaStore>;
  /** 插件列表 */
  _p: PiniaPlugin[];
  /** 安装状态 */
  _a?: any;
  /** 作为插件安装 */
  install(app: any): void;
  /** 获取 Store */
  use(storeId: string): PiniaStore | undefined;
  /** 安装插件 */
  usePlugin(plugin: PiniaPlugin): void;
}

// ============================================================
// 当前活跃的 Pinia 实例
// ============================================================

let activePinia: Pinia | undefined;

/**
 * 设置当前活跃的 Pinia 实例
 *
 * @param pinia - Pinia 实例
 */
export function setActivePinia(pinia: Pinia): void {
  activePinia = pinia;
}

/**
 * 获取当前活跃的 Pinia 实例
 *
 * @returns 当前 Pinia 实例
 */
export function getActivePinia(): Pinia {
  if (!activePinia) {
    console.warn(
      '[plugin-pinia] getActivePinia(): 没有活跃的 Pinia 实例。' +
      '请确保在使用 store 之前调用了 app.use(pinia)。'
    );
  }
  return activePinia!;
}

// ============================================================
// Pinia 创建
// ============================================================

/**
 * 创建 Pinia 实例
 *
 * 兼容 Pinia 的 createPinia API。
 *
 * @returns Pinia 实例
 *
 * @example
 * ```ts
 * import { createPinia } from '@lytjs/plugin-pinia'
 * import { createApp } from '@lytjs/compat'
 *
 * const app = createApp(App)
 * const pinia = createPinia()
 * app.use(pinia)
 * ```
 */
export function createPinia(): Pinia {
  const stores = new Map<string, PiniaStore>();
  const plugins: PiniaPlugin[] = [];

  const pinia: Pinia = {
    /** 已注册的 Store Map */
    _s: stores,

    /** 插件列表 */
    _p: plugins,

    /**
     * 作为插件安装
     *
     * 当通过 app.use(pinia) 调用时：
     * 1. 保存 app 引用
     * 2. 设置为活跃 Pinia 实例
     * 3. 执行所有已注册的插件
     * 4. 通过 provide 注入 pinia 实例
     */
    install(app: any): void {
      pinia._a = app;

      // 设置为活跃 Pinia 实例
      setActivePinia(pinia);

      // 通过 provide 注入
      if (app.provide) {
        app.provide('pinia', pinia);
      }

      // 全局属性
      if (app.config && app.config.globalProperties) {
        app.config.globalProperties.$pinia = pinia;
      }

      // 执行所有已注册的插件
      for (const plugin of plugins) {
        plugin.install(pinia);
      }
    },

    /**
     * 获取 Store
     *
     * @param storeId - Store ID
     * @returns Store 实例
     */
    use(storeId: string): PiniaStore | undefined {
      return stores.get(storeId);
    },

    /**
     * 安装插件
     *
     * @param plugin - Pinia 插件
     */
    usePlugin(plugin: PiniaPlugin): void {
      plugins.push(plugin);

      // 如果 Pinia 已经安装到 app，立即执行插件
      if (pinia._a) {
        plugin.install(pinia);
      }
    },
  };

  return pinia;
}
