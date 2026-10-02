// @vitest-environment jsdom
/**
 * 端到端判据：**模板编译产物的 children 形态**必须能成为组件的默认插槽
 *
 * ## 缺陷（2026-10-03 探针实测）
 *
 * `initSlots` 只处理三种 children：nullish / 单个函数 / 「函数名字典」。
 * **唯独没有「VNode 或 VNode 数组」** —— 而那正是**模板编译产物最常见的形态**。
 *
 * ⇒ `slots.default` **从未建立** ⇒ 组件里 `slots.default?.()` 得到 `undefined`
 * ⇒ 渲染函数返回 `undefined` ⇒ vdom `update()` 里 `vnode.el = subTree.el` 抛
 * `Cannot read properties of undefined (reading 'el')`。
 *
 * 三个症状同源（修一处全消）：
 * | 用法 | 修复前 | 修复后 |
 * |---|---|---|
 * | `<Transition><div/></Transition>`（模板） | ❌ 抛错 | ✅ |
 * | `<TransitionGroup><li/></TransitionGroup>`（模板） | ❌ 抛错 | ✅ |
 * | `<KeepAlive><div/></KeepAlive>`（模板） | ⚠️ 降级成 `<!--keep-alive-->` | ✅ |
 * | `h(Comp, null, { default: () => [...] })`（显式 slots） | ✅ | ✅（对照组） |
 *
 * ⚠️ 判别性：修复前这些用例是**抛错**（异常），不是"渲染为空" ⇒
 * 断言 `innerHTML` 足以判别；对照组保证没有把「显式 slots」路径改坏。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, KeepAlive, Transition, TransitionGroup } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

async function mountHtml(options: Record<string, unknown>): Promise<string> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp(options as never).mount(host);
  await new Promise((resolve) => setTimeout(resolve, 30));
  return host.innerHTML;
}

describe('端到端：模板 children 形态 ⇒ 组件默认插槽', () => {
  it('★ <Transition> 的模板子节点应渲染（修复前抛错）', async () => {
    const html = await mountHtml({
      setup: () => ({ Transition }),
      template: '<Transition><div id="a">A</div></Transition>',
    });
    expect(html).toContain('<div id="a">A</div>');
  });

  it('★ <TransitionGroup> 的模板子节点应渲染（修复前抛错）', async () => {
    const html = await mountHtml({
      setup: () => ({ TransitionGroup }),
      template: '<TransitionGroup tag="ul"><li id="g">G</li></TransitionGroup>',
    });
    expect(html).toContain('<li id="g">G</li>');
  });

  it('★ <KeepAlive> 的模板子节点应渲染（修复前降级成注释占位）', async () => {
    const html = await mountHtml({
      setup: () => ({ KeepAlive }),
      template: '<KeepAlive><div id="k">K</div></KeepAlive>',
    });
    expect(html).toContain('<div id="k">K</div>');
    expect(html).not.toContain('<!--keep-alive-->');
  });

  it('多个子节点（数组形态）同样应成为默认插槽', async () => {
    const html = await mountHtml({
      setup: () => ({ Transition }),
      template: '<Transition><i>1</i><i>2</i><i>3</i></Transition>',
    });
    expect(html).toContain('<i>1</i>');
    expect(html).toContain('<i>3</i>');
  });

  it('对照组：显式 slots 对象路径不受影响', async () => {
    const html = await mountHtml({
      render: () => h(Transition as never, null, { default: () => [h('div', { id: 's' }, 'S')] }),
    });
    expect(html).toContain('<div id="s">S</div>');
  });

  it('对照组：普通组件的模板子节点仍不影响其自身渲染', async () => {
    const Foo = {
      setup: () => ({}),
      render: () => h('span', { id: 'foo' }, 'FOO'),
    };
    const html = await mountHtml({
      setup: () => ({ Foo }),
      template: '<div><Foo>ignored</Foo></div>',
    });
    expect(html).toContain('<span id="foo">FOO</span>');
  });
});
