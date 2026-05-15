/**
 * @lytjs/plugin-testing - 类型定义
 */

export interface TestingPluginOptions {
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
  /** 是否启用自动清理 */
  autoCleanup?: boolean;
  /** 测试环境配置 */
  environment?: 'node' | 'jsdom' | 'browser';
}

export interface WrapperOptions {
  /** 挂载目标 */
  container?: Element | string;
  /** 组件 props */
  props?: Record<string, unknown>;
  /** 插槽内容 */
  slots?: Record<string, unknown>;
  /** 是否挂载到 DOM */
  attach?: boolean;
}

export interface ComponentWrapper<T = unknown> {
  /** 实例 */
  instance: T;
  /** 根元素 */
  element: Element;
  /** 组件卸载 */
  unmount: () => void;
  /** 重新渲染 */
  rerender: (props?: Record<string, unknown>) => void;
  /** 查找元素 */
  find: (selector: string) => Element | null;
  /** 查找所有元素 */
  findAll: (selector: string) => Element[];
  /** 触发事件 */
  trigger: (eventName: string, payload?: unknown) => void;
}

export interface MockOptions {
  /** 是否保留原实现 */
  preserveOriginal?: boolean;
  /** 模拟实现 */
  implementation?: (...args: unknown[]) => unknown;
}

export interface MockFn {
  /** 调用次数 */
  readonly callCount: number;
  /** 所有调用参数 */
  readonly calls: unknown[][];
  /** 最后一次调用参数 */
  readonly lastCall: unknown[] | undefined;
  /** 模拟返回值 */
  mockReturnValue: (value: unknown) => void;
  /** 模拟实现 */
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void;
  /** 重置 mock */
  mockReset: () => void;
  /** 清除所有调用记录 */
  mockClear: () => void;
  /** 原始函数（如果有） */
  readonly originalFn: ((...args: unknown[]) => unknown) | undefined;
}

export interface SignalTestHelpers {
  /** 检查 signal 是否更新 */
  trackUpdates: <T>(signal: { value: T }) => {
    readonly value: T;
    readonly updateCount: number;
    readonly history: T[];
  };
  /** 等待 signal 更新 */
  waitForUpdate: <T>(signal: { value: T }, timeout?: number) => Promise<void>;
}

export interface DOMTestHelpers {
  /** 等待元素出现 */
  waitForElement: (selector: string, timeout?: number) => Promise<Element>;
  /** 等待元素消失 */
  waitForElementToDisappear: (selector: string, timeout?: number) => Promise<void>;
  /** 等待文本出现 */
  waitForText: (text: string, timeout?: number) => Promise<Element>;
  /** 模拟用户输入 */
  fillForm: (data: Record<string, string | boolean>) => void;
  /** 模拟点击 */
  click: (selector: string | Element) => void;
  /** 检查元素是否存在 */
  exists: (selector: string) => boolean;
  /** 检查元素是否可见 */
  isVisible: (selector: string | Element) => boolean;
  /** 检查元素是否禁用 */
  isDisabled: (selector: string | Element) => boolean;
  /** 获取元素文本 */
  text: (selector: string | Element) => string;
  /** 获取元素属性 */
  attribute: (selector: string | Element, name: string) => string | null;
  /** 获取元素类名 */
  classes: (selector: string | Element) => string[];
  /** 检查元素是否包含类名 */
  hasClass: (selector: string | Element, className: string) => boolean;
}

export interface TestingContext {
  /** 组件包装器 */
  mount: <T = unknown>(component: unknown, options?: WrapperOptions) => ComponentWrapper<T>;
  /** 创建 mock 函数 */
  mockFn: (options?: MockOptions) => MockFn;
  /** 模拟模块 */
  mockModule: (moduleName: string, factory: () => unknown) => void;
  /** 清除所有 mock */
  clearAllMocks: () => void;
  /** 信号测试助手 */
  signal: SignalTestHelpers;
  /** DOM 测试助手 */
  dom: DOMTestHelpers;
  /** 等待指定时间 */
  wait: (ms: number) => Promise<void>;
  /** 等待条件满足 */
  waitFor: (condition: () => boolean | Promise<boolean>, timeout?: number) => Promise<void>;
  /** 下一帧 */
  nextTick: () => Promise<void>;
}