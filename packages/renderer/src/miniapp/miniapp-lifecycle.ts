/**
 * miniapp-lifecycle.ts - 小程序生命周期适配器
 *
 * 将 Lyt.js 的组件生命周期钩子映射为小程序平台的生命周期方法。
 * 支持 Page 和 Component 两种模式的包装。
 * 纯原生零依赖 TypeScript 实现。
 */

import type { MiniAppPlatform } from './miniapp-renderer';

/* ================================================================
 *  类型定义
 * ================================================================ */

/**
 * 生命周期映射条目
 */
export interface LifecycleMapping {
  /** Lyt.js 生命周期钩子名 */
  lytHook: string;
  /** 目标平台的生命周期方法名 */
  platformHook: string;
  /** 映射说明 */
  description: string;
  /** 是否有直接对应 */
  hasDirectMapping: boolean;
}

/**
 * 页面生命周期钩子集合
 */
export interface PageLifecycleHooks {
  onBeforeMount?: (...args: any[]) => void;
  onMounted?: (...args: any[]) => void;
  onUpdated?: (...args: any[]) => void;
  onUnmounted?: (...args: any[]) => void;
  onLoad?: (...args: any[]) => void;
  onShow?: (...args: any[]) => void;
  onReady?: (...args: any[]) => void;
  onHide?: (...args: any[]) => void;
  onUnload?: (...args: any[]) => void;
  onPullDownRefresh?: (...args: any[]) => void;
  onReachBottom?: (...args: any[]) => void;
  onShareAppMessage?: (...args: any[]) => any;
  onError?: (...args: any[]) => void;
  [key: string]: Function | undefined;
}

/**
 * 组件生命周期钩子集合
 */
export interface ComponentLifecycleHooks {
  setup?: () => Record<string, any>;
  onBeforeMount?: (...args: any[]) => void;
  onMounted?: (...args: any[]) => void;
  onUpdated?: (...args: any[]) => void;
  onUnmounted?: (...args: any[]) => void;
  onErrorCaptured?: (err: Error, vm: any, info: string) => boolean | void;
  created?: (...args: any[]) => void;
  attached?: (...args: any[]) => void;
  ready?: (...args: any[]) => void;
  moved?: (...args: any[]) => void;
  detached?: (...args: any[]) => void;
  [key: string]: Function | undefined;
}

/* ================================================================
 *  生命周期映射表
 * ================================================================ */

/**
 * Lyt.js -> 小程序（微信/支付宝/字节跳动通用）生命周期映射
 *
 * 说明：
 * - setup() 在小程序中没有直接对应，拆分为 data 初始化 + attached()
 * - onUpdated() 在小程序中没有直接对应，可通过 observers 或 setData 回调模拟
 * - onBeforeUnmount() 在小程序中没有直接对应
 * - onErrorCaptured() 在小程序中没有直接对应
 */
const LIFECYCLE_MAP: Record<string, LifecycleMapping> = {
  // ---- Lyt.js setup 相关 ----
  'setup': {
    lytHook: 'setup',
    platformHook: 'data + attached',
    description: 'setup() 返回值作为 data，逻辑在 attached() 中执行',
    hasDirectMapping: false,
  },

  // ---- 挂载阶段 ----
  'onBeforeMount': {
    lytHook: 'onBeforeMount',
    platformHook: 'created / onLoad',
    description: '页面使用 onLoad，组件使用 created',
    hasDirectMapping: true,
  },
  'onMounted': {
    lytHook: 'onMounted',
    platformHook: 'ready',
    description: '页面和组件均使用 ready',
    hasDirectMapping: true,
  },

  // ---- 更新阶段 ----
  'onUpdated': {
    lytHook: 'onUpdated',
    platformHook: '(无直接对应)',
    description: '可通过 observers 或 setData 回调模拟',
    hasDirectMapping: false,
  },

  // ---- 卸载阶段 ----
  'onBeforeUnmount': {
    lytHook: 'onBeforeUnmount',
    platformHook: '(无直接对应)',
    description: '可在 detached 中手动处理',
    hasDirectMapping: false,
  },
  'onUnmounted': {
    lytHook: 'onUnmounted',
    platformHook: 'detached / onUnload',
    description: '组件使用 detached，页面使用 onUnload',
    hasDirectMapping: true,
  },

  // ---- 错误处理 ----
  'onErrorCaptured': {
    lytHook: 'onErrorCaptured',
    platformHook: '(无直接对应)',
    description: '小程序无直接对应，可在方法中 try-catch',
    hasDirectMapping: false,
  },

  // ---- 小程序特有 ----
  'onLoad': {
    lytHook: 'onLoad',
    platformHook: 'onLoad',
    description: '页面加载时触发（仅页面）',
    hasDirectMapping: true,
  },
  'onShow': {
    lytHook: 'onShow',
    platformHook: 'onShow',
    description: '页面显示时触发（仅页面）',
    hasDirectMapping: true,
  },
  'onReady': {
    lytHook: 'onReady',
    platformHook: 'onReady',
    description: '页面初次渲染完成（仅页面）',
    hasDirectMapping: true,
  },
  'onHide': {
    lytHook: 'onHide',
    platformHook: 'onHide',
    description: '页面隐藏时触发（仅页面）',
    hasDirectMapping: true,
  },
  'onUnload': {
    lytHook: 'onUnload',
    platformHook: 'onUnload',
    description: '页面卸载时触发（仅页面）',
    hasDirectMapping: true,
  },
  'created': {
    lytHook: 'created',
    platformHook: 'created',
    description: '组件实例创建时触发（仅组件）',
    hasDirectMapping: true,
  },
  'attached': {
    lytHook: 'attached',
    platformHook: 'attached',
    description: '组件进入页面节点树时触发（仅组件）',
    hasDirectMapping: true,
  },
  'ready': {
    lytHook: 'ready',
    platformHook: 'ready',
    description: '组件布局完成后触发（仅组件）',
    hasDirectMapping: true,
  },
  'moved': {
    lytHook: 'moved',
    platformHook: 'moved',
    description: '组件实例被移动到节点树另一个位置时触发（仅组件）',
    hasDirectMapping: true,
  },
  'detached': {
    lytHook: 'detached',
    platformHook: 'detached',
    description: '组件离开页面节点树时触发（仅组件）',
    hasDirectMapping: true,
  },
};

/**
 * Lyt.js 生命周期钩子到小程序页面生命周期的映射
 */
const PAGE_LIFECYCLE_MAPPING: Record<string, string> = {
  'onBeforeMount': 'onLoad',
  'onMounted': 'onReady',
  'onUnmounted': 'onUnload',
  'onShow': 'onShow',
  'onHide': 'onHide',
  'onReady': 'onReady',
  'onLoad': 'onLoad',
  'onUnload': 'onUnload',
};

/**
 * Lyt.js 生命周期钩子到小程序组件生命周期的映射
 */
const COMPONENT_LIFECYCLE_MAPPING: Record<string, string> = {
  'onBeforeMount': 'created',
  'onMounted': 'ready',
  'onUnmounted': 'detached',
  'onReady': 'ready',
  'created': 'created',
  'attached': 'attached',
  'moved': 'moved',
  'detached': 'detached',
};

/* ================================================================
 *  MiniAppLifecycleAdapter 实现
 * ================================================================ */

/**
 * MiniAppLifecycleAdapter - 小程序生命周期适配器
 *
 * 将 Lyt.js 的组件生命周期钩子映射为小程序平台的生命周期方法。
 * 支持 Page 和 Component 两种模式的包装。
 *
 * 使用示例：
 * ```ts
 * const adapter = new MiniAppLifecycleAdapter('wechat');
 *
 * // 映射生命周期钩子名
 * adapter.mapLifecycle('onMounted', 'wechat'); // => 'ready'
 *
 * // 创建页面生命周期
 * const pageLifecycles = adapter.createPageLifecycle({
 *   onMounted() { console.log('mounted'); },
 *   onUnmounted() { console.log('unmounted'); },
 * });
 * // => { onReady() { ... }, onUnload() { ... } }
 *
 * // 包装组件
 * const wrappedComponent = adapter.wrapComponent({
 *   setup() { return { count: 0 }; },
 *   onMounted() { console.log('ready'); },
 * }, 'wechat');
 * ```
 */
export class MiniAppLifecycleAdapter {
  /** 当前平台 */
  private _platform: MiniAppPlatform;

  /**
   * 创建生命周期适配器
   *
   * @param platform 小程序平台
   */
  constructor(platform: MiniAppPlatform) {
    this._platform = platform;
  }

  /* --------------------------------------------------
   *  生命周期映射
   * -------------------------------------------------- */

  /**
   * 生命周期映射
   *
   * 将 Lyt.js 的生命周期钩子名映射为小程序平台对应的生命周期方法名。
   *
   * @example
   * mapLifecycle('onMounted', 'wechat') // => 'ready'
   * mapLifecycle('onUnmounted', 'wechat') // => 'detached'
   * mapLifecycle('onBeforeMount', 'wechat') // => 'created'
   * mapLifecycle('setup', 'wechat') // => 'data + attached'
   * mapLifecycle('onUpdated', 'wechat') // => '(无直接对应)'
   *
   * @param lytHook Lyt.js 生命周期钩子名
   * @param platform 目标平台（可选，使用实例平台）
   * @returns 小程序平台的生命周期方法名
   */
  mapLifecycle(lytHook: string, platform?: MiniAppPlatform): string {
    const mapping = LIFECYCLE_MAP[lytHook];
    if (mapping) {
      return mapping.platformHook;
    }

    // 未知钩子：直接返回原名称
    return lytHook;
  }

  /**
   * 获取完整的生命周期映射信息
   *
   * @param lytHook Lyt.js 生命周期钩子名
   * @returns 映射信息，未知钩子返回 null
   */
  getLifecycleMapping(lytHook: string): LifecycleMapping | null {
    return LIFECYCLE_MAP[lytHook] || null;
  }

  /**
   * 获取所有支持的生命周期映射
   *
   * @returns 生命周期映射数组
   */
  getAllMappings(): LifecycleMapping[] {
    return Object.values(LIFECYCLE_MAP);
  }

  /* --------------------------------------------------
   *  页面生命周期创建
   * -------------------------------------------------- */

  /**
   * 创建页面生命周期
   *
   * 将 Lyt.js 风格的生命周期钩子转换为小程序 Page 的生命周期方法。
   *
   * @example
   * createPageLifecycle({
   *   onBeforeMount() { console.log('before mount'); },
   *   onMounted() { console.log('mounted'); },
   *   onUnmounted() { console.log('unmounted'); },
   *   onShow() { console.log('show'); },
   * })
   * // => {
   * //   onLoad(options) { console.log('before mount'); },
   * //   onReady() { console.log('mounted'); },
   * //   onUnload() { console.log('unmounted'); },
   * //   onShow() { console.log('show'); },
   * // }
   *
   * @param hooks Lyt.js 生命周期钩子映射
   * @returns 小程序页面生命周期方法映射
   */
  createPageLifecycle(hooks: Record<string, Function>): Record<string, Function> {
    const pageLifecycles: Record<string, Function> = {};

    for (const [lytHook, handler] of Object.entries(hooks)) {
      if (typeof handler !== 'function') continue;

      const platformHook = PAGE_LIFECYCLE_MAPPING[lytHook];

      if (platformHook) {
        // 已知映射
        if (pageLifecycles[platformHook]) {
          // 如果目标钩子已存在，包装为链式调用
          const existingHandler = pageLifecycles[platformHook];
          pageLifecycles[platformHook] = function (...args: any[]) {
            existingHandler.apply(this, args);
            handler.apply(this, args);
          };
        } else {
          pageLifecycles[platformHook] = handler;
        }
      } else {
        // 未知钩子：直接保留
        pageLifecycles[lytHook] = handler;
      }
    }

    return pageLifecycles;
  }

  /* --------------------------------------------------
   *  组件生命周期创建
   * -------------------------------------------------- */

  /**
   * 创建组件生命周期
   *
   * 将 Lyt.js 风格的生命周期钩子转换为小程序 Component 的生命周期方法。
   * 组件生命周期放在 lifetimes 对象中。
   *
   * @example
   * createComponentLifecycle({
   *   setup() { return { count: 0 }; },
   *   onMounted() { console.log('mounted'); },
   *   onUnmounted() { console.log('unmounted'); },
   * })
   * // => {
   * //   lifetimes: {
   * //     created() { ... },
   * //     attached() { ... },
   * //     ready() { console.log('mounted'); },
   * //     detached() { console.log('unmounted'); },
   * //   },
   * //   data: { count: 0 },
   * // }
   *
   * @param hooks Lyt.js 生命周期钩子映射
   * @returns 小程序组件生命周期方法映射（包含 lifetimes 和可能的 data）
   */
  createComponentLifecycle(hooks: Record<string, Function>): Record<string, any> {
    const result: Record<string, any> = {};
    const lifetimes: Record<string, Function> = {};
    let setupData: Record<string, any> | null = null;

    for (const [lytHook, handler] of Object.entries(hooks)) {
      if (typeof handler !== 'function') continue;

      // 处理 setup 钩子
      if (lytHook === 'setup') {
        const setupResult = handler.call({});
        if (setupResult && typeof setupResult === 'object') {
          setupData = setupResult;
        }
        continue;
      }

      const platformHook = COMPONENT_LIFECYCLE_MAPPING[lytHook];

      if (platformHook) {
        if (lifetimes[platformHook]) {
          // 链式调用
          const existingHandler = lifetimes[platformHook];
          lifetimes[platformHook] = function (...args: any[]) {
            existingHandler.apply(this, args);
            handler.apply(this, args);
          };
        } else {
          lifetimes[platformHook] = handler;
        }
      } else {
        // 未知钩子：放入 methods
        if (!result.methods) {
          result.methods = {};
        }
        result.methods[lytHook] = handler;
      }
    }

    // 设置 lifetimes
    if (Object.keys(lifetimes).length > 0) {
      result.lifetimes = lifetimes;
    }

    // 设置 setup 返回的 data
    if (setupData) {
      result.data = setupData;
    }

    return result;
  }

  /* --------------------------------------------------
   *  组件包装
   * -------------------------------------------------- */

  /**
   * 包装组件为小程序格式
   *
   * 将 Lyt.js 组件对象包装为小程序 Component() 所需的格式。
   * 自动处理生命周期映射、data 提取、方法合并等。
   *
   * @example
   * wrapComponent({
   *   setup() {
   *     return { count: 0, message: 'Hello' };
   *   },
   *   data: { extra: 'data' },
   *   methods: {
   *     increment() { this.setData({ count: this.data.count + 1 }); },
   *   },
   *   onMounted() {
   *     console.log('Component ready');
   *   },
   *   onUnmounted() {
   *     console.log('Component detached');
   *   },
   * }, 'wechat')
   * // => {
   * //   data: { count: 0, message: 'Hello', extra: 'data' },
   * //   methods: { increment() { ... } },
   * //   lifetimes: {
   * //     ready() { console.log('Component ready'); },
   * //     detached() { console.log('Component detached'); },
   * //   },
   * // }
   *
   * @param component Lyt.js 组件对象
   * @param platform 目标平台（可选，使用实例平台）
   * @returns 小程序 Component 格式的组件定义
   */
  wrapComponent(component: any, platform?: MiniAppPlatform): any {
    const targetPlatform = platform || this._platform;
    const result: Record<string, any> = {};

    // 1. 处理 setup 钩子
    if (component.setup && typeof component.setup === 'function') {
      const setupResult = component.setup.call({});
      if (setupResult && typeof setupResult === 'object') {
        result.data = {
          ...(setupResult || {}),
          ...(component.data || {}),
        };
      } else {
        result.data = component.data || {};
      }
    } else {
      result.data = component.data || {};
    }

    // 2. 处理 props -> properties
    if (component.props) {
      if (Array.isArray(component.props)) {
        const properties: Record<string, any> = {};
        for (const propName of component.props) {
          properties[propName] = { type: null };
        }
        result.properties = properties;
      } else if (typeof component.props === 'object') {
        const properties: Record<string, any> = {};
        for (const [propName, propDef] of Object.entries(component.props)) {
          if (typeof propDef === 'function') {
            properties[propName] = { type: propDef.name };
          } else if (typeof propDef === 'object' && propDef !== null) {
            const entry: Record<string, any> = {};
            if ((propDef as any).type) entry.type = (propDef as any).type;
            if ((propDef as any).default !== undefined) entry.value = (propDef as any).default;
            if ((propDef as any).value !== undefined) entry.value = (propDef as any).value;
            properties[propName] = entry;
          } else {
            properties[propName] = { type: null, value: propDef };
          }
        }
        result.properties = properties;
      }
    }

    // 3. 处理生命周期钩子
    const lifetimes: Record<string, Function> = {};

    // 收集所有生命周期相关的钩子
    const lifecycleKeys = [
      'onBeforeMount', 'onMounted', 'onUpdated', 'onUnmounted',
      'onBeforeUnmount', 'onErrorCaptured',
      'created', 'attached', 'ready', 'moved', 'detached',
    ];

    for (const key of lifecycleKeys) {
      if (component[key] && typeof component[key] === 'function') {
        const platformHook = COMPONENT_LIFECYCLE_MAPPING[key];
        if (platformHook) {
          lifetimes[platformHook] = component[key];
        }
      }
    }

    if (Object.keys(lifetimes).length > 0) {
      result.lifetimes = lifetimes;
    }

    // 4. 处理 methods
    if (component.methods && typeof component.methods === 'object') {
      result.methods = { ...component.methods };
    } else {
      result.methods = {};
    }

    // 5. 处理 computed（小程序无直接对应，转为 observers + data）
    if (component.computed && typeof component.computed === 'object') {
      const observers: Record<string, string> = {};
      for (const [key, getter] of Object.entries(component.computed)) {
        if (typeof getter === 'function') {
          // 将 computed 转为初始化 data + observer
          try {
            const value = getter.call(result.data);
            result.data[key] = value;
          } catch {
            // 忽略初始化错误
          }
        }
      }
    }

    // 6. 处理 watch（转为 observers）
    if (component.watch && typeof component.watch === 'object') {
      if (!result.observers) {
        result.observers = {};
      }
      for (const [watchKey, watchHandler] of Object.entries(component.watch)) {
        if (typeof watchHandler === 'function') {
          result.observers[watchKey] = watchHandler;
        } else if (Array.isArray(watchHandler)) {
          // 多个 watcher
          const handlers = watchHandler.filter(h => typeof h === 'function');
          if (handlers.length > 0) {
            result.observers[watchKey] = function (...args: any[]) {
              for (const h of handlers) {
                h.apply(this, args);
              }
            };
          }
        }
      }
    }

    // 7. 处理 observers（直接透传）
    if (component.observers && typeof component.observers === 'object') {
      if (!result.observers) {
        result.observers = {};
      }
      Object.assign(result.observers, component.observers);
    }

    // 8. 处理页面级别的生命周期（如果包装为页面）
    if (component.onLoad || component.onShow || component.onHide ||
        component.onPullDownRefresh || component.onReachBottom ||
        component.onShareAppMessage) {
      if (component.onLoad) result.onLoad = component.onLoad;
      if (component.onShow) result.onShow = component.onShow;
      if (component.onHide) result.onHide = component.onHide;
      if (component.onPullDownRefresh) result.onPullDownRefresh = component.onPullDownRefresh;
      if (component.onReachBottom) result.onReachBottom = component.onReachBottom;
      if (component.onShareAppMessage) result.onShareAppMessage = component.onShareAppMessage;
    }

    return result;
  }

  /* --------------------------------------------------
   *  平台特定处理
   * -------------------------------------------------- */

  /**
   * 获取当前平台
   */
  getPlatform(): MiniAppPlatform {
    return this._platform;
  }

  /**
   * 设置平台
   */
  setPlatform(platform: MiniAppPlatform): void {
    this._platform = platform;
  }

  /**
   * 获取平台特定的生命周期名称差异
   *
   * 返回当前平台与标准微信小程序生命周期的差异说明。
   */
  getPlatformLifecycleDifferences(platform?: MiniAppPlatform): Record<string, string> {
    const targetPlatform = platform || this._platform;

    if (targetPlatform === 'alipay') {
      return {
        'created': 'created（支付宝组件支持）',
        'attached': 'attached（支付宝组件支持）',
        'ready': 'didMount（支付宝组件使用 didMount 替代 ready）',
        'detached': 'didUnmount（支付宝组件使用 didUnmount 替代 detached）',
        'onLoad': 'onLoad（支付宝页面支持）',
        'onReady': 'onReady（支付宝页面支持）',
        'onUnload': 'onUnload（支付宝页面支持）',
      };
    }

    if (targetPlatform === 'bytedance') {
      return {
        'created': 'created（字节跳动组件支持）',
        'attached': 'attached（字节跳动组件支持）',
        'ready': 'ready（字节跳动组件支持）',
        'detached': 'detached（字节跳动组件支持）',
        'onLoad': 'onLoad（字节跳动页面支持）',
        'onReady': 'onReady（字节跳动页面支持）',
        'onUnload': 'onUnload（字节跳动页面支持）',
      };
    }

    // 微信小程序（标准）
    return {
      'created': 'created',
      'attached': 'attached',
      'ready': 'ready',
      'moved': 'moved',
      'detached': 'detached',
      'onLoad': 'onLoad',
      'onShow': 'onShow',
      'onReady': 'onReady',
      'onHide': 'onHide',
      'onUnload': 'onUnload',
    };
  }
}
