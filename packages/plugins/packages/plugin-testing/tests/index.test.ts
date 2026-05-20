import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockFn, createTestingContext } from '../src';

describe('@lytjs/plugin-testing', () => {
  let testing: ReturnType<typeof createTestingContext>;

  beforeEach(() => {
    testing = createTestingContext();
  });

  describe('createMockFn', () => {
    it('should create a mock function', () => {
      const fn = createMockFn();
      expect(fn.callCount).toBe(0);
    });

    it('should track calls', () => {
      const fn = createMockFn();
      fn('arg1', 'arg2');
      expect(fn.callCount).toBe(1);
      expect(fn.calls[0]).toEqual(['arg1', 'arg2']);
    });

    it('should track last call', () => {
      const fn = createMockFn();
      fn('first');
      fn('second');
      expect(fn.lastCall).toEqual(['second']);
    });

    it('should return mock value', () => {
      const fn = createMockFn();
      fn.mockReturnValue('return value');
      expect(fn()).toBe('return value');
    });

    it('should use mock implementation', () => {
      const fn = createMockFn();
      fn.mockImplementation((a, b) => a + b);
      expect(fn(1, 2)).toBe(3);
    });

    it('should clear calls', () => {
      const fn = createMockFn();
      fn('test');
      expect(fn.callCount).toBe(1);
      fn.mockClear();
      expect(fn.callCount).toBe(0);
    });

    it('should reset everything', () => {
      const fn = createMockFn();
      fn.mockReturnValue('test');
      fn('call');
      fn.mockReset();
      expect(fn.callCount).toBe(0);
      expect(fn()).toBeUndefined();
    });
  });

  describe('testing context', () => {
    it('should create mock functions', () => {
      const fn = testing.mockFn();
      fn('test');
      expect(fn.callCount).toBe(1);
    });

    it('should clear all mocks', () => {
      const fn1 = testing.mockFn();
      const fn2 = testing.mockFn();
      fn1('test1');
      fn2('test2');
      testing.clearAllMocks();
      expect(fn1.callCount).toBe(0);
      expect(fn2.callCount).toBe(0);
    });

    it('should wait', async () => {
      const startTime = Date.now();
      await testing.wait(10);
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(10);
    });

    it('should wait for condition', async () => {
      let flag = false;
      setTimeout(() => (flag = true), 10);
      await testing.waitFor(() => flag);
      expect(flag).toBe(true);
    });

    it('should next tick', async () => {
      let ticked = false;
      Promise.resolve().then(() => (ticked = true));
      expect(ticked).toBe(false);
      await testing.nextTick();
      expect(ticked).toBe(true);
    });
  });

  describe('DOM helpers', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should check if element exists', () => {
      expect(testing.dom.exists('.test')).toBe(false);
      const el = document.createElement('div');
      el.className = 'test';
      document.body.appendChild(el);
      expect(testing.dom.exists('.test')).toBe(true);
    });

    it('should get text content', () => {
      const el = document.createElement('div');
      el.textContent = 'Hello world';
      document.body.appendChild(el);
      expect(testing.dom.text(el)).toBe('Hello world');
    });

    it('should check for classes', () => {
      const el = document.createElement('div');
      el.className = 'test-class another-class';
      expect(testing.dom.hasClass(el, 'test-class')).toBe(true);
      expect(testing.dom.hasClass(el, 'not-present')).toBe(false);
    });

    it('should get classes', () => {
      const el = document.createElement('div');
      el.className = 'class1 class2';
      expect(testing.dom.classes(el)).toEqual(['class1', 'class2']);
    });

    it('should get attribute', () => {
      const el = document.createElement('div');
      el.setAttribute('data-test', 'value');
      expect(testing.dom.attribute(el, 'data-test')).toBe('value');
    });

    it('should check visible', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      expect(testing.dom.isVisible(el)).toBe(true);
      el.style.display = 'none';
      expect(testing.dom.isVisible(el)).toBe(false);
    });

    it('should check disabled', () => {
      const el = document.createElement('button');
      expect(testing.dom.isDisabled(el)).toBe(false);
      el.disabled = true;
      expect(testing.dom.isDisabled(el)).toBe(true);
    });

    it('should wait for element', async () => {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'delayed-element';
        document.body.appendChild(el);
      }, 10);
      const el = await testing.dom.waitForElement('.delayed-element', 100);
      expect(el.className).toBe('delayed-element');
    });
  });

  describe('Signal helpers', () => {
    it('should track updates', () => {
      const signal = { value: 'initial' };
      const tracked = testing.signal.trackUpdates(signal);
      expect(tracked.value).toBe('initial');
      signal.value = 'updated';
      expect(tracked.value).toBe('updated');
      expect(tracked.updateCount).toBe(1);
      expect(tracked.history).toEqual(['initial', 'updated']);
    });

    it('should wait for update', async () => {
      const signal = { value: 'initial' };
      setTimeout(() => (signal.value = 'changed'), 10);
      await testing.signal.waitForUpdate(signal, 100);
      expect(signal.value).toBe('changed');
    });
  });
});
