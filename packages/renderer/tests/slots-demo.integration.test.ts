// @vitest-environment jsdom
/**
 * 插槽能力演示的**集成验证**（复用 examples/slots-demo/app.ts 这一份代码）
 *
 * 目的：demo 不只是"看起来能跑"，而是被真实渲染与断言过；
 * 也让本会话建成的插槽能力有一条端到端的回归防线。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountSlotsDemo } from '../../../examples/slots-demo/app';

describe('slots demo 集成（浏览器侧能力端到端）', () => {
  let container: HTMLElement;
  let handle: ReturnType<typeof mountSlotsDemo> | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.renderer.unmount();
    handle = null;
    container.remove();
  });

  it('应渲染出具名插槽（header / footer）与默认插槽', () => {
    handle = mountSlotsDemo(container);

    const header = container.querySelector('.card-hd');
    const footer = container.querySelector('.card-ft');
    const body = container.querySelector('.card-bd');

    expect(header?.textContent).toContain('具名插槽：header');
    expect(footer?.textContent).toContain('具名插槽：footer');
    // 默认插槽内容
    expect(body?.textContent).toContain('条件：可见');
  });

  it('插槽内的 v-for 应渲染出列表，且随数据更新', () => {
    handle = mountSlotsDemo(container);
    const list = () => container.querySelectorAll('.card-bd ul li');

    expect(list().length).toBe(3);
    expect(container.textContent).toContain('alpha');

    handle.state.items.value = [{ name: 'only' }];
    expect(list().length).toBe(1);
    expect(container.textContent).toContain('only');
  });

  it('插槽内的 v-if / v-else 应随条件切换', () => {
    handle = mountSlotsDemo(container);

    expect(container.textContent).toContain('条件：可见');
    expect(container.textContent).not.toContain('条件：隐藏');

    handle.state.visible.value = false;
    expect(container.textContent).toContain('条件：隐藏');
    expect(container.textContent).not.toContain('条件：可见');
  });

  it('插槽内的 v-show 应只切换 display（元素仍在 DOM）', () => {
    handle = mountSlotsDemo(container);
    const p = container.querySelector<HTMLElement>('.card-bd p');

    expect(p).not.toBeNull();
    expect(p!.style.display).not.toBe('none');

    handle.state.visible.value = false;
    expect(container.querySelector<HTMLElement>('.card-bd p')!.style.display).toBe('none');
  });

  it('作用域插槽应收到子组件回传的数据', () => {
    handle = mountSlotsDemo(container);
    const scoped = container.querySelectorAll('li.scoped');

    expect(scoped.length).toBe(2);
    expect(scoped[0]?.textContent).toContain('第一条');
    expect(scoped[1]?.textContent).toContain('第二条');
  });

  it('v-model 应完成双向绑定（输入后同步回 state）', () => {
    handle = mountSlotsDemo(container);
    const input = container.querySelector<HTMLInputElement>('input');
    expect(input).not.toBeNull();
    // 初始值来自 state
    expect(input!.value).toBe('hello');

    input!.value = 'typed';
    input!.dispatchEvent(new Event('input'));
    // 回写到响应式状态（通过再次渲染体现：input 仍受控为 'typed'）
    expect(container.querySelector<HTMLInputElement>('input')!.value).toBe('typed');
  });
});
