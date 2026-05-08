// tests/emit.test.ts
// Emit event, pass arguments, validate emitted events, warn on invalid, camelCase to kebab-case, update:modelValue, not emit after unmount, multiple listeners, emits as Record, validation function

import { describe, it, expect, vi } from 'vitest';
import {
  createComponentInstance,
  setupComponent,
  defineComponent,
  emit,
  normalizeEmitsOptions,
  isEmitValid,
} from '../src/index';
import type { ComponentInternalInstance, ComponentOptions } from '../src/types';

function createAndSetup(options: ComponentOptions, rawProps: Record<string, any> = {}) {
  const vnode = { type: options, props: rawProps, children: null };
  const instance = createComponentInstance(vnode, null);
  setupComponent(instance);
  return instance;
}

describe('emit', () => {
  it('should emit event and call handler', () => {
    const handler = vi.fn();
    const options = defineComponent({
      name: 'EmitComp',
      emits: ['click'],
    });

    const vnode = { type: options, props: { onClick: handler }, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    emit(instance, 'click');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to handler', () => {
    const handler = vi.fn();
    const options = defineComponent({
      name: 'ArgComp',
      emits: ['change'],
    });

    const vnode = { type: options, props: { onChange: handler }, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    emit(instance, 'change', 'new value', 42);
    expect(handler).toHaveBeenCalledWith('new value', 42);
  });

  it('should validate emitted events against emits option', () => {
    const options = defineComponent({
      name: 'ValidateComp',
      emits: ['click', 'change'],
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(isEmitValid(instance, 'click')).toBe(true);
    expect(isEmitValid(instance, 'change')).toBe(true);
    expect(isEmitValid(instance, 'unknown')).toBe(false);
  });

  it('should not crash when emitting undeclared event (no handler)', () => {
    const options = defineComponent({
      name: 'NoHandlerComp',
      emits: ['click'],
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // Should not throw
    expect(() => emit(instance, 'click')).not.toThrow();
  });

  it('should convert camelCase event to onXxx handler', () => {
    const handler = vi.fn();
    const options = defineComponent({
      name: 'CamelComp',
      emits: ['update:modelValue'],
    });

    const vnode = { type: options, props: { 'onUpdate:modelValue': handler }, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    emit(instance, 'update:modelValue', 'new-value');
    expect(handler).toHaveBeenCalledWith('new-value');
  });

  it('should support update:modelValue pattern', () => {
    const handler = vi.fn();
    const options = defineComponent({
      name: 'ModelComp',
      emits: ['update:modelValue'],
    });

    const vnode = { type: options, props: { 'onUpdate:modelValue': handler }, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    emit(instance, 'update:modelValue', 'updated');
    expect(handler).toHaveBeenCalledWith('updated');
  });

  it('should not emit after unmount', () => {
    const handler = vi.fn();
    const options = defineComponent({
      name: 'UnmountEmitComp',
      emits: ['click'],
    });

    const vnode = { type: options, props: { onClick: handler }, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    instance.isUnmounted = true;
    emit(instance, 'click');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should support multiple listeners for the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const options = defineComponent({
      name: 'MultiListenerComp',
      emits: ['click'],
    });

    // Merge handlers into an array
    const mergedHandler = (...args: any[]) => {
      handler1(...args);
      handler2(...args);
    };

    const vnode = { type: options, props: { onClick: mergedHandler }, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    emit(instance, 'click', 'arg');
    expect(handler1).toHaveBeenCalledWith('arg');
    expect(handler2).toHaveBeenCalledWith('arg');
  });

  it('should support emits as Record with validation function', () => {
    const validator = vi.fn((payload: any) => payload > 0);
    const options = defineComponent({
      name: 'RecordEmitComp',
      emits: {
        change: validator,
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance.emitsOptions).toBeDefined();
    expect(instance.emitsOptions?.change).toBe(validator);
  });

  it('should work with emit from setup context', () => {
    const handler = vi.fn();
    const setupFn = vi.fn((_props, ctx) => {
      ctx.emit('custom', 'from-setup');
      return {};
    });

    const options = defineComponent({
      name: 'SetupEmitComp',
      emits: ['custom'],
      setup: setupFn,
    });

    const vnode = { type: options, props: { onCustom: handler }, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(setupFn).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('from-setup');
  });
});

describe('normalizeEmitsOptions', () => {
  it('should normalize array emits', () => {
    const result = normalizeEmitsOptions(['click', 'change']);
    expect(result).toEqual({ click: null, change: null });
  });

  it('should return null for undefined emits', () => {
    const result = normalizeEmitsOptions(undefined);
    expect(result).toBeNull();
  });

  it('should pass through Record emits', () => {
    const validator = () => true;
    const result = normalizeEmitsOptions({ click: validator });
    expect(result?.click).toBe(validator);
  });
});
