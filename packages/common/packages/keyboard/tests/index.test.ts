import { describe, it, expect, beforeEach, vi } from 'vitest';

// jsdom 环境下 KeyboardEvent 可能未定义，使用 Event 替代
const KeyboardEventCtor =
  typeof KeyboardEvent !== 'undefined'
    ? KeyboardEvent
    : class extends Event {
        key: string;
        ctrlKey: boolean;
        shiftKey: boolean;
        altKey: boolean;
        metaKey: boolean;
        constructor(type: string, init: Record<string, unknown> = {}) {
          super(type, init);
          this.key = (init.key as string) || '';
          this.ctrlKey = (init.ctrlKey as boolean) || false;
          this.shiftKey = (init.shiftKey as boolean) || false;
          this.altKey = (init.altKey as boolean) || false;
          this.metaKey = (init.metaKey as boolean) || false;
        }
      };

import {
  matchShortcut,
  createKeySequence,
  parseShortcut,
  MODIFIER_KEYS,
  SPECIAL_KEYS,
} from '../src/index';

function createKeyboardEvent(
  key: string,
  options: Partial<KeyboardEventInit> = {},
): InstanceType<typeof KeyboardEventCtor> {
  return new (KeyboardEventCtor as any)('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

describe('@lytjs/common-keyboard', () => {
  describe('MODIFIER_KEYS', () => {
    it('should contain ctrl, shift, alt, meta', () => {
      expect(MODIFIER_KEYS.has('ctrl')).toBe(true);
      expect(MODIFIER_KEYS.has('shift')).toBe(true);
      expect(MODIFIER_KEYS.has('alt')).toBe(true);
      expect(MODIFIER_KEYS.has('meta')).toBe(true);
    });
  });

  describe('SPECIAL_KEYS', () => {
    it('should map special key names to KeyboardEvent.key values', () => {
      expect(SPECIAL_KEYS['enter']).toBe('Enter');
      expect(SPECIAL_KEYS['escape']).toBe('Escape');
      expect(SPECIAL_KEYS['tab']).toBe('Tab');
      expect(SPECIAL_KEYS['space']).toBe(' ');
      expect(SPECIAL_KEYS['arrowup']).toBe('ArrowUp');
      expect(SPECIAL_KEYS['arrowdown']).toBe('ArrowDown');
      expect(SPECIAL_KEYS['arrowleft']).toBe('ArrowLeft');
      expect(SPECIAL_KEYS['arrowright']).toBe('ArrowRight');
    });

    it('should map function keys', () => {
      expect(SPECIAL_KEYS['f1']).toBe('F1');
      expect(SPECIAL_KEYS['f12']).toBe('F12');
    });

    it('should map navigation keys', () => {
      expect(SPECIAL_KEYS['home']).toBe('Home');
      expect(SPECIAL_KEYS['end']).toBe('End');
      expect(SPECIAL_KEYS['pageup']).toBe('PageUp');
      expect(SPECIAL_KEYS['pagedown']).toBe('PageDown');
    });
  });

  describe('parseShortcut', () => {
    it('should parse a simple key', () => {
      const result = parseShortcut('enter');
      expect(result).toEqual({
        key: 'Enter',
        ctrl: false,
        shift: false,
        alt: false,
        meta: false,
      });
    });

    it('should parse a shortcut with ctrl modifier', () => {
      const result = parseShortcut('ctrl+s');
      expect(result).toEqual({
        key: 'S',
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
      });
    });

    it('should parse a shortcut with multiple modifiers', () => {
      const result = parseShortcut('shift+alt+t');
      expect(result).toEqual({
        key: 'T',
        ctrl: false,
        shift: true,
        alt: true,
        meta: false,
      });
    });

    it('should parse ctrl+shift+alt+meta+a', () => {
      const result = parseShortcut('ctrl+shift+alt+meta+a');
      expect(result).toEqual({
        key: 'A',
        ctrl: true,
        shift: true,
        alt: true,
        meta: true,
      });
    });

    it('should parse special keys', () => {
      const result = parseShortcut('escape');
      expect(result.key).toBe('Escape');
    });

    it('should parse arrow keys', () => {
      const result = parseShortcut('arrowup');
      expect(result.key).toBe('ArrowUp');
    });

    it('should parse function keys', () => {
      const result = parseShortcut('f5');
      expect(result.key).toBe('F5');
    });

    it('should handle "control" as alias for "ctrl"', () => {
      const result = parseShortcut('control+s');
      expect(result.ctrl).toBe(true);
    });

    it('should handle "cmd" as alias for "meta"', () => {
      const result = parseShortcut('cmd+s');
      expect(result.meta).toBe(true);
    });

    it('should handle "command" as alias for "meta"', () => {
      const result = parseShortcut('command+s');
      expect(result.meta).toBe(true);
    });

    it('should handle whitespace around parts', () => {
      const result = parseShortcut(' ctrl + s ');
      expect(result).toEqual({
        key: 'S',
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
      });
    });
  });

  describe('matchShortcut', () => {
    it('should match a simple key', () => {
      const event = createKeyboardEvent('Enter');
      expect(matchShortcut(event, 'enter')).toBe(true);
    });

    it('should not match a different key', () => {
      const event = createKeyboardEvent('Escape');
      expect(matchShortcut(event, 'enter')).toBe(false);
    });

    it('should match ctrl+s', () => {
      const event = createKeyboardEvent('s', { ctrlKey: true });
      expect(matchShortcut(event, 'ctrl+s')).toBe(true);
    });

    it('should not match ctrl+s when shift is also pressed', () => {
      const event = createKeyboardEvent('s', { ctrlKey: true, shiftKey: true });
      expect(matchShortcut(event, 'ctrl+s')).toBe(false);
    });

    it('should match shift+alt+t', () => {
      const event = createKeyboardEvent('t', { shiftKey: true, altKey: true });
      expect(matchShortcut(event, 'shift+alt+t')).toBe(true);
    });

    it('should match escape', () => {
      const event = createKeyboardEvent('Escape');
      expect(matchShortcut(event, 'escape')).toBe(true);
    });

    it('should match tab', () => {
      const event = createKeyboardEvent('Tab');
      expect(matchShortcut(event, 'tab')).toBe(true);
    });

    it('should match space', () => {
      const event = createKeyboardEvent(' ');
      expect(matchShortcut(event, 'space')).toBe(true);
    });

    it('should match arrow keys', () => {
      expect(matchShortcut(createKeyboardEvent('ArrowUp'), 'arrowup')).toBe(true);
      expect(matchShortcut(createKeyboardEvent('ArrowDown'), 'arrowdown')).toBe(true);
      expect(matchShortcut(createKeyboardEvent('ArrowLeft'), 'arrowleft')).toBe(true);
      expect(matchShortcut(createKeyboardEvent('ArrowRight'), 'arrowright')).toBe(true);
    });

    it('should match function keys', () => {
      expect(matchShortcut(createKeyboardEvent('F1'), 'f1')).toBe(true);
      expect(matchShortcut(createKeyboardEvent('F12'), 'f12')).toBe(true);
    });

    it('should match backspace and delete', () => {
      expect(matchShortcut(createKeyboardEvent('Backspace'), 'backspace')).toBe(true);
      expect(matchShortcut(createKeyboardEvent('Delete'), 'delete')).toBe(true);
    });

    it('should match home and end', () => {
      expect(matchShortcut(createKeyboardEvent('Home'), 'home')).toBe(true);
      expect(matchShortcut(createKeyboardEvent('End'), 'end')).toBe(true);
    });

    it('should match pageup and pagedown', () => {
      expect(matchShortcut(createKeyboardEvent('PageUp'), 'pageup')).toBe(true);
      expect(matchShortcut(createKeyboardEvent('PageDown'), 'pagedown')).toBe(true);
    });
  });

  describe('createKeySequence', () => {
    it('should return a matcher function', () => {
      const matcher = createKeySequence(['ctrl', 'k']);
      expect(typeof matcher).toBe('function');
    });

    it('should match a two-key sequence', () => {
      const matcher = createKeySequence(['ctrl+k', 's']);
      const event1 = createKeyboardEvent('k', { ctrlKey: true });
      const event2 = createKeyboardEvent('s');

      expect(matcher(event1)).toBe(false);
      expect(matcher(event2)).toBe(true);
    });

    it('should match a three-key sequence', () => {
      const matcher = createKeySequence(['ctrl+k', 's', 'enter']);
      const event1 = createKeyboardEvent('k', { ctrlKey: true });
      const event2 = createKeyboardEvent('s');
      const event3 = createKeyboardEvent('Enter');

      expect(matcher(event1)).toBe(false);
      expect(matcher(event2)).toBe(false);
      expect(matcher(event3)).toBe(true);
    });

    it('should reset when sequence is broken', () => {
      const matcher = createKeySequence(['ctrl+k', 's']);
      const event1 = createKeyboardEvent('k', { ctrlKey: true });
      const wrongEvent = createKeyboardEvent('a');
      const event2 = createKeyboardEvent('s');

      matcher(event1); // matches first key
      expect(matcher(wrongEvent)).toBe(false); // breaks sequence
      expect(matcher(event2)).toBe(false); // should not match because sequence was reset
    });

    it('should allow re-matching after completion', () => {
      const matcher = createKeySequence(['ctrl+k', 's']);
      const event1 = createKeyboardEvent('k', { ctrlKey: true });
      const event2 = createKeyboardEvent('s');

      expect(matcher(event1)).toBe(false);
      expect(matcher(event2)).toBe(true);

      // Should be able to match again
      expect(matcher(event1)).toBe(false);
      expect(matcher(event2)).toBe(true);
    });

    it('should handle single-key sequence', () => {
      const matcher = createKeySequence(['enter']);
      const event = createKeyboardEvent('Enter');
      expect(matcher(event)).toBe(true);
    });
  });
});
