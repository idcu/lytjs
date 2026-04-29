// src/component.ts
// Core component instance management

import { reactive } from '@lytjs/reactivity';
import { nextTick } from '@lytjs/common-scheduler';
import {
  isFunction,
  isObject,
  hasOwn,
  NOOP,
  EMPTY_OBJ,
  isPromise,
} from '@lytjs/common-is';
import type {
  ComponentOptions,
  ComponentInternalInstance,
  ComponentPublicInstance,
  SetupContext,
  InternalSlots,
  AppContext,
} from './types';
import { normalizePropsOptions, resolvePropValue } from './props';
import { normalizeEmitsOptions, emit } from './emit';
import { initSlots } from './slots';
import {
  setCurrentInstance,
  getCurrentInstance,
  callCreatedHook,
  handleError,
} from './lifecycle';

// ==================== UID counter ====================

let uid = 0;

// ==================== createComponentInstance ====================

/**
 * Create a component internal instance from a vnode.
 */
export function createComponentInstance(
  vnode: any,
  parent: ComponentInternalInstance | null,
): ComponentInternalInstance {
  const type = vnode.type as ComponentOptions;

  // Merge extends and mixins
  const mergedOptions = mergeOptions(type);

  const appContext = (parent ? parent.appContext : createAppContext());

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
    emit: NOOP as any,
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    lifecycle: {
      update: new Set(),
      mount: new Set(),
      unmount: new Set(),
    },
    provides: parent ? parent.provides : Object.create(null),
    parent,
    root: parent ? parent.root : null as unknown as ComponentInternalInstance,
    appContext,
    attrs: {},
  };

  // Set root to self if no parent
  if (!parent) {
    instance.root = instance;
  }

  // Create emit function bound to this instance
  instance.emit = (event: string, ...args: any[]) => emit(instance, event, ...args);

  return instance;
}

// ==================== setupComponent ====================

/**
 * Set up a component instance: run setup, init props, init slots.
 */
export function setupComponent(instance: ComponentInternalInstance): void {
  const { props, children } = instance.vnode;

  // Init props
  initProps(instance, props);

  // Init slots
  initSlots(instance, children);

  // Set up the component
  const setupResult = runSetup(instance);

  if (isPromise(setupResult)) {
    // Async setup - mark vnode as async
    instance.vnode.isAsyncPlaceholder = true;
    setupResult
      .then((resolvedResult: any) => {
        handleSetupResult(instance, resolvedResult);
        instance.vnode.isAsyncPlaceholder = false;
      })
      .catch((err: Error) => {
        handleError(err, instance, 'setup function');
      });
  } else {
    handleSetupResult(instance, setupResult);
  }
}

/**
 * Run the setup function if defined.
 */
function runSetup(instance: ComponentInternalInstance): any {
  const { setup } = instance.type;

  if (!setup) return undefined;

  setCurrentInstance(instance);

  try {
    const setupContext = createSetupContext(instance);
    const result = setup(instance.props, setupContext);
    return result;
  } catch (err) {
    handleError(err as Error, instance, 'setup function');
    return undefined;
  } finally {
    setCurrentInstance(null);
  }
}

/**
 * Handle the result of the setup function.
 */
function handleSetupResult(instance: ComponentInternalInstance, setupResult: any): void {
  if (isFunction(setupResult)) {
    // Setup returned a render function
    instance.render = setupResult;
  } else if (isObject(setupResult) && setupResult !== null) {
    // Setup returned a state object
    instance.setupState = setupResult;
  }

  // Finish component setup
  finishComponentSetup(instance);
}

/**
 * Finish component setup: handle data, methods, computed, render.
 */
export function finishComponentSetup(instance: ComponentInternalInstance): void {
  const { type } = instance;

  // Init data
  if (type.data) {
    const data = type.data.call(instance.ctx);
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

  // Create public instance proxy
  instance.ctx = createComponentPublicInstance(instance);
}

// ==================== initProps ====================

/**
 * Initialize and validate props on a component instance.
 */
export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Record<string, any> | null,
): void {
  const propsOptions = instance.propsOptions;
  const props: Record<string, any> = {};

  if (!rawProps) {
    instance.props = props;
    return;
  }

  // Process declared props
  for (const key in propsOptions) {
    if (hasOwn(propsOptions, key)) {
      const value = rawProps[key];
      props[key] = resolvePropValue(propsOptions[key]!, value, instance);
    }
  }

  // Collect attrs (non-declared props)
  const attrs: Record<string, any> = {};
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
export function createSetupContext(instance: ComponentInternalInstance): SetupContext {
  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: instance.emit,
    expose(exposed?: Record<string, any>) {
      instance.exposed = exposed ?? null;
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
      return instance.vnode?.el ?? null;
    },
    get $options() {
      return instance.type;
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
 */
function mergeOptions(options: ComponentOptions): ComponentOptions {
  let merged: ComponentOptions = { ...options };

  // Apply extends first
  if (options.extends) {
    merged = mergeOptionsPair(mergeOptions(options.extends), merged);
  }

  // Then apply mixins
  if (options.mixins) {
    for (const mixin of options.mixins) {
      merged = mergeOptionsPair(merged, mergeOptions(mixin));
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
  const merged: Record<string, any> = { ...parent };

  for (const key in child) {
    if (key === 'props' || key === 'emits' || key === 'inject') {
      const parentVal = (parent as any)[key];
      const childVal = (child as any)[key];
      if (parentVal && childVal) {
        merged[key] = { ...parentVal, ...childVal };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'data' || key === 'provide') {
      const parentVal = (parent as any)[key];
      const childVal = (child as any)[key];
      if (parentVal && childVal) {
        merged[key] = function (this: any) {
          const parentData = isFunction(parentVal)
            ? parentVal.call(this)
            : parentVal;
          const childData = isFunction(childVal)
            ? childVal.call(this)
            : childVal;
          return { ...parentData, ...childData };
        };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'computed' || key === 'methods' || key === 'watch') {
      const parentVal = (parent as any)[key];
      const childVal = (child as any)[key];
      if (parentVal && childVal) {
        merged[key] = { ...parentVal, ...childVal };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'beforeCreate' || key === 'created' ||
               key === 'beforeMount' || key === 'mounted' ||
               key === 'beforeUpdate' || key === 'updated' ||
               key === 'beforeUnmount' || key === 'unmounted') {
      const parentVal = (parent as any)[key];
      const childVal = (child as any)[key];
      if (parentVal && childVal) {
        merged[key] = function (this: any) {
          parentVal.call(this);
          childVal.call(this);
        };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'mixins' || key === 'extends') {
      // Skip - already handled
    } else if (hasOwn(child, key)) {
      merged[key] = (child as any)[key];
    }
  }

  return merged as ComponentOptions;
}

// ==================== createAppContext ====================

function createAppContext(): AppContext {
  return {
    config: {},
    components: {},
    directives: {},
    mixins: [],
    provides: Object.create(null),
  };
}

// ==================== provide / inject ====================

/**
 * Provide a value to descendant components.
 */
export function provide(key: string | symbol, value: any): void {
  const instance = getCurrentInstance();
  if (instance) {
    instance.provides[key as string] = value;
  }
}

/**
 * Inject a value from ancestor components.
 */
export function inject(key: string | symbol, defaultValue?: any): any {
  const instance = getCurrentInstance();
  if (!instance) return defaultValue;

  // Walk up the parent chain
  let current: ComponentInternalInstance | null = instance.parent;
  while (current) {
    if (hasOwn(current.provides, key as string)) {
      return current.provides[key as string];
    }
    current = current.parent;
  }

  return defaultValue;
}
