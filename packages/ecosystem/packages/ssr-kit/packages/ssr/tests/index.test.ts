/**
 * @lytjs/ssr 单元测试
 */

import { describe, it, expect } from 'vitest';
import { renderToString, renderToHtml } from '../src/index';

describe('SSR', () => {
  describe('renderToString', () => {
    it('should render string', () => {
      const result = renderToString('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should escape HTML in string', () => {
      const result = renderToString('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should render number', () => {
      const result = renderToString(42);
      expect(result).toBe('42');
    });

    it('should render null as empty', () => {
      const result = renderToString(null);
      expect(result).toBe('');
    });

    it('should render undefined as empty', () => {
      const result = renderToString(undefined);
      expect(result).toBe('');
    });

    it('should render array', () => {
      const result = renderToString(['Hello', ' ', 'World']);
      expect(result).toBe('Hello World');
    });
  });

  describe('renderToHtml', () => {
    it('should render complete HTML page', () => {
      const result = renderToHtml('Hello', { title: 'Test Page' });
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Page</title>');
      expect(result).toContain('<div id="app">Hello</div>');
    });

    it('should include custom head content', () => {
      const result = renderToHtml('', { head: '<meta name="description" content="Test">' });
      expect(result).toContain('<meta name="description" content="Test">');
    });

    it('should include body attributes', () => {
      const result = renderToHtml('', { bodyAttrs: { class: 'dark-mode' } });
      expect(result).toContain('<body class="dark-mode">');
    });
  });
});

// ⚠️ 2026-10-27 新增（P0 回归）：Fragment 必须**展开 children**
//
// 起因：Fragment 的 type 是 `Symbol.for('Fragment')`，而 renderToString 里有一条
// 「type 是 symbol ⇒ 当文本节点」的分支 ⇒ 多根子树被 `String(children)` 转成
// `[object Object],[object Object]` 输出（实测）。
describe('renderToString 的 Fragment（P0 回归）', () => {
  it('多根 Fragment 应展开成 HTML，而不是 [object Object]', async () => {
    const { createVNode, Fragment } = await import('@lytjs/vdom');
    const vnode = createVNode(Fragment, null, [
      createVNode('h1', null, 'T'),
      createVNode('p', null, 'P'),
    ]);

    const html = renderToString(vnode as never);

    expect(html).toBe('<h1>T</h1><p>P</p>');
    expect(html).not.toContain('[object Object]');
  });
});
