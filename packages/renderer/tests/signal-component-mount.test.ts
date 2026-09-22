// @vitest-environment jsdom
/**
 * SignalRenderer 端到端：模板中出现组件时应真正挂载
 *
 * 背景：运行时的 SignalRenderer 走的是**非优化版** codegen（optimizeSignal: false），
 * 而组件支持最初只加在优化版里 —— 也就是说"编译期看着支持、运行时仍然不生效"。
 * 本文件锁定运行时的真实行为：模板里的 <Child/> 必须被挂载成组件的渲染结果，
 * 而不是在 DOM 里留一个字面量 <Child /> 标签。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVNode } from '@lytjs/vdom';
import { ref } from '@lytjs/reactivity';
import { createSignalRenderer } from '../src/signal/signal-renderer';
import { resetVaporComponentRenderer } from '../src/vapor/mount-component';

describe('SignalRenderer + 组件挂载', () => {
  let container: HTMLElement;

  beforeEach(() => {
    resetVaporComponentRenderer();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('模板中的组件应被真实挂载（DOM 中不应残留 <Child /> 字面量）', () => {
    const Child = {
      name: 'Child',
      setup() {
        return () => createVNode('strong', null, 'from-child');
      },
    };

    const renderer = createSignalRenderer('<div><Child/></div>', { Child });
    renderer.render(container);

    expect(container.innerHTML).toContain('from-child');
    // 占位元素会被组件内容替换掉
    expect(container.querySelector('lyt-comp')).toBeNull();

    renderer.unmount();
  });

  it('静态属性应作为 props 传入组件', () => {
    const Child = {
      name: 'Child',
      props: { label: { type: String, default: '' } },
      setup(props: Record<string, unknown>) {
        return () => createVNode('em', null, String(props.label));
      },
    };

    const renderer = createSignalRenderer('<div><Child label="hi"/></div>', { Child });
    renderer.render(container);

    expect(container.innerHTML).toContain('hi');
    renderer.unmount();
  });

  it('组件 emit 的事件应触达父级 @事件处理器', () => {
    let clicked = 0;
    const Child = {
      name: 'Child',
      emits: ['click'],
      setup(_props: unknown, ctx: { emit: (e: string, ...a: unknown[]) => void }) {
        return () => {
          ctx.emit('click');
          return createVNode('span', null, 'child');
        };
      },
    };

    const renderer = createSignalRenderer('<div><Child @click="onChildClick"/></div>', {
      Child,
      onChildClick: () => {
        clicked += 1;
      },
    });
    renderer.render(container);

    // 事件链路：codegen 产出 props.onClick → 组件 emit('click') 回查并调用
    expect(clicked).toBeGreaterThan(0);
    expect(container.innerHTML).toContain('child');
    renderer.unmount();
  });

  it('组件子内容应作为默认插槽渲染出来', () => {
    const Child = {
      name: 'Child',
      setup(_props: unknown, ctx: { slots: { default?: () => unknown } }) {
        return () =>
          createVNode(
            'section',
            { class: 'child' },
            ctx.slots.default ? ctx.slots.default() : null,
          );
      },
    };

    const renderer = createSignalRenderer('<div><Child>hello-slot</Child></div>', { Child });
    renderer.render(container);

    // 插槽链路：codegen 产出 {default:()=>[vnode]} → initSlots 归一化 → renderSlot 取用
    expect(container.querySelector('section.child')).not.toBeNull();
    expect(container.innerHTML).toContain('hello-slot');
    renderer.unmount();
  });

  it('插槽内的插值应随响应式数据更新', () => {
    const msg = ref('hello');
    const Child = {
      name: 'Child',
      setup(_props: unknown, ctx: { slots: { default?: () => unknown } }) {
        return () =>
          createVNode(
            'section',
            { class: 'child' },
            ctx.slots.default ? ctx.slots.default() : null,
          );
      },
    };

    const renderer = createSignalRenderer('<div><Child>{{ msg }}</Child></div>', { msg, Child });
    renderer.render(container);
    expect(container.innerHTML).toContain('hello');

    msg.value = 'world';
    expect(container.innerHTML).toContain('world');

    renderer.unmount();
  });
});
