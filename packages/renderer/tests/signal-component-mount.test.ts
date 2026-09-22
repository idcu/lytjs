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

  it('插槽内的 v-if 应随条件出现 / 消失', () => {
    const ok = ref(true);
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

    const renderer = createSignalRenderer('<div><Child><b v-if="ok">yes</b></Child></div>', {
      ok,
      Child,
    });
    renderer.render(container);
    expect(container.innerHTML).toContain('yes');

    ok.value = false;
    expect(container.innerHTML).not.toContain('yes');

    renderer.unmount();
  });

  it('插槽内的 v-for 应渲染出列表，并随数据更新', () => {
    const items = ref([{ name: 'a' }, { name: 'b' }]);
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

    const renderer = createSignalRenderer(
      '<div><Child><li v-for="item in items">{{ item.name }}</li></Child></div>',
      { items, Child },
    );
    renderer.render(container);

    expect(container.querySelectorAll('li').length).toBe(2);
    expect(container.innerHTML).toContain('a');
    expect(container.innerHTML).toContain('b');

    items.value = [{ name: 'c' }];
    expect(container.querySelectorAll('li').length).toBe(1);
    expect(container.innerHTML).toContain('c');

    renderer.unmount();
  });

  it('插槽内的 v-else 应在条件翻转时切换分支', () => {
    const ok = ref(true);
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

    const renderer = createSignalRenderer(
      '<div><Child><b v-if="ok">yes</b><i v-else>no</i></Child></div>',
      { ok, Child },
    );
    renderer.render(container);
    expect(container.innerHTML).toContain('yes');
    expect(container.innerHTML).not.toContain('no');

    ok.value = false;
    expect(container.innerHTML).toContain('no');
    expect(container.innerHTML).not.toContain('yes');

    renderer.unmount();
  });

  it('插槽内的 v-show 应通过 display 切换可见性', () => {
    const visible = ref(true);
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

    const renderer = createSignalRenderer('<div><Child><b v-show="visible">hi</b></Child></div>', {
      visible,
      Child,
    });
    renderer.render(container);
    const el = container.querySelector('b') as HTMLElement;
    expect(el).not.toBeNull();
    // v-show：元素始终在 DOM 中，仅 display 变化
    expect(el.style.display).not.toBe('none');

    visible.value = false;
    expect((container.querySelector('b') as HTMLElement).style.display).toBe('none');

    renderer.unmount();
  });

  it('具名插槽应能被组件分别消费', () => {
    const Child = {
      name: 'Child',
      setup(_props: unknown, ctx: { slots: Record<string, (() => unknown) | undefined> }) {
        return () =>
          createVNode('section', { class: 'child' }, [
            createVNode('header', null, ctx.slots.header ? ctx.slots.header() : null),
            createVNode('main', null, ctx.slots.default ? ctx.slots.default() : null),
          ]);
      },
    };

    const renderer = createSignalRenderer(
      '<div><Child><template #header>HEAD</template>BODY</Child></div>',
      { Child },
    );
    renderer.render(container);

    expect(container.querySelector('header')?.innerHTML).toContain('HEAD');
    expect(container.querySelector('main')?.innerHTML).toContain('BODY');

    renderer.unmount();
  });

  it('插槽作用域：组件传给插槽的参数应能被父级接收', () => {
    const Child = {
      name: 'Child',
      setup(
        _props: unknown,
        ctx: { slots: Record<string, ((scope?: unknown) => unknown) | undefined> },
      ) {
        return () =>
          createVNode(
            'section',
            { class: 'child' },
            // 组件侧把作用域数据作为参数传给插槽函数
            ctx.slots.default ? ctx.slots.default({ item: 'from-child' }) : null,
          );
      },
    };

    const renderer = createSignalRenderer(
      '<div><Child v-slot="p"><b>{{ p.item }}</b></Child></div>',
      { Child },
    );
    renderer.render(container);

    // 父级插槽函数收到 { item: 'from-child' } 并渲染出 p.item
    expect(container.innerHTML).toContain('from-child');

    renderer.unmount();
  });
});
