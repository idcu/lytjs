// @vitest-environment jsdom
/**
 * `h()` 的**第二参数重载**（2026-11-01 新增）
 *
 * 此前第二个参数**一律当 props**，于是最常见的写法
 *
 * ```js
 * h('div', [h('span', null, 'X')])
 * ```
 *
 * 会把数组当 props 遍历 ⇒ `patchProp(el, '0', …)` ⇒
 * `DOMException: "0" did not match the Name production`，**整棵树渲染不出来**。
 * `h('div', 'txt')` 同病（字符串被当成 props 对象遍历）。
 *
 * 这类缺陷不会在编译产物里出现（模板走 `createElementVNode`），
 * 只会打在**手写 render 函数**的用户身上 —— 而 store / 组合式 API 的示例全是这么写的。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

async function mount(render: () => unknown): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({ render: render as never }).mount(host);
  return host;
}

describe('h() 第二参数重载', () => {
  it('h(type, childrenArray) —— 数组是子节点，不是 props', async () => {
    const host = await mount(() => h('div', [h('span', { class: 's' }, 'X')]));
    expect(host.querySelector('.s')?.textContent).toBe('X');
  });

  it('h(type, string) —— 字符串是文本子节点', async () => {
    const host = await mount(() => h('div', 'txt'));
    expect(host.textContent).toBe('txt');
  });

  it('h(type, number) —— 数字转文本', async () => {
    const host = await mount(() => h('div', 42));
    expect(host.textContent).toBe('42');
  });

  it('h(type, vnode) —— 单个 vnode 是子节点', async () => {
    const host = await mount(() => h('div', h('b', null, 'B')));
    expect(host.querySelector('b')?.textContent).toBe('B');
  });

  it('h(type, props, children) 仍然正确（不被重载影响）', async () => {
    const host = await mount(() => h('div', { class: 'p' }, [h('i', null, 'I')]));
    expect(host.querySelector('.p')).not.toBeNull();
    expect(host.querySelector('i')?.textContent).toBe('I');
  });

  it('h(type, props) 无子节点仍然正确', async () => {
    const host = await mount(() => h('div', { id: 'only' }));
    expect(host.querySelector('#only')).not.toBeNull();
  });

  it('嵌套数组被展平', async () => {
    const host = await mount(() => h('div', [[h('u', null, 'U')], [h('s', null, 'S')]]));
    expect(host.querySelector('u')?.textContent).toBe('U');
    expect(host.querySelector('s')?.textContent).toBe('S');
  });
});
