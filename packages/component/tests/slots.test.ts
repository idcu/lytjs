/* eslint-disable @typescript-eslint/no-unused-vars */
// tests/slots.test.ts
// Default slot, named slots, slot props, scoped slots, fallback content, dynamic slots, slot not provided, slot with v-for, nested slots, conditional slots

import { describe, it, expect, vi } from 'vitest';
import {
  createComponentInstance,
  setupComponent,
  defineComponent,
  initSlots,
  normalizeSlotValue,
} from '../src/index';
import type { ComponentInternalInstance, ComponentOptions, InternalSlots } from '../src/types';

function createAndSetup(
  options: ComponentOptions,
  rawProps: Record<string, any> = {},
  children: any = null,
) {
  const vnode = { type: options, props: rawProps, children };
  const instance = createComponentInstance(vnode, null);
  setupComponent(instance);
  return instance;
}

describe('slots', () => {
  it('should initialize default slot from function children', () => {
    const defaultSlot = vi.fn(() => ['default content']);
    const options = defineComponent({ name: 'DefaultSlotComp' });

    const vnode = { type: options, props: {}, children: defaultSlot };
    const instance = createComponentInstance(vnode, null);
    initSlots(instance, defaultSlot);

    expect(instance.slots.default).toBeDefined();
    expect(instance.slots.default?.()).toEqual(['default content']);
  });

  it('should initialize named slots from object children', () => {
    const headerSlot = vi.fn(() => ['header content']);
    const footerSlot = vi.fn(() => ['footer content']);

    const options = defineComponent({ name: 'NamedSlotComp' });
    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    const children = {
      header: headerSlot,
      footer: footerSlot,
    };
    initSlots(instance, children);

    expect(instance.slots.header).toBeDefined();
    expect(instance.slots.footer).toBeDefined();
    expect(instance.slots.header?.()).toEqual(['header content']);
    expect(instance.slots.footer?.()).toEqual(['footer content']);
  });

  it('should support slot props (scoped slots)', () => {
    const scopedSlot = vi.fn((props: any) => [`item: ${props.item}`]);
    const options = defineComponent({ name: 'ScopedSlotComp' });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    const children = {
      default: scopedSlot,
    };
    initSlots(instance, children);

    const result = instance.slots.default?.({ item: 'hello' });
    expect(result).toEqual(['item: hello']);
    expect(scopedSlot).toHaveBeenCalledWith({ item: 'hello' });
  });

  it('should handle fallback content when slot is not provided', () => {
    const options = defineComponent({ name: 'FallbackComp' });
    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    initSlots(instance, null);

    // Default slot should be undefined
    expect(instance.slots.default).toBeUndefined();
  });

  it('should handle dynamic slot names', () => {
    const slotA = vi.fn(() => ['slot A']);
    const slotB = vi.fn(() => ['slot B']);

    const options = defineComponent({ name: 'DynamicSlotComp' });
    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    const children = {
      slotA,
      slotB,
    };
    initSlots(instance, children);

    // Access slots dynamically
    const dynamicName = 'slotA';
    const result = instance.slots[dynamicName]?.();
    expect(result).toEqual(['slot A']);
  });

  it('should return undefined for non-provided slots', () => {
    const options = defineComponent({ name: 'NoSlotComp' });
    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    initSlots(instance, { default: () => ['only default'] });

    expect(instance.slots.default).toBeDefined();
    expect(instance.slots.header).toBeUndefined();
    expect(instance.slots.footer).toBeUndefined();
  });

  it('should support slot with v-for pattern (multiple items)', () => {
    const listSlot = vi.fn(() => ['item1', 'item2', 'item3']);

    const options = defineComponent({ name: 'ForSlotComp' });
    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    initSlots(instance, { default: listSlot });

    const result = instance.slots.default?.();
    expect(result).toEqual(['item1', 'item2', 'item3']);
  });

  it('should support nested slots', () => {
    const innerSlot = vi.fn(() => ['inner content']);
    const outerSlot = vi.fn(() => ['outer content']);

    const options = defineComponent({ name: 'NestedSlotComp' });
    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    initSlots(instance, {
      outer: outerSlot,
      inner: innerSlot,
    });

    expect(instance.slots.outer?.()).toEqual(['outer content']);
    expect(instance.slots.inner?.()).toEqual(['inner content']);
  });

  it('should support conditional slots', () => {
    const conditionalSlot = vi.fn(() => {
      return Math.random() > 0.5 ? ['shown'] : [];
    });

    const options = defineComponent({ name: 'ConditionalSlotComp' });
    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);

    initSlots(instance, { conditional: conditionalSlot });

    // Call multiple times - slot function is callable
    const result = instance.slots.conditional?.();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should pass slots through setup context', () => {
    let capturedSlots: InternalSlots | undefined;

    const options = defineComponent({
      name: 'SetupSlotComp',
      setup(_props, ctx) {
        capturedSlots = ctx.slots;
        return {};
      },
    });

    const defaultSlot = vi.fn(() => ['setup slot content']);
    const vnode = { type: options, props: {}, children: defaultSlot };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(capturedSlots).toBeDefined();
    expect(capturedSlots?.default).toBeDefined();
    expect(capturedSlots?.default?.()).toEqual(['setup slot content']);
  });
});

describe('normalizeSlotValue', () => {
  it('should normalize null/undefined to empty array', () => {
    expect(normalizeSlotValue(null)).toEqual([]);
    expect(normalizeSlotValue(undefined)).toEqual([]);
  });

  it('should pass through arrays', () => {
    expect(normalizeSlotValue([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('should wrap non-array values in array', () => {
    expect(normalizeSlotValue('text')).toEqual(['text']);
    expect(normalizeSlotValue(42)).toEqual([42]);
  });
});

// ⚠️ 2026-10-27 新增（P0 回归）：插槽返回**单个 VNode** 时也必须能安全展开
//
// 起因：`slots.default()` 的契约允许返回单个 VNode，而组件里普遍写
// `children.push(...slots.default())` —— 单 vnode 直接抛
// `Spread syntax requires ...iterable[Symbol.iterator]`，整棵渲染崩溃。
// 实测 `<Modal><input/></Modal>`（单子节点）就会崩，而既有测试都传数组所以没被发现。
describe('initSlots 规范化返回值（P0 回归）', () => {
  const makeInstance = () =>
    ({ slots: {}, type: { name: 'X' }, props: {}, ctx: {} }) as unknown as Parameters<
      typeof initSlots
    >[0];

  it('默认插槽返回单个 VNode 时应可被展开', () => {
    const instance = makeInstance();
    const vnode = { __v_isVNode: true, type: 'div' } as never;
    initSlots(instance, () => vnode);

    const result = instance.slots.default!({});
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([vnode]);
    // 关键：展开不再抛
    expect(() => [...(result as never[])]).not.toThrow();
  });

  it('具名插槽返回单个 VNode 时同样规范化', () => {
    const instance = makeInstance();
    const vnode = { __v_isVNode: true, type: 'span' } as never;
    initSlots(instance, { header: () => vnode });

    const result = instance.slots.header!({});
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([vnode]);
  });

  it('返回数组时保持原样（不额外包一层）', () => {
    const instance = makeInstance();
    const vnode = { __v_isVNode: true, type: 'i' } as never;
    initSlots(instance, { default: () => [vnode] });

    expect(instance.slots.default!({})).toEqual([vnode]);
  });
});
