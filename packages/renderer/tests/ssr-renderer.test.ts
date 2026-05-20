 
import { describe, it, expect } from 'vitest';
import { createVNode, Fragment } from '@lytjs/vdom';
import { h } from '@lytjs/core';
import { renderToString } from '../src/ssr/ssr-renderer';

describe('SSR Renderer', () => {
  // 1. Simple element
  it('should render a simple element to string', async () => {
    const vnode = createVNode('div', { id: 'app' }, 'hello');
    const html = await renderToString({ vnode });
    expect(html).toBe('<div id="app">hello</div>');
  });

  // 2. Nested elements
  it('should render nested elements', async () => {
    const vnode = createVNode('div', null, [createVNode('span', null, 'child')]);
    const html = await renderToString({ vnode });
    expect(html).toBe('<div><span>child</span></div>');
  });

  // 3. Text content
  it('should render text content with HTML escaping', async () => {
    const vnode = createVNode('div', null, '<script>alert("xss")</script>');
    const html = await renderToString({ vnode });
    expect(html).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
  });

  // 4. Fragment
  it('should render fragments', async () => {
    const vnode = createVNode(Fragment, null, [
      createVNode('span', null, 'a'),
      createVNode('span', null, 'b'),
    ]);
    const html = await renderToString({ vnode });
    expect(html).toBe('<span>a</span><span>b</span>');
  });

  // 5. Class attribute
  it('should render class attribute', async () => {
    const vnode = createVNode('div', { class: 'foo bar' }, 'hello');
    const html = await renderToString({ vnode });
    expect(html).toBe('<div class="foo bar">hello</div>');
  });

  // 6. Style attribute (object)
  it('should render style attribute from object', async () => {
    const vnode = createVNode('div', { style: { color: 'red', fontSize: '16px' } }, 'hello');
    const html = await renderToString({ vnode });
    expect(html).toBe('<div style="color:red;font-size:16px">hello</div>');
  });

  // 7. Boolean attributes
  it('should render boolean attributes', async () => {
    const vnode = createVNode('input', { disabled: true, type: 'text' });
    const html = await renderToString({ vnode });
    expect(html).toBe('<input disabled type="text" />');
  });

  // 8. Self-closing elements
  it('should render void elements as self-closing', async () => {
    const vnode = createVNode('img', { src: 'test.png', alt: 'test' });
    const html = await renderToString({ vnode });
    expect(html).toBe('<img src="test.png" alt="test" />');
  });

  // 9. Event handlers should be skipped
  it('should skip event handlers in SSR output', async () => {
    const vnode = createVNode('button', { onClick: () => {} }, 'click');
    const html = await renderToString({ vnode });
    expect(html).toBe('<button>click</button>');
  });

  // 10. Empty element
  it('should render an empty element', async () => {
    const vnode = createVNode('div');
    const html = await renderToString({ vnode });
    expect(html).toBe('<div></div>');
  });

  describe('SSR component rendering', () => {
    it('should render a simple component', async () => {
      const vnode = h('div', { class: 'container' }, 'Hello');
      const html = await renderToString({ vnode });
      expect(html).toContain('<div class="container">Hello</div>');
    });

    it('should render nested components', async () => {
      const vnode = h('div', null, [h('span', null, 'A'), h('span', null, 'B')]);
      const html = await renderToString({ vnode });
      expect(html).toContain('<span>A</span>');
      expect(html).toContain('<span>B</span>');
    });

    it('should handle conditional rendering (v-if)', async () => {
      const vnode = h('div', null, [h('span', null, 'shown'), null, h('span', null, 'also shown')]);
      const html = await renderToString({ vnode });
      expect(html).toContain('<span>shown</span>');
      expect(html).toContain('<span>also shown</span>');
    });

    it('should handle list rendering (v-for)', async () => {
      const items = ['a', 'b', 'c'];
      const vnode = h(
        'ul',
        null,
        items.map((item) => h('li', null, item)),
      );
      const html = await renderToString({ vnode });
      expect(html).toContain('<li>a</li>');
      expect(html).toContain('<li>b</li>');
      expect(html).toContain('<li>c</li>');
    });
  });
});
