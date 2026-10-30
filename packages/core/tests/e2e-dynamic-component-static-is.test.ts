// @vitest-environment jsdom
/**
 * 端到端判据：`<component is="X">` 的**静态**写法。
 *
 * ## 修之前实测
 *
 * ```
 * <component is="A" />   → 整个模板渲染为空，控制台一条
 *                          `compileTemplateToRender: 执行产物失败：A is not defined`
 * ```
 *
 * 编译产物是 `createElementVNode(A, null)` —— **裸标识符**，而且被 `hoistStatic`
 * 提到模块顶层：
 *
 * ```js
 * const _hoisted_1 = createElementVNode("div", null, createElementVNode(A, null))
 * ```
 *
 * 于是模块求值即 `ReferenceError`（`A` 既不是参数也不是 import），
 * 组件被静默跳过 —— 用户看到空白，错误指向生成的代码而不是模板。
 *
 * 动态写法 `<component :is="x">` 在 §23 已修好（运行期解析 + 字符串/组件对象两态），
 * 静态写法漏了 —— 典型的「同一特性的两种写法只修了一种」。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, defineComponent, ref } from '../src/index';

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

const A = defineComponent({
  name: 'A',
  props: { label: { type: String, default: 'A' } },
  setup(props: { label?: string }) {
    return () => h('div', { class: 'comp-a' }, props.label);
  },
});

async function mount(template: string, setup?: () => Record<string, unknown>) {
  const host = newHost();
  await createApp({
    template: `<div id="app">${template}</div>`,
    components: { A },
    setup,
  } as never).mount(host);
  return host;
}

describe('<component is="X">（静态 is）', () => {
  it('is="A"（已注册的组件名）应渲染该组件', async () => {
    const host = await mount(`<component is="A" />`);
    expect(host.querySelector('.comp-a')?.textContent).toBe('A');
  });

  it('is="A" 应能接收 props', async () => {
    const host = await mount(`<component is="A" label="L" />`);
    expect(host.querySelector('.comp-a')?.textContent).toBe('L');
  });

  it('is="div"（原生标签）应渲染成元素，且属性照常生效', async () => {
    const host = await mount(`<component is="div" class="native" data-x="1">T</component>`);
    const el = host.querySelector('div.native');
    expect(el).not.toBeNull();
    expect(el!.getAttribute('data-x')).toBe('1');
    expect(el!.textContent).toBe('T');
  });

  it('与动态写法 `:is` 的行为一致（对照组）', async () => {
    const which = ref('A');
    const host = await mount(`<component :is="which" />`, () => ({ which }));
    expect(host.querySelector('.comp-a')?.textContent).toBe('A');
  });

  it('静态 is 不得被 hoist 成模块级常量（否则 `_ctx` 在模块作用域里不存在）', async () => {
    // 行为判据：同一份编译产物**挂载两次**，两个实例都要正常渲染。
    // 若组件 vnode 被 hoist 共享，第二次挂载会复用同一 vnode（`el` 已被占）⇒ 只渲染一处。
    const host1 = await mount(`<component is="A" />`);
    const host2 = await mount(`<component is="A" />`);
    expect(host1.querySelector('.comp-a')).not.toBeNull();
    expect(host2.querySelector('.comp-a')).not.toBeNull();
  });
});
