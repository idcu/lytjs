 
/**
 * @lytjs/ssr - 流式服务端渲染测试
 */

import { describe, it, expect, vi } from 'vitest';
import { renderToStream, renderToStreamAsync } from '../src/stream';

/** 创建一个简单的 VNode 用于测试 */
function createTestVNode(
  type: string,
  props: Record<string, unknown> | null,
  children?: unknown,
): any {
  return { type, props: props || {}, children: children ?? null };
}

/** 将 ReadableStream 读取为完整字符串 */
async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}

/** 将 ReadableStream 读取为分块数组 */
async function streamToChunks(stream: ReadableStream<Uint8Array>): Promise<Uint8Array[]> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return chunks;
}

describe('renderToStream', () => {
  it('应该返回 ReadableStream 实例', () => {
    const vnode = createTestVNode('div', null, 'Hello');
    const stream = renderToStream(vnode);
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('应该正确渲染简单元素', async () => {
    const vnode = createTestVNode('div', null, 'Hello World');
    const stream = renderToStream(vnode);
    const html = await streamToString(stream);
    expect(html).toContain('<div>');
    expect(html).toContain('Hello World');
    expect(html).toContain('</div>');
  });

  it('应该使用默认 chunkSize 4096', async () => {
    // 创建一个较大的内容
    const longText = 'A'.repeat(5000);
    const vnode = createTestVNode('div', null, longText);
    const stream = renderToStream(vnode);
    const chunks = await streamToChunks(stream);

    // 应该被分成多个 chunk
    expect(chunks.length).toBeGreaterThan(1);

    // 每个 chunk 不应超过 4096 字节
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });

  it('应该支持自定义 chunkSize', async () => {
    const longText = 'B'.repeat(200);
    const vnode = createTestVNode('div', null, longText);
    const stream = renderToStream(vnode, { chunkSize: 50 });
    const chunks = await streamToChunks(stream);

    // 应该被分成多个 chunk
    expect(chunks.length).toBeGreaterThan(1);

    // 每个 chunk 不应超过 50 字节
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(50);
    }
  });

  it('应该在流完成时关闭', async () => {
    const vnode = createTestVNode('span', null, 'test');
    const stream = renderToStream(vnode);
    const reader = stream.getReader();

    const { done: done1 } = await reader.read();
    expect(done1).toBe(false);

    const { done: done2 } = await reader.read();
    expect(done2).toBe(true);
  });

  it('应该在有 Suspense 边界时触发 onShellReady', async () => {
    const suspenseVNode = createTestVNode(
      'Suspense',
      { __suspense: true },
      createTestVNode('div', null, 'content'),
    );
    const onShellReady = vi.fn();
    const stream = renderToStream(suspenseVNode, { onShellReady });
    await streamToString(stream);

    expect(onShellReady).toHaveBeenCalledTimes(1);
  });

  it('应该在无 Suspense 边界时不触发 onShellReady', async () => {
    const vnode = createTestVNode('div', null, 'no suspense');
    const onShellReady = vi.fn();
    const stream = renderToStream(vnode, { onShellReady });
    await streamToString(stream);

    expect(onShellReady).not.toHaveBeenCalled();
  });

  it('应该正确处理嵌套元素', async () => {
    const vnode = createTestVNode(
      'div',
      { class: 'container' },
      createTestVNode('p', null, 'nested text'),
    );
    const stream = renderToStream(vnode);
    const html = await streamToString(stream);

    expect(html).toContain('<div class="container">');
    expect(html).toContain('<p>');
    expect(html).toContain('nested text');
  });

  it('应该正确处理空 VNode', async () => {
    const vnode = createTestVNode('div', null, null);
    const stream = renderToStream(vnode);
    const html = await streamToString(stream);

    expect(html).toContain('<div>');
    expect(html).toContain('</div>');
  });

  it('应该在错误时调用 onError', async () => {
    // 构造一个会触发错误的 VNode：
    // props 中包含 getter，在 renderAttributes 遍历时抛出错误
    const badProps = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('proxy error');
        },
      },
    );
    const badVNode = createTestVNode('div', badProps, 'text');
    const onError = vi.fn();
    const stream = renderToStream(badVNode, { onError });

    try {
      await streamToString(stream);
    } catch {
      // 预期会抛出错误
    }

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('应该正确处理属性', async () => {
    const vnode = createTestVNode('input', {
      type: 'text',
      placeholder: 'Enter name',
      disabled: true,
    });
    const stream = renderToStream(vnode);
    const html = await streamToString(stream);

    expect(html).toContain('type="text"');
    expect(html).toContain('placeholder="Enter name"');
    expect(html).toContain('disabled');
  });

  it('应该正确处理数组子节点', async () => {
    const vnode = createTestVNode('ul', null, [
      createTestVNode('li', null, 'item 1'),
      createTestVNode('li', null, 'item 2'),
      createTestVNode('li', null, 'item 3'),
    ]);
    const stream = renderToStream(vnode);
    const html = await streamToString(stream);

    expect(html).toContain('item 1');
    expect(html).toContain('item 2');
    expect(html).toContain('item 3');
  });

  it('应该正确处理自闭合标签', async () => {
    const vnode = createTestVNode('img', { src: 'test.png', alt: 'test' });
    const stream = renderToStream(vnode);
    const html = await streamToString(stream);

    expect(html).toContain('<img');
    expect(html).toContain('src="test.png"');
    expect(html).not.toContain('</img>');
  });
});

describe('renderToStreamAsync', () => {
  it('应该返回 ReadableStream 实例', () => {
    const vnode = createTestVNode('div', null, 'Hello');
    const stream = renderToStreamAsync(vnode);
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('应该正确渲染简单元素', async () => {
    const vnode = createTestVNode('div', null, 'Async Hello');
    const stream = renderToStreamAsync(vnode);
    const html = await streamToString(stream);

    expect(html).toContain('<div>');
    expect(html).toContain('Async Hello');
  });

  it('应该触发 onShellReady 回调', async () => {
    const onShellReady = vi.fn();
    const vnode = createTestVNode('div', null, 'content');
    const stream = renderToStreamAsync(vnode, { onShellReady });
    await streamToString(stream);

    expect(onShellReady).toHaveBeenCalledTimes(1);
  });
});
