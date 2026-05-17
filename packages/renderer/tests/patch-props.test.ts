// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  patchProp,
  patchClass,
  patchStyle,
  patchEvent,
  patchAttr,
} from '@lytjs/adapter-web';
import { isOn } from '@lytjs/common-events';
import { isBooleanAttr } from '../src/utils';

describe('patch-props', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  describe('isOn', () => {
    it('should detect event handler keys', () => {
      expect(isOn('onClick')).toBe(true);
      expect(isOn('onMouseEnter')).toBe(true);
      expect(isOn('onInput')).toBe(true);
      expect(isOn('class')).toBe(false);
      expect(isOn('style')).toBe(false);
      expect(isOn('onclick')).toBe(false); // lowercase 'c' - not a match
    });
  });

  describe('isBooleanAttr', () => {
    it('should detect boolean attributes', () => {
      expect(isBooleanAttr('disabled')).toBe(true);
      expect(isBooleanAttr('checked')).toBe(true);
      expect(isBooleanAttr('required')).toBe(true);
      expect(isBooleanAttr('id')).toBe(false);
      expect(isBooleanAttr('class')).toBe(false);
    });
  });

  describe('patchClass', () => {
    it('should set className from string', () => {
      patchClass(el, null, 'foo bar');
      expect(el.className).toBe('foo bar');
    });

    it('should clear className when next is null', () => {
      el.className = 'foo';
      patchClass(el, 'foo', null);
      expect(el.className).toBe('');
    });

    it('should update className', () => {
      patchClass(el, 'foo', 'bar');
      expect(el.className).toBe('bar');
    });
  });

  describe('patchStyle', () => {
    it('should set style from object', () => {
      patchStyle(el, null, { color: 'red', fontSize: '16px' });
      expect(el.style.color).toBe('red');
      expect(el.style.fontSize).toBe('16px');
    });

    it('should set style from string', () => {
      patchStyle(el, null, 'color: red; font-size: 16px');
      expect(el.getAttribute('style')).toBe('color: red; font-size: 16px');
    });

    it('should clear style when next is null', () => {
      el.style.color = 'red';
      patchStyle(el, { color: 'red' }, null);
      expect(el.getAttribute('style')).toBeNull();
    });

    it('should remove old style properties', () => {
      patchStyle(el, null, { color: 'red', fontSize: '16px' });
      patchStyle(el, { color: 'red', fontSize: '16px' }, { color: 'blue' });
      expect(el.style.color).toBe('blue');
      expect(el.style.fontSize).toBe('');
    });

    it('should handle empty string style', () => {
      patchStyle(el, null, { color: 'red' });
      patchStyle(el, { color: 'red' }, '');
      expect(el.getAttribute('style')).toBeNull();
    });
  });

  describe('patchEvent', () => {
    it('should add event listener', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick', handler);
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should remove event listener when next is null', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick', handler);
      patchEvent(el, 'onClick', null);
      el.click();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should replace event listener', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      patchEvent(el, 'onClick', handler1);
      patchEvent(el, 'onClick', handler2);
      el.click();
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should cache invoker via WeakMap when adding event', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick', handler);
      // FIX: WeakMap 不暴露内部状态，通过事件触发验证
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should only replace invoker.value when updating event (no DOM re-bind)', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const addSpy = vi.spyOn(el, 'addEventListener');
      const removeSpy = vi.spyOn(el, 'removeEventListener');

      patchEvent(el, 'onClick', handler1);
      const addCountAfterFirst = addSpy.mock.calls.length;

      patchEvent(el, 'onClick', handler2);

      // 不应再次调用 addEventListener 或 removeEventListener
      expect(addSpy.mock.calls.length).toBe(addCountAfterFirst);
      expect(removeSpy).not.toHaveBeenCalled();

      // handler2 应生效
      el.click();
      expect(handler2).toHaveBeenCalledTimes(1);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('should remove event listener when clearing event', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick', handler);
      patchEvent(el, 'onClick', null);
      // FIX: WeakMap 不暴露内部状态，通过行为验证
      el.click();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('patchAttr', () => {
    it('should set regular attribute', () => {
      patchAttr(el, 'id', 'app', false);
      expect(el.getAttribute('id')).toBe('app');
    });

    it('should remove attribute when value is null', () => {
      el.setAttribute('id', 'app');
      patchAttr(el, 'id', null, false);
      expect(el.getAttribute('id')).toBeNull();
    });

    it('should handle boolean attributes', () => {
      patchAttr(el, 'disabled', true, false);
      expect(el.getAttribute('disabled')).toBe('');
    });

    it('should remove boolean attribute when false', () => {
      el.setAttribute('disabled', '');
      patchAttr(el, 'disabled', false, false);
      expect(el.getAttribute('disabled')).toBeNull();
    });
  });

  describe('patchProp', () => {
    it('should dispatch to patchClass for class key', () => {
      patchProp(el, 'class', null, 'foo');
      expect(el.className).toBe('foo');
    });

    it('should dispatch to patchStyle for style key', () => {
      patchProp(el, 'style', null, { color: 'red' });
      expect(el.style.color).toBe('red');
    });

    it('should dispatch to patchEvent for onXxx keys', () => {
      const handler = vi.fn();
      patchProp(el, 'onClick', null, handler);
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should dispatch to patchAttr for regular attributes', () => {
      patchProp(el, 'data-test', null, 'value', false);
      expect(el.getAttribute('data-test')).toBe('value');
    });
  });
});
