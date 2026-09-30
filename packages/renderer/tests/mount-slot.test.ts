// @vitest-environment jsdom
/**
 * 运行期原语：`mountSlot()` —— signal/Vapor 模式下 `<slot/>` 出口的挂载能力。
 *
 * 这是「`<slot/>` 与 `$slots` 对接」缺口三段中的**第 3 段**（运行期）。
 * 本文件独立验证它：给插槽函数 + 容器，断言**真实 DOM**。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { h, defineComponent } from '@lytjs/core';
import { mountSlot } from '../src/index';

describe('mountSlot()', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('单个 vnode：挂载进容器', () => {
    mountSlot(() => h('b', { id: 'one' }, 'ONE'), container);
    expect(container.querySelector('#one')?.textContent).toBe('ONE');
  });

  it('vnode 数组：全部挂载（Fragment 承载）', () => {
    mountSlot(
      () => [h('i', { id: 'a' }, 'A'), h('i', { id: 'b' }, 'B'), h('i', { id: 'c' }, 'C')],
      container,
    );
    expect(container.querySelectorAll('i')).toHaveLength(3);
    expect(container.textContent).toBe('ABC');
  });

  it('纯文本 vnode 也可挂载', () => {
    mountSlot(() => h('span', {}, 'TXT'), container);
    expect(container.textContent).toContain('TXT');
  });

  it('插槽函数返回空 ⇒ 容器为空且不抛错', () => {
    expect(() => mountSlot(() => null, container)).not.toThrow();
    expect(container.innerHTML).toBe('');
  });

  it('插槽函数缺失（undefined）⇒ 不抛错且容器为空', () => {
    expect(() => mountSlot(undefined, container)).not.toThrow();
    expect(container.innerHTML).toBe('');
  });

  it('作用域插槽：props 传给插槽函数', () => {
    const seen: unknown[] = [];
    mountSlot(
      (p?: unknown) => {
        seen.push(p);
        return h('u', {}, String((p as { item?: string } | undefined)?.item ?? ''));
      },
      container,
      { item: 'ROW' },
    );
    expect(seen[0]).toEqual({ item: 'ROW' });
    expect(container.textContent).toBe('ROW');
  });

  it('插槽内是组件 vnode：组件被正常挂载渲染', () => {
    const Child = defineComponent({
      name: 'SlotChild',
      setup() {
        return () => h('em', { id: 'slot-child' }, 'CHILD');
      },
    });
    mountSlot(() => h(Child as never, {}, null as never), container);
    expect(container.querySelector('#slot-child')?.textContent).toBe('CHILD');
  });
});
