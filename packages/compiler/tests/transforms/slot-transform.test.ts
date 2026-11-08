/**
 * `<slot>` 出口的编译产物
 *
 * 判据：执行产物，注入 `$slots`，断言**渲染出来的内容**。
 * 出口若没被编译成 renderSlot，拿到的是 `createVNode("slot")` ⇒ 渲染结果对不上。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/index';
import { asVNode, execute } from '../support/execute';

const render = (template: string, ctx: Record<string, unknown> = {}): unknown =>
  execute(compile(template))(ctx);

const childrenOf = (value: unknown): unknown[] => {
  const node = asVNode(value);
  return Array.isArray(node.children) ? node.children : [node.children];
};

const withDefault = (slot: (props?: Record<string, unknown>) => unknown) => ({
  $slots: { default: slot },
});

describe('transformSlot - <slot> 编译', () => {
  it('默认插槽渲染出 $slots.default 的内容', () => {
    expect(
      childrenOf(
        render(
          '<div><slot/></div>',
          withDefault(() => 'SLOT'),
        ),
      ),
    ).toEqual(['SLOT']);
  });

  it('具名插槽渲染出对应插槽的内容', () => {
    const ctx = { $slots: { header: () => 'HEADER' } };
    expect(childrenOf(render('<div><slot name="header"/></div>', ctx))).toEqual(['HEADER']);
  });

  it('动态插槽名按上下文求值', () => {
    const ctx = { $slots: { header: () => 'HEADER' }, slotName: 'header' };
    expect(childrenOf(render('<div><slot :name="slotName"/></div>', ctx))).toEqual(['HEADER']);
  });

  it('作用域插槽参数传给插槽函数', () => {
    const ctx = {
      $slots: { default: (props?: Record<string, unknown>) => `user:${props?.user}` },
      currentUser: 'U',
    };
    expect(childrenOf(render('<div><slot :user="currentUser"/></div>', ctx))).toEqual(['user:U']);
  });

  it('静态属性同样作为插槽参数传入', () => {
    const ctx = { $slots: { default: (props?: Record<string, unknown>) => props?.label } };
    expect(childrenOf(render('<div><slot label="hi"/></div>', ctx))).toEqual(['hi']);
  });

  it('无插槽时渲染回退内容', () => {
    const fallback = asVNode(
      asVNode(render('<div><slot><span>fallback</span></slot></div>')).children,
    );
    expect(fallback.type).toBe('span');
    expect(fallback.children).toBe('fallback');
  });

  it('slot 作为根节点时直接返回插槽内容（不再包 createVNode）', () => {
    expect(
      render(
        '<slot/>',
        withDefault(() => 'SLOT'),
      ),
    ).toBe('SLOT');
  });

  it('slot 出口不得退化成 type 为 "slot" 的 VNode', () => {
    const node = asVNode(
      render(
        '<div><slot/></div>',
        withDefault(() => 'SLOT'),
      ),
    );
    expect(node.children).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'slot' })]),
    );
  });
});
