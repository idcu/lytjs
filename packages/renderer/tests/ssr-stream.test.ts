/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';
import { createVNode, Fragment } from '@lytjs/vdom';
import { renderToStream } from '../src/ssr/ssr-stream';

/**
 * Helper: consume a ReadableStream and collect all chunks as a single string.
 */
async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode(); // flush
  return result;
}

/**
 * Helper: consume a ReadableStream and collect individual chunks as strings.
 */
async function streamToChunks(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value, { stream: true }));
  }
  return chunks;
}

describe('SSR Streaming', () => {
  // 1. Basic element rendering to stream
  it('should render a simple element to stream', async () => {
    const vnode = createVNode('div', { id: 'app' }, 'hello');
    const stream = renderToStream({ vnode });
    const html = await streamToString(stream);
    expect(html).toBe('<div id="app">hello</div>');
  });

  // 2. Nested elements produce correct HTML
  it('should render nested elements to stream', async () => {
    const vnode = createVNode('div', null, [createVNode('span', null, 'child')]);
    const stream = renderToStream({ vnode });
    const html = await streamToString(stream);
    expect(html).toBe('<div><span>child</span></div>');
  });

  // 3. Multiple child nodes produce multiple chunks
  it('should produce multiple chunks for multiple child nodes', async () => {
    const vnode = createVNode('div', null, [
      createVNode('span', null, 'a'),
      createVNode('span', null, 'b'),
    ]);
    const stream = renderToStream({ vnode });
    const chunks = await streamToChunks(stream);
    // Each element boundary produces a chunk: open tag, text, close tag for each child
    // Plus the parent open/close tags
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    // The combined output should be correct
    const html = chunks.join('');
    expect(html).toBe('<div><span>a</span><span>b</span></div>');
  });

  // 4. Stream can be consumed via getReader().read()
  it('should be consumable via getReader().read()', async () => {
    const vnode = createVNode('p', null, 'stream test');
    const stream = renderToStream({ vnode });
    const reader = stream.getReader();

    let fullText = '';
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }
    fullText += decoder.decode();

    expect(fullText).toBe('<p>stream test</p>');
  });

  // 5. Fragment rendering
  it('should render fragments to stream', async () => {
    const vnode = createVNode(Fragment, null, [
      createVNode('span', null, 'x'),
      createVNode('span', null, 'y'),
    ]);
    const stream = renderToStream({ vnode });
    const html = await streamToString(stream);
    expect(html).toBe('<span>x</span><span>y</span>');
  });

  // 6. HTML escaping in stream output
  it('should escape HTML in stream output', async () => {
    const vnode = createVNode('div', null, '<script>alert("xss")</script>');
    const stream = renderToStream({ vnode });
    const html = await streamToString(stream);
    expect(html).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
  });

  // 7. Comment markers option
  it('should insert comment markers when commentMarkers is true', async () => {
    const vnode = createVNode('div', null, 'hello');
    const stream = renderToStream({ vnode }, { commentMarkers: true });
    const html = await streamToString(stream);
    expect(html).toContain('<!-- stream:');
    expect(html).toContain('hello');
  });

  // 8. No comment markers by default
  it('should not insert comment markers by default', async () => {
    const vnode = createVNode('div', null, 'hello');
    const stream = renderToStream({ vnode });
    const html = await streamToString(stream);
    expect(html).not.toContain('<!-- stream:');
    expect(html).toBe('<div>hello</div>');
  });

  // 9. Void elements
  it('should render void elements in stream', async () => {
    const vnode = createVNode('img', { src: 'test.png', alt: 'test' });
    const stream = renderToStream({ vnode });
    const html = await streamToString(stream);
    expect(html).toBe('<img src="test.png" alt="test" />');
  });

  // 10. Event handlers are skipped
  it('should skip event handlers in stream output', async () => {
    const vnode = createVNode('button', { onClick: () => {} }, 'click');
    const stream = renderToStream({ vnode });
    const html = await streamToString(stream);
    expect(html).toBe('<button>click</button>');
  });
});
