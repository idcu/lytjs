/**
 * miniapp-event-bridge.ts - 小程序事件桥接层
 *
 * 提供小程序与 Lyt.js 之间的事件系统桥接，处理不同平台的事件差异。
 * 支持微信、支付宝、字节跳动三个平台的事件名标准化、
 * 事件参数解析、数据绑定和自定义事件桥接。
 * 纯原生零依赖 TypeScript 实现。
 */

import type { MiniAppPlatform } from './miniapp-renderer';

/* ================================================================
 *  类型定义
 * ================================================================ */

/**
 * 小程序原生事件对象
 */
export interface MiniAppNativeEvent {
  /** 事件类型 */
  type: string;
  /** 时间戳 */
  timeStamp: number;
  /** 事件目标 */
  target: {
    id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataset: Record<string, any>;
  };
  /** 当前目标（冒泡路径上的当前元素） */
  currentTarget: {
    id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataset: Record<string, any>;
  };
  /** 事件详情数据 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: Record<string, any>;
  /** 标记事件是否可冒泡 */
  bubbles: boolean;
  /** 标记事件是否可取消 */
  cancelable: boolean;
  /** 是否已调用过 preventDefault */
  defaultPrevented: boolean;
  /** 是否已阻止冒泡 */
  propagationStopped: boolean;
}

/**
 * 解析后的事件参数
 */
export interface ParsedEventArgs {
  /** 原生事件对象 */
  nativeEvent: MiniAppNativeEvent;
  /** 事件详情数据 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: Record<string, any>;
}

/**
 * 数据绑定器
 */
export interface DataBinder {
  /** 获取数据 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: () => any;
  /** 设置数据 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: (value: any) => void;
}

/**
 * 事件处理器映射
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BridgeHandlerMap = Record<string, (...args: any[]) => void>;

/* ================================================================
 *  事件名映射表
 * ================================================================ */

/**
 * Lyt.js / DOM 事件名到小程序事件名的映射
 */
const EVENT_NAME_MAP: Record<string, Record<MiniAppPlatform, string>> = {
  'click':      { wechat: 'tap',       alipay: 'tap',       bytedance: 'tap' },
  'dblclick':   { wechat: 'tap',       alipay: 'tap',       bytedance: 'tap' },
  'input':      { wechat: 'input',     alipay: 'input',     bytedance: 'input' },
  'change':     { wechat: 'change',    alipay: 'change',    bytedance: 'change' },
  'submit':     { wechat: 'submit',    alipay: 'submit',    bytedance: 'submit' },
  'focus':      { wechat: 'focus',     alipay: 'focus',     bytedance: 'focus' },
  'blur':       { wechat: 'blur',      alipay: 'blur',      bytedance: 'blur' },
  'touchstart': { wechat: 'touchstart', alipay: 'touchStart', bytedance: 'touchstart' },
  'touchend':   { wechat: 'touchend',  alipay: 'touchEnd',  bytedance: 'touchend' },
  'touchmove':  { wechat: 'touchmove', alipay: 'touchMove', bytedance: 'touchmove' },
  'touchcancel':{ wechat: 'touchcancel', alipay: 'touchCancel', bytedance: 'touchcancel' },
  'scroll':     { wechat: 'scroll',    alipay: 'scroll',    bytedance: 'scroll' },
  'longpress':  { wechat: 'longpress', alipay: 'longTap',   bytedance: 'longpress' },
  'keydown':    { wechat: 'confirm',   alipay: 'confirm',   bytedance: 'confirm' },
  'keyup':      { wechat: 'confirm',   alipay: 'confirm',   bytedance: 'confirm' },
  'keypress':   { wechat: 'confirm',   alipay: 'confirm',   bytedance: 'confirm' },
};

/**
 * 小程序事件绑定前缀
 */
const BIND_PREFIX_MAP: Record<MiniAppPlatform, {
  bind: string;
  catch: string;
  captureBind: string;
  captureCatch: string;
}> = {
  wechat: {
    bind: 'bind',
    catch: 'catch',
    captureBind: 'capture-bind:',
    captureCatch: 'capture-catch:',
  },
  alipay: {
    bind: 'on',
    catch: 'catchEvent',
    captureBind: 'capture-bind:',
    captureCatch: 'capture-catch:',
  },
  bytedance: {
    bind: 'bind',
    catch: 'catch',
    captureBind: 'capture-bind:',
    captureCatch: 'capture-catch:',
  },
};

/* ================================================================
 *  MiniAppEventBridge 实现
 * ================================================================ */

/**
 * MiniAppEventBridge - 小程序事件桥接层
 *
 * 负责在不同平台的小程序与 Lyt.js 之间桥接事件系统。
 * 处理事件名标准化、参数解析、数据绑定和自定义事件。
 *
 * 使用示例：
 * ```ts
 * const bridge = new MiniAppEventBridge('wechat');
 *
 * // 标准化事件名
 * bridge.normalizeEvent('click'); // => 'tap'
 *
 * // 创建桥接处理器
 * const handlers = bridge.createBridgeHandler('my-component');
 * // handlers.bindtap, handlers.onTap, ...
 *
 * // 创建数据绑定器
 * const binder = bridge.createDataBinder('formData.name');
 * binder.set('Hello'); // => this.setData({ 'formData.name': 'Hello' })
 * ```
 */
export class MiniAppEventBridge {
  /** 当前平台 */
  private _platform: MiniAppPlatform;

  /** 组件实例引用（用于 setData 等操作） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _componentInstance: any;

  /** 自定义事件监听器映射 */
  private _customEventListeners: Record<string, Function[]> = {};

  /** 事件冒泡状态 */
  private _bubblingEnabled: boolean;

  /** 事件捕获状态 */
  private _capturingEnabled: boolean;

  /**
   * 创建事件桥接实例
   *
   * @param platform 小程序平台
   * @param componentInstance 组件实例引用（可选，用于 setData）
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(platform: MiniAppPlatform, componentInstance?: any) {
    this._platform = platform;
    this._componentInstance = componentInstance;
    this._bubblingEnabled = true;
    this._capturingEnabled = true;
  }

  /* --------------------------------------------------
   *  事件名标准化
   * -------------------------------------------------- */

  /**
   * 事件名标准化
   *
   * 将 Lyt.js / DOM 事件名转换为对应平台的小程序事件名。
   *
   * @example
   * normalizeEvent('click', 'wechat') // => 'tap'
   * normalizeEvent('click', 'alipay') // => 'tap'
   * normalizeEvent('touchstart', 'alipay') // => 'touchStart'
   *
   * @param lytEvent Lyt.js 事件名
   * @param platform 目标平台（可选，使用实例平台）
   * @returns 标准化后的小程序事件名
   */
  normalizeEvent(lytEvent: string, platform?: MiniAppPlatform): string {
    const targetPlatform = platform || this._platform;
    const lowerEvent = lytEvent.toLowerCase();

    const mapping = EVENT_NAME_MAP[lowerEvent];
    if (mapping) {
      return mapping[targetPlatform];
    }

    // 未知事件名：直接返回，但根据平台调整大小写
    if (targetPlatform === 'alipay') {
      // 支付宝事件名使用 camelCase
      return lytEvent.charAt(0).toLowerCase() + lytEvent.slice(1);
    }

    return lowerEvent;
  }

  /**
   * 生成事件绑定属性名
   *
   * @param lytEvent Lyt.js 事件名
   * @param options 选项：capture（捕获阶段）、stop（阻止冒泡）
   * @returns 事件绑定属性名（如 'bindtap', 'catchtap', 'capture-bind:tap'）
   */
  getBindName(lytEvent: string, options?: { capture?: boolean; stop?: boolean }): string {
    const miniEvent = this.normalizeEvent(lytEvent);
    const prefixConfig = BIND_PREFIX_MAP[this._platform];

    if (options?.capture) {
      return `${prefixConfig.captureBind}${miniEvent}`;
    }

    if (options?.stop) {
      if (this._platform === 'alipay') {
        return `${prefixConfig.catch}${this._capitalize(miniEvent)}`;
      }
      return `${prefixConfig.catch}${miniEvent}`;
    }

    if (this._platform === 'alipay') {
      return `${prefixConfig.bind}${this._capitalize(miniEvent)}`;
    }

    return `${prefixConfig.bind}${miniEvent}`;
  }

  /* --------------------------------------------------
   *  事件参数解析
   * -------------------------------------------------- */

  /**
   * 解析事件参数
   *
   * 将小程序原生事件参数解析为统一格式。
   * 不同平台的事件对象结构略有差异，此方法统一处理。
   *
   * @param args 小程序事件回调的参数列表
   * @param platform 目标平台（可选，使用实例平台）
   * @returns 解析后的事件参数（nativeEvent + detail）
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseEventArgs(args: any[], platform?: MiniAppPlatform): ParsedEventArgs {
    const targetPlatform = platform || this._platform;
    const rawEvent = args[0] || {};

    // 构建标准化的原生事件对象
    const nativeEvent: MiniAppNativeEvent = {
      type: rawEvent.type || '',
      timeStamp: rawEvent.timeStamp || Date.now(),
      target: this._normalizeTarget(rawEvent.target || {}),
      currentTarget: this._normalizeTarget(rawEvent.currentTarget || {}),
      detail: rawEvent.detail || {},
      bubbles: rawEvent.bubbles !== false,
      cancelable: rawEvent.cancelable !== false,
      defaultPrevented: false,
      propagationStopped: false,
    };

    // 提取 detail 数据
    const detail = rawEvent.detail || {};

    // 平台特定的 detail 字段提取
    if (targetPlatform === 'wechat') {
      // 微信小程序的 detail 中常用字段
      // input 事件：detail.value
      // change 事件：detail.value
      // tap 事件：detail.x, detail.y
    } else if (targetPlatform === 'alipay') {
      // 支付宝小程序事件对象可能直接在顶层包含值
      // my.onTap 的 detail 可能为空，值在 e.value 中
      if (!detail.value && rawEvent.value !== undefined) {
        nativeEvent.detail.value = rawEvent.value;
      }
    } else if (targetPlatform === 'bytedance') {
      // 字节跳动小程序与微信类似
    }

    return { nativeEvent, detail };
  }

  /**
   * 标准化事件目标对象
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _normalizeTarget(target: any): { id: string; dataset: Record<string, any> } {
    return {
      id: target.id || '',
      dataset: target.dataset || {},
    };
  }

  /* --------------------------------------------------
   *  数据绑定
   * -------------------------------------------------- */

  /**
   * 创建数据绑定器
   *
   * 创建一个 get/set 对，用于读写组件数据路径对应的值。
   * setter 会调用小程序的 setData 方法进行响应式更新。
   *
   * @example
   * const binder = bridge.createDataBinder('user.name');
   * binder.set('Alice'); // => this.setData({ 'user.name': 'Alice' })
   * binder.get(); // => 'Alice'
   *
   * @param dataPath 数据路径（支持点号分隔的嵌套路径）
   * @returns 数据绑定器（get / set）
   */
  createDataBinder(dataPath: string): DataBinder {
    const self = this;

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get(): any {
        if (!self._componentInstance) return undefined;

        const data = self._componentInstance.data || {};
        return self._getNestedValue(data, dataPath);
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set(value: any): void {
        if (!self._componentInstance) return;

        // 使用小程序的 setData 方法
        if (typeof self._componentInstance.setData === 'function') {
          self._componentInstance.setData({
            [dataPath]: value,
          });
        } else {
          // 回退：直接修改数据
          self._setNestedValue(self._componentInstance.data || {}, dataPath, value);
        }
      },
    };
  }

  /**
   * 获取嵌套对象的值
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }

    return current;
  }

  /**
   * 设置嵌套对象的值
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] == null) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /* --------------------------------------------------
   *  桥接事件处理器
   * -------------------------------------------------- */

  /**
   * 创建桥接事件处理器
   *
   * 为指定组件创建一组桥接事件处理函数，可直接绑定到小程序模板中。
   * 每个处理函数会自动解析事件参数并调用对应的 Lyt.js 回调。
   *
   * @example
   * const handlers = bridge.createBridgeHandler('my-button');
   * // handlers.bindtap = function(e) { ... }
   * // handlers.onTap = function(e) { ... }（支付宝）
   *
   * @param componentName 组件名称
   * @returns 事件处理器映射
   */
  createBridgeHandler(componentName: string): Record<string, Function> {
    const handlers: Record<string, Function> = {};
    const self = this;

    // 为所有支持的事件创建处理函数
    for (const [lytEvent] of Object.entries(EVENT_NAME_MAP)) {
      const bindName = this.getBindName(lytEvent);
      const miniEvent = this.normalizeEvent(lytEvent);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handlers[bindName] = function (e: any, ...rest: any[]) {
        const parsed = self.parseEventArgs([e, ...rest]);

        // 触发自定义事件（冒泡）
        if (self._bubblingEnabled) {
          self._emitCustomEvent(componentName, lytEvent, parsed.detail, parsed.nativeEvent);
        }

        return parsed;
      };

      // 同时存储以事件名为键的处理器
      handlers[miniEvent] = handlers[bindName];
    }

    // 通用事件处理器
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlers['handleEvent'] = function (e: any) {
      const parsed = self.parseEventArgs([e]);
      return parsed;
    };

    return handlers;
  }

  /* --------------------------------------------------
   *  自定义事件（$emit 桥接）
   * -------------------------------------------------- */

  /**
   * 注册自定义事件监听器
   *
   * @param eventName 事件名
   * @param listener 监听器函数
   */
  on(eventName: string, listener: Function): void {
    if (!this._customEventListeners[eventName]) {
      this._customEventListeners[eventName] = [];
    }
    this._customEventListeners[eventName].push(listener);
  }

  /**
   * 移除自定义事件监听器
   *
   * @param eventName 事件名
   * @param listener 监听器函数
   */
  off(eventName: string, listener?: Function): void {
    if (!this._customEventListeners[eventName]) return;

    if (listener) {
      const idx = this._customEventListeners[eventName].indexOf(listener);
      if (idx !== -1) {
        this._customEventListeners[eventName].splice(idx, 1);
      }
    } else {
      delete this._customEventListeners[eventName];
    }
  }

  /**
   * 触发自定义事件（$emit 桥接）
   *
   * 将 Lyt.js 的 $emit 调用桥接为小程序的 triggerEvent。
   *
   * @param componentName 组件名称
   * @param eventName 事件名
   * @param detail 事件数据
   * @param nativeEvent 原生事件（可选）
   */
  private _emitCustomEvent(
    componentName: string,
    eventName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detail: Record<string, any>,
    nativeEvent?: MiniAppNativeEvent
  ): void {
    const listeners = this._customEventListeners[eventName];
    if (!listeners || listeners.length === 0) return;

    for (const listener of listeners) {
      try {
        listener(detail, nativeEvent);
      } catch (err) {
        // 静默处理监听器错误，但记录详细上下文
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(
            `[MiniAppEventBridge] Error in event listener for "${eventName}" on component "${componentName}":`,
            err instanceof Error ? err.message : err,
            err instanceof Error ? `\n  stack: ${err.stack}` : ''
          );
        }
      }
    }

    // 如果有组件实例，同时调用 triggerEvent
    if (this._componentInstance && typeof this._componentInstance.triggerEvent === 'function') {
      this._componentInstance.triggerEvent(eventName, detail, {
        bubbles: nativeEvent?.bubbles !== false,
        composed: true,
        capturePhase: false,
      });
    }
  }

  /**
   * 模拟 $emit（供 Lyt.js 组件调用）
   *
   * @param eventName 事件名
   * @param detail 事件数据
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $emit(eventName: string, detail?: Record<string, any>): void {
    this._emitCustomEvent('__self__', eventName, detail || {});
  }

  /* --------------------------------------------------
   *  事件冒泡和捕获控制
   * -------------------------------------------------- */

  /**
   * 启用事件冒泡
   */
  enableBubbling(): void {
    this._bubblingEnabled = true;
  }

  /**
   * 禁用事件冒泡
   */
  disableBubbling(): void {
    this._bubblingEnabled = false;
  }

  /**
   * 启用事件捕获
   */
  enableCapturing(): void {
    this._capturingEnabled = true;
  }

  /**
   * 禁用事件捕获
   */
  disableCapturing(): void {
    this._capturingEnabled = false;
  }

  /**
   * 判断事件冒泡是否启用
   */
  isBubblingEnabled(): boolean {
    return this._bubblingEnabled;
  }

  /**
   * 判断事件捕获是否启用
   */
  isCapturingEnabled(): boolean {
    return this._capturingEnabled;
  }

  /* --------------------------------------------------
   *  组件实例管理
   * -------------------------------------------------- */

  /**
   * 设置组件实例引用
   *
   * @param instance 小程序组件实例
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setComponentInstance(instance: any): void {
    this._componentInstance = instance;
  }

  /**
   * 获取组件实例引用
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getComponentInstance(): any {
    return this._componentInstance;
  }

  /**
   * 获取当前平台
   */
  getPlatform(): MiniAppPlatform {
    return this._platform;
  }

  /* --------------------------------------------------
   *  辅助方法
   * -------------------------------------------------- */

  /**
   * 首字母大写
   */
  private _capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
