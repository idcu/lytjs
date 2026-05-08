// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  focusTrap,
  manageFocus,
  getAriaProps,
  setAriaProps,
  isFocusable,
  getFocusableElements,
  assertActiveElement,
  ARIA_ROLES,
} from '../src/index';

describe('@lytjs/common-a11y', () => {
  describe('isFocusable', () => {
    it('should return true for a button element', () => {
      const el = document.createElement('button');
      expect(isFocusable(el)).toBe(true);
    });

    it('should return true for an input element', () => {
      const el = document.createElement('input');
      expect(isFocusable(el)).toBe(true);
    });

    it('should return true for an anchor with href', () => {
      const el = document.createElement('a');
      el.setAttribute('href', '#');
      expect(isFocusable(el)).toBe(true);
    });

    it('should return false for a disabled button', () => {
      const el = document.createElement('button');
      el.disabled = true;
      expect(isFocusable(el)).toBe(false);
    });

    it('should return false for a div without tabindex', () => {
      const el = document.createElement('div');
      expect(isFocusable(el)).toBe(false);
    });

    it('should return true for a div with tabindex', () => {
      const el = document.createElement('div');
      el.setAttribute('tabindex', '0');
      expect(isFocusable(el)).toBe(true);
    });

    it('should return false for element with tabindex="-1"', () => {
      const el = document.createElement('div');
      el.setAttribute('tabindex', '-1');
      expect(isFocusable(el)).toBe(false);
    });

    it('should return false for element with aria-hidden="true"', () => {
      const el = document.createElement('button');
      el.setAttribute('aria-hidden', 'true');
      expect(isFocusable(el)).toBe(false);
    });

    it('should return true for contenteditable element', () => {
      const el = document.createElement('div');
      el.setAttribute('contenteditable', 'true');
      expect(isFocusable(el)).toBe(true);
    });
  });

  describe('getFocusableElements', () => {
    it('should return all focusable elements in a container', () => {
      const container = document.createElement('div');
      const btn = document.createElement('button');
      const input = document.createElement('input');
      const span = document.createElement('span');
      container.appendChild(btn);
      container.appendChild(input);
      container.appendChild(span);
      document.body.appendChild(container);

      const result = getFocusableElements(container);
      expect(result).toHaveLength(2);
      expect(result).toContain(btn);
      expect(result).toContain(input);

      document.body.removeChild(container);
    });

    it('should return empty array when no focusable elements', () => {
      const container = document.createElement('div');
      const span = document.createElement('span');
      container.appendChild(span);

      const result = getFocusableElements(container);
      expect(result).toHaveLength(0);
    });

    it('should exclude disabled elements', () => {
      const container = document.createElement('div');
      const btn = document.createElement('button');
      const disabledBtn = document.createElement('button');
      disabledBtn.disabled = true;
      container.appendChild(btn);
      container.appendChild(disabledBtn);

      const result = getFocusableElements(container);
      expect(result).toHaveLength(1);
      expect(result).toContain(btn);
    });
  });

  describe('focusTrap', () => {
    it('should return a cleanup function', () => {
      const container = document.createElement('div');
      const btn = document.createElement('button');
      container.appendChild(btn);
      document.body.appendChild(container);

      const cleanup = focusTrap(container);
      expect(typeof cleanup).toBe('function');
      cleanup();

      document.body.removeChild(container);
    });

    it('should focus the first focusable element', () => {
      const container = document.createElement('div');
      const btn = document.createElement('button');
      container.appendChild(btn);
      document.body.appendChild(container);

      focusTrap(container);
      expect(assertActiveElement(btn)).toBe(true);

      document.body.removeChild(container);
    });

    it('should focus the initialFocus element when provided', () => {
      const container = document.createElement('div');
      const btn1 = document.createElement('button');
      const btn2 = document.createElement('button');
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);

      focusTrap(container, { initialFocus: btn2 });
      expect(assertActiveElement(btn2)).toBe(true);

      document.body.removeChild(container);
    });

    it('should trap Tab key within the container', () => {
      const container = document.createElement('div');
      const btn1 = document.createElement('button');
      const btn2 = document.createElement('button');
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);

      focusTrap(container);
      btn2.focus();

      // Simulate Tab key on last element
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(tabEvent, 'shiftKey', { value: false });
      btn2.dispatchEvent(tabEvent);

      // Focus should wrap to first element
      expect(assertActiveElement(btn1)).toBe(true);

      document.body.removeChild(container);
    });

    it('should trap Shift+Tab within the container', () => {
      const container = document.createElement('div');
      const btn1 = document.createElement('button');
      const btn2 = document.createElement('button');
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);

      focusTrap(container);
      btn1.focus();

      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      btn1.dispatchEvent(shiftTabEvent);

      expect(assertActiveElement(btn2)).toBe(true);

      document.body.removeChild(container);
    });

    it('should cleanup on Escape when escapeDeactivates is true', () => {
      const container = document.createElement('div');
      const btn = document.createElement('button');
      container.appendChild(btn);
      document.body.appendChild(container);

      const cleanup = focusTrap(container, { escapeDeactivates: true });

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      document.dispatchEvent(escapeEvent);

      // After escape, the trap should be cleaned up
      // Tab should no longer be trapped
      btn.focus();
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      btn.dispatchEvent(tabEvent);

      cleanup();
      document.body.removeChild(container);
    });
  });

  describe('manageFocus', () => {
    it('should return a restore function', () => {
      const container = document.createElement('div');
      const btn = document.createElement('button');
      container.appendChild(btn);
      document.body.appendChild(container);

      const restore = manageFocus(container);
      expect(typeof restore).toBe('function');
      restore();

      document.body.removeChild(container);
    });

    it('should focus the first focusable element in the container', () => {
      const container = document.createElement('div');
      const btn = document.createElement('button');
      container.appendChild(btn);
      document.body.appendChild(container);

      manageFocus(container);
      expect(assertActiveElement(btn)).toBe(true);

      document.body.removeChild(container);
    });

    it('should restore focus to trigger element', () => {
      const trigger = document.createElement('button');
      const container = document.createElement('div');
      const btn = document.createElement('button');
      container.appendChild(btn);
      document.body.appendChild(trigger);
      document.body.appendChild(container);

      trigger.focus();
      const restore = manageFocus(container, trigger);
      expect(assertActiveElement(btn)).toBe(true);

      restore();
      expect(assertActiveElement(trigger)).toBe(true);

      document.body.removeChild(trigger);
      document.body.removeChild(container);
    });

    it('should restore focus to previous active element when no trigger', () => {
      const previous = document.createElement('button');
      const container = document.createElement('div');
      const btn = document.createElement('button');
      container.appendChild(btn);
      document.body.appendChild(previous);
      document.body.appendChild(container);

      previous.focus();
      const restore = manageFocus(container);
      restore();
      expect(assertActiveElement(previous)).toBe(true);

      document.body.removeChild(previous);
      document.body.removeChild(container);
    });
  });

  describe('getAriaProps', () => {
    it('should return all aria-* attributes', () => {
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'test');
      el.setAttribute('aria-expanded', 'true');
      el.setAttribute('role', 'button');
      el.setAttribute('id', 'myId');

      const props = getAriaProps(el);
      expect(props).toEqual({
        'aria-label': 'test',
        'aria-expanded': 'true',
      });
    });

    it('should return empty object when no aria attributes', () => {
      const el = document.createElement('div');
      expect(getAriaProps(el)).toEqual({});
    });
  });

  describe('setAriaProps', () => {
    it('should set aria-* attributes on element', () => {
      const el = document.createElement('div');
      setAriaProps(el, {
        'aria-label': 'test',
        'aria-expanded': 'false',
      });
      expect(el.getAttribute('aria-label')).toBe('test');
      expect(el.getAttribute('aria-expanded')).toBe('false');
    });

    it('should only set aria-* attributes and ignore others', () => {
      const el = document.createElement('div');
      setAriaProps(el, {
        'aria-label': 'test',
        'role': 'button',
        'id': 'myId',
      } as Record<string, string>);
      expect(el.getAttribute('aria-label')).toBe('test');
      expect(el.getAttribute('role')).toBeNull();
      expect(el.getAttribute('id')).toBeNull();
    });
  });

  describe('assertActiveElement', () => {
    it('should return true when element is active', () => {
      const el = document.createElement('button');
      document.body.appendChild(el);
      el.focus();
      expect(assertActiveElement(el)).toBe(true);
      document.body.removeChild(el);
    });

    it('should return false when element is not active', () => {
      const el = document.createElement('button');
      const other = document.createElement('button');
      document.body.appendChild(el);
      document.body.appendChild(other);
      other.focus();
      expect(assertActiveElement(el)).toBe(false);
      document.body.removeChild(el);
      document.body.removeChild(other);
    });
  });

  describe('ARIA_ROLES', () => {
    it('should be a non-empty object', () => {
      expect(typeof ARIA_ROLES).toBe('object');
      expect(Object.keys(ARIA_ROLES).length).toBeGreaterThan(0);
    });

    it('should contain common roles', () => {
      expect(ARIA_ROLES).toHaveProperty('button');
      expect(ARIA_ROLES).toHaveProperty('dialog');
      expect(ARIA_ROLES).toHaveProperty('alert');
      expect(ARIA_ROLES).toHaveProperty('checkbox');
    });

    it('should map roles to arrays of required attributes', () => {
      expect(Array.isArray(ARIA_ROLES['alert'])).toBe(true);
      expect(Array.isArray(ARIA_ROLES['dialog'])).toBe(true);
    });
  });
});
