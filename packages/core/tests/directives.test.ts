import { describe, it, expect, vi } from 'vitest';
import { withDirectives, withMemo } from '../src/directives';
import type { VNode, DirectiveArguments } from '../src/types';

function createMockVNode(): VNode {
  return { type: 'div', props: null, children: null } as unknown as VNode;
}

describe('withDirectives', () => {
  it('将指令信息存储到 VNode 的 _directives 属性', () => {
    const vnode = createMockVNode();
    const dir = { mounted: vi.fn(), updated: vi.fn() };
    const directives: DirectiveArguments = [[dir as any, 'value', 'arg', { modifier: true }]];

    const result = withDirectives(vnode, directives);

    expect(result).toBe(vnode);
    expect((result as any)._directives).toHaveLength(1);
    expect((result as any)._directives[0]).toEqual({
      dir: expect.any(Object),
      value: 'value',
      arg: 'arg',
      modifiers: { modifier: true },
    });
  });

  it('modifiers 为 undefined 时默认为空对象', () => {
    const vnode = createMockVNode();
    const dir = { mounted: vi.fn() };
    const directives: DirectiveArguments = [[dir as any, 'value', 'arg']];

    const result = withDirectives(vnode, directives);

    expect((result as any)._directives[0].modifiers).toEqual({});
  });

  it('支持多个指令组合', () => {
    const vnode = createMockVNode();
    const dir1 = { mounted: vi.fn() };
    const dir2 = { updated: vi.fn() };
    const directives: DirectiveArguments = [
      [dir1 as any, 'v1', 'a1', { m1: true }],
      [dir2 as any, 'v2', 'a2', { m2: true }],
    ];

    const result = withDirectives(vnode, directives);

    expect((result as any)._directives).toHaveLength(2);
    expect((result as any)._directives[0].value).toBe('v1');
    expect((result as any)._directives[1].value).toBe('v2');
  });

  it('返回同一 VNode 引用', () => {
    const vnode = createMockVNode();
    const dir = { mounted: vi.fn() };
    const directives: DirectiveArguments = [[dir as any, 'val', 'arg']];

    const result = withDirectives(vnode, directives);

    expect(result).toBe(vnode);
  });

  it('指令参数正确映射 dir/value/arg/modifiers', () => {
    const vnode = createMockVNode();
    const dir = { created: vi.fn(), beforeMount: vi.fn() };
    const directives: DirectiveArguments = [[dir as any, 42, 'focus', { lazy: true, once: true }]];

    withDirectives(vnode, directives);

    const stored = (vnode as any)._directives[0];
    expect(stored.dir).toBe(dir);
    expect(stored.value).toBe(42);
    expect(stored.arg).toBe('focus');
    expect(stored.modifiers).toEqual({ lazy: true, once: true });
  });
});

describe('withMemo', () => {
  it('缓存命中时返回缓存结果', () => {
    const cache: Array<{ memo: unknown[]; result: VNode }> = [];
    const memo = [1, 2, 3];
    const render = vi.fn(() => createMockVNode());

    const result1 = withMemo(memo, render, cache, 0);
    const result2 = withMemo(memo, render, cache, 0);

    expect(result1).toBe(result2);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('缓存失效时重新执行 render', () => {
    const cache: Array<{ memo: unknown[]; result: VNode }> = [];
    const render = vi.fn(() => createMockVNode());

    const result1 = withMemo([1, 2, 3], render, cache, 0);
    const result2 = withMemo([1, 2, 4], render, cache, 0);

    expect(render).toHaveBeenCalledTimes(2);
    expect(result1).not.toBe(result2);
  });

  it('memo 长度不同导致缓存失效', () => {
    const cache: Array<{ memo: unknown[]; result: VNode }> = [];
    const render = vi.fn(() => createMockVNode());

    withMemo([1, 2, 3], render, cache, 0);
    withMemo([1, 2], render, cache, 0);

    expect(render).toHaveBeenCalledTimes(2);
  });

  it('空 memo 数组缓存命中', () => {
    const cache: Array<{ memo: unknown[]; result: VNode }> = [];
    const render = vi.fn(() => createMockVNode());

    const result1 = withMemo([], render, cache, 0);
    const result2 = withMemo([], render, cache, 0);

    expect(result1).toBe(result2);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('不同 index 独立缓存', () => {
    const cache: Array<{ memo: unknown[]; result: VNode }> = [];
    const render = vi.fn(() => createMockVNode());

    const result1 = withMemo([1, 2], render, cache, 0);
    const result2 = withMemo([3, 4], render, cache, 1);

    expect(render).toHaveBeenCalledTimes(2);
    expect(result1).not.toBe(result2);
  });

  it('首次调用时缓存为空应执行 render', () => {
    const cache: Array<{ memo: unknown[]; result: VNode }> = [];
    const vnode = createMockVNode();
    const render = vi.fn(() => vnode);

    const result = withMemo([1], render, cache, 0);

    expect(render).toHaveBeenCalledTimes(1);
    expect(result).toBe(vnode);
    expect(cache[0].memo).toEqual([1]);
    expect(cache[0].result).toBe(vnode);
  });
});
