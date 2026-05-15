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
 * 创建测试上下文
 */
function createTestingContext(options: TestingPluginOptions = {}): TestingContext {
  const mocks: Map<string, unknown> = new Map();
  const mockFns: MockFn[] = [];
  const domHelpers = createDOMTestHelpers();
  const signalHelpers = createSignalTestHelpers();

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
  description: 'LytJS official testing plugin with testing utilities and helpers',
  author: 'LytJS Team',
  keywords: ['lytjs', 'testing', 'test-utilities'],
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
};
export { createTestingContext, createMockFn };