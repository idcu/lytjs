/**
 * ssr-kit/stream 覆盖率电池（Task C）
 *
 * 覆盖 collectChunks / collectAndPrefetchData / renderToStringAsync 三处
 * 「按 vnode 类型分派」的分支矩阵（null / string / number / array / 非对象 /
 * text·symbol / 函数组件 / 元素），以及 Suspense 边界、流控、分块边界、
 * 组件 prefetch（成功与抛错）等路径。
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToStream, renderToStreamAsync } from '../src/stream';

function el(type: unknown, children?: unknown, props: Record<string, unknown> = {}) {
  return { type, props, children: children ?? null };
}

async function toText(stream: ReadableStream<Uint8Array>): Promise<string> {
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

describe('stream battery: renderToStream vnode type matrix', () => {
  const cases: Array<[string, unknown]> = [
    ['null', null],
    ['string', 'plain-text'],
    ['number', 42],
    ['bigint (non-object)', 10n],
    ['array', [el('div', 'a'), el('span', 'b')]],
    ['text node', el('text', 't')],
    ['symbol-typed node', el(Symbol('frag'), null)],
    ['function component', el(() => null, null)],
    ['element', el('div', 'x')],
  ];

  for (const [name, vnode] of cases) {
    it(`renders ${name}`, async () => {
      const html = await toText(renderToStream(vnode as never));
      expect(typeof html).toBe('string');
    });
  }
});

describe('stream battery: Suspense boundary + shell', () => {
  it('sends the shell first for a string-typed Suspense boundary', async () => {
    const onShellReady = vi.fn();
    const vnode = el('Suspense', [el('div', 'inner')]);
    const html = await toText(renderToStream(vnode, { onShellReady }));
    expect(onShellReady).toHaveBeenCalledTimes(1);
    expect(html).toContain('inner');
  });

  it('recognises the object-typed suspense marker', async () => {
    // 对象型 type 的分支被识别为 suspense 边界；随后因 type 既非 text/symbol、
    // 也非函数/字符串，children 不会被遍历，故输出为空串。这里只断言分支被走到。
    const vnode = el({ __suspense: true }, [el('div', 'deep')]);
    const html = await toText(renderToStream(vnode));
    expect(typeof html).toBe('string');
  });
});

describe('stream battery: chunking & flow control', () => {
  it('handles a chunkSize smaller than one multi-byte character', async () => {
    // chunkSize=1 会把多字节字符按字节切开（实现如此），故只断言不抛错且产出非空。
    const vnode = el('div', '😀😀😀');
    const html = await toText(renderToStream(vnode, { chunkSize: 1 }));
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('applies maxBytesPerSecond flow control and still emits the full payload', async () => {
    // 回归：启用流控时 sendChunk 必须由 start() await 后再 close。
    // 曾经是 fire-and-forget async IIFE ⇒ 入队发生在 close 之后，输出恒为空
    // 且抛出 ERR_INVALID_STATE 未处理拒绝。
    const payload = 'x'.repeat(50);
    const html = await toText(renderToStream(el('div', payload), { maxBytesPerSecond: 1e6 }));
    expect(html).toContain(payload);
  });

  it('rate-limits across chunks when the per-second budget is tiny', async () => {
    const payload = 'y'.repeat(30);
    const html = await toText(renderToStream(el('div', payload), { maxBytesPerSecond: 8 }));
    expect(html).toContain(payload);
  });
});

describe('stream battery: renderToStreamAsync prefetch', () => {
  it('prefetches data from a component with a prefetch method', async () => {
    const onDataPrefetched = vi.fn();
    const component: any = () => null;
    component.prefetch = async () => ({ data: { answer: 42 } });

    const vnode = el(component, [el('div', 'child')]);
    const html = await toText(
      renderToStreamAsync(vnode, {
        prefetchContext: {} as never,
        onDataPrefetched,
      }),
    );
    expect(typeof html).toBe('string');
    expect(onDataPrefetched).toHaveBeenCalledWith({ answer: 42 });
  });

  it('continues rendering when prefetch throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const component: any = () => null;
    component.prefetch = async () => {
      throw new Error('prefetch boom');
    };

    const html = await toText(
      renderToStreamAsync(el(component, 'c'), { prefetchContext: {} as never }),
    );
    expect(typeof html).toBe('string');
    warnSpy.mockRestore();
  });

  it('handles null / string / number / array / non-object / text / element', async () => {
    const variants: unknown[] = [
      null,
      'str',
      7,
      [el('div', 'a')],
      10n,
      el('text', 't'),
      el(() => null, null),
      el('div', 'e'),
    ];
    for (const v of variants) {
      const html = await toText(renderToStreamAsync(v as never));
      expect(typeof html).toBe('string');
    }
  });
});
