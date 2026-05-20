/* eslint-disable @typescript-eslint/no-unused-vars */
// tests/component.test.ts
// Component instance creation, setup, render, mixins, extends, async setup, provide/inject, error handling, unmount

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createComponentInstance,
  setupComponent,
  defineComponent,
  provide,
  inject,
  callMountedHook,
  callUnmountedHook,
  callCreatedHook,
  callUpdatedHook,
  setCurrentInstance,
  getCurrentInstance,
} from '../src/index';
import type { ComponentOptions, ComponentInternalInstance } from '../src/types';
import type { InjectOptions } from '../src/component';

describe('createComponentInstance', () => {
  it('should create a component instance with correct defaults', () => {
    const options = defineComponent({ name: 'TestComp' });
    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    expect(instance).toBeDefined();
    expect(instance.uid).toBeGreaterThanOrEqual(0);
    expect(instance.type.name).toBe('TestComp');
    expect(instance.isMounted).toBe(false);
    expect(instance.isUnmounted).toBe(false);
    expect(instance.isDeactivated).toBe(false);
    expect(instance.parent).toBeNull();
    expect(instance.root).toBe(instance);
    expect(instance.lifecycle.beforeMount.size).toBe(0);
    expect(instance.lifecycle.mounted.size).toBe(0);
    expect(instance.lifecycle.beforeUpdate.size).toBe(0);
    expect(instance.lifecycle.updated.size).toBe(0);
    expect(instance.lifecycle.beforeUnmount.size).toBe(0);
    expect(instance.lifecycle.unmounted.size).toBe(0);
  });

  it('should set parent and root correctly', () => {
    const parentOptions = defineComponent({ name: 'Parent' });
    const childOptions = defineComponent({ name: 'Child' });

    const parentVnode = { type: parentOptions, props: {}, children: null };
    const parentInstance = createComponentInstance(parentVnode, null);

    const childVnode = { type: childOptions, props: {}, children: null };
    const childInstance = createComponentInstance(childVnode, parentInstance);

    expect(childInstance.parent).toBe(parentInstance);
    expect(childInstance.root).toBe(parentInstance);
  });
});

describe('setupComponent', () => {
  it('should call setup function with props and context', () => {
    const setupFn = vi.fn((_props, ctx) => {
      return { count: 1 };
    });

    const options = defineComponent({
      name: 'SetupComp',
      props: { msg: { type: String } },
      setup: setupFn,
    });

    const vnode = {
      type: options,
      props: { msg: 'hello' },
      children: null,
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(setupFn).toHaveBeenCalledTimes(1);
    expect(setupFn.mock.calls[0]![0].msg).toBe('hello');
    expect(setupFn.mock.calls[0]![1].emit).toBeDefined();
    expect(setupFn.mock.calls[0]![1].attrs).toBeDefined();
    expect(setupFn.mock.calls[0]![1].slots).toBeDefined();
    expect(instance.setupState.count).toBe(1);
  });

  it('should use setup return as render function when it returns a function', () => {
    const renderFn = vi.fn(() => 'rendered');

    const options = defineComponent({
      name: 'RenderComp',
      setup() {
        return renderFn;
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.render).toBe(renderFn);
  });

  it('should call data() and make it reactive', () => {
    const options = defineComponent({
      name: 'DataComp',
      data() {
        return { count: 0, text: 'hello' };
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.data.count).toBe(0);
    expect(instance.data.text).toBe('hello');
  });

  it('should handle async setup', async () => {
    vi.useFakeTimers();

    const options = defineComponent({
      name: 'AsyncComp',
      async setup() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { asyncData: 'resolved' };
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // Initially async placeholder
    expect(instance.vnode.isAsyncPlaceholder).toBe(true);

    // 使用 fake timers 推进时间，等待异步 setup 完成
    await vi.advanceTimersByTimeAsync(50);

    expect(instance.setupState.asyncData).toBe('resolved');
    expect(instance.vnode.isAsyncPlaceholder).toBe(false);

    vi.useRealTimers();
  });
});

describe('defineComponent', () => {
  it('should return the same options object', () => {
    const options = { name: 'Test', setup() {} };
    const result = defineComponent(options);
    expect(result).toBe(options);
  });
});

describe('mixins', () => {
  it('should merge mixin lifecycle hooks', () => {
    const mixinCreated = vi.fn();
    const ownCreated = vi.fn();

    const mixin: ComponentOptions = {
      created: mixinCreated,
    };

    const options = defineComponent({
      name: 'MixinComp',
      mixins: [mixin],
      created: ownCreated,
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // created is called during finishComponentSetup
    expect(mixinCreated).toHaveBeenCalledTimes(1);
    expect(ownCreated).toHaveBeenCalledTimes(1);
  });

  it('should merge mixin data', () => {
    const mixin: ComponentOptions = {
      data() {
        return { mixinProp: 'from mixin' };
      },
    };

    const options = defineComponent({
      name: 'MixinDataComp',
      mixins: [mixin],
      data() {
        return { ownProp: 'from own' };
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.data.mixinProp).toBe('from mixin');
    expect(instance.data.ownProp).toBe('from own');
  });

  it('should merge mixin methods', () => {
    const mixin: ComponentOptions = {
      methods: {
        mixinMethod() {
          return 'mixin';
        },
      },
    };

    const options = defineComponent({
      name: 'MixinMethodComp',
      mixins: [mixin],
      methods: {
        ownMethod() {
          return 'own';
        },
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.type.methods?.mixinMethod).toBeDefined();
    expect(instance.type.methods?.ownMethod).toBeDefined();
  });
});

describe('extends', () => {
  it('should merge extends options', () => {
    const base: ComponentOptions = {
      data() {
        return { baseProp: 'base' };
      },
      methods: {
        baseMethod() {
          return 'base';
        },
      },
    };

    const options = defineComponent({
      name: 'ExtendedComp',
      extends: base,
      data() {
        return { childProp: 'child' };
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.data.baseProp).toBe('base');
    expect(instance.data.childProp).toBe('child');
  });
});

describe('provide/inject', () => {
  it('should provide and inject values through parent chain', () => {
    const parentOptions = defineComponent({
      name: 'Provider',
      setup() {
        provide('token', 'provided-value');
        return {};
      },
    });

    const childOptions = defineComponent({
      name: 'Consumer',
      setup() {
        const value = inject('token');
        return { injected: value };
      },
    });

    // Create parent
    const parentVnode = { type: parentOptions, props: {}, children: null };
    const parentInstance = createComponentInstance(parentVnode, null);
    setupComponent(parentInstance);

    // Create child with parent
    const childVnode = { type: childOptions, props: {}, children: null };
    const childInstance = createComponentInstance(childVnode, parentInstance);
    setupComponent(childInstance);

    expect(childInstance.setupState.injected).toBe('provided-value');
  });

  it('should return default value when inject key is not found', () => {
    const options = defineComponent({
      name: 'NoProvider',
      setup() {
        const value = inject('missing-key', 'default-value');
        return { injected: value };
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.setupState.injected).toBe('default-value');
  });

  it('should support factory function default value', () => {
    const options = defineComponent({
      name: 'FactoryDefault',
      setup() {
        const value = inject('missing-factory', () => ({ count: 42 }), { factory: true });
        return { injected: value };
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.setupState.injected).toEqual({ count: 42 });
  });

  it('should not call factory when value is provided by ancestor', () => {
    const parentOptions = defineComponent({
      name: 'FactoryProvider',
      setup() {
        provide('factory-key', 'provided-value');
        return {};
      },
    });

    const childOptions = defineComponent({
      name: 'FactoryConsumer',
      setup() {
        const factoryFn = vi.fn(() => 'factory-result');
        const value = inject('factory-key', factoryFn, { factory: true });
        return { injected: value, factoryFn };
      },
    });

    const parentVnode = { type: parentOptions, props: {}, children: null };
    const parentInstance = createComponentInstance(parentVnode, null);
    setupComponent(parentInstance);

    const childVnode = { type: childOptions, props: {}, children: null };
    const childInstance = createComponentInstance(childVnode, parentInstance);
    setupComponent(childInstance);

    expect(childInstance.setupState.injected).toBe('provided-value');
    expect(childInstance.setupState.factoryFn).not.toHaveBeenCalled();
  });

  it('should support from modifier to look up from a different key', () => {
    const parentOptions = defineComponent({
      name: 'FromProvider',
      setup() {
        provide('actual-source-key', 'from-value');
        return {};
      },
    });

    const childOptions = defineComponent({
      name: 'FromConsumer',
      setup() {
        const value = inject('alias-key', 'default', { from: 'actual-source-key' });
        return { injected: value };
      },
    });

    const parentVnode = { type: parentOptions, props: {}, children: null };
    const parentInstance = createComponentInstance(parentVnode, null);
    setupComponent(parentInstance);

    const childVnode = { type: childOptions, props: {}, children: null };
    const childInstance = createComponentInstance(childVnode, parentInstance);
    setupComponent(childInstance);

    expect(childInstance.setupState.injected).toBe('from-value');
  });

  it('should support local modifier to only check own provides', () => {
    const parentOptions = defineComponent({
      name: 'LocalProvider',
      setup() {
        provide('local-key', 'parent-value');
        return {};
      },
    });

    const childOptions = defineComponent({
      name: 'LocalConsumer',
      setup() {
        provide('local-key', 'own-value');
        const value = inject('local-key', 'default', { local: true });
        return { injected: value };
      },
    });

    const parentVnode = { type: parentOptions, props: {}, children: null };
    const parentInstance = createComponentInstance(parentVnode, null);
    setupComponent(parentInstance);

    const childVnode = { type: childOptions, props: {}, children: null };
    const childInstance = createComponentInstance(childVnode, parentInstance);
    setupComponent(childInstance);

    // local mode should find own provides, not parent's
    expect(childInstance.setupState.injected).toBe('own-value');
  });

  it('should return default when local modifier finds nothing', () => {
    const parentOptions = defineComponent({
      name: 'LocalDefaultProvider',
      setup() {
        provide('local-missing', 'parent-value');
        return {};
      },
    });

    const childOptions = defineComponent({
      name: 'LocalDefaultConsumer',
      setup() {
        // Don't provide 'local-missing' in child
        const value = inject('local-missing', 'local-default', { local: true });
        return { injected: value };
      },
    });

    const parentVnode = { type: parentOptions, props: {}, children: null };
    const parentInstance = createComponentInstance(parentVnode, null);
    setupComponent(parentInstance);

    const childVnode = { type: childOptions, props: {}, children: null };
    const childInstance = createComponentInstance(childVnode, parentInstance);
    setupComponent(childInstance);

    // local mode should NOT find parent's value, return default
    expect(childInstance.setupState.injected).toBe('local-default');
  });

  it('should maintain backward compatibility with two-argument form', () => {
    const options = defineComponent({
      name: 'BackwardCompat',
      setup() {
        const v1 = inject('key1');
        const v2 = inject('key2', 'default');
        return { v1, v2 };
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.setupState.v1).toBeUndefined();
    expect(instance.setupState.v2).toBe('default');
  });
});

describe('error handling', () => {
  it('should handle error in setup function', () => {
    const errorCaptured = vi.fn();

    const options = defineComponent({
      name: 'ErrorComp',
      errorCaptured,
      setup() {
        throw new Error('setup error');
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    // Should not throw
    expect(() => setupComponent(instance)).not.toThrow();
  });
});

describe('unmount', () => {
  it('should mark instance as unmounted', () => {
    const unmountedFn = vi.fn();

    const options = defineComponent({
      name: 'UnmountComp',
      unmounted: unmountedFn,
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.isUnmounted).toBe(false);

    callUnmountedHook(instance);

    expect(instance.isUnmounted).toBe(true);
    expect(unmountedFn).toHaveBeenCalledTimes(1);
  });
});
