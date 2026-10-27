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
import { onMounted, onBeforeMount } from '@lytjs/component';
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

  // ⚠️ 2026-10-10（P0-3 回归）：此前本 effect 每次重跑都「清空容器 + 重新 mount」，
  // 组件实例被销毁重建 —— setup 重跑、钩子重复触发、DOM 整棵重建（丢焦点/输入值）。
  // 本用例以「实例计数 + DOM 元素同一性」把它钉住：修好前 setupCount 会变成 2、
  // 元素也会换成新对象。
  it('依赖变化时应复用组件实例与 DOM，而不是销毁重建（P0-3 回归）', () => {
    const container = document.createElement('div');
    const msg = ref('hello');
    let setupCount = 0;

    const Child = {
      name: 'Child',
      setup() {
        setupCount += 1;
        return () => createVNode('p', { class: 'greet' }, msg.value);
      },
    };

    // 插槽里读同一个 ref ⇒ 外层 effect 会把 msg 收为依赖，从而在变化时重跑
    mountComponent(Child, null, container, {
      default: () => createVNode('span', null, msg.value),
    });

    const firstEl = container.querySelector('p.greet');
    expect(firstEl).not.toBeNull();
    expect(setupCount).toBe(1);
    expect(container.textContent).toContain('hello');

    msg.value = 'world';

    // 同步可见（旧实现靠「清空 + 重挂载」保证同步；新实现靠实例 update()）
    expect(container.textContent).toContain('world');
    expect(setupCount).toBe(1); // 实例被复用（旧实现会是 2）
    expect(container.querySelector('p.greet')).toBe(firstEl); // DOM 元素同一性保持
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

// ⚠️ 2026-10-27 新增（P1-7 回归）：Vapor / Signal 模式下的组件生命周期
//
// 起因：`getRenderer()` 此前**只**注入 `setupChildComponent` / `normalizeProps`，
// 而 `callMountedHook` 等 4 个实现只在 core 侧注入（core-vnode 那处上一轮修过）。
// Vapor 模式下的组件走的是本渲染器 ⇒ `onMounted` / `onBeforeUnmount` 等**永不执行**。
// 症状与 2026-09-26 那次 VNode 路径的 P0 完全同型：不报错、只是不跑。
describe('mountComponent 的生命周期钩子（P1-7 回归）', () => {
  beforeEach(() => {
    resetVaporComponentRenderer();
  });

  it('setup 里注册的 onBeforeMount / onMounted 必须被调用', () => {
    const container = document.createElement('div');
    const calls: string[] = [];

    const Child = {
      name: 'Child',
      setup() {
        onBeforeMount(() => calls.push('beforeMount'));
        onMounted(() => calls.push('mounted'));
        return () => createVNode('p', null, 'x');
      },
    };

    mountComponent(Child, null, container);

    expect(calls).toEqual(['beforeMount', 'mounted']);
  });

  it('onMounted 触发时 DOM 必须已在容器里', () => {
    const container = document.createElement('div');
    let htmlAtMounted = '';

    const Child = {
      name: 'Child',
      setup() {
        onMounted(() => {
          htmlAtMounted = container.innerHTML;
        });
        return () => createVNode('p', { class: 'probe' }, 'x');
      },
    };

    mountComponent(Child, null, container);

    expect(htmlAtMounted).toContain('probe');
  });

  it('钩子抛错不应吞掉（走 errorHandler / error 留痕）', () => {
    const container = document.createElement('div');
    const Child = {
      name: 'Throwing',
      setup() {
        onMounted(() => {
          throw new Error('hook-boom');
        });
        return () => createVNode('p', null, 'x');
      },
    };

    // 不抛到调用方（钩子错误被 handleError 接住），但组件本身必须挂上
    expect(() => mountComponent(Child, null, container)).not.toThrow();
    expect(container.innerHTML).toContain('<p>');
  });
});
