// src/component.ts
// Core component instance management

import { reactive } from "@lytjs/reactivity";
import { nextTick } from "@lytjs/common-scheduler";
import {
  isFunction,
  isObject,
  hasOwn,
  NOOP,
  EMPTY_OBJ,
  isPromise,
} from "@lytjs/common-is";
import { warn } from "@lytjs/common-error";
import type {
  ComponentOptions,
  ComponentInternalInstance,
  ComponentPublicInstance,
  SetupContext,
  InternalSlots,
  AppContext,
  RenderFunction,
} from "./types";
import type { VNode } from "@lytjs/common-vnode";

type SetupResult = RenderFunction | Record<string, unknown> | void;
import { normalizePropsOptions, resolvePropValue } from "./props";
import { normalizeEmitsOptions, emit } from "./emit";
import { initSlots } from "./slots";
import {
  setCurrentInstance,
  getCurrentInstance,
  callCreatedHook,
  handleError,
} from "./lifecycle";

// ==================== UID counter ====================

let uid = 0;

// ==================== createComponentInstance ====================

/**
 * Create a component internal instance from a vnode.
 */
export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
): ComponentInternalInstance {
  const type = vnode.type as ComponentOptions;

  // Merge extends and mixins
  const mergedOptions = mergeOptions(type);

  const appContext = parent ? parent.appContext : createAppContext();

  const instance: ComponentInternalInstance = {
    uid: uid++,
    type: mergedOptions,
    vnode,
    subTree: null,
    props: EMPTY_OBJ,
    slots: {} as InternalSlots,
    ctx: {} as ComponentPublicInstance,
    setupState: {},
    data: {},
    propsOptions: normalizePropsOptions(mergedOptions.props),
    emitsOptions: normalizeEmitsOptions(mergedOptions.emits),
    emit: NOOP as (event: string, ...args: unknown[]) => void,
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    lifecycle: {
      beforeMount: new Set(),
      mounted: new Set(),
      beforeUpdate: new Set(),
      updated: new Set(),
      beforeUnmount: new Set(),
      unmounted: new Set(),
    },
    provides: parent ? parent.provides : new Map(),
    parent,
    root: parent ? parent.root : (null as unknown as ComponentInternalInstance),
    appContext,
    attrs: {},
  };

  // Set root to self if no parent
  if (!parent) {
    instance.root = instance;
  }

  // Create emit function bound to this instance
  instance.emit = (event: string, ...args: unknown[]) =>
    emit(instance, event, ...args);

  return instance;
}

// ==================== setupComponent ====================

/**
 * Set up a component instance: run setup, init props, init slots.
 */
export function setupComponent(instance: ComponentInternalInstance): void {
  const vnode = instance.vnode;
  if (!vnode) return;

  const { children } = vnode;
  const props = (vnode.props as Record<string, unknown> | null) ?? null;

  // Init props
  initProps(instance, props);

  // Init slots
  initSlots(instance, children);

  // Set up the component
  const setupResult = runSetup(instance);

  if (isPromise(setupResult)) {
    // Async setup - mark vnode as async
    vnode.isAsyncPlaceholder = true;
    setupResult
      .then((resolvedResult) => {
        if (instance.isUnmounted) return;
        handleSetupResult(instance, resolvedResult as SetupResult);
        vnode.isAsyncPlaceholder = false;
      })
      .catch((err: Error) => {
        vnode.isAsyncPlaceholder = false;
        handleError(err, instance, "setup function");
      });
  } else {
    handleSetupResult(instance, setupResult);
  }
}

/**
 * Run the setup function if defined.
 */
function runSetup(instance: ComponentInternalInstance): SetupResult {
  const { setup } = instance.type;

  if (!setup) return undefined;

  setCurrentInstance(instance);

  try {
    const setupContext = createSetupContext(instance);
    const result = setup(instance.props, setupContext);
    return result;
  } catch (err) {
    handleError(err as Error, instance, "setup function");
    // Set a no-op render to prevent silent empty rendering
    instance.render = () => null as unknown as VNode;
    return undefined;
  } finally {
    setCurrentInstance(null);
  }
}

/**
 * Handle the result of the setup function.
 */
function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: SetupResult,
): void {
  if (isFunction(setupResult)) {
    // Setup returned a render function
    instance.render = setupResult as RenderFunction;
  } else if (isObject(setupResult) && setupResult !== null) {
    // Setup returned a state object
    instance.setupState = setupResult as Record<string, unknown>;
  }

  // Finish component setup
  finishComponentSetup(instance);
}

/**
 * Finish component setup: handle data, methods, computed, render.
 */
export function finishComponentSetup(
  instance: ComponentInternalInstance,
): void {
  const { type } = instance;

  // Create public instance proxy before data() so ctx is available
  instance.ctx = createComponentPublicInstance(instance);

  // Init data
  if (type.data) {
    const data = type.data.call(instance.ctx) ?? {};
    instance.data = reactive(data);
  }

  // Call beforeCreate and created hooks
  callCreatedHook(instance);

  // If no render function from setup, use options render
  if (!instance.render) {
    if (type.render) {
      instance.render = type.render.bind(instance.ctx);
    }
  }
}

// ==================== initProps ====================

/**
 * Initialize and validate props on a component instance.
 */
export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Record<string, unknown> | null,
): void {
  const propsOptions = instance.propsOptions;
  const props: Record<string, unknown> = {};

  if (!rawProps) {
    instance.props = props;
    return;
  }

  // Process declared props
  for (const key in propsOptions) {
    if (hasOwn(propsOptions, key)) {
      const value = rawProps[key];
      props[key] = resolvePropValue(propsOptions[key]!, value, instance, key);
    }
  }

  // Collect attrs (non-declared props)
  const attrs: Record<string, unknown> = {};
  for (const key in rawProps) {
    if (!hasOwn(propsOptions, key)) {
      attrs[key] = rawProps[key];
    }
  }

  instance.props = props;
  instance.attrs = attrs;
}

// ==================== createSetupContext ====================

/**
 * Create the setup context object passed to the setup function.
 */
export function createSetupContext(
  instance: ComponentInternalInstance,
): SetupContext {
  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: instance.emit,
    expose(exposed?: Record<string, unknown>) {
      if (!exposed) {
        instance.exposed = null;
        return;
      }
      // 过滤危险 key，防止原型污染
      const safeExposed: Record<string, unknown> = {};
      for (const key of Object.keys(exposed)) {
        if (key !== "__proto__" && key !== "constructor") {
          safeExposed[key] = exposed[key];
        }
      }
      instance.exposed = safeExposed;
    },
  };
}

// ==================== createComponentPublicInstance ====================

/**
 * Create the public instance proxy ($data, $props, $el, etc.).
 */
export function createComponentPublicInstance(
  instance: ComponentInternalInstance,
): ComponentPublicInstance {
  const ctx: ComponentPublicInstance = {
    get $data() {
      return instance.data;
    },
    get $props() {
      return instance.props;
    },
    get $el() {
      return (instance.vnode?.el as Element) ?? null;
    },
    get $options() {
      return instance.type as unknown as Record<string, unknown>;
    },
    get $refs() {
      return {};
    },
    get $slots() {
      return instance.slots;
    },
    $emit: instance.emit,
    $forceUpdate: NOOP,
    $nextTick: () => nextTick(),
  };

  return ctx;
}

// ==================== defineComponent ====================

/**
 * defineComponent is an identity function that returns the options.
 * It provides TypeScript type inference for component options.
 */
export function defineComponent(options: ComponentOptions): ComponentOptions {
  return options;
}

// ==================== mergeOptions ====================

/**
 * Merge component options with extends and mixins.
 * Uses path tracking to provide detailed circular dependency warnings
 * that include the full merge chain with component names.
 */
function mergeOptions(
  options: ComponentOptions,
  seen = new WeakSet<ComponentOptions>(),
  path: ComponentOptions[] = [],
): ComponentOptions {
  if (seen.has(options)) {
    if (__DEV__) {
      // Build a human-readable cycle path using component names
      const cycleStart = path.indexOf(options);
      const cyclePath = path
        .slice(cycleStart)
        .map((opts, i) => {
          const name =
            (opts as Record<string, unknown>).name ||
            (opts as Record<string, unknown>).__name ||
            `anonymous#${i}`;
          return String(name);
        })
        .join(" -> ");
      warn(
        `Circular mixin/extends detected: ${cyclePath} -> (cycle). Skipping.`,
      );
    }
    return { ...options };
  }
  seen.add(options);
  path.push(options);

  let merged: ComponentOptions = { ...options };

  // Apply extends first
  if (options.extends) {
    merged = mergeOptionsPair(
      mergeOptions(options.extends, seen, [...path]),
      merged,
    );
  }

  // Then apply mixins
  if (options.mixins) {
    for (const mixin of options.mixins) {
      merged = mergeOptionsPair(merged, mergeOptions(mixin, seen, [...path]));
    }
  }

  return merged;
}

/**
 * Merge two ComponentOptions objects.
 */
function mergeOptionsPair(
  parent: ComponentOptions,
  child: ComponentOptions,
): ComponentOptions {
  // 使用 Record<string, unknown> 作为中间类型以支持动态键访问，
  // 最终通过类型断言返回 ComponentOptions
  const merged: Record<string, unknown> = { ...parent };

  for (const key in child) {
    if (key === "props" || key === "emits" || key === "inject") {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = { ...parentVal, ...childVal };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === "data" || key === "provide") {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = function (this: ComponentPublicInstance) {
          const parentData = isFunction(parentVal)
            ? parentVal.call(this)
            : parentVal;
          const childData = isFunction(childVal)
            ? childVal.call(this)
            : childVal;
          return {
            ...(parentData as Record<string, unknown>),
            ...(childData as Record<string, unknown>),
          };
        };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === "computed" || key === "methods" || key === "watch") {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = { ...parentVal, ...childVal };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (
      key === "beforeCreate" ||
      key === "created" ||
      key === "beforeMount" ||
      key === "mounted" ||
      key === "beforeUpdate" ||
      key === "updated" ||
      key === "beforeUnmount" ||
      key === "unmounted"
    ) {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = function (this: ComponentPublicInstance) {
          (parentVal as (...args: unknown[]) => unknown).call(this);
          (childVal as (...args: unknown[]) => unknown).call(this);
        };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === "mixins" || key === "extends") {
      // Skip - already handled
    } else if (hasOwn(child, key)) {
      merged[key] = (child as Record<string, unknown>)[key];
    }
  }

  return merged as ComponentOptions;
}

// ==================== createAppContext ====================

/**
 * Create a base app context object.
 * Exported for @lytjs/core to extend with runtime fields.
 */
export function createAppContext(): AppContext {
  return {
    config: {},
    components: {},
    directives: {},
    mixins: [],
    provides: new Map(),
  };
}

// ==================== provide / inject ====================

/**
 * Provide a value to descendant components.
 */
export function provide<T = unknown>(key: string | symbol, value: T): void {
  const instance = getCurrentInstance();
  if (instance) {
    instance.provides.set(key, value);
  }
}

/**
 * Inject a value from ancestor components.
 */
export function inject<T = unknown>(
  key: string | symbol,
  defaultValue?: T,
): T | undefined {
  const instance = getCurrentInstance();
  if (!instance) return defaultValue;

  // Walk up the parent chain
  let current: ComponentInternalInstance | null = instance.parent;
  while (current) {
    const provides = current.provides;
    if (provides.has(key)) {
      return provides.get(key) as T | undefined;
    }
    current = current.parent;
  }

  return defaultValue;
}
