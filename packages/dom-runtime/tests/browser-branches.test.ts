// @vitest-environment jsdom
/**
 * dom-runtime 在**浏览器环境**（jsdom）下的分支补测。
 *
 * 主要补齐：
 * - `normalizeClass` 的 null/false/字符串/数组/ref 解包
 * - `getRealNode` 对 TemplateWrapper 的识别分支
 * - `insert` / `remove` 的 TemplateWrapper 与「有/无 remove()」分支
 * - 各 setter 的**增量更新短路**（值相同时提前返回）
 * - `setStyle` 的数值 px 补全分支
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeClass,
  getRealNode,
  createTemplate,
  createElement,
  insert,
  remove,
  setText,
  setAttribute,
  setProperty,
  setStyle,
  setClass,
} from '../src/index';

describe('dom-runtime · 浏览器环境分支补测', () => {
  // ==================== normalizeClass ====================
  describe('normalizeClass', () => {
    it('null / undefined / false ⇒ 空串', () => {
      expect(normalizeClass(null)).toBe('');
      expect(normalizeClass(undefined)).toBe('');
      expect(normalizeClass(false)).toBe('');
    });

    it('字符串 ⇒ 原样返回', () => {
      expect(normalizeClass('a b')).toBe('a b');
    });

    it('数组（含嵌套 / 假值）⇒ 拼接', () => {
      expect(normalizeClass(['a', null, 'b', false])).toBe('a b');
      expect(normalizeClass(['a', ['b', 'c']])).toBe('a b c');
    });

    it('对象 ⇒ 取真值键', () => {
      expect(normalizeClass({ a: true, b: false, c: 1 })).toBe('a c');
    });
  });

  // ==================== getRealNode / createTemplate ====================
  describe('TemplateWrapper 相关', () => {
    it('getRealNode 识别 TemplateWrapper 并返回真实节点', () => {
      const wrapper = createTemplate('<span id="w">hi</span>');
      const real = getRealNode(wrapper) as Element;
      expect(real).toBeTruthy();
      expect((real as Element).tagName ?? (real as any).nodeName).toBeTruthy();
    });

    it('insert 支持 parent 为 TemplateWrapper', () => {
      const wrapper = createTemplate('<div id="host"></div>');
      const child = createElement('i');
      expect(() => insert(child, wrapper)).not.toThrow();
    });

    it('remove 支持 TemplateWrapper（走 wrapper.remove）', () => {
      const wrapper = createTemplate('<div></div>');
      expect(() => remove(wrapper)).not.toThrow();
    });

    it('remove 支持无 remove() 的普通节点（走 parentNode.removeChild）', () => {
      const host = document.createElement('div');
      const child = document.createElement('b');
      host.appendChild(child);
      remove(child);
      expect(host.contains(child)).toBe(false);
    });
  });

  // ==================== 增量更新短路 ====================
  describe('各 setter 的增量更新短路', () => {
    it('setText：值相同则跳过', () => {
      const el = document.createElement('div');
      setText(el, 'x');
      expect(el.textContent).toBe('x');
      setText(el, 'x'); // 命中短路
      expect(el.textContent).toBe('x');
    });

    it('setAttribute：值相同则跳过', () => {
      const el = document.createElement('div');
      setAttribute(el, 'data-x', 'v');
      expect(el.getAttribute('data-x')).toBe('v');
      setAttribute(el, 'data-x', 'v'); // 命中短路
      expect(el.getAttribute('data-x')).toBe('v');
    });

    it('setProperty：同名属性值相同则跳过', () => {
      const el = document.createElement('input');
      (el as any).value = 'a';
      setProperty(el, 'value', 'a'); // 命中短路
      expect((el as any).value).toBe('a');
    });

    it('setProperty：假值且属性本不存在 ⇒ 直接返回', () => {
      const el = document.createElement('div');
      expect(() => setProperty(el, 'hidden', false)).not.toThrow();
      expect(el.hasAttribute('hidden')).toBe(false);
    });

    it('setProperty：字符串属性值相同则跳过', () => {
      const el = document.createElement('div');
      setProperty(el, 'title', 't');
      expect(el.getAttribute('title')).toBe('t');
      setProperty(el, 'title', 't'); // 命中短路
      expect(el.getAttribute('title')).toBe('t');
    });

    it('setStyle：cssText 相同则跳过；数值自动补 px', () => {
      const el = document.createElement('div');
      setStyle(el, 'color: red');
      setStyle(el, 'color: red'); // 命中 cssText 短路
      expect(el.style.color).toBe('red');

      setStyle(el, { width: 10 }); // 命中数值 → px 分支
      expect(el.style.width).toBe('10px');
      setStyle(el, { width: 10 }); // 命中单属性短路
      expect(el.style.width).toBe('10px');
    });

    it('setClass：值相同则跳过', () => {
      const el = document.createElement('div');
      setClass(el, 'a');
      expect(el.getAttribute('class')).toBe('a');
      setClass(el, 'a'); // 命中短路
      expect(el.getAttribute('class')).toBe('a');
    });
  });
});
