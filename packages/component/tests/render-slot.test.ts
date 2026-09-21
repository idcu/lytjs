/**
 * renderSlot 运行时测试
 *
 * 契约：`<slot>` 编译产物调用 renderSlot(_ctx.$slots, name, props, fallback)，
 * 该函数必须能处理：具名插槽 / 缺失插槽 / 回退内容 / 非数组返回值 / 无 slots 对象。
 */

import { describe, it, expect, vi } from 'vitest';
import { createVNode } from '@lytjs/vdom';
import { renderSlot, normalizeSlotValue } from '../src/slots';

const vnodeA = createVNode('i', null, 'A');
const vnodeB = createVNode('i', null, 'B');

describe('renderSlot', () => {
  it('命中插槽时应调用插槽函数并返回规范化后的数组', () => {
    const slot = vi.fn(() => [vnodeA]);
    const result = renderSlot({ default: slot }, 'default');

    expect(slot).toHaveBeenCalledTimes(1);
    expect(result).toEqual([vnodeA]);
  });

  it('插槽返回单个 VNode 时应规范化为数组', () => {
    const result = renderSlot({ default: () => vnodeA }, 'default');
    expect(result).toEqual([vnodeA]);
  });

  it('应把 props 透传给作用域插槽', () => {
    const slot = vi.fn(() => [vnodeA]);
    renderSlot({ item: slot }, 'item', { user: { id: 1 } });

    expect(slot).toHaveBeenCalledWith({ user: { id: 1 } });
  });

  it('插槽缺失时应返回回退内容', () => {
    const result = renderSlot({}, 'default', {}, [vnodeB]);
    expect(result).toEqual([vnodeB]);
  });

  it('插槽缺失且无回退内容时应返回空数组', () => {
    expect(renderSlot({}, 'default')).toEqual([]);
  });

  it('slots 为 undefined/null 时不应抛错', () => {
    expect(renderSlot(undefined, 'default')).toEqual([]);
    expect(renderSlot(null, 'header', {}, vnodeB)).toEqual([vnodeB]);
  });

  it('具名插槽应各取各的', () => {
    const slots = { header: () => [vnodeA], footer: () => [vnodeB] };
    expect(renderSlot(slots, 'header')).toEqual([vnodeA]);
    expect(renderSlot(slots, 'footer')).toEqual([vnodeB]);
    expect(renderSlot(slots, 'default')).toEqual([]);
  });

  it('normalizeSlotValue 应把 nullish 归一为空数组', () => {
    expect(normalizeSlotValue(null)).toEqual([]);
    expect(normalizeSlotValue(undefined)).toEqual([]);
  });
});
