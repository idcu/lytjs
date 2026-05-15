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

/**
 * 模糊测试生成器配置
 */
export interface FuzzGeneratorOptions {
  /** 生成值的最大长度（针对字符串、数组等） */
  maxLength?: number;
  /** 最小值（针对数字） */
  min?: number;
  /** 最大值（针对数字） */
  max?: number;
  /** 是否允许 null/undefined */
  allowNull?: boolean;
  /** 是否允许 undefined */
  allowUndefined?: boolean;
}

/**
 * 模糊测试结果
 */
export interface FuzzTestResult {
  /** 测试用例总数 */
  totalCases: number;
  /** 通过的测试用例数 */
  passedCases: number;
  /** 失败的测试用例 */
  failedCases: Array<{
    input: unknown;
    error: Error;
  }>;
  /** 是否全部通过 */
  success: boolean;
}

/**
 * 性能基准测试配置
 */
export interface BenchmarkOptions {
  /** 迭代次数 */
  iterations?: number;
  /** 预热次数 */
  warmupIterations?: number;
  /** 是否输出详细信息 */
  verbose?: boolean;
}

/**
 * 性能基准测试结果
 */
export interface BenchmarkResult {
  /** 操作名称 */
  name: string;
  /** 总执行时间（毫秒） */
  totalTime: number;
  /** 平均执行时间（毫秒） */
  averageTime: number;
  /** 最快执行时间（毫秒） */
  minTime: number;
  /** 最慢执行时间（毫秒） */
  maxTime: number;
  /** 操作次数 */
  iterations: number;
  /** 每秒操作数 */
  opsPerSecond: number;
}

/**
 * 性能回归测试配置
 */
export interface RegressionTestOptions {
  /** 性能阈值（百分比），如果新的性能比基准慢超过这个百分比则失败 */
  threshold?: number;
  /** 基准数据 */
  baseline?: BenchmarkResult;
}

/**
 * 性能回归测试结果
 */
export interface RegressionTestResult {
  /** 是否通过回归测试 */
  passed: boolean;
  /** 基准结果 */
  baseline: BenchmarkResult;
  /** 当前结果 */
  current: BenchmarkResult;
  /** 性能差异百分比（正值表示变慢，负值表示变快） */
  regressionPercent: number;
  /** 消息 */
  message: string;
}

export interface FuzzTestHelpers {
  /** 生成随机字符串 */
  randomString: (options?: FuzzGeneratorOptions) => string;
  /** 生成随机数字 */
  randomNumber: (options?: FuzzGeneratorOptions) => number;
  /** 生成随机布尔值 */
  randomBoolean: () => boolean;
  /** 生成随机数组 */
  randomArray: <T>(generator: () => T, options?: FuzzGeneratorOptions) => T[];
  /** 生成随机对象 */
  randomObject: (options?: FuzzGeneratorOptions) => Record<string, unknown>;
  /** 生成随机日期 */
  randomDate: (options?: FuzzGeneratorOptions) => Date;
  /** 运行模糊测试 */
  fuzz: <T>(
    generator: () => T,
    testFn: (input: T) => void | Promise<void>,
    iterations?: number
  ) => Promise<FuzzTestResult>;
}

export interface PerformanceTestHelpers {
  /** 运行基准测试 */
  benchmark: (
    name: string,
    fn: () => void | Promise<void>,
    options?: BenchmarkOptions
  ) => Promise<BenchmarkResult>;
  /** 比较两次基准测试结果 */
  compare: (
    baseline: BenchmarkResult,
    current: BenchmarkResult
  ) => { percentChange: number; isFaster: boolean; isSlower: boolean };
  /** 性能回归测试 */
  regressionTest: (
    name: string,
    fn: () => void | Promise<void>,
    baseline: BenchmarkResult,
    options?: RegressionTestOptions
  ) => Promise<RegressionTestResult>;
  /** 保存基准数据 */
  saveBaseline: (result: BenchmarkResult, path?: string) => void;
  /** 加载基准数据 */
  loadBaseline: (name: string, path?: string) => BenchmarkResult | null;
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
  /** 模糊测试助手 */
  fuzz: FuzzTestHelpers;
  /** 性能测试助手 */
  performance: PerformanceTestHelpers;
}