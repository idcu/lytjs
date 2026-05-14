/**
 * @lytjs/test-utils
 *
 * LytJS testing utilities for unit and integration testing.
 *
 * @packageDocumentation
 */

import { createApp, defineComponent, h, nextTick, type ComponentOptions } from '@lytjs/core';
import { signal, watch, type Signal } from '@lytjs/reactivity';

// ============================================
// Types
// ============================================

export interface MountOptions {
  /** Attach to a specific DOM element */
  attachTo?: HTMLElement | string;
  /** Props to pass to the component */
  props?: Record<string, unknown>;
  /** Global plugins to install */
  global?: {
    plugins?: any[];
    provide?: Record<string, unknown>;
  };
}

export interface Wrapper<T = unknown> {
  /** The root DOM element of the mounted component */
  root: HTMLElement;
  /** The component instance */
  vm: T;
  /** Unmount the component */
  unmount: () => void;
  /** Get DOM element by selector */
  find: (selector: string) => Element | null;
  /** Get all DOM elements matching selector */
  findAll: (selector: string) => Element[];
  /** Get component props */
  props: () => Record<string, unknown>;
  /** Set component props */
  setProps: (props: Record<string, unknown>) => Promise<void>;
  /** Trigger an event on an element */
  trigger: (selector: string, event: string, detail?: unknown) => void;
  /** Get element text content */
  text: () => string;
  /** Get element inner HTML */
  html: () => string;
}

// ============================================
// DOM Utilities
// ============================================

/**
 * Create a clean DOM environment for testing
 */
export function createDOMEnvironment(): Document {
  if (typeof document !== 'undefined') {
    return document;
  }

  // For Node.js environment, you would need jsdom or happy-dom
  throw new Error(
    'DOM environment not available. Please install jsdom or happy-dom and set up your test environment.'
  );
}

/**
 * Create a container element for mounting
 */
export function createContainer(): HTMLElement {
  const doc = createDOMEnvironment();
  const container = doc.createElement('div');
  container.id = 'test-container';
  return container;
}

// ============================================
// Mount Utilities
// ============================================

/**
 * Mount a component for testing
 *
 * @example
 * ```ts
 * import { mount } from '@lytjs/test-utils';
 * import MyComponent from './MyComponent.lyt';
 *
 * const wrapper = mount(MyComponent, {
 *   props: { title: 'Hello' }
 * });
 *
 * expect(wrapper.text()).toContain('Hello');
 * wrapper.unmount();
 * ```
 */
export function mount<T = unknown>(
  component: any,
  options: MountOptions = {}
): Wrapper<T> {
  const container = createContainer();
  const doc = createDOMEnvironment();

  // Handle attachTo option
  let targetEl: HTMLElement;
  if (options.attachTo) {
    if (typeof options.attachTo === 'string') {
      targetEl = doc.querySelector(options.attachTo) as HTMLElement;
      if (!targetEl) {
        throw new Error(`Element not found: ${options.attachTo}`);
      }
    } else {
      targetEl = options.attachTo;
    }
  } else {
    targetEl = container;
  }

  // Create the app
  const app: any = createApp(component);

  // Install global plugins
  if (options.global?.plugins) {
    for (const plugin of options.global.plugins) {
      if (typeof plugin === 'function') {
        plugin(app);
      } else if (plugin && typeof plugin.install === 'function') {
        plugin.install(app);
      }
    }
  }

  // Provide global values
  if (options.global?.provide) {
    for (const [key, value] of Object.entries(options.global.provide)) {
      app.provide(key, value);
    }
  }

  // Mount the app
  const instance = app.mount(targetEl);

  // Create wrapper
  const wrapper: Wrapper<T> = {
    root: targetEl.firstElementChild as HTMLElement || targetEl,
    vm: instance as T,

    unmount() {
      app.unmount();
      if (targetEl === container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },

    find(selector: string) {
      return this.root.querySelector(selector);
    },

    findAll(selector: string) {
      return Array.from(this.root.querySelectorAll(selector));
    },

    props() {
      return { ...options.props };
    },

    async setProps(newProps: Record<string, unknown>) {
      Object.assign(options.props || {}, newProps);
      await flushPromises();
    },

    trigger(selector: string, event: string, detail?: unknown) {
      const el = this.find(selector);
      if (!el) {
        throw new Error(`Element not found: ${selector}`);
      }

      const eventObj = new CustomEvent(event, { detail, bubbles: true });
      el.dispatchEvent(eventObj);
    },

    text() {
      return this.root.textContent || '';
    },

    html() {
      return this.root.innerHTML;
    },
  };

  return wrapper;
}

/**
 * Mount a component and return a promise that resolves after initial render
 */
export async function mountAsync<T = unknown>(
  component: any,
  options: MountOptions = {}
): Promise<Wrapper<T>> {
  const wrapper = mount<T>(component, options);
  await flushPromises();
  return wrapper;
}

// ============================================
// Async Utilities
// ============================================

/**
 * Wait for all pending promises to resolve
 *
 * @example
 * ```ts
 * await flushPromises();
 * ```
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Wait for the next tick
 *
 * @example
 * ```ts
 * await nextTick();
 * ```
 */
export { nextTick };

/**
 * Wait for a specific condition to be true
 *
 * @example
 * ```ts
 * await waitFor(() => wrapper.text().includes('Loaded'));
 * ```
 */
export async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 1000, interval = 50 } = options;

  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`waitFor timeout: condition not met within ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Wait for a specific amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Mock Utilities
// ============================================

/**
 * Create a mock function that tracks calls
 */
export function mockFn<T extends (...args: any[]) => any = (...args: any[]) => any>(
  implementation?: T
): MockFunction<T> {
  const calls: any[][] = [];
  const instances: any[] = [];
  let mockImplementation = implementation;

  const fn: any = function (this: any, ...args: any[]) {
    calls.push(args);
    instances.push(this);
    if (mockImplementation) {
      return mockImplementation.apply(this, args);
    }
    return undefined;
  };

  fn.calls = calls;
  fn.instances = instances;

  fn.mockReturnValue = (value: any) => {
    mockImplementation = (() => value) as T;
    return fn;
  };

  fn.mockResolvedValue = (value: any) => {
    mockImplementation = (async () => value) as T;
    return fn;
  };

  fn.mockImplementation = (impl: T) => {
    mockImplementation = impl;
    return fn;
  };

  fn.mockClear = () => {
    calls.length = 0;
    instances.length = 0;
    return fn;
  };

  fn.mockReset = () => {
    fn.mockClear();
    mockImplementation = implementation;
    return fn;
  };

  return fn;
}

export interface MockFunction<T extends (...args: any[]) => any = (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: any[][];
  instances: any[];
  mockReturnValue: (value: any) => MockFunction<T>;
  mockResolvedValue: (value: any) => MockFunction<T>;
  mockImplementation: (impl: T) => MockFunction<T>;
  mockClear: () => MockFunction<T>;
  mockReset: () => MockFunction<T>;
}

/**
 * Create a mock component for testing
 */
export function mockComponent(name: string, options: Partial<ComponentOptions> = {}): ComponentOptions {
  return defineComponent({
    name,
    setup(_props, { slots }) {
      return () => (h as any)(
        'div',
        { 'data-testid': `mock-${name.toLowerCase()}` },
        slots.default ? slots.default() : `Mock: ${name}`
      );
    },
    ...options,
  });
}

/**
 * Spy on an object method
 */
export function spyOn<T extends object, K extends keyof T>(
  obj: T,
  method: K,
  implementation?: T[K]
): MockFunction {
  const original = obj[method];
  const mock = mockFn(implementation as (...args: any[]) => any);

  Object.defineProperty(obj, method, {
    value: mock,
    writable: true,
    configurable: true,
  });

  (mock as any).mockRestore = () => {
    Object.defineProperty(obj, method, {
      value: original,
      writable: true,
      configurable: true,
    });
  };

  return mock;
}

// ============================================
// Signal Testing Utilities
// ============================================

/**
 * Create a test signal with tracking
 */
export function createTestSignal<T>(initialValue: T): TestSignal<T> {
  const sig = signal(initialValue);
  const history: T[] = [initialValue];

  const testSignal: TestSignal<T> = {
    get value() {
      return sig();
    },
    set value(v: T) {
      sig.set(v);
      history.push(v);
    },
    history: () => [...history],
    reset: () => {
      sig.set(initialValue);
      history.length = 0;
      history.push(initialValue);
    },
  };

  return testSignal;
}

export interface TestSignal<T> {
  value: T;
  history: () => T[];
  reset: () => void;
}

/**
 * Track signal changes
 */
export function trackSignal<T>(sig: Signal<T>): SignalTracker<T> {
  const values: { value: T; timestamp: number }[] = [];
  const stop = watch(
    () => sig(),
    (value) => {
      values.push({ value, timestamp: Date.now() });
    }
  );

  return {
    values: () => values.map((v) => v.value),
    timestamps: () => values.map((v) => v.timestamp),
    count: () => values.length,
    stop,
  };
}

export interface SignalTracker<T> {
  values: () => T[];
  timestamps: () => number[];
  count: () => number;
  stop: () => void;
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert that a component emits an event
 */
export async function assertEmits(
  wrapper: Wrapper,
  eventName: string,
  action: () => void | Promise<void>,
  timeout = 1000
): Promise<any[]> {
  const emitted: any[] = [];

  const originalEmit = (wrapper.vm as { $emit?: (event: string, ...args: any[]) => void })?.$emit;
  if (originalEmit) {
    (wrapper.vm as { $emit: (event: string, ...args: any[]) => void }).$emit = (
      event: string,
      ...args: any[]
    ) => {
      if (event === eventName) {
        emitted.push(args.length === 1 ? args[0] : args);
      }
      originalEmit(event, ...args);
    };
  }

  await action();
  await flushPromises();

  if (emitted.length === 0) {
    throw new Error(`Event "${eventName}" was not emitted within ${timeout}ms`);
  }

  return emitted;
}

/**
 * Check if a value is reactive
 */
export function isReactive(_value: unknown): boolean {
  return false; // LytJS v6 uses Signals instead of Reactive Objects
}

// ============================================
// Cleanup Utilities
// ============================================

let cleanupCallbacks: (() => void)[] = [];

/**
 * Register a cleanup callback to run after each test
 */
export function registerCleanup(callback: () => void): void {
  cleanupCallbacks.push(callback);
}

/**
 * Run all cleanup callbacks
 */
export function runCleanup(): void {
  for (const callback of cleanupCallbacks) {
    try {
      callback();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
  cleanupCallbacks = [];
}

/**
 * Auto-cleanup wrapper for mount
 */
export function mountWithCleanup<T = unknown>(
  component: any,
  options: MountOptions = {}
): Wrapper<T> {
  const wrapper = mount<T>(component, options);
  registerCleanup(() => wrapper.unmount());
  return wrapper;
}
