/**
 * @lytjs/test-utils
 *
 * LytJS testing utilities for unit and integration testing.
 *
 * @packageDocumentation
 */

import { createApp, defineComponent, nextTick, type ComponentOptions } from '@lytjs/core';
import { signal, watch, isReactive as isReactiveImpl, isRef, isSignal } from '@lytjs/reactivity';

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
    plugins?: unknown[];
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
  /** Get element outer HTML（含根元素自身，便于整体快照/断言根节点属性） */
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
    'DOM environment not available. Please install jsdom or happy-dom and set up your test environment.',
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
 * Mount a component for testing.
 *
 * ★ 2026-10-24：**必须是 async**。`@lytjs/core` 的 `app.mount()` 本身是 `async`
 *   （它要动态 `import()` 渲染器），所以任何「同步返回可用 wrapper」的实现都不可能成立 ——
 *   此前这里把 `app.mount()` 返回的 **Promise 直接当成组件实例**存进 `vm`：
 *   - `wrapper.vm.$emit` / `$props` / `$forceUpdate` **全是 undefined**（Promise 上没这些）；
 *   - DOM 要等一个宏任务才出现 ⇒ `wrapper.text()` 同步读到 `''`；
 *   - `wrapper.root` 在 mount 当刻就 `firstElementChild || targetEl` 取定，那时还没渲染
 *     ⇒ **恒等于容器**（`id=test-container`），永远不是组件根元素。
 *
 * @example
 * ```ts
 * const wrapper = await mount(MyComponent, { props: { title: 'Hello' } });
 * expect(wrapper.text()).toContain('Hello');
 * wrapper.unmount();
 * ```
 */
export async function mount<T = unknown>(
  component: unknown,
  options: MountOptions = {},
): Promise<Wrapper<T>> {
  const doc = createDOMEnvironment();
  const container = createContainer();

  // Handle attachTo option
  let targetEl: HTMLElement;
  let ownsContainer = false;

  if (options.attachTo) {
    if (typeof options.attachTo === 'string') {
      const found = doc.querySelector(options.attachTo) as HTMLElement | null;
      if (!found) {
        throw new Error(`Element not found: ${options.attachTo}`);
      }
      targetEl = found;
    } else {
      targetEl = options.attachTo;
    }
  } else {
    targetEl = container;
    ownsContainer = true;
    // ★ 2026-10-24：默认容器**必须入文档**。此前它从不 append ⇒
    //   `document.body.contains(root)` 为 false、`document.querySelector` 找不到组件、
    //   焦点 / `document` 级事件监听 / `getBoundingClientRect` 的行为与真实页面不一致。
    (doc.body ?? doc.documentElement).appendChild(container);
  }

  // Create the app
  //
  // ★ 2026-10-24：**第二个参数才是 props**。此前只传了 `component` 一个参数
  //   ⇒ `options.props` 一个都没进组件（组件里全是 undefined），
  //   而 `wrapper.props()` 返回的却是 `{...options.props}` —— 看起来对，实则骗人。
  const app = createApp(
    component as Parameters<typeof createApp>[0],
    (options.props ?? null) as Parameters<typeof createApp>[1],
  ) as unknown as {
    use: (plugin: unknown, ...options: unknown[]) => unknown;
    provide: (key: string, value: unknown) => unknown;
    mount: (el: HTMLElement) => Promise<T>;
    unmount: () => void;
  };

  // Install global plugins
  if (options.global?.plugins) {
    for (const plugin of options.global.plugins) {
      if (typeof plugin === 'function') {
        plugin(app);
      } else if (plugin && typeof (plugin as { install?: unknown }).install === 'function') {
        (plugin as { install: (app: unknown) => void }).install(app);
      }
    }
  }

  // Provide global values
  if (options.global?.provide) {
    for (const [key, value] of Object.entries(options.global.provide)) {
      app.provide(key, value);
    }
  }

  // Mount the app —— core 的 mount 是 async，必须 await
  const instance = await app.mount(targetEl);

  // Create wrapper
  const wrapper: Wrapper<T> = {
    // ★ getter：挂载完成后才能确定组件根元素。写成取值即定的话，
    //   拿到的永远是容器（见函数头注释）。
    get root(): HTMLElement {
      return (targetEl.firstElementChild as HTMLElement) || targetEl;
    },
    vm: instance as T,

    unmount() {
      app.unmount();
      if (ownsContainer && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },

    find(selector: string) {
      // ★ 2026-10-24：**根元素自身也参与匹配**。
      //   `Element.querySelector` 只查后代 ⇒ 组件根就是 `.app` 时
      //   `wrapper.find('.app')` 恒为 null（最常被查的恰恰是根节点）。
      return this.root.matches(selector) ? this.root : this.root.querySelector(selector);
    },

    findAll(selector: string) {
      const matched = Array.from(this.root.querySelectorAll(selector));
      return this.root.matches(selector) ? [this.root, ...matched] : matched;
    },

    props() {
      // 读**组件真实 props**（`$props`），而不是 mount 时那份 options 副本
      const actual = (instance as { $props?: Record<string, unknown> } | null)?.$props;
      return { ...(actual ?? options.props ?? {}) };
    },

    async setProps(newProps: Record<string, unknown>) {
      // ★ 2026-10-24：此前只 `Object.assign(options.props, newProps)` + flush，
      //   而那份对象**组件根本看不到** ⇒ setProps 是彻底的空操作。
      //   现在写进组件的真实 props 并强制重渲染。
      const vm = instance as {
        $props?: Record<string, unknown>;
        $forceUpdate?: () => void;
      } | null;
      const target = vm?.$props ?? (options.props ||= {});

      Object.assign(target, newProps);
      vm?.$forceUpdate?.();

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
      // ★ 2026-10-24：改用 `outerHTML`。`root` 现在**是组件根元素**（不再是容器），
      //   返回 innerHTML 会把根元素本身丢掉 ⇒ 无法断言根节点的 class/属性，
      //   而 `wrapper.html()` 的主要用途正是整体快照。
      return this.root.outerHTML;
    },
  };

  return wrapper;
}

/**
 * Mount a component and return a promise that resolves after initial render.
 *
 * `mount()` 本身已是 async，本函数保留为语义化别名（旧代码无需改动）。
 */
export async function mountAsync<T = unknown>(
  component: unknown,
  options: MountOptions = {},
): Promise<Wrapper<T>> {
  const wrapper = await mount<T>(component, options);
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
  options: { timeout?: number; interval?: number } = {},
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
export function mockFn<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown>(
  implementation?: T,
): MockFunction<T> {
  const calls: unknown[][] = [];
  const instances: unknown[] = [];
  let mockImplementation = implementation;

  const fn: MockFunction<T> = function (this: unknown, ...args: unknown[]) {
    calls.push(args);
    instances.push(this);
    if (mockImplementation) {
      return mockImplementation.apply(this, args);
    }
    return undefined;
  } as unknown as MockFunction<T>;

  fn.calls = calls;
  fn.instances = instances;

  fn.mockReturnValue = (value: unknown) => {
    mockImplementation = (() => value) as T;
    return fn;
  };

  fn.mockResolvedValue = (value: unknown) => {
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

export interface MockFunction<
  T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown,
> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: unknown[][];
  instances: unknown[];
  mockReturnValue: (value: unknown) => MockFunction<T>;
  mockResolvedValue: (value: unknown) => MockFunction<T>;
  mockImplementation: (impl: T) => MockFunction<T>;
  mockClear: () => MockFunction<T>;
  mockReset: () => MockFunction<T>;
}

/**
 * Create a mock component for testing
 */
export function mockComponent(
  name: string,
  options: Partial<ComponentOptions> = {},
): ComponentOptions {
  return defineComponent({
    name,
    ...options,
  }) as unknown as ComponentOptions;
}

/**
 * Spy on an object method
 */
export function spyOn<T extends object, K extends keyof T>(
  obj: T,
  method: K,
  implementation?: T[K],
): MockFunction & { mockRestore: () => void } {
  const original = obj[method];

  // ★ 2026-10-24：**不传 implementation 时沿用原实现**。
  //   此前 `mockFn(undefined)` ⇒ 被 spy 的方法恒返回 `undefined`，
  //   业务代码里的调用点会莫名拿到 undefined（"spy" 变成了 "stub"）。
  const mock = mockFn((implementation ?? original) as unknown as (...args: unknown[]) => unknown);

  Object.defineProperty(obj, method, {
    value: mock,
    writable: true,
    configurable: true,
  });

  const spy = mock as MockFunction & { mockRestore: () => void };
  spy.mockRestore = () => {
    Object.defineProperty(obj, method, {
      value: original,
      writable: true,
      configurable: true,
    });
  };

  return spy;
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
export function trackSignal<T>(sig: TestSignal<T>): SignalTracker<T> {
  const values: { value: T; timestamp: number }[] = [];
  const stop = watch(
    () => sig.value,
    (value) => {
      values.push({ value, timestamp: Date.now() });
    },
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
  timeout = 1000,
): Promise<unknown[]> {
  const emitted: unknown[] = [];

  const vm = wrapper.vm as { $props?: Record<string, unknown> } | null;
  const props = vm?.$props;

  // ★ 2026-10-24：`$props` 拿不到时必须**明确报错**。此前是 `if (originalEmit)` ——
  //   静默跳过劫持，然后统一报「事件没发出」，把「工具坏了」伪装成「被测代码没 emit」。
  if (!vm || !props) {
    throw new Error(
      '[lytjs/test-utils] assertEmits(): wrapper.vm.$props is not available. ' +
        'Make sure the wrapper comes from an awaited mount()/mountAsync().',
    );
  }

  // ★ 2026-10-24：**不能靠替换 `vm.$emit` 来劫持**。
  //   `$emit` 只是公共实例上的一个引用；组件内部（`setup(_p, ctx)` 的 `ctx.emit`、
  //   以及 `instance.emit`）走的是 `@lytjs/component` 的 `emit(instance, ...)` 闭包，
  //   压根不经过这个属性 ⇒ 换了也没人调用（实测：事件已发出，但 `emitted` 恒为空）。
  //   正确做法是走 `emit()` **真正的查找路径**：它读 `instance.props[toHandlerKey(event)]`。
  const handlerKey = toHandlerKey(eventName);
  const hadHandler = handlerKey in props;
  const previousHandler = props[handlerKey];

  const recorder = (...args: unknown[]): void => {
    emitted.push(args.length === 1 ? args[0] : args);
    if (typeof previousHandler === 'function') {
      (previousHandler as (...a: unknown[]) => void)(...args);
    }
  };

  props[handlerKey] = recorder;

  try {
    await action();

    // ★ `timeout` 此前**只被用进错误文案**，实际只 flush 一次（≈0ms）
    //   ⇒ 定时器里 emit 的事件永远等不到。现在真的按 timeout 轮询。
    const startTime = Date.now();
    while (emitted.length === 0) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Event "${eventName}" was not emitted within ${timeout}ms`);
      }
      await flushPromises();
    }

    return emitted;
  } finally {
    // 无论成功失败都还原，别把组件留在「多了一个监听器」的状态
    if (hadHandler) {
      props[handlerKey] = previousHandler;
    } else {
      delete props[handlerKey];
    }
  }
}

/**
 * 事件名 ⇒ props 上的处理器键。
 *
 * 必须与 `@lytjs/component` 的 `emit()` 内部实现**逐字一致**：
 * `on${capitalize(kebabToCamel(event))}`（见 `component/src/emit.ts`）。
 * 不一致的话这里挂上的处理器 `emit()` 永远找不到。
 */
function toHandlerKey(event: string): string {
  if (!event) return '';
  const camel = event.replace(/-([a-zA-Z0-9])/g, (_m, c: string) => c.toUpperCase());
  return `on${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
}

/**
 * 判断一个值是否具备响应性（signal / ref / computed / reactive 代理）。
 *
 * ⚠️ 2026-10-10 修复（P2）：此前实现是 `return false;`（附注释「LytJS v6 uses Signals
 * instead of Reactive Objects」）—— 那是**用一句借口掩盖未实现**：
 * ① 它恒返回 false，任何断言「某值是响应式」的测试都会静默失败/永真（取决于断言方向）；
 * ② 本框架**确实**同时有 signal 与 Proxy reactive 两套（`@lytjs/reactivity` 两者都导出），
 *    所以「不用 reactive」的理由本身也不成立。
 * 现在改为委托给 `@lytjs/reactivity` 的**真判定器**（硬约束 8：判据必须打到被验证对象）。
 */
export function isReactive(value: unknown): boolean {
  return isReactiveImpl(value) || isRef(value) || isSignal(value);
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
  // ★ 2026-10-24：**先取快照并清空，再执行**。
  //   此前是「先遍历、最后 `cleanupCallbacks = []`」⇒ 清理过程中新注册的回调
  //   被连同数组一起丢掉（静默泄漏）。现在它们留在队列里，由下一次 runCleanup 处理。
  const callbacks = cleanupCallbacks;
  cleanupCallbacks = [];

  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

/**
 * Auto-cleanup wrapper for mount
 */
export async function mountWithCleanup<T = unknown>(
  component: unknown,
  options: MountOptions = {},
): Promise<Wrapper<T>> {
  // `mount()` 是 async ⇒ 这里也必须 await，否则 `registerCleanup` 会在
  // 挂载完成前就注册一个「卸载一个还不存在的 wrapper」的回调。
  const wrapper = await mount<T>(component, options);
  registerCleanup(() => wrapper.unmount());
  return wrapper;
}
