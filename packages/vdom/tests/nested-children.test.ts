/**
 * 嵌套数组 children 的自动展平（回归防线）
 *
 * 场景：槽函数返回**数组**，多次调用直接组合成 children ⇒ [[a],[b]]。
 * 若不展平，渲染器会**静默丢弃**整组节点（不渲染且无报错，极难排查）。
 */

import { describe, it, expect } from 'vitest';
import { createVNode, Text } from '../src/index';

describe('createVNode - 嵌套数组 children 应被展平', () => {
  it('应把 [[a],[b]] 展平为 [a,b]', () => {
    const a = createVNode('li', null, 'A');
    const b = createVNode('li', null, 'B');
    const vnode = createVNode('ul', null, [[a], [b]] as never);

    const children = vnode.children as unknown[];
    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBe(2);
    // 展平后不应再有数组项
    expect(children.some(Array.isArray)).toBe(false);
    expect(children[0]).toBe(a);
    expect(children[1]).toBe(b);
  });

  it('多层嵌套也应展平', () => {
    const x = createVNode(Text, null, 'x');
    const vnode = createVNode('div', null, [[[x]], []] as never);
    const children = vnode.children as unknown[];
    expect(children.length).toBe(1);
    expect(children[0]).toBe(x);
  });

  it('原本就是一维数组时行为不变（顺序与内容一致）', () => {
    const a = createVNode('li', null, 'A');
    const b = createVNode('li', null, 'B');
    const vnode = createVNode('ul', null, [a, b] as never);
    const children = vnode.children as unknown[];
    expect(children.length).toBe(2);
    expect(children[0]).toBe(a);
    expect(children[1]).toBe(b);
  });
});
