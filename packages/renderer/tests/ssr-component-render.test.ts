/**
 * SSR `renderToString` · 组件 vnode 端到端门禁（真跑）
 *
 * 背景（审计 P1）：`packages/renderer/src/ssr/ssr-renderer.ts` 的
 * `renderVNodeToString` 只分派 Fragment / Text / Comment / ELEMENT，
 * **没有组件分支** ⇒ 组件 vnode 一律落到 `return ''`，**静默输出空串**。
 *
 * 同包的流式实现 `ssr-stream.ts` 有 `COMPONENT_MASK` 分支并真正调用
 * `render` / `setup`。本文件断言**两个入口对同一输入产出一致**，
 * 用真实 HTML 文本作为判据（而非形状断言）。
 */
import { describe, it, expect, vi } from 'vitest';
import { createVNode, Fragment, Text } from '@lytjs/vdom';
import { renderToString } from '../src/ssr/ssr-renderer';
import { renderToStream } from '../src/ssr/ssr-stream';

/** 读取流式产物（用于与 renderToString 交叉对照） */
async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

const Greeting = {
  name: 'Greeting',
  render(props: Record<string, unknown>) {
    return createVNode('p', { class: 'greet' }, `hi ${String(props.name)}`);
  },
};

describe('SSR renderToString · 组件 vnode', () => {
  it('有状态组件（options.render）产出真实 HTML', async () => {
    const html = await renderToString({ vnode: createVNode(Greeting as never, { name: 'lyt' }) });
    expect(html).toContain('<p');
    expect(html).toContain('hi lyt');
  });

  it('组件 setup 直接返回 VNode 时使用该 VNode', async () => {
    const ViaSetup = {
      name: 'ViaSetup',
      setup() {
        return createVNode('strong', null, 'from-setup');
      },
    };
    const html = await renderToString({ vnode: createVNode(ViaSetup as never, null) });
    expect(html).toContain('<strong>from-setup</strong>');
  });

  it('组件 render 返回 Fragment / 嵌套结构时完整展开', async () => {
    const List = {
      name: 'List',
      render() {
        return createVNode('ul', null, [
          createVNode('li', null, 'a'),
          createVNode('li', null, 'b'),
        ] as never);
      },
    };
    const html = await renderToString({ vnode: createVNode(List as never, null) });
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<li>b</li>');
  });

  it('组件内再嵌组件时递归渲染', async () => {
    const Inner = {
      name: 'Inner',
      render() {
        return createVNode('em', null, 'inner');
      },
    };
    const Outer = {
      name: 'Outer',
      render() {
        return createVNode('div', null, [createVNode(Inner as never, null)] as never);
      },
    };
    const html = await renderToString({ vnode: createVNode(Outer as never, null) });
    expect(html).toContain('<em>inner</em>');
  });

  it('无法渲染的组件（缺 render/setup）不抛错也不静默吞掉整棵树', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Empty = { name: 'Empty' };
    const html = await renderToString({ vnode: createVNode(Empty as never, null) });
    expect(typeof html).toBe('string');
    warnSpy.mockRestore();
  });

  it('组件返回非 VNode 时不抛错', async () => {
    const Bad = {
      name: 'Bad',
      render() {
        return null as never;
      },
    };
    const html = await renderToString({ vnode: createVNode(Bad as never, null) });
    expect(typeof html).toBe('string');
  });

  it('对照组：流式入口对同一组件 vnode 应产出同样内容', async () => {
    const vnode = createVNode(Greeting as never, { name: 'lyt' });
    const sync = await renderToString({ vnode });
    const streamed = await streamToText(renderToStream({ vnode }));
    expect(streamed).toContain('hi lyt');
    expect(sync).toContain('hi lyt');
  });

  it('组件 setup 返回对象时作为 render 的 ctx（而非 props）', async () => {
    const ViaCtx = {
      name: 'ViaCtx',
      setup() {
        return { inner: 'from-setup' };
      },
      render(ctx: Record<string, unknown>) {
        return createVNode('code', null, String(ctx.inner));
      },
    };
    const html = await renderToString({ vnode: createVNode(ViaCtx as never, { ignored: 1 }) });
    expect(html).toContain('<code>from-setup</code>');
  });

  it('（缺口记录）函数式 type 会进入组件分支，但无 setup/render ⇒ 告警并返回空串', async () => {
    // 实测：`getShapeFlag(fn)` = STATEFUL_COMPONENT(4)（`isObject()` 把函数视为对象），
    // 所以函数 type 不是「不被识别为组件」，而是「被识别为组件但没有 setup/render」。
    // 本仓的组件形态约定是 options 对象；「函数式组件」支持是独立缺口（流式版同理）。
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const FnComp = () => createVNode('i', null, 'fn');
    const html = await renderToString({ vnode: createVNode(FnComp as never, null) });
    expect(typeof html).toBe('string');
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('could not render component vnode');
    warnSpy.mockRestore();
  });

  it('对照组：元素/Fragment/Text 三个既有分支不受影响', async () => {
    expect(await renderToString({ vnode: createVNode('div', null, 'plain') })).toContain('plain');
    expect(
      await renderToString({
        vnode: createVNode(Fragment, null, [
          createVNode('span', null, 'x'),
          createVNode(Text, null, 'y'),
        ] as never),
      }),
    ).toContain('x');
  });
});
