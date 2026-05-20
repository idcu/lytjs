/**
 * @lytjs/html-renderer 测试
 */
import { describe, it, expect } from 'vitest';
import { HTMLRenderer } from '../src';

describe('@lytjs/html-renderer', () => {
  describe('HTMLRenderer', () => {
    it('应该创建 HTML 渲染器', () => {
      const renderer = new HTMLRenderer();
      expect(renderer).toBeInstanceOf(HTMLRenderer);
    });

    it('应该支持自定义模板', () => {
      const renderer = new HTMLRenderer({
        template: (content) => `<!DOCTYPE html><html><body>${content}</body></html>`,
      });
      expect(typeof renderer).toBe('object');
    });
  });
});
