/**
 * @lytjs/ssr - 组件渲染测试
 *
 * 背景：旧实现里 `renderToString` 遇到组件一律 `return ''`（源码注释写着
 * "简化处理：组件返回空字符串"），而 defineComponent 返回的是选项对象，
 * 于是任何组件页面 SSR 出来都是空壳。本文件锁定"组件真的能被渲染成 HTML"。
 */

import { describe, it, expect, vi } from 'vitest';
import { createVNode, Text } from '@lytjs/vdom';
import { renderToString } from '../src/render';

describe('renderToString - 组件渲染', () => {
  it('选项式组件（setup 返回渲染函数）应被渲染为 HTML', () => {
    const Hello = {
      name: 'Hello',
      props: { msg: { type: String, default: 'world' } },
      setup(props: Record<string, unknown>) {
        return () => createVNode('p', { class: 'greeting' }, `Hello ${String(props.msg)}`);
      },
    };

    const html = renderToString(createVNode(Hello as never, { msg: 'lytjs' }, null));
    expect(html).toBe('<p class="greeting">Hello lytjs</p>');
  });

  it('选项式组件（options.render）应被渲染为 HTML', () => {
    const Box = {
      name: 'Box',
      props: { title: { type: String, default: '' } },
      render(ctx: Record<string, unknown>) {
        // ctx 是组件代理，已声明的 props 可直接按名读取
        return createVNode('div', null, String(ctx.title ?? ''));
      },
    };

    const html = renderToString(createVNode(Box as never, { title: 'boxed' }, null));
    expect(html).toContain('<div>boxed</div>');
  });

  it('函数式组件应被渲染为 HTML', () => {
    const Fn = (props: Record<string, unknown>) =>
      createVNode('span', null, `fn:${String(props.name)}`);

    const html = renderToString(createVNode(Fn as never, { name: 'a' }, null));
    expect(html).toBe('<span>fn:a</span>');
  });

  it('组件嵌套组件应递归渲染', () => {
    const Child = {
      name: 'Child',
      setup() {
        return () => createVNode('b', null, 'child');
      },
    };
    const Parent = {
      name: 'Parent',
      setup() {
        return () =>
          createVNode('div', { id: 'parent' }, [createVNode(Child as never, null, null)]);
      },
    };

    const html = renderToString(createVNode(Parent as never, null, null));
    expect(html).toBe('<div id="parent"><b>child</b></div>');
  });

  it('无渲染函数的组件应告警并退化为渲染默认插槽（不再静默输出空串）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const NoRender = { name: 'NoRender' };

    const html = renderToString(
      createVNode(NoRender as never, null, [createVNode('i', null, 'fallback')] as never),
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('没有可用的渲染函数'));
    expect(html).toContain('<i>fallback</i>');
    warn.mockRestore();
  });

  it('组件返回数组（多根）应全部渲染', () => {
    const Multi = {
      name: 'Multi',
      setup() {
        return () => [createVNode('i', null, '1'), createVNode('i', null, '2')];
      },
    };

    const html = renderToString(createVNode(Multi as never, null, null));
    expect(html).toBe('<i>1</i><i>2</i>');
  });

  it('组件返回文本节点应转义并渲染', () => {
    const T = {
      name: 'T',
      setup() {
        return () => createVNode(Text, null, '<script>');
      },
    };

    const html = renderToString(createVNode(T as never, null, null));
    expect(html).toBe('&lt;script&gt;');
  });
});
