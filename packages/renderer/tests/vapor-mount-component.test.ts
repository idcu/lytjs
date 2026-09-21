// @vitest-environment jsdom
/**
 * Signal/Vapor 模式的组件挂载运行时测试
 *
 * 此前 Vapor 模式把组件标签当成普通 HTML 元素写进模板串（DOM 里出现字面量
 * <Child />，组件逻辑完全不执行）。现在由 mountComponent() 真挂载。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVNode } from '@lytjs/vdom';
import { ref } from '@lytjs/reactivity';
import { mountComponent, resetVaporComponentRenderer } from '../src/vapor/mount-component';

describe('mountComponent（Vapor 运行时）', () => {
  beforeEach(() => {
    resetVaporComponentRenderer();
  });

  it('应把 setup 返回渲染函数的组件挂载进容器', () => {
    const container = document.createElement('div');
    const Hello = {
      name: 'Hello',
      setup() {
        return () => createVNode('p', null, 'hello vapor');
      },
    };

    mountComponent(Hello, null, container);
    expect(container.innerHTML).toContain('<p>hello vapor</p>');
  });

  it('props 应传给组件的 setup', () => {
    const container = document.createElement('div');
    const Greet = {
      name: 'Greet',
      setup(props: Record<string, unknown>) {
        return () => createVNode('span', null, String(props.name));
      },
    };

    mountComponent(Greet, { name: 'lytjs' }, container);
    expect(container.innerHTML).toContain('lytjs');
  });

  it('响应式状态变化后应重新渲染（整体重渲染策略）', async () => {
    const container = document.createElement('div');
    const count = ref(1);
    const Counter = {
      name: 'Counter',
      setup() {
        return () => createVNode('b', null, String(count.value));
      },
    };

    mountComponent(Counter, null, container);
    expect(container.textContent).toContain('1');

    count.value = 2;
    // 调度器可能是异步的，给一次微任务机会
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toContain('2');
  });

  it('容器为 DocumentFragment（无 textContent）时也应能挂载', () => {
    const frag = document.createDocumentFragment();
    const Hello = {
      name: 'Hello',
      setup() {
        return () => createVNode('i', null, 'frag');
      },
    };

    mountComponent(Hello, null, frag);
    expect(frag.textContent).toContain('frag');
  });

  it('组件定义或容器为空时不应抛错', () => {
    expect(() => mountComponent(null, null, null)).not.toThrow();
    expect(() => mountComponent(undefined, {}, undefined)).not.toThrow();
  });
});
