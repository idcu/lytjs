/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SVG_TAGS,
  SVG_NS,
  isSVGTag,
  patchClass,
  patchStyle,
  patchAttr,
  patchProp,
} from '../src/index';

// Set __DEV__ global for tests that exercise dev-mode warning paths
declare const __DEV__: boolean;
(globalThis as any).__DEV__ = true;

describe('@lytjs/common-dom', () => {
  // ==================== SVG_TAGS ====================
  describe('SVG_TAGS', () => {
    it('should be a Set', () => {
      expect(SVG_TAGS).toBeInstanceOf(Set);
    });

    it('should contain basic shape tags', () => {
      expect(SVG_TAGS.has('svg')).toBe(true);
      expect(SVG_TAGS.has('path')).toBe(true);
      expect(SVG_TAGS.has('circle')).toBe(true);
      expect(SVG_TAGS.has('ellipse')).toBe(true);
      expect(SVG_TAGS.has('line')).toBe(true);
      expect(SVG_TAGS.has('polyline')).toBe(true);
      expect(SVG_TAGS.has('polygon')).toBe(true);
      expect(SVG_TAGS.has('rect')).toBe(true);
    });

    it('should contain group and container tags', () => {
      expect(SVG_TAGS.has('g')).toBe(true);
      expect(SVG_TAGS.has('defs')).toBe(true);
      expect(SVG_TAGS.has('use')).toBe(true);
      expect(SVG_TAGS.has('clipPath')).toBe(true);
      expect(SVG_TAGS.has('mask')).toBe(true);
      expect(SVG_TAGS.has('symbol')).toBe(true);
      expect(SVG_TAGS.has('marker')).toBe(true);
      expect(SVG_TAGS.has('pattern')).toBe(true);
      expect(SVG_TAGS.has('foreignObject')).toBe(true);
      expect(SVG_TAGS.has('image')).toBe(true);
    });

    it('should contain text tags', () => {
      expect(SVG_TAGS.has('text')).toBe(true);
      expect(SVG_TAGS.has('tspan')).toBe(true);
      expect(SVG_TAGS.has('textPath')).toBe(true);
    });

    it('should contain gradient tags', () => {
      expect(SVG_TAGS.has('linearGradient')).toBe(true);
      expect(SVG_TAGS.has('radialGradient')).toBe(true);
      expect(SVG_TAGS.has('stop')).toBe(true);
    });

    it('should contain filter tags', () => {
      expect(SVG_TAGS.has('filter')).toBe(true);
      expect(SVG_TAGS.has('feBlend')).toBe(true);
      expect(SVG_TAGS.has('feColorMatrix')).toBe(true);
      expect(SVG_TAGS.has('feComponentTransfer')).toBe(true);
      expect(SVG_TAGS.has('feComposite')).toBe(true);
      expect(SVG_TAGS.has('feConvolveMatrix')).toBe(true);
      expect(SVG_TAGS.has('feDiffuseLighting')).toBe(true);
      expect(SVG_TAGS.has('feDisplacementMap')).toBe(true);
      expect(SVG_TAGS.has('feDistantLight')).toBe(true);
      expect(SVG_TAGS.has('feFlood')).toBe(true);
      expect(SVG_TAGS.has('feGaussianBlur')).toBe(true);
      expect(SVG_TAGS.has('feImage')).toBe(true);
      expect(SVG_TAGS.has('feMerge')).toBe(true);
      expect(SVG_TAGS.has('feMergeNode')).toBe(true);
      expect(SVG_TAGS.has('feMorphology')).toBe(true);
      expect(SVG_TAGS.has('feOffset')).toBe(true);
      expect(SVG_TAGS.has('fePointLight')).toBe(true);
      expect(SVG_TAGS.has('feSpecularLighting')).toBe(true);
      expect(SVG_TAGS.has('feSpotLight')).toBe(true);
      expect(SVG_TAGS.has('feTile')).toBe(true);
      expect(SVG_TAGS.has('feTurbulence')).toBe(true);
    });

    it('should contain animation tags', () => {
      expect(SVG_TAGS.has('animate')).toBe(true);
      expect(SVG_TAGS.has('animateTransform')).toBe(true);
      expect(SVG_TAGS.has('animateMotion')).toBe(true);
      expect(SVG_TAGS.has('set')).toBe(true);
    });

    it('should not contain non-SVG tags', () => {
      expect(SVG_TAGS.has('div')).toBe(false);
      expect(SVG_TAGS.has('span')).toBe(false);
      expect(SVG_TAGS.has('img')).toBe(false);
    });
  });

  // ==================== SVG_NS ====================
  describe('SVG_NS', () => {
    it('should be the correct SVG namespace URI', () => {
      expect(SVG_NS).toBe('http://www.w3.org/2000/svg');
    });
  });

  // ==================== isSVGTag ====================
  describe('isSVGTag', () => {
    it('should return true for SVG tags', () => {
      expect(isSVGTag('svg')).toBe(true);
      expect(isSVGTag('path')).toBe(true);
      expect(isSVGTag('circle')).toBe(true);
      expect(isSVGTag('g')).toBe(true);
      expect(isSVGTag('text')).toBe(true);
      expect(isSVGTag('filter')).toBe(true);
      expect(isSVGTag('animate')).toBe(true);
    });

    it('should return false for non-SVG tags', () => {
      expect(isSVGTag('div')).toBe(false);
      expect(isSVGTag('span')).toBe(false);
      expect(isSVGTag('img')).toBe(false);
      expect(isSVGTag('input')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSVGTag('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isSVGTag('SVG')).toBe(false);
      expect(isSVGTag('Svg')).toBe(false);
      expect(isSVGTag('CIRCLE')).toBe(false);
    });
  });

  // ==================== patchClass ====================
  describe('patchClass', () => {
    let el: HTMLElement;

    beforeEach(() => {
      el = document.createElement('div');
    });

    it('should set className from string', () => {
      patchClass(el, null, 'foo bar');
      expect(el.className).toBe('foo bar');
    });

    it('should clear className when next is null', () => {
      el.className = 'foo';
      patchClass(el, 'foo', null);
      expect(el.className).toBe('');
    });

    it('should clear className when next is undefined', () => {
      el.className = 'foo';
      patchClass(el, 'foo', undefined);
      expect(el.className).toBe('');
    });

    it('should not update when prev and next are the same', () => {
      el.className = 'foo';
      const spy = vi.spyOn(HTMLElement.prototype, 'className', 'set');
      patchClass(el, 'foo', 'foo');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should convert non-string values via String()', () => {
      patchClass(el, null, 123 as any);
      expect(el.className).toBe('123');
    });

    it('should handle prev being null and next being a string', () => {
      patchClass(el, null, 'active');
      expect(el.className).toBe('active');
    });

    it('should handle prev being undefined and next being a string', () => {
      patchClass(el, undefined, 'active');
      expect(el.className).toBe('active');
    });

    it('should handle prev being a number', () => {
      patchClass(el, 42 as any, 'new-class');
      expect(el.className).toBe('new-class');
    });

    it('should handle next being an empty string', () => {
      el.className = 'old';
      patchClass(el, 'old', '');
      expect(el.className).toBe('');
    });
  });

  // ==================== patchStyle ====================
  describe('patchStyle', () => {
    let el: HTMLElement;

    beforeEach(() => {
      el = document.createElement('div');
    });

    it('should remove style attribute when next is null', () => {
      el.style.color = 'red';
      patchStyle(el, null, null);
      expect(el.getAttribute('style')).toBeNull();
    });

    it('should remove style attribute when next is empty string', () => {
      el.style.color = 'red';
      patchStyle(el, null, '');
      expect(el.getAttribute('style')).toBeNull();
    });

    it('should remove style attribute when next is undefined', () => {
      el.style.color = 'red';
      patchStyle(el, null, undefined);
      expect(el.getAttribute('style')).toBeNull();
    });

    it('should remove style attribute when next is false', () => {
      el.style.color = 'red';
      patchStyle(el, null, false as any);
      expect(el.getAttribute('style')).toBeNull();
    });

    it('should set style from string', () => {
      patchStyle(el, null, 'color: red; font-size: 16px');
      expect(el.getAttribute('style')).toBe('color: red; font-size: 16px');
    });

    it('should transition from object to string (clear old object styles)', () => {
      patchStyle(el, null, { color: 'red', fontSize: '16px' });
      expect(el.style.getPropertyValue('color')).toBe('red');
      expect(el.style.getPropertyValue('font-size')).toBe('16px');

      // Now switch to string - should clear old object styles
      patchStyle(el, { color: 'red', fontSize: '16px' }, 'background: blue');
      expect(el.style.getPropertyValue('color')).toBe('');
      expect(el.style.getPropertyValue('font-size')).toBe('');
      expect(el.getAttribute('style')).toContain('background: blue');
    });

    it('should transition from string to object (clear old string style)', () => {
      patchStyle(el, null, 'color: red');
      expect(el.getAttribute('style')).toBe('color: red');

      patchStyle(el, 'color: red', { background: 'blue' });
      expect(el.style.getPropertyValue('color')).toBe('');
      expect(el.style.getPropertyValue('background')).toBe('blue');
    });

    it('should apply styles from object', () => {
      patchStyle(el, null, { color: 'red', fontSize: '16px' });
      expect(el.style.getPropertyValue('color')).toBe('red');
      expect(el.style.getPropertyValue('font-size')).toBe('16px');
    });

    it('should remove keys that existed in prev but not in next (object to object)', () => {
      patchStyle(el, null, { color: 'red', fontSize: '16px' });
      patchStyle(el, { color: 'red', fontSize: '16px' }, { color: 'blue' });
      expect(el.style.getPropertyValue('color')).toBe('blue');
      expect(el.style.getPropertyValue('font-size')).toBe('');
    });

    it('should remove property when value is null', () => {
      patchStyle(el, null, { color: 'red' });
      patchStyle(el, { color: 'red' }, { color: null as any });
      expect(el.style.getPropertyValue('color')).toBe('');
    });

    it('should remove property when value is empty string', () => {
      patchStyle(el, null, { color: 'red' });
      patchStyle(el, { color: 'red' }, { color: '' });
      expect(el.style.getPropertyValue('color')).toBe('');
    });

    it('should handle numeric values in style object', () => {
      patchStyle(el, null, { zIndex: 10 });
      expect(el.style.getPropertyValue('z-index')).toBe('10');
    });

    it('should return early for non-object non-string next values', () => {
      el.style.color = 'red';
      patchStyle(el, null, 123 as any);
      // 123 is a number, not object and not string, so it should return early
      expect(el.style.getPropertyValue('color')).toBe('red');
    });

    it('should handle prev being null when next is object', () => {
      patchStyle(el, null, { color: 'red' });
      expect(el.style.getPropertyValue('color')).toBe('red');
    });

    it('should handle prev being undefined when next is object', () => {
      patchStyle(el, undefined, { color: 'red' });
      expect(el.style.getPropertyValue('color')).toBe('red');
    });

    it('should handle prev being a string when next is object', () => {
      el.setAttribute('style', 'color: red');
      patchStyle(el, 'color: red', { background: 'blue' });
      expect(el.style.getPropertyValue('background')).toBe('blue');
    });
  });

  // ==================== patchAttr ====================
  describe('patchAttr', () => {
    let el: HTMLElement;

    beforeEach(() => {
      el = document.createElement('div');
    });

    it('should remove attribute when value is null', () => {
      el.setAttribute('id', 'test');
      patchAttr(el, 'id', null, false);
      expect(el.getAttribute('id')).toBeNull();
    });

    it('should remove attribute when value is undefined', () => {
      el.setAttribute('id', 'test');
      patchAttr(el, 'id', undefined, false);
      expect(el.getAttribute('id')).toBeNull();
    });

    it('should remove attribute when value is false', () => {
      el.setAttribute('disabled', '');
      patchAttr(el, 'disabled', false, false);
      expect(el.getAttribute('disabled')).toBeNull();
    });

    it('should set boolean attribute to empty string when value is true', () => {
      patchAttr(el, 'disabled', true, false);
      expect(el.getAttribute('disabled')).toBe('');
    });

    it('should set boolean attribute to empty string when value is empty string', () => {
      patchAttr(el, 'disabled', '', false);
      expect(el.getAttribute('disabled')).toBe('');
    });

    it('should set boolean attribute with string value (safe)', () => {
      patchAttr(el, 'disabled', 'true', false);
      expect(el.getAttribute('disabled')).toBe('true');
    });

    it('should set boolean attribute with non-string value converted to string (safe)', () => {
      patchAttr(el, 'disabled', 1, false);
      expect(el.getAttribute('disabled')).toBe('1');
    });

    it('should set non-boolean attribute with string value (safe)', () => {
      patchAttr(el, 'id', 'my-id', false);
      expect(el.getAttribute('id')).toBe('my-id');
    });

    it('should set non-boolean attribute with non-string value (safe)', () => {
      patchAttr(el, 'tabindex', 0, false);
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('should block unsafe attribute and warn in DEV mode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      patchAttr(el, 'onclick', 'alert(1)', false);
      expect(el.getAttribute('onclick')).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should block unsafe URL attribute and warn in DEV mode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      patchAttr(el, 'href', 'javascript:alert(1)', false);
      expect(el.getAttribute('href')).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should allow safe URL attribute', () => {
      patchAttr(el, 'href', 'https://example.com', false);
      expect(el.getAttribute('href')).toBe('https://example.com');
    });

    it('should convert non-string value to string for non-boolean attr', () => {
      patchAttr(el, 'data-value', 42, false);
      expect(el.getAttribute('data-value')).toBe('42');
    });

    it('should not warn in production mode', () => {
      (globalThis as any).__DEV__ = false;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      patchAttr(el, 'onclick', 'alert(1)', false);
      expect(el.getAttribute('onclick')).toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
      (globalThis as any).__DEV__ = true;
    });

    it('should block unsafe boolean attribute value and warn in DEV mode', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Reset module registry so doMock takes effect on next dynamic import
      vi.resetModules();
      vi.doMock('@lytjs/common-string', async () => {
        const actual =
          await vi.importActual<typeof import('@lytjs/common-string')>('@lytjs/common-string');
        return {
          ...actual,
          isSafeAttribute: () => false,
        };
      });
      vi.doMock('@lytjs/common-error', async () => {
        const actual =
          await vi.importActual<typeof import('@lytjs/common-error')>('@lytjs/common-error');
        return actual;
      });
      // Dynamic import to get a fresh module with mocked isSafeAttribute
      const { patchAttr: mockedPatchAttr } = await import('../src/index');
      // 'disabled' is a boolean attr, value 'evil' triggers the else branch (not true/'')
      mockedPatchAttr(el, 'disabled', 'evil', false);
      expect(el.getAttribute('disabled')).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      vi.doUnmock('@lytjs/common-string');
      vi.doUnmock('@lytjs/common-error');
      warnSpy.mockRestore();
    });
  });

  // ==================== patchProp ====================
  describe('patchProp', () => {
    let el: HTMLElement;

    beforeEach(() => {
      el = document.createElement('div');
    });

    afterEach(() => {
      (globalThis as any).__DEV__ = true;
    });

    // --- class ---
    it('should delegate to patchClass for key "class"', () => {
      patchProp(el, 'class', null, 'foo bar', false);
      expect(el.className).toBe('foo bar');
    });

    it('should delegate to patchClass for key "class" with SVG', () => {
      patchProp(el, 'class', null, 'svg-class', true);
      expect(el.className).toBe('svg-class');
    });

    // --- style ---
    it('should delegate to patchStyle for key "style"', () => {
      patchProp(el, 'style', null, 'color: red', false);
      expect(el.style.getPropertyValue('color')).toBe('red');
    });

    it('should delegate to patchStyle for key "style" with object', () => {
      patchProp(el, 'style', null, { color: 'blue' }, false);
      expect(el.style.getPropertyValue('color')).toBe('blue');
    });

    // --- innerHTML ---
    it('should set innerHTML with string value', () => {
      patchProp(el, 'innerHTML', null, '<span>hello</span>', false);
      expect(el.innerHTML).toBe('<span>hello</span>');
    });

    it('should sanitize innerHTML', () => {
      patchProp(el, 'innerHTML', null, '<script>alert(1)</script><span>safe</span>', false);
      expect(el.innerHTML).not.toContain('<script');
      expect(el.innerHTML).toContain('safe');
    });

    it('should set innerHTML to empty string when next is null', () => {
      el.innerHTML = '<p>old</p>';
      patchProp(el, 'innerHTML', '<p>old</p>', null, false);
      expect(el.innerHTML).toBe('');
    });

    it('should set innerHTML to empty string when next is undefined', () => {
      el.innerHTML = '<p>old</p>';
      patchProp(el, 'innerHTML', '<p>old</p>', undefined, false);
      expect(el.innerHTML).toBe('');
    });

    it('should not update innerHTML when prev and next are the same', () => {
      const html = '<span>same</span>';
      patchProp(el, 'innerHTML', null, html, false);
      const spy = vi.spyOn(HTMLElement.prototype, 'innerHTML', 'set');
      patchProp(el, 'innerHTML', html, html, false);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should warn in DEV mode when innerHTML value is not a string', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      patchProp(el, 'innerHTML', null, 123 as any, false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should not warn in production mode when innerHTML value is not a string', () => {
      (globalThis as any).__DEV__ = false;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      patchProp(el, 'innerHTML', null, 123 as any, false);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    // --- textContent ---
    it('should set textContent with string value', () => {
      patchProp(el, 'textContent', null, 'hello', false);
      expect(el.textContent).toBe('hello');
    });

    it('should set textContent to empty string when next is null', () => {
      el.textContent = 'old';
      patchProp(el, 'textContent', 'old', null, false);
      expect(el.textContent).toBe('');
    });

    it('should set textContent to empty string when next is undefined', () => {
      el.textContent = 'old';
      patchProp(el, 'textContent', 'old', undefined, false);
      expect(el.textContent).toBe('');
    });

    it('should convert non-string textContent to string', () => {
      patchProp(el, 'textContent', null, 42 as any, false);
      expect(el.textContent).toBe('42');
    });

    it('should not update textContent when prev and next are the same', () => {
      patchProp(el, 'textContent', null, 'same', false);
      const spy = vi.spyOn(HTMLElement.prototype, 'textContent', 'set');
      patchProp(el, 'textContent', 'same', 'same', false);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    // --- fallback to patchAttr ---
    it('should delegate to patchAttr for regular attributes', () => {
      patchProp(el, 'id', null, 'my-id', false);
      expect(el.getAttribute('id')).toBe('my-id');
    });

    it('should delegate to patchAttr with isSVG flag', () => {
      patchProp(el, 'viewBox', null, '0 0 100 100', true);
      expect(el.getAttribute('viewBox')).toBe('0 0 100 100');
    });

    it('should delegate to patchAttr for boolean attributes', () => {
      patchProp(el, 'disabled', null, true, false);
      expect(el.getAttribute('disabled')).toBe('');
    });

    it('should delegate to patchAttr to remove attribute when value is null', () => {
      el.setAttribute('id', 'test');
      patchProp(el, 'id', 'test', null, false);
      expect(el.getAttribute('id')).toBeNull();
    });

    // --- default isSVG parameter ---
    it('should default isSVG to false', () => {
      patchProp(el, 'id', null, 'default-test');
      expect(el.getAttribute('id')).toBe('default-test');
    });
  });
});
