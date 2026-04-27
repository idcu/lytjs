/**
 * api-adapter.ts - 小程序 API 适配器
 *
 * 将小程序原生 API（wx / my / tt）适配为 Lyt.js 风格的 API。
 * 提供 Promise 化封装、存储适配、网络请求适配、路由适配等。
 * 纯原生零依赖 TypeScript 实现。
 */

/* ================================================================
 *  类型定义
 * ================================================================ */

/**
 * 小程序平台全局对象接口
 */
export interface MiniAppGlobal {
  /** 网络请求 */
  request: (options: Record<string, unknown>) => unknown;
  /** 上传文件 */
  uploadFile: (options: Record<string, unknown>) => unknown;
  /** 下载文件 */
  downloadFile: (options: Record<string, unknown>) => unknown;
  /** WebSocket */
  connectSocket: (options: Record<string, unknown>) => unknown;
  /** 存储 - 同步 */
  setStorageSync: (key: string, data: unknown) => void;
  getStorageSync: (key: string) => unknown;
  removeStorageSync: (key: string) => void;
  clearStorageSync: () => void;
  getStorageInfoSync: () => { keys: string[]; currentSize: number; limitSize: number };
  /** 存储 - 异步 */
  setStorage: (options: { key: string; data: unknown; success?: Function; fail?: Function; complete?: Function }) => void;
  getStorage: (options: { key: string; success?: Function; fail?: Function; complete?: Function }) => void;
  removeStorage: (options: { key: string; success?: Function; fail?: Function; complete?: Function }) => void;
  clearStorage: (options: { success?: Function; fail?: Function; complete?: Function }) => void;
  /** 路由 */
  navigateTo: (options: { url: string; success?: Function; fail?: Function; complete?: Function }) => void;
  redirectTo: (options: { url: string; success?: Function; fail?: Function; complete?: Function }) => void;
  switchTab: (options: { url: string; success?: Function; fail?: Function; complete?: Function }) => void;
  navigateBack: (options: { delta?: number; success?: Function; fail?: Function; complete?: Function }) => void;
  reLaunch: (options: { url: string; success?: Function; fail?: Function; complete?: Function }) => void;
  /** 界面 */
  showToast: (options: Record<string, unknown>) => void;
  hideToast: () => void;
  showLoading: (options: Record<string, unknown>) => void;
  hideLoading: () => void;
  showModal: (options: Record<string, unknown>) => void;
  /** 设备信息 */
  getSystemInfoSync: () => Record<string, unknown>;
  getSystemInfo: (options: { success?: Function; fail?: Function; complete?: Function }) => void;
  /** 位置 */
  getLocation: (options: Record<string, unknown>) => void;
  /** 剪贴板 */
  setClipboardData: (options: Record<string, unknown>) => void;
  getClipboardData: (options: Record<string, unknown>) => void;
  /** 下拉刷新 */
  startPullDownRefresh: (options?: Record<string, unknown>) => void;
  stopPullDownRefresh: () => void;
  /** 动画 */
  createAnimation: (options?: Record<string, unknown>) => unknown;
  /** 选择器查询 */
  createSelectorQuery: () => unknown;
  /** 节点查询 */
  createIntersectionObserver: (options?: Record<string, unknown>) => unknown;
  /** 其他 */
  getNetworkType: (options: Record<string, unknown>) => void;
  onNetworkStatusChange: (callback: Function) => void;
  makePhoneCall: (options: Record<string, unknown>) => void;
  scanCode: (options: Record<string, unknown>) => void;
  setScreenBrightness: (options: Record<string, unknown>) => void;
  getScreenBrightness: (options: Record<string, unknown>) => void;
  vibrateLong: (options?: Record<string, unknown>) => void;
  vibrateShort: (options?: Record<string, unknown>) => void;
  /** 事件通道 */
  EventChannel?: unknown;
}

/**
 * 请求配置
 */
export interface RequestConfig {
  /** 请求 URL */
  url: string;
  /** HTTP 方法（默认 'GET'） */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求数据 */
  data?: Record<string, unknown> | string;
  /** 响应类型 */
  responseType?: 'text' | 'arraybuffer';
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 响应对象
 */
export interface Response<T = unknown> {
  /** 状态码 */
  statusCode: number;
  /** 响应头 */
  headers: Record<string, string>;
  /** 响应数据 */
  data: T;
  /** 请求耗时（毫秒） */
  duration: number;
  /** 请求 URL */
  url: string;
}

/**
 * 路由导航选项
 */
export interface NavigateOptions {
  /** 页面路径 */
  url: string;
  /** 页面参数 */
  query?: Record<string, string>;
  /** 动画类型 */
  animationType?: string;
  /** 动画时长 */
  animationDuration?: number;
}

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  /** 获取值 */
  getItem(key: string): string | null;
  /** 设置值 */
  setItem(key: string, value: string): void;
  /** 移除值 */
  removeItem(key: string): void;
  /** 清空所有值 */
  clear(): void;
  /** 获取所有键名 */
  keys(): string[];
  /** 获取存储信息 */
  getInfo(): { currentSize: number; limitSize: number };
}

/* ================================================================
 *  MiniAppApiAdapter 实现
 * ================================================================ */

/**
 * MiniAppApiAdapter - 小程序 API 适配器
 *
 * 将小程序原生 API 适配为 Lyt.js 风格的 Promise API。
 * 支持微信（wx）、支付宝（my）、字节跳动（tt）三个平台。
 *
 * 使用示例：
 * ```ts
 * const adapter = new MiniAppApiAdapter('wechat', wx);
 *
 * // 网络请求（fetch 风格）
 * const res = await adapter.fetch('/api/users', { method: 'GET' });
 *
 * // 存储（localStorage 风格）
 * adapter.storage.setItem('token', 'abc123');
 * const token = adapter.storage.getItem('token');
 *
 * // 路由
 * adapter.router.push('/pages/detail/index?id=1');
 * adapter.router.back();
 * ```
 */
export class MiniAppApiAdapter {
  /** 当前平台 */
  private _platform: 'wechat' | 'alipay' | 'bytedance';

  /** 小程序全局对象引用 */
  private _wx: MiniAppGlobal;

  /** 存储适配器实例 */
  private _storageAdapter: StorageAdapter;

  /** 路由适配器实例 */
  private _routerAdapter: MiniAppRouterAdapter;

  /**
   * 创建 API 适配器
   *
   * @param platform 小程序平台
   * @param wx 小程序全局对象（wx / my / tt）
   */
  constructor(
    platform: 'wechat' | 'alipay' | 'bytedance',
    wx: MiniAppGlobal
  ) {
    this._platform = platform;
    this._wx = wx;
    this._storageAdapter = new MiniAppStorageAdapter(wx);
    this._routerAdapter = new MiniAppRouterAdapter(wx);
  }

  /* --------------------------------------------------
   *  网络请求
   * -------------------------------------------------- */

  /**
   * 发起网络请求（fetch 风格）
   *
   * 将小程序 wx.request 包装为 Promise 风格的 fetch API。
   *
   * @param url 请求 URL
   * @param config 请求配置
   * @returns 响应对象
   *
   * @example
   * const res = await adapter.fetch('/api/users', { method: 'GET' });
   * console.log(res.data);
   *
   * const res2 = await adapter.fetch('/api/users', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   data: { name: 'Alice' },
   * });
   */
  async fetch<T = unknown>(url: string, config?: RequestConfig): Promise<Response<T>> {
    return new Promise((resolve, reject) => {
      const requestConfig: Record<string, unknown> = {
        url,
        method: config?.method || 'GET',
        dataType: config?.responseType || 'json',
        responseType: config?.responseType === 'arraybuffer' ? 'arraybuffer' : 'text',
      };

      if (config?.headers) {
        requestConfig.header = config.headers;
      }
      if (config?.data !== undefined) {
        requestConfig.data = config.data;
      }
      if (config?.timeout) {
        requestConfig.timeout = config.timeout;
      }

      this._wx.request({
        ...requestConfig,
        success: (res: Record<string, unknown>) => {
          resolve({
            statusCode: res.statusCode as number,
            headers: (res.header || {}) as Record<string, string>,
            data: res.data as T,
            duration: (res.duration || 0) as number,
            url,
          });
        },
        fail: (err: Record<string, unknown>) => {
          reject(new Error(`[MiniApp API] Request failed: ${err.errMsg || JSON.stringify(err)}`));
        },
      } as Record<string, unknown>);
    });
  }

  /**
   * 发起 GET 请求
   *
   * @param url 请求 URL
   * @param headers 请求头（可选）
   * @returns 响应数据
   */
  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
    const res = await this.fetch<T>(url, { url, method: 'GET', headers });
    return res.data;
  }

  /**
   * 发起 POST 请求
   *
   * @param url 请求 URL
   * @param data 请求数据
   * @param headers 请求头（可选）
   * @returns 响应数据
   */
  async post<T = unknown>(url: string, data?: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
    const res = await this.fetch<T>(url, { url, method: 'POST', data, headers });
    return res.data;
  }

  /**
   * 发起 PUT 请求
   */
  async put<T = unknown>(url: string, data?: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
    const res = await this.fetch<T>(url, { url, method: 'PUT', data, headers });
    return res.data;
  }

  /**
   * 发起 DELETE 请求
   */
  async delete<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
    const res = await this.fetch<T>(url, { url, method: 'DELETE', headers });
    return res.data;
  }

  /* --------------------------------------------------
   *  存储
   * -------------------------------------------------- */

  /**
   * 获取存储适配器
   *
   * 提供 localStorage 风格的存储 API。
   *
   * @example
   * adapter.storage.setItem('key', 'value');
   * const value = adapter.storage.getItem('key');
   * adapter.storage.removeItem('key');
   */
  get storage(): StorageAdapter {
    return this._storageAdapter;
  }

  /* --------------------------------------------------
   *  路由
   * -------------------------------------------------- */

  /**
   * 获取路由适配器
   *
   * 提供类似 Vue Router 的路由 API。
   *
   * @example
   * adapter.router.push('/pages/detail/index?id=1');
   * adapter.router.replace('/pages/login/index');
   * adapter.router.back();
   * adapter.router.switchTab('/pages/home/index');
   */
  get router(): MiniAppRouterAdapter {
    return this._routerAdapter;
  }

  /* --------------------------------------------------
   *  界面交互
   * -------------------------------------------------- */

  /**
   * 显示消息提示
   *
   * @param title 提示文字
   * @param options 其他选项
   */
  showToast(title: string, options?: { icon?: 'success' | 'error' | 'loading' | 'none'; duration?: number; mask?: boolean }): void {
    this._wx.showToast({
      title,
      icon: options?.icon || 'none',
      duration: options?.duration || 1500,
      mask: options?.mask || false,
    } as Record<string, unknown>);
  }

  /**
   * 隐藏消息提示
   */
  hideToast(): void {
    this._wx.hideToast();
  }

  /**
   * 显示加载提示
   *
   * @param title 提示文字
   * @param mask 是否显示透明蒙层
   */
  showLoading(title: string = '加载中...', mask: boolean = false): void {
    this._wx.showLoading({ title, mask } as Record<string, unknown>);
  }

  /**
   * 隐藏加载提示
   */
  hideLoading(): void {
    this._wx.hideLoading();
  }

  /**
   * 显示模态对话框
   *
   * @param options 对话框选项
   * @returns Promise<boolean> 用户是否点击了确定
   */
  showModal(options: {
    title?: string;
    content: string;
    showCancel?: boolean;
    cancelText?: string;
    confirmText?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      this._wx.showModal({
        title: options.title || '提示',
        content: options.content,
        showCancel: options.showCancel !== false,
        cancelText: options.cancelText || '取消',
        confirmText: options.confirmText || '确定',
        success: (res: Record<string, unknown>) => {
          resolve(res.confirm === true);
        },
        fail: () => {
          resolve(false);
        },
      } as Record<string, unknown>);
    });
  }

  /* --------------------------------------------------
   *  设备信息
   * -------------------------------------------------- */

  /**
   * 获取系统信息（同步）
   *
   * @returns 系统信息对象
   */
  getSystemInfo(): Record<string, unknown> {
    return this._wx.getSystemInfoSync();
  }

  /**
   * 获取系统信息（异步）
   *
   * @returns Promise<系统信息>
   */
  getSystemInfoAsync(): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      this._wx.getSystemInfo({
        success: (res: Record<string, unknown>) => resolve(res),
        fail: (err: Record<string, unknown>) => reject(err),
      });
    });
  }

  /* --------------------------------------------------
   *  剪贴板
   * -------------------------------------------------- */

  /**
   * 设置剪贴板内容
   *
   * @param data 要设置的内容
   */
  setClipboardData(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._wx.setClipboardData({
        data,
        success: () => resolve(),
        fail: (err: Record<string, unknown>) => reject(err),
      } as Record<string, unknown>);
    });
  }

  /**
   * 获取剪贴板内容
   *
   * @returns 剪贴板内容
   */
  getClipboardData(): Promise<string> {
    return new Promise((resolve, reject) => {
      this._wx.getClipboardData({
        success: (res: Record<string, unknown>) => resolve(res.data as string),
        fail: (err: Record<string, unknown>) => reject(err),
      } as Record<string, unknown>);
    });
  }

  /* --------------------------------------------------
   *  下拉刷新
   * -------------------------------------------------- */

  /**
   * 开始下拉刷新
   */
  startPullDownRefresh(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._wx.startPullDownRefresh({
        success: () => resolve(),
        fail: (err: Record<string, unknown>) => reject(err),
      } as Record<string, unknown>);
    });
  }

  /**
   * 停止下拉刷新
   */
  stopPullDownRefresh(): void {
    this._wx.stopPullDownRefresh();
  }

  /* --------------------------------------------------
   *  获取平台
   * -------------------------------------------------- */

  /**
   * 获取当前平台
   */
  getPlatform(): 'wechat' | 'alipay' | 'bytedance' {
    return this._platform;
  }

  /**
   * 获取小程序全局对象引用
   */
  getWx(): MiniAppGlobal {
    return this._wx;
  }
}

/* ================================================================
 *  MiniAppStorageAdapter - 存储适配器
 * ================================================================ */

/**
 * MiniAppStorageAdapter - 小程序存储适配器
 *
 * 将小程序的 wx.setStorage / wx.getStorage 等 API 适配为
 * Web localStorage 风格的同步 API。
 */
class MiniAppStorageAdapter implements StorageAdapter {
  private _wx: MiniAppGlobal;

  constructor(wx: MiniAppGlobal) {
    this._wx = wx;
  }

  /**
   * 获取值
   */
  getItem(key: string): string | null {
    try {
      const value = this._wx.getStorageSync(key);
      if (value === '' || value === undefined || value === null) {
        return null;
      }
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch (e) {
      return null;
    }
  }

  /**
   * 设置值
   */
  setItem(key: string, value: string): void {
    try {
      // 尝试解析 JSON，如果是 JSON 对象则存储对象
      try {
        const parsed = JSON.parse(value);
        this._wx.setStorageSync(key, parsed);
      } catch {
        // 非 JSON 字符串，直接存储
        this._wx.setStorageSync(key, value);
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[MiniApp Storage] setItem failed:', e);
      }
    }
  }

  /**
   * 移除值
   */
  removeItem(key: string): void {
    try {
      this._wx.removeStorageSync(key);
    } catch (e) {
      // 静默处理
    }
  }

  /**
   * 清空所有值
   */
  clear(): void {
    try {
      this._wx.clearStorageSync();
    } catch (e) {
      // 静默处理
    }
  }

  /**
   * 获取所有键名
   */
  keys(): string[] {
    try {
      const info = this._wx.getStorageInfoSync();
      return info.keys || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 获取存储信息
   */
  getInfo(): { currentSize: number; limitSize: number } {
    try {
      const info = this._wx.getStorageInfoSync();
      return {
        currentSize: info.currentSize || 0,
        limitSize: info.limitSize || 10240,
      };
    } catch (e) {
      return { currentSize: 0, limitSize: 10240 };
    }
  }

  /**
   * 异步获取值
   */
  async getItemAsync(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      this._wx.getStorage({
        key,
        success: (res: Record<string, unknown>) => {
          const value = res.data;
          resolve(value === undefined || value === null
            ? null
            : typeof value === 'string' ? value as string : JSON.stringify(value));
        },
        fail: () => resolve(null),
      });
    });
  }

  /**
   * 异步设置值
   */
  async setItemAsync(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let data: unknown = value;
      try {
        data = JSON.parse(value);
      } catch {
        // 非 JSON 字符串
      }
      this._wx.setStorage({
        key,
        data,
        success: () => resolve(),
        fail: (err: Record<string, unknown>) => reject(err),
      });
    });
  }

  /**
   * 异步移除值
   */
  async removeItemAsync(key: string): Promise<void> {
    return new Promise((resolve) => {
      this._wx.removeStorage({
        key,
        success: () => resolve(),
        fail: () => resolve(),
      });
    });
  }

  /**
   * 异步清空
   */
  async clearAsync(): Promise<void> {
    return new Promise((resolve) => {
      this._wx.clearStorage({
        success: () => resolve(),
        fail: () => resolve(),
      });
    });
  }
}

/* ================================================================
 *  MiniAppRouterAdapter - 路由适配器
 * ================================================================ */

/**
 * MiniAppRouterAdapter - 小程序路由适配器
 *
 * 将小程序的路由 API 适配为类似 Vue Router 的 API。
 */
class MiniAppRouterAdapter {
  private _wx: MiniAppGlobal;

  constructor(wx: MiniAppGlobal) {
    this._wx = wx;
  }

  /**
   * 保留当前页面，跳转到应用内的某个页面
   *
   * @param url 页面路径（可带参数）
   * @param options 导航选项
   */
  push(url: string, options?: NavigateOptions): void {
    const finalUrl = this._buildUrl(url, options?.query);
    this._wx.navigateTo({
      url: finalUrl,
      success: options?.animationType ? () => {} : undefined,
      fail: (err: Record<string, unknown>) => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[MiniApp Router] navigateTo failed:', err.errMsg || err);
        }
      },
    });
  }

  /**
   * 关闭当前页面，跳转到应用内的某个页面
   *
   * @param url 页面路径
   * @param options 导航选项
   */
  replace(url: string, options?: NavigateOptions): void {
    const finalUrl = this._buildUrl(url, options?.query);
    this._wx.redirectTo({
      url: finalUrl,
      fail: (err: Record<string, unknown>) => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[MiniApp Router] redirectTo failed:', err.errMsg || err);
        }
      },
    });
  }

  /**
   * 关闭所有页面，打开到应用内的某个页面
   *
   * @param url 页面路径
   */
  replaceAll(url: string): void {
    this._wx.reLaunch({
      url,
      fail: (err: Record<string, unknown>) => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[MiniApp Router] reLaunch failed:', err.errMsg || err);
        }
      },
    });
  }

  /**
   * 跳转到 tabBar 页面，并关闭其他所有非 tabBar 页面
   *
   * @param url tabBar 页面路径（不能带参数）
   */
  switchTab(url: string): void {
    this._wx.switchTab({
      url,
      fail: (err: Record<string, unknown>) => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[MiniApp Router] switchTab failed:', err.errMsg || err);
        }
      },
    });
  }

  /**
   * 关闭当前页面，返回上一页面或多级页面
   *
   * @param delta 返回的页面数（默认 1）
   */
  back(delta: number = 1): void {
    this._wx.navigateBack({
      delta,
      fail: (err: Record<string, unknown>) => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[MiniApp Router] navigateBack failed:', err.errMsg || err);
        }
      },
    });
  }

  /**
   * 构建带查询参数的 URL
   */
  private _buildUrl(url: string, query?: Record<string, string>): string {
    if (!query || Object.keys(query).length === 0) {
      return url;
    }
    const queryString = Object.entries(query)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return `${url}?${queryString}`;
  }
}

/* ================================================================
 *  全局状态管理
 * ================================================================ */

/**
 * 全局状态管理器
 *
 * 在小程序中，页面之间无法直接共享状态。
 * GlobalStateManager 提供了一个简单的全局状态管理方案，
 * 基于 wx.setStorageSync / wx.getStorageSync 实现持久化。
 */
export class GlobalStateManager {
  private _state: Record<string, unknown>;
  private _listeners: Record<string, Function[]>;
  private _wx: MiniAppGlobal | null;
  private _persistKey: string;

  /**
   * 创建全局状态管理器
   *
   * @param initialState 初始状态
   * @param wx 小程序全局对象（可选，传入后启用持久化）
   * @param persistKey 持久化存储键名（默认 '__lyt_global_state__'）
   */
  constructor(
    initialState: Record<string, unknown> = {},
    wx?: MiniAppGlobal,
    persistKey: string = '__lyt_global_state__'
  ) {
    this._wx = wx || null;
    this._persistKey = persistKey;
    this._listeners = {};

    // 尝试从存储中恢复状态
    if (this._wx) {
      try {
        const saved = this._wx.getStorageSync(persistKey);
        if (saved && typeof saved === 'object') {
          this._state = { ...initialState, ...saved };
        } else {
          this._state = { ...initialState };
        }
      } catch {
        this._state = { ...initialState };
      }
    } else {
      this._state = { ...initialState };
    }
  }

  /**
   * 获取状态值
   *
   * @param key 状态键名
   * @returns 状态值
   */
  get<T = unknown>(key: string): T {
    return this._state[key] as T;
  }

  /**
   * 设置状态值
   *
   * @param key 状态键名
   * @param value 状态值
   */
  set(key: string, value: unknown): void {
    const oldValue = this._state[key];
    this._state[key] = value;

    // 通知监听器
    this._notify(key, value, oldValue);

    // 持久化
    this._persist();
  }

  /**
   * 批量更新状态
   *
   * @param updates 要更新的键值对
   */
  setMultiple(updates: Record<string, unknown>): void {
    const oldValues: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      oldValues[key] = this._state[key];
      this._state[key] = updates[key];
    }

    // 通知监听器
    for (const key of Object.keys(updates)) {
      this._notify(key, updates[key], oldValues[key]);
    }

    // 持久化
    this._persist();
  }

  /**
   * 监听状态变化
   *
   * @param key 状态键名
   * @param listener 监听器函数 (newValue, oldValue) => void
   * @returns 取消监听的函数
   */
  on(key: string, listener: (newValue: unknown, oldValue: unknown) => void): () => void {
    if (!this._listeners[key]) {
      this._listeners[key] = [];
    }
    this._listeners[key].push(listener);

    // 返回取消监听函数
    return () => {
      const listeners = this._listeners[key];
      if (listeners) {
        const idx = listeners.indexOf(listener);
        if (idx !== -1) {
          listeners.splice(idx, 1);
        }
      }
    };
  }

  /**
   * 获取所有状态
   */
  getAll(): Record<string, unknown> {
    return { ...this._state };
  }

  /**
   * 清除所有状态
   */
  clear(): void {
    const oldState = { ...this._state };
    this._state = {};

    // 通知所有监听器
    for (const key of Object.keys(oldState)) {
      this._notify(key, undefined, oldState[key]);
    }

    // 持久化
    this._persist();
  }

  /**
   * 通知状态变化
   */
  private _notify(key: string, newValue: unknown, oldValue: unknown): void {
    const listeners = this._listeners[key];
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(newValue, oldValue);
        } catch (e) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(`[GlobalStateManager] Listener error for key "${key}":`, e);
          }
        }
      }
    }
  }

  /**
   * 持久化状态到存储
   */
  private _persist(): void {
    if (!this._wx) return;
    try {
      this._wx.setStorageSync(this._persistKey, this._state);
    } catch (e) {
      // 持久化失败不影响运行
    }
  }
}

/* ================================================================
 *  工厂函数和默认实例
 * ================================================================ */

/** 默认 API 适配器实例（延迟初始化） */
let _defaultAdapter: MiniAppApiAdapter | null = null;

/**
 * 创建 API 适配器
 *
 * @param platform 小程序平台
 * @param wx 小程序全局对象
 * @returns API 适配器实例
 */
export function createApiAdapter(
  platform: 'wechat' | 'alipay' | 'bytedance',
  wx: MiniAppGlobal
): MiniAppApiAdapter {
  return new MiniAppApiAdapter(platform, wx);
}

/**
 * 获取默认 API 适配器
 *
 * 首次调用时需要传入小程序全局对象进行初始化。
 *
 * @param wx 小程序全局对象（仅首次需要）
 * @param platform 小程序平台（默认 'wechat'）
 * @returns API 适配器实例
 */
export function getApiAdapter(
  wx?: MiniAppGlobal,
  platform: 'wechat' | 'alipay' | 'bytedance' = 'wechat'
): MiniAppApiAdapter {
  if (!_defaultAdapter && wx) {
    _defaultAdapter = new MiniAppApiAdapter(platform, wx);
  }
  if (!_defaultAdapter) {
    throw new Error('[MiniApp API Adapter] 未初始化。请先调用 createApiAdapter() 或传入 wx 对象。');
  }
  return _defaultAdapter;
}

/**
 * 创建全局状态管理器
 *
 * @param initialState 初始状态
 * @param wx 小程序全局对象（可选）
 * @param persistKey 持久化键名（可选）
 * @returns 全局状态管理器
 */
export function createGlobalState(
  initialState?: Record<string, unknown>,
  wx?: MiniAppGlobal,
  persistKey?: string
): GlobalStateManager {
  return new GlobalStateManager(initialState, wx, persistKey);
}
