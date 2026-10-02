/**
 * 流式 SSR 的组件解析顺序（2026-10-02）。
 *
 * 背景：`ssr-stream.ts` · `streamComponentAsync` 与 `ssr-stream-optimized.ts` ·
 * `streamComponent` 各有一份「组件 → 根 vnode」的解析副本，且都是
 * **render 优先、恒以 props 作 ctx** —— 与 `ssr-island.ts` / `ssr-renderer.ts` 的
 * 「setup 优先、setup 返回值作 render 的 ctx」**语义分歧**。
 * ⇒ 含 `setup`（返回状态）+ `render`（读 ctx）的组件在**流式 SSR 下会渲染出
 * `undefined`**，与同步入口产出一致性被破坏。
 *
 * 本文件的两类判据：
 * ① **判别性**：让「正确 ctx」与「错误 ctx」渲染出**不同的 HTML**（`ctx=S` vs `ctx=undefined`），
 *    否则缺陷版与修复版产出相同字符串、断言恒绿；
 * ② **一致性**：同一组件经 **同步入口 / 流式入口 / 优化流式入口** 应产出**同一 HTML** ——
 *    这是能同时抓住「任何一处再次分叉」的最强判据。
 *    ⚠️ 一致性判据**包含 async setup** 的用例 —— 该用例在 2026-10-02 之前**不成立**
 *    （彼时同步入口不 await async setup），是把 `renderToString` 改为 async 递归、
 *    三个入口共用同一解析助手之后才成立的。它同时钉住「任何一处再退回同步实现」。
 */
import { describe, it, expect } from 'vitest';
import { createVNode } from '@lytjs/vdom';
import { renderToString } from '../src/ssr/ssr-renderer';
import { renderToStream } from '../src/ssr/ssr-stream';
import { createOptimizedStream } from '../src/ssr/ssr-stream-optimized';

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

/** setup（返回状态）+ render（读 ctx）的组件 —— 解析顺序分歧的唯一可观测点 */
const CtxComponent = {
  setup: () => ({ msg: 'from-setup' }),
  render: (ctx: Record<string, unknown>) => createVNode('div', null, `ctx=${String(ctx.msg)}`),
};

describe('流式 SSR：组件解析顺序', () => {
  // ---------------------------------------------------------------
  // 1. 判别性：流式入口必须把 setup 返回值作为 render 的 ctx
  //    （缺陷版会渲染 `ctx=undefined`）
  // ---------------------------------------------------------------
  it('流式入口：含 setup + render 的组件应拿到 setup 返回值作 ctx', async () => {
    const html = await streamToString(
      renderToStream({ vnode: createVNode(CtxComponent as never, {}) }),
    );
    expect(html).toContain('ctx=from-setup');
    expect(html).not.toContain('ctx=undefined');
  });

  it('优化流式入口：同上', async () => {
    const html = await streamToString(
      createOptimizedStream(createVNode(CtxComponent as never, {})),
    );
    expect(html).toContain('ctx=from-setup');
    expect(html).not.toContain('ctx=undefined');
  });

  // ---------------------------------------------------------------
  // 2. ★ 三入口一致性（最强判据：任何一处再次分叉都会在此暴露）
  // ---------------------------------------------------------------
  it('★ 同步入口 / 流式入口 / 优化流式入口应对同一组件产出同一 HTML', async () => {
    const vnode = () => createVNode(CtxComponent as never, {});

    const sync = await renderToString({ vnode: vnode() });
    const stream = await streamToString(renderToStream({ vnode: vnode() }));
    const optimized = await streamToString(createOptimizedStream(vnode()));

    expect(stream).toBe(sync);
    expect(optimized).toBe(sync);
  });

  // ---------------------------------------------------------------
  // 2b. ★ 三入口一致性（**含 async setup**）
  //     2026-10-02 之前此用例必然失败：同步入口不 await async setup，
  //     会把 Promise 当 ctx ⇒ 同步产出 `ctx=undefined`，与流式不一致。
  // ---------------------------------------------------------------
  it('★ 三入口应对含 async setup 的组件产出一致 HTML', async () => {
    const AsyncComp = {
      setup: async () => ({ msg: 'async-from-setup' }),
      render: (ctx: Record<string, unknown>) => createVNode('div', null, `ctx=${String(ctx.msg)}`),
    };
    const vnode = () => createVNode(AsyncComp as never, {});

    const sync = await renderToString({ vnode: vnode() });
    const stream = await streamToString(renderToStream({ vnode: vnode() }));
    const optimized = await streamToString(createOptimizedStream(vnode()));

    expect(sync).toContain('ctx=async-from-setup');
    expect(stream).toBe(sync);
    expect(optimized).toBe(sync);
  });

  // ---------------------------------------------------------------
  // 3. async setup（这正是两条流式路径此前无法与同步版合并的原因，必须不回归）
  // ---------------------------------------------------------------
  it('流式入口应 await 返回 Promise 的 setup（返回状态对象）', async () => {
    const Comp = {
      setup: async () => ({ msg: 'async-ctx' }),
      render: (ctx: Record<string, unknown>) => createVNode('div', null, `ctx=${String(ctx.msg)}`),
    };

    const html = await streamToString(renderToStream({ vnode: createVNode(Comp as never, {}) }));

    expect(html).toContain('ctx=async-ctx');
    expect(html).not.toContain('ctx=undefined');
  });

  it('流式入口应 await 返回 Promise 的 setup（返回 vnode）', async () => {
    const Comp = {
      setup: async () => createVNode('b', null, 'async-vnode'),
    };

    const html = await streamToString(renderToStream({ vnode: createVNode(Comp as never, {}) }));

    expect(html).toContain('<b>async-vnode</b>');
  });

  // ---------------------------------------------------------------
  // 4. setup 直接返回 vnode ⇒ 跳过 render（回归）
  // ---------------------------------------------------------------
  it('setup 返回 vnode 时应跳过 render', async () => {
    let renderCalled = false;
    const Comp = {
      setup: () => createVNode('em', null, 'from-setup'),
      render: () => {
        renderCalled = true;
        return createVNode('em', null, 'from-render');
      },
    };

    const html = await streamToString(renderToStream({ vnode: createVNode(Comp as never, {}) }));

    expect(html).toContain('<em>from-setup</em>');
    expect(renderCalled).toBe(false);
  });

  // ---------------------------------------------------------------
  // 5. 回归：仅 render 的组件（无 setup）仍走 props 作 ctx
  // ---------------------------------------------------------------
  it('回归：仅 render 的组件应以 props 作 ctx', async () => {
    const Comp = {
      render: (ctx: Record<string, unknown>) => createVNode('span', null, `p=${String(ctx.value)}`),
    };

    const html = await streamToString(
      renderToStream({ vnode: createVNode(Comp as never, { value: 'prop-ctx' }) }),
    );

    expect(html).toContain('p=prop-ctx');
  });

  // ---------------------------------------------------------------
  // 6. 回归：既无 setup 也无 render ⇒ 不产出内容、不抛错
  // ---------------------------------------------------------------
  it('回归：既无 setup 也无 render 的组件不抛错', async () => {
    const html = await streamToString(renderToStream({ vnode: createVNode({} as never, {}) }));
    expect(html).not.toContain('undefined');
  });
});
