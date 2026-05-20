/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
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
