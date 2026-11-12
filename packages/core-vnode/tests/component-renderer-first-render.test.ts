// @vitest-environment jsdom
/**
 * `createDOMRenderer().render()` 首帧必须收集响应式依赖。
 *
 * ## 回归背景（2026-11-12，R-P0-4）
 *
 * `web-dom-renderer.ts` 的 `render()` 曾把**首次挂载**包在
 * `withFirstRenderOptimization()` 里，而 `trackEffect()` 在优化窗口内**直接 return**
 * ⇒ 组件渲染 effect 首帧读到的每一个状态都没有被订阅。
 *
 * 现象：通过 `renderer.render(vnode, container)`（公开 API，adapter-web README 首例）
 * 挂载的组件，首帧正确、**之后任何 state 变更都不再更新**，页面冻结。
 *
 * `createApp().mount()` 走的是 `renderer.mount()`，没被包住，所以既有测试全绿也没暴露它。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createVNode } from '@lytjs/vdom';
import { ref } from '@lytjs/reactivity';
import { nextTick } from '@lytjs/common-scheduler';
import { createAppContext } from '@lytjs/component';
import { createComponentRenderer } from '../src/component-renderer';

afterEach(() => {
  document.body.innerHTML = '';
});

function newContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('createDOMRenderer().render() 首帧依赖收集', () => {
  it('★ 首帧渲染后 state 变更必须触发重渲染', async () => {
    const count = ref(0);
    const Counter = {
      name: 'FirstRenderCounter',
      render() {
        return createVNode('div', null, `n=${count.value}`);
      },
    };

    const renderer = createComponentRenderer(createAppContext);
    const container = newContainer();

    renderer.render(createVNode(Counter), container);
    expect(container.textContent).toBe('n=0');

    count.value = 1;
    await nextTick();

    // 改前：仍是 `n=0`（首帧未订阅）
    expect(container.textContent).toBe('n=1');
  });
});
