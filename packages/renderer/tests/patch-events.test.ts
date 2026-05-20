/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeEventName,
  getEventKey,
  parseEventModifier,
  createInvoker,
  patchEvent,
  removeAllEventListeners,
} from '@lytjs/adapter-web';


describe('patch-events', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  // ----------------------------------------------------------
  // normalizeEventName
  // ----------------------------------------------------------
  describe('normalizeEventName', () => {
    it('should normalize onClick to click', () => {
      expect(normalizeEventName('onClick')).toBe('click');
    });

    it('should normalize @click to click', () => {
      expect(normalizeEventName('@click')).toBe('click');
    });

    it('should normalize plain click to click', () => {
      expect(normalizeEventName('click')).toBe('click');
    });

    it('should normalize onMouseEnter to mouseenter', () => {
      expect(normalizeEventName('onMouseEnter')).toBe('mouseenter');
    });

    it('should strip modifier suffixes', () => {
      expect(normalizeEventName('onClick.stop.prevent')).toBe('click');
    });
  });

  // ----------------------------------------------------------
  // getEventKey
  // ----------------------------------------------------------
  describe('getEventKey', () => {
    it('should convert click to onClick', () => {
      expect(getEventKey('click')).toBe('onClick');
    });

    it('should convert mouseenter to onMouseenter', () => {
      expect(getEventKey('mouseenter')).toBe('onMouseenter');
    });

    it('should handle raw names with modifiers', () => {
      expect(getEventKey('click.stop')).toBe('onClick');
    });
  });

  // ----------------------------------------------------------
  // parseEventModifier
  // ----------------------------------------------------------
  describe('parseEventModifier', () => {
    it('should parse no modifiers', () => {
      const parsed = parseEventModifier('onClick');
      expect(parsed).toEqual({
        name: 'click',
        stop: false,
        prevent: false,
        capture: false,
        once: false,
        self: false,
        passive: false,
      });
    });

    it('should parse .stop modifier', () => {
      const parsed = parseEventModifier('onClick.stop');
      expect(parsed.name).toBe('click');
      expect(parsed.stop).toBe(true);
    });

    it('should parse .prevent modifier', () => {
      const parsed = parseEventModifier('onSubmit.prevent');
      expect(parsed.name).toBe('submit');
      expect(parsed.prevent).toBe(true);
    });

    it('should parse multiple modifiers', () => {
      const parsed = parseEventModifier('onClick.stop.prevent.capture');
      expect(parsed.stop).toBe(true);
      expect(parsed.prevent).toBe(true);
      expect(parsed.capture).toBe(true);
    });

    it('should parse .self modifier', () => {
      const parsed = parseEventModifier('onClick.self');
      expect(parsed.self).toBe(true);
    });

    it('should parse .passive modifier', () => {
      const parsed = parseEventModifier('onTouchStart.passive');
      expect(parsed.passive).toBe(true);
    });

    it('should parse .once modifier', () => {
      const parsed = parseEventModifier('onClick.once');
      expect(parsed.once).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // createInvoker
  // ----------------------------------------------------------
  describe('createInvoker', () => {
    it('should create an invoker with initial value', () => {
      const handler = vi.fn();
      const invoker = createInvoker(handler);
      expect(invoker.value).toBe(handler);
    });

    it('should call value when invoked', () => {
      const handler = vi.fn();
      const invoker = createInvoker(handler);
      const event = new Event('click');
      invoker(event);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not throw when value is null', () => {
      const invoker = createInvoker(() => {});
      invoker.value = null;
      const event = new Event('click');
      expect(() => invoker(event)).not.toThrow();
    });

    it('should call new value after replacement', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const invoker = createInvoker(handler1);
      invoker.value = handler2;
      const event = new Event('click');
      invoker(event);
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(event);
    });
  });

  // ----------------------------------------------------------
  // patchEvent — 核心四种分支
  // ----------------------------------------------------------
  describe('patchEvent', () => {
    it('should add event listener (branch 2: nextValue + no existing)', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick', handler);
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should cache invoker via WeakMap', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick', handler);
      // FIX: 使用 WeakMap 替代 el._vei，通过事件触发验证缓存工作正常
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should replace invoker.value without re-binding (branch 1)', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const addSpy = vi.spyOn(el, 'addEventListener');
      const removeSpy = vi.spyOn(el, 'removeEventListener');

      patchEvent(el, 'onClick', handler1);
      const callCountAfterFirst = addSpy.mock.calls.length;

      // 更新事件处理函数
      patchEvent(el, 'onClick', handler2);

      // addEventListener 不应被再次调用
      expect(addSpy.mock.calls.length).toBe(callCountAfterFirst);
      // removeEventListener 不应被调用
      expect(removeSpy).not.toHaveBeenCalled();

      // 新处理函数应生效
      el.click();
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('should remove event listener (branch 3: no nextValue + existing)', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick', handler);
      patchEvent(el, 'onClick', null);
      el.click();
      expect(handler).not.toHaveBeenCalled();
      // FIX: WeakMap 不暴露内部状态，通过行为验证
    });

    it('should do nothing when no nextValue and no existing (branch 4)', () => {
      const addSpy = vi.spyOn(el, 'addEventListener');
      patchEvent(el, 'onClick', null);
      expect(addSpy).not.toHaveBeenCalled();
      addSpy.mockRestore();
    });

    it('should handle multiple events on same element', () => {
      const clickHandler = vi.fn();
      const inputHandler = vi.fn();
      patchEvent(el, 'onClick', clickHandler);
      patchEvent(el, 'onInput', inputHandler);

      el.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(inputHandler).not.toHaveBeenCalled();

      el.dispatchEvent(new Event('input'));
      expect(inputHandler).toHaveBeenCalledTimes(1);
    });

    it('should support .stop modifier', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick.stop', handler);

      const parent = document.createElement('div');
      parent.appendChild(el);
      const parentHandler = vi.fn();
      parent.addEventListener('click', parentHandler);

      el.click();
      expect(handler).toHaveBeenCalled();
      expect(parentHandler).not.toHaveBeenCalled();
    });

    it('should support .prevent modifier', () => {
      const handler = vi.fn();
      patchEvent(el, 'onSubmit.prevent', handler);

      const event = new Event('submit', { cancelable: true });
      el.dispatchEvent(event);
      expect(handler).toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    });

    it('should support .self modifier', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick.self', handler);

      const child = document.createElement('span');
      el.appendChild(child);

      // 从子元素触发，不应执行 handler
      child.click();
      expect(handler).not.toHaveBeenCalled();

      // 从自身触发，应执行 handler
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support .capture modifier', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick.capture', handler);

      // FIX: WeakMap 不暴露内部状态，通过事件触发验证
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support object format { handler, capture, once, passive }', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick', { handler, capture: true } as any);
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should pass capture option to removeEventListener', () => {
      const handler = vi.fn();
      const addSpy = vi.spyOn(el, 'addEventListener');
      const removeSpy = vi.spyOn(el, 'removeEventListener');

      patchEvent(el, 'onClick.capture', handler);

      // addEventListener 应被调用且包含 capture: true
      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), { capture: true });

      // 移除
      patchEvent(el, 'onClick.capture', null);

      // removeEventListener 应传递 capture: true
      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), { capture: true });

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // removeAllEventListeners
  // ----------------------------------------------------------
  describe('removeAllEventListeners', () => {
    it('should remove all cached event listeners', () => {
      const clickHandler = vi.fn();
      const inputHandler = vi.fn();

      patchEvent(el, 'onClick', clickHandler);
      patchEvent(el, 'onInput', inputHandler);

      removeAllEventListeners(el);

      el.click();
      el.dispatchEvent(new Event('input'));

      expect(clickHandler).not.toHaveBeenCalled();
      expect(inputHandler).not.toHaveBeenCalled();
      // FIX: WeakMap 不暴露内部状态，通过行为验证
    });

    it('should do nothing when no events are cached', () => {
      expect(() => removeAllEventListeners(el)).not.toThrow();
    });

    it('should handle partially removed events', () => {
      const handler = vi.fn();
      patchEvent(el, 'onClick', handler);
      patchEvent(el, 'onClick', null); // 移除 click

      // _vei 仍存在但 onClick 为 undefined
      expect(() => removeAllEventListeners(el)).not.toThrow();
    });
  });
});
