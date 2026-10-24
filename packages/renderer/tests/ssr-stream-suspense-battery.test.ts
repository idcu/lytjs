/**
 * `renderer/src/ssr/ssr-stream.ts`（413 行、108 条未覆盖 = 58%）。
 *
 * 既有测试只覆盖「元素 / 属性 / 转义 / 注释标记」，**Text、Comment、Suspense 边界
 * 整段没有判据**（Suspense 的 100 条语句 0 覆盖）。
 *
 * 判据重点：**Suspense 到底输出什么**。真实 `<Suspense>` 的 vnode shapeFlag 是
 * `ARRAY_CHILDREN | SUSPENSE`（没有组件位），而插槽在 `children` 上而非 `props` ——
 * 这两点只要有一处对不上，整棵子树就会被静默丢掉。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createVNode, Fragment, Text, Comment, ShapeFlags } from '@lytjs/vdom';
import { Suspense } from '@lytjs/component';
import { renderToStream } from '../src/ssr/ssr-stream';
import { h } from '@lytjs/core';

/** 把流读完拼成字符串 */
async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

function render(vnode: unknown, options?: { commentMarkers?: boolean }): Promise<string> {
  return readAll(renderToStream({ vnode } as never, options));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ============================================================
// Text / Comment
// ============================================================

describe('文本与注释节点', () => {
  it('Text 节点被转义后输出', async () => {
    expect(await render(createVNode(Text, null, '<b>&"'))).toBe('&lt;b&gt;&amp;&quot;');
  });

  it('Text 的数字子节点按字符串输出', async () => {
    expect(await render(createVNode(Text, null, 42))).toBe('42');
  });

  it('Text 的函数子节点输出空串（不把函数源码写进 HTML）', async () => {
    expect(await render(createVNode(Text, null, (() => 'x') as never))).toBe('');
  });

  it('Text 的 null 子节点输出空串', async () => {
    expect(await render(createVNode(Text, null, null))).toBe('');
  });

  it('Comment 节点输出注释', async () => {
    expect(await render(createVNode(Comment, null, 'hi'))).toBe('<!--hi-->');
  });

  it('★ Comment 内容里的 `<!--` / `-->` / `--` 必须被消毒（否则注释提前闭合）', async () => {
    const out = await render(createVNode(Comment, null, 'a-->b<!--c--d'));

    // 不能出现第二个 `<!--` 或 `-->`，也不能有连续 `--`
    expect(out.startsWith('<!--')).toBe(true);
    expect(out.endsWith('-->')).toBe(true);
    const inner = out.slice(4, -3);
    expect(inner).not.toContain('-->');
    expect(inner).not.toContain('<!--');
    expect(inner).not.toContain('--');
  });

  it('Comment 的函数子节点输出空注释', async () => {
    expect(await render(createVNode(Comment, null, (() => 'x') as never))).toBe('<!---->');
  });

  it('Fragment 逐个流式输出子节点', async () => {
    const vnode = createVNode(Fragment, null, [
      createVNode('span', null, 'a'),
      createVNode('span', null, 'b'),
    ]);

    expect(await render(vnode)).toBe('<span>a</span><span>b</span>');
  });
});

// ============================================================
// Suspense
// ============================================================

describe('Suspense 边界', () => {
  it('★ 真实 Suspense vnode（shapeFlag=SUSPENSE + 数组 children）必须输出内容', async () => {
    const vnode = createVNode(Suspense, null, [createVNode('div', null, 'content')]);

    // 前置条件：确认 shapeFlag 确实没有组件位（这正是此前被丢掉的原因）
    expect(vnode.shapeFlag & ShapeFlags.SUSPENSE).toBeTruthy();
    expect(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT).toBe(0);

    const out = await render(vnode);

    // 修复前：所有分支都不命中 ⇒ 输出空串（既不渲染 fallback 也不渲染内容）
    expect(out).toContain('<div>content</div>');
    // ID 是**模块级单调递增**的（不按用例重置），所以只能按形状断言
    expect(out).toMatch(/suspense-\d+-start/);
    expect(out).toMatch(/suspense-\d+-end/);
  });

  it('数组 children 只把第一个当 default 分支', async () => {
    const vnode = createVNode(Suspense, null, [
      createVNode('div', null, 'first'),
      createVNode('div', null, 'second'),
    ]);

    const out = await render(vnode);

    expect(out).toContain('first');
    expect(out).not.toContain('second');
  });

  it('★ 插槽对象 { default, fallback }：先输出 fallback 再输出真实内容', async () => {
    const vnode = createVNode(Suspense, null, {
      default: () => [createVNode('div', null, 'real')],
      fallback: () => [createVNode('div', null, 'loading')],
    } as never);

    const out = await render(vnode);

    expect(out).toContain('loading');
    expect(out).toContain('real');
    // fallback 在内容之前
    expect(out.indexOf('loading')).toBeLessThan(out.indexOf('real'));
    expect(out).toContain('fallback-start');
    expect(out).toContain('content-start');
  });

  it('★ default 返回 Promise 时必须 await 解析后再输出', async () => {
    const vnode = createVNode(Suspense, null, {
      default: async () => {
        await new Promise((r) => setTimeout(r, 10));
        return [createVNode('div', null, 'async-done')];
      },
    } as never);

    const out = await render(vnode);

    expect(out).toContain('async-done');
  });

  it('default 抛错时输出 error 标记，流不中断', async () => {
    const vnode = createVNode(Suspense, null, {
      default: () => {
        throw new Error('boom');
      },
      fallback: () => [createVNode('div', null, 'loading')],
    } as never);

    const out = await render(vnode);

    expect(out).toContain('loading');
    expect(out).toContain('-error');
    expect(out).toContain('-end');
  });

  it('fallback 抛错时静默跳过，真实内容仍输出', async () => {
    const vnode = createVNode(Suspense, null, {
      default: () => [createVNode('div', null, 'real')],
      fallback: () => {
        throw new Error('fallback boom');
      },
    } as never);

    const out = await render(vnode);

    expect(out).toContain('real');
    expect(out).toContain('fallback-start');
    expect(out).toContain('fallback-end');
  });

  it('没有 default 时只输出 start / end 标记', async () => {
    const vnode = createVNode(Suspense, null, {} as never);

    const out = await render(vnode);

    expect(out).toMatch(/suspense-\d+-start/);
    expect(out).toMatch(/suspense-\d+-end/);
    expect(out).not.toContain('content-start');
  });

  it('兼容旧写法：插槽放在 props.default / props.fallback', async () => {
    const vnode = createVNode(Suspense, {
      default: () => [createVNode('div', null, 'from-props')],
      fallback: () => [createVNode('div', null, 'props-fallback')],
    } as never);

    const out = await render(vnode);

    expect(out).toContain('from-props');
    expect(out).toContain('props-fallback');
  });

  it('多个 Suspense 的 ID 单调递增、互不冲突', async () => {
    const mk = () =>
      createVNode(Suspense, null, { default: () => [createVNode('i', null, 'x')] } as never);

    const out = await render(createVNode(Fragment, null, [mk(), mk()]));

    const ids = [...out.matchAll(/suspense-(\d+)-start/g)].map((m) => Number(m[1]));
    expect(ids).toHaveLength(2);
    expect(ids[1]).toBe(ids[0]! + 1);
  });

  it('name 为 Suspense 的普通组件 vnode 也走边界分支（组件位形态）', async () => {
    const fakeSuspense = { name: 'Suspense' };
    const vnode = createVNode(
      fakeSuspense as never,
      {
        default: () => [createVNode('div', null, 'named')],
      } as never,
    );

    const out = await render(vnode);

    expect(out).toContain('named');
  });
});

// ============================================================
// 错误与边界
// ============================================================

describe('错误与边界', () => {
  it('非法标签名不输出，并在 DEV 下告警', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const vnode = createVNode('not a tag!' as never, null, 'x');

    const out = await render(vnode);

    expect(out).toBe('');
    expect(warn).toHaveBeenCalled();
  });

  it('void 元素自闭合', async () => {
    expect(await render(createVNode('br', null))).toBe('<br />');
  });

  it('★ 渲染过程抛错时流以错误结束（controller.error）', async () => {
    // 传一个 children 里塞了非法结构、触发内部异常的 vnode：
    // 用 `type` 为 null 的 vnode，`streamVNodeAsync` 会在读 type 时把它当普通节点跳过，
    // 所以这里直接用「getter 抛错」的对象模拟渲染期异常。
    const vnode = createVNode('div', null, 'x') as unknown as Record<string, unknown>;
    Object.defineProperty(vnode, 'props', {
      get() {
        throw new Error('props boom');
      },
    });

    const stream = renderToStream({ vnode } as never);

    await expect(readAll(stream)).rejects.toThrow(/props boom/);
  });

  it('★ 没有 queueMicrotask 时用 Promise 回退，输出不变', async () => {
    vi.stubGlobal('queueMicrotask', undefined);
    const vnode = createVNode(Fragment, null, [
      createVNode('i', null, 'a'),
      createVNode('i', null, 'b'),
    ]);

    expect(await render(vnode)).toBe('<i>a</i><i>b</i>');
  });

  it('commentMarkers 开启时每个块前带标记', async () => {
    const out = await render(createVNode('div', null, 'x'), { commentMarkers: true });

    expect(out).toContain('<!-- stream:element:div:open -->');
    expect(out).toContain('<!-- stream:element:div:close -->');
  });
});

// ============================================================
// 组件路径（回归）
// ============================================================

describe('组件路径', () => {
  it('函数式/有状态组件解析后流式输出', async () => {
    const Comp = { setup: () => () => h('p', null, 'from component') };

    expect(await render(createVNode(Comp as never, null, null))).toContain('from component');
  });

  it('无法解析的组件不抛错、不输出内容', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const out = await render(createVNode({} as never, null, null));

    expect(out).toBe('');
    expect(warn).toHaveBeenCalled();
  });
});
