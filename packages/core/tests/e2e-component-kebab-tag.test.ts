// @vitest-environment jsdom
/**
 * 端到端判据：**连字符写法**的组件标签（`<my-comp />`）。
 *
 * ## 修之前实测
 *
 * 整个模板渲染为空，控制台只有一条指向生成代码的报错：
 *
 * ```
 * <my-comp />  →  <div id="app"></div>
 * 编译产物：createElementVNode(_ctx.my-_ctx.comp, null)   ← 语法错误
 * ```
 *
 * 根因：组件 tag 被交给 `prefixIdentifiers()` —— 那是个**表达式**前缀器，按词边界
 * 切分，于是 `my-comp` 被当成 `my - comp` 两个标识符各加前缀。
 * 编译期不校验产物语法 ⇒ 一路到运行时才炸，且错误指向生成的代码，不指向模板。
 *
 * 这属于「同一特性的两种写法只修了一种」：PascalCase（`<MyComp/>`）一直正常，
 * 连字符写法（Vue 模板里同样常见）从来不能用。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, defineComponent, ref, nextTick } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

const MyComp = defineComponent({
  name: 'MyComp',
  props: { label: { type: String, default: 'D' } },
  setup(props: { label?: string }) {
    return () => h('div', { class: 'my-comp' }, props.label);
  },
});

async function mount(
  template: string,
  components: Record<string, unknown>,
  setup?: () => Record<string, unknown>,
) {
  const host = newHost();
  await createApp({
    template: `<div id="app">${template}</div>`,
    components,
    setup,
  } as never).mount(host);
  return host;
}

describe('连字符写法的组件标签', () => {
  it('components 以连字符名注册时应渲染', async () => {
    const host = await mount(`<my-comp />`, { 'my-comp': MyComp });
    expect(host.querySelector('.my-comp')?.textContent).toBe('D');
  });

  it('components 以 PascalCase 注册、模板写连字符时也应渲染（大小写互转）', async () => {
    const host = await mount(`<my-comp label="L" />`, { MyComp });
    expect(host.querySelector('.my-comp')?.textContent).toBe('L');
  });

  it('连字符组件照常接收 props 与事件', async () => {
    const Clicker = defineComponent({
      name: 'Clicker',
      emits: ['hit'],
      setup(_p: unknown, { emit }: never) {
        return () =>
          h('button', { class: 'btn', onClick: () => (emit as (e: string) => void)('hit') }, 'B');
      },
    });
    const hits = ref(0);
    const host = await mount(`<click-er @hit="hits++" />`, { 'click-er': Clicker }, () => ({
      hits,
    }));
    host.querySelector('.btn')!.dispatchEvent(new MouseEvent('click'));
    await nextTick();
    expect(hits.value).toBe(1);
  });

  it('连字符组件的响应式更新照常（v-if 切换）', async () => {
    const on = ref(false);
    const host = await mount(`<my-comp v-if="on" label="X" />`, { 'my-comp': MyComp }, () => ({
      on,
    }));
    expect(host.querySelector('.my-comp')).toBeNull();
    on.value = true;
    await nextTick();
    expect(host.querySelector('.my-comp')?.textContent).toBe('X');
  });

  it('多个连字符组件实例互不干扰（不得共享同一个 vnode）', async () => {
    const host = await mount(`<my-comp label="1" /><my-comp label="2" />`, { 'my-comp': MyComp });
    const texts = Array.from(host.querySelectorAll('.my-comp')).map((el) => el.textContent);
    expect(texts).toEqual(['1', '2']);
  });
});
