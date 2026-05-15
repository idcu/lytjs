/**
 * @lytjs/plugin-testing
 *
 * LytJS official testing plugin with testing utilities and helpers.
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import type {
  TestingPluginOptions,
  WrapperOptions,
  ComponentWrapper,
  MockOptions,
  MockFn,
  SignalTestHelpers,
  DOMTestHelpers,
  TestingContext,
  FuzzTestHelpers,
  PerformanceTestHelpers,
  FuzzGeneratorOptions,
  FuzzTestResult,
  BenchmarkOptions,
  BenchmarkResult,
  RegressionTestOptions,
  RegressionTestResult,
} from './types';

/**
 * 创建 mock 函数
 */
function createMockFn(options: MockOptions = {}): MockFn {
  let returnValue: unknown = undefined;
  let implementation: ((...args: unknown[]) => unknown) | undefined = options.implementation;
  const calls: unknown[][] = [];

  const mockFn: MockFn & ((...args: unknown[]) => unknown) = ((...args: unknown[]) => {
    calls.push(args);
    if (implementation) {
      return implementation(...args);
    }
    return returnValue;
  }) as MockFn & ((...args: unknown[]) => unknown);

  Object.defineProperties(mockFn, {
    callCount: {
      get: () => calls.length,
    },
    calls: {
      get: () => [...calls],
    },
    lastCall: {
      get: () => calls[calls.length - 1],
    },
    originalFn: {
      get: () => (options.preserveOriginal ? undefined : undefined),
    },
  });

  mockFn.mockReturnValue = (value: unknown) => {
    returnValue = value;
  };

  mockFn.mockImplementation = (fn: (...args: unknown[]) => unknown) => {
    implementation = fn;
  };

  mockFn.mockReset = () => {
    calls.length = 0;
    returnValue = undefined;
    implementation = undefined;
  };

  mockFn.mockClear = () => {
    calls.length = 0;
  };

  return mockFn as unknown as MockFn;
}

/**
 * 创建 DOM 测试助手
 */
function createDOMTestHelpers(): DOMTestHelpers {
  const getElement = (selectorOrElement: string | Element): Element => {
    if (typeof selectorOrElement === 'string') {
      const el = document.querySelector(selectorOrElement);
      if (!el) {
        throw new Error(`Element not found: ${selectorOrElement}`);
      }
      return el;
    }
    return selectorOrElement;
  };

  return {
    waitForElement: async (selector: string, timeout = 5000): Promise<Element> => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const el = document.querySelector(selector);
        if (el) {
          return el;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      throw new Error(`Element not found within timeout: ${selector}`);
    },

    waitForElementToDisappear: async (selector: string, timeout = 5000): Promise<void> => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const el = document.querySelector(selector);
        if (!el) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      throw new Error(`Element did not disappear within timeout: ${selector}`);
    },

    waitForText: async (text: string, timeout = 5000): Promise<Element> => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const el = Array.from(document.body.querySelectorAll('*')).find(el =>
          el.textContent?.includes(text),
        );
        if (el) {
          return el;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      throw new Error(`Text not found within timeout: ${text}`);
    },

    fillForm: (data: Record<string, string | boolean>) => {
      for (const [name, value] of Object.entries(data)) {
        const el = document.querySelector(`[name="${name}"]`);
        if (el) {
          if (typeof value === 'boolean' && 'checked' in el) {
            (el as HTMLInputElement).checked = value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if ('value' in el) {
            (el as HTMLInputElement).value = String(value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    },

    click: (selectorOrElement: string | Element) => {
      const el = getElement(selectorOrElement);
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    },

    exists: (selector: string): boolean => {
      return document.querySelector(selector) !== null;
    },

    isVisible: (selectorOrElement: string | Element): boolean => {
      const el = getElement(selectorOrElement);
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    },

    isDisabled: (selectorOrElement: string | Element): boolean => {
      const el = getElement(selectorOrElement);
      return 'disabled' in el && (el as HTMLButtonElement).disabled;
    },

    text: (selectorOrElement: string | Element): string => {
      const el = getElement(selectorOrElement);
      return el.textContent || '';
    },

    attribute: (selectorOrElement: string | Element, name: string): string | null => {
      const el = getElement(selectorOrElement);
      return el.getAttribute(name);
    },

    classes: (selectorOrElement: string | Element): string[] => {
      const el = getElement(selectorOrElement);
      return Array.from(el.classList);
    },

    hasClass: (selectorOrElement: string | Element, className: string): boolean => {
      const el = getElement(selectorOrElement);
      return el.classList.contains(className);
    },
  };
}

/**
 * 创建 Signal 测试助手
 */
function createSignalTestHelpers(): SignalTestHelpers {
  return {
    trackUpdates: <T>(signal: { value: T }) => {
      const history: T[] = [signal.value];
      let updateCount = 0;

      const proxy = new Proxy(signal, {
        set(target, prop, newValue) {
          if (prop === 'value') {
            history.push(newValue);
            updateCount++;
          }
          return Reflect.set(target, prop, newValue);
        },
        get(target, prop) {
          return Reflect.get(target, prop);
        },
      });

      return {
        get value() {
          return proxy.value;
        },
        get updateCount() {
          return updateCount;
        },
        get history() {
          return [...history];
        },
      };
    },

    waitForUpdate: async <T>(signal: { value: T }, timeout = 5000): Promise<void> => {
      const initialValue = signal.value;
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (signal.value !== initialValue) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      throw new Error('Signal did not update within timeout');
    },
  };
}

/**
 * 创建模糊测试助手
 */
function createFuzzTestHelpers(): FuzzTestHelpers {
  const randomString = (options: FuzzGeneratorOptions = {}): string => {
    const maxLength = options.maxLength ?? 100;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const length = Math.floor(Math.random() * maxLength) + 1;
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const randomNumber = (options: FuzzGeneratorOptions = {}): number => {
    const min = options.min ?? -1000;
    const max = options.max ?? 1000;
    return Math.random() * (max - min) + min;
  };

  const randomBoolean = (): boolean => {
    return Math.random() < 0.5;
  };

  const randomArray = <T>(generator: () => T, options: FuzzGeneratorOptions = {}): T[] => {
    const maxLength = options.maxLength ?? 20;
    const length = Math.floor(Math.random() * maxLength) + 1;
    const result: T[] = [];
    for (let i = 0; i < length; i++) {
      result.push(generator());
    }
    return result;
  };

  const randomObject = (options: FuzzGeneratorOptions = {}): Record<string, unknown> => {
    const maxLength = options.maxLength ?? 10;
    const length = Math.floor(Math.random() * maxLength) + 1;
    const result: Record<string, unknown> = {};
    for (let i = 0; i < length; i++) {
      const key = `key_${i}`;
      const type = Math.random();
      if (type < 0.3) {
        result[key] = randomString({ maxLength: 20 });
      } else if (type < 0.6) {
        result[key] = randomNumber({ min: -100, max: 100 });
      } else if (type < 0.8) {
        result[key] = randomBoolean();
      } else {
        result[key] = null;
      }
    }
    return result;
  };

  const randomDate = (options: FuzzGeneratorOptions = {}): Date => {
    const now = Date.now();
    const offset = Math.floor(Math.random() * 10000000000) - 5000000000;
    return new Date(now + offset);
  };

  const fuzz = async <T>(
    generator: () => T,
    testFn: (input: T) => void | Promise<void>,
    iterations = 100
  ): Promise<FuzzTestResult> => {
    const failedCases: Array<{ input: unknown; error: Error }> = [];
    let passedCases = 0;

    for (let i = 0; i < iterations; i++) {
      const input = generator();
      try {
        await testFn(input);
        passedCases++;
      } catch (error) {
        failedCases.push({
          input,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return {
      totalCases: iterations,
      passedCases,
      failedCases,
      success: failedCases.length === 0,
    };
  };

  return {
    randomString,
    randomNumber,
    randomBoolean,
    randomArray,
    randomObject,
    randomDate,
    fuzz,
  };
}

/**
 * 创建性能测试助手
 */
function createPerformanceTestHelpers(): PerformanceTestHelpers {
  const benchmarks = new Map<string, BenchmarkResult>();

  const benchmark = async (
    name: string,
    fn: () => void | Promise<void>,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> => {
    const iterations = options.iterations ?? 1000;
    const warmupIterations = options.warmupIterations ?? 100;

    // 预热
    for (let i = 0; i < warmupIterations; i++) {
      await fn();
    }

    const times: number[] = [];
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now();
      await fn();
      times.push(performance.now() - iterStart);
    }

    const totalTime = performance.now() - start;
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / averageTime;

    const result: BenchmarkResult = {
      name,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      iterations,
      opsPerSecond,
    };

    benchmarks.set(name, result);

    if (options.verbose) {
      console.log(`Benchmark "${name}":`);
      console.log(`  Average: ${averageTime.toFixed(4)}ms`);
      console.log(`  Min: ${minTime.toFixed(4)}ms`);
      console.log(`  Max: ${maxTime.toFixed(4)}ms`);
      console.log(`  Ops/s: ${opsPerSecond.toFixed(2)}`);
    }

    return result;
  };

  const compare = (
    baseline: BenchmarkResult,
    current: BenchmarkResult
  ): { percentChange: number; isFaster: boolean; isSlower: boolean } => {
    const percentChange = ((current.averageTime - baseline.averageTime) / baseline.averageTime) * 100;
    return {
      percentChange,
      isFaster: percentChange < 0,
      isSlower: percentChange > 0,
    };
  };

  const regressionTest = async (
    name: string,
    fn: () => void | Promise<void>,
    baseline: BenchmarkResult,
    options: RegressionTestOptions = {}
  ): Promise<RegressionTestResult> => {
    const threshold = options.threshold ?? 10;
    const current = await benchmark(name, fn);
    const { percentChange, isSlower } = compare(baseline, current);

    let message = '';
    if (isSlower && percentChange > threshold) {
      message = `Performance regression detected: ${percentChange.toFixed(2)}% slower (threshold: ${threshold}%)`;
    } else if (isSlower) {
      message = `Performance slightly slower: ${percentChange.toFixed(2)}% (within threshold)`;
    } else if (percentChange < 0) {
      message = `Performance improved: ${Math.abs(percentChange).toFixed(2)}% faster`;
    } else {
      message = 'Performance unchanged';
    }

    return {
      passed: !isSlower || percentChange <= threshold,
      baseline,
      current,
      regressionPercent: percentChange,
      message,
    };
  };

  const saveBaseline = (result: BenchmarkResult, path = './benchmarks'): void => {
    try {
      if (typeof window === 'undefined') {
        // Node.js 环境
        const fs = require('fs');
        const fspath = require('path');
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path, { recursive: true });
        }
        const filePath = fspath.join(path, `${result.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
      }
    } catch (e) {
      console.warn('Could not save baseline:', e);
    }
  };

  const loadBaseline = (name: string, path = './benchmarks'): BenchmarkResult | null => {
    try {
      if (typeof window === 'undefined') {
        // Node.js 环境
        const fs = require('fs');
        const fspath = require('path');
        const filePath = fspath.join(path, `${name}.json`);
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
      }
    } catch (e) {
      console.warn('Could not load baseline:', e);
    }
    return null;
  };

  return {
    benchmark,
    compare,
    regressionTest,
    saveBaseline,
    loadBaseline,
  };
}

/**
 * 创建测试上下文
 */
function createTestingContext(options: TestingPluginOptions = {}): TestingContext {
  const mocks: Map<string, unknown> = new Map();
  const mockFns: MockFn[] = [];
  const domHelpers = createDOMTestHelpers();
  const signalHelpers = createSignalTestHelpers();
  const fuzzHelpers = createFuzzTestHelpers();
  const performanceHelpers = createPerformanceTestHelpers();

  return {
    mount: <T = unknown>(component: unknown, options: WrapperOptions = {}): ComponentWrapper<T> => {
      const container =
        typeof options.container === 'string'
          ? document.querySelector(options.container)
          : options.container || document.createElement('div');

      if (!container) {
        throw new Error('Invalid container');
      }

      if (options.attach !== false && container.parentNode === null) {
        document.body.appendChild(container);
      }

      let instance: T = {} as T;
      const element = container as Element;

      return {
        instance,
        element,
        unmount: () => {
          while (container.firstChild) {
            container.firstChild.remove();
          }
          if (options.attach !== false && container.parentNode === document.body) {
            document.body.removeChild(container);
          }
        },
        rerender: (newProps?: Record<string, unknown>) => {},
        find: (selector: string) => element.querySelector(selector),
        findAll: (selector: string) => Array.from(element.querySelectorAll(selector)),
        trigger: (eventName: string, payload?: unknown) => {
          element.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
        },
      };
    },

    mockFn: (mockOptions?: MockOptions) => {
      const mockFn = createMockFn(mockOptions);
      mockFns.push(mockFn);
      return mockFn;
    },

    mockModule: (moduleName: string, factory: () => unknown) => {
      mocks.set(moduleName, factory());
    },

    clearAllMocks: () => {
      mockFns.forEach(mockFn => mockFn.mockClear());
      mocks.clear();
    },

    signal: signalHelpers,
    dom: domHelpers,
    fuzz: fuzzHelpers,
    performance: performanceHelpers,

    wait: async (ms: number): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, ms));
    },

    waitFor: async (condition: () => boolean | Promise<boolean>, timeout = 5000): Promise<void> => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const result = await condition();
        if (result) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      throw new Error('Condition not met within timeout');
    },

    nextTick: async (): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 0));
    },
  };
}

const pluginTesting = definePlugin({
  name: 'testing',
  version: '6.0.0',
  description: 'LytJS official testing plugin with testing utilities and helpers, including fuzz testing and performance regression testing',
  author: 'LytJS Team',
  keywords: ['lytjs', 'testing', 'test-utilities', 'fuzz-testing', 'benchmark'],
  schema: {
    type: 'object',
    object: {
      properties: {
        defaultTimeout: { type: 'number', default: 5000 },
        autoCleanup: { type: 'boolean', default: true },
        environment: { type: 'string', default: 'jsdom' },
      },
    },
  },
  install(app, options) {
    const testingContext = createTestingContext(options as TestingPluginOptions);

    app.config.globalProperties.$testing = testingContext;

    app.provide('lyt-testing', testingContext);
  },
});

export default pluginTesting;
export type {
  TestingPluginOptions,
  WrapperOptions,
  ComponentWrapper,
  MockOptions,
  MockFn,
  SignalTestHelpers,
  DOMTestHelpers,
  TestingContext,
  FuzzTestHelpers,
  PerformanceTestHelpers,
  FuzzGeneratorOptions,
  FuzzTestResult,
  BenchmarkOptions,
  BenchmarkResult,
  RegressionTestOptions,
  RegressionTestResult,
};
export { createTestingContext, createMockFn };