// tests/lifecycle.test.ts
// beforeCreate, created, beforeMount, mounted, beforeUpdate, updated, beforeUnmount, unmounted, errorCaptured, onMounted in setup

import { describe, it, expect, vi } from 'vitest';
import {
  createComponentInstance,
  setupComponent,
  defineComponent,
  callMountedHook,
  callUnmountedHook,
  callCreatedHook,
  callUpdatedHook,
  onMounted,
  onUpdated,
  onUnmounted,
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount,
  onErrorCaptured,
  handleError,
} from '../src/index';
import type { ComponentOptions } from '../src/types';

function createAndSetup(options: ComponentOptions, rawProps: Record<string, any> = {}) {
  const vnode = { type: options, props: rawProps, children: null };
  const instance = createComponentInstance(vnode, null);
  setupComponent(instance);
  return instance;
}

describe('lifecycle hooks', () => {
  it('should call beforeCreate hook', () => {
    const beforeCreate = vi.fn();
    const options = defineComponent({
      name: 'BeforeCreateComp',
      beforeCreate,
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(beforeCreate).toHaveBeenCalledTimes(1);
  });

  it('should call created hook', () => {
    const created = vi.fn();
    const options = defineComponent({
      name: 'CreatedComp',
      created,
    });

    const instance = createAndSetup(options);
    expect(created).toHaveBeenCalledTimes(1);
  });

  it('should call beforeMount and mounted hooks', () => {
    const beforeMount = vi.fn();
    const mounted = vi.fn();
    const options = defineComponent({
      name: 'MountComp',
      beforeMount,
      mounted,
    });

    const instance = createAndSetup(options);
    expect(beforeMount).not.toHaveBeenCalled();
    expect(mounted).not.toHaveBeenCalled();

    callMountedHook(instance);

    expect(beforeMount).toHaveBeenCalledTimes(1);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(instance.isMounted).toBe(true);
  });

  it('should call beforeUpdate and updated hooks', () => {
    const beforeUpdate = vi.fn();
    const updated = vi.fn();
    const options = defineComponent({
      name: 'UpdateComp',
      beforeUpdate,
      updated,
    });

    const instance = createAndSetup(options);
    callUpdatedHook(instance);

    expect(beforeUpdate).toHaveBeenCalledTimes(1);
    expect(updated).toHaveBeenCalledTimes(1);
  });

  it('should call beforeUnmount and unmounted hooks', () => {
    const beforeUnmount = vi.fn();
    const unmounted = vi.fn();
    const options = defineComponent({
      name: 'UnmountComp',
      beforeUnmount,
      unmounted,
    });

    const instance = createAndSetup(options);
    callUnmountedHook(instance);

    expect(beforeUnmount).toHaveBeenCalledTimes(1);
    expect(unmounted).toHaveBeenCalledTimes(1);
    expect(instance.isUnmounted).toBe(true);
  });

  it('should call errorCaptured hook', () => {
    const errorCaptured = vi.fn();
    const options = defineComponent({
      name: 'ErrorCapturedComp',
      errorCaptured,
    });

    const instance = createAndSetup(options);
    const err = new Error('test error');

    handleError(err, instance, 'test info');

    expect(errorCaptured).toHaveBeenCalledTimes(1);
    expect(errorCaptured).toHaveBeenCalledWith(err, instance, 'test info');
  });

  it('should propagate error to parent if not handled', () => {
    const parentErrorCaptured = vi.fn();
    const childErrorCaptured = vi.fn();

    const parentOptions = defineComponent({
      name: 'ParentErrorComp',
      errorCaptured: parentErrorCaptured,
    });

    const childOptions = defineComponent({
      name: 'ChildErrorComp',
      errorCaptured: childErrorCaptured,
    });

    const parentVnode = { type: parentOptions, props: {}, children: null };
    const parentInstance = createComponentInstance(parentVnode, null);
    setupComponent(parentInstance);

    const childVnode = { type: childOptions, props: {}, children: null };
    const childInstance = createComponentInstance(childVnode, parentInstance);
    setupComponent(childInstance);

    const err = new Error('child error');
    handleError(err, childInstance, 'child info');

    expect(childErrorCaptured).toHaveBeenCalledTimes(1);
    expect(parentErrorCaptured).toHaveBeenCalledTimes(1);
  });

  it('should stop error propagation when errorCaptured returns false', () => {
    const parentErrorCaptured = vi.fn();
    const childErrorCaptured = vi.fn(() => false);

    const parentOptions = defineComponent({
      name: 'ParentStopComp',
      errorCaptured: parentErrorCaptured,
    });

    const childOptions = defineComponent({
      name: 'ChildStopComp',
      errorCaptured: childErrorCaptured,
    });

    const parentVnode = { type: parentOptions, props: {}, children: null };
    const parentInstance = createComponentInstance(parentVnode, null);
    setupComponent(parentInstance);

    const childVnode = { type: childOptions, props: {}, children: null };
    const childInstance = createComponentInstance(childVnode, parentInstance);
    setupComponent(childInstance);

    const err = new Error('stopped error');
    handleError(err, childInstance, 'stopped info');

    expect(childErrorCaptured).toHaveBeenCalledTimes(1);
    // Parent should NOT be called because child returned false
    expect(parentErrorCaptured).not.toHaveBeenCalled();
  });

  it('should register onMounted in setup and call it', () => {
    const mountedFn = vi.fn();

    const options = defineComponent({
      name: 'SetupMountedComp',
      setup() {
        onMounted(mountedFn);
        return {};
      },
    });

    const instance = createAndSetup(options);
    expect(mountedFn).not.toHaveBeenCalled();

    callMountedHook(instance);
    expect(mountedFn).toHaveBeenCalledTimes(1);
  });

  it('should register onUnmounted in setup and call it', () => {
    const unmountedFn = vi.fn();

    const options = defineComponent({
      name: 'SetupUnmountedComp',
      setup() {
        onUnmounted(unmountedFn);
        return {};
      },
    });

    const instance = createAndSetup(options);
    expect(unmountedFn).not.toHaveBeenCalled();

    callUnmountedHook(instance);
    expect(unmountedFn).toHaveBeenCalledTimes(1);
  });
});
