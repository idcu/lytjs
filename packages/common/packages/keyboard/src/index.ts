/**
 * @lytjs/common-keyboard
 * 轻量级键盘快捷键工具
 */

declare const __DEV__: boolean;

export interface ParsedShortcut {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/** 修饰键名称集合 */
export const MODIFIER_KEYS: Set<string> = new Set(['ctrl', 'shift', 'alt', 'meta']);

/** 特殊键名称到 KeyboardEvent.key 的映射 */
export const SPECIAL_KEYS: Record<string, string> = {
  enter: 'Enter',
  escape: 'Escape',
  tab: 'Tab',
  space: ' ',
  backspace: 'Backspace',
  delete: 'Delete',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  f1: 'F1',
  f2: 'F2',
  f3: 'F3',
  f4: 'F4',
  f5: 'F5',
  f6: 'F6',
  f7: 'F7',
  f8: 'F8',
  f9: 'F9',
  f10: 'F10',
  f11: 'F11',
  f12: 'F12',
};

/**
 * 解析快捷键字符串为结构化对象
 *
 * @param shortcut - 快捷键字符串，如 "ctrl+s", "shift+alt+t", "enter"
 * @returns 解析后的快捷键对象
 */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const result: ParsedShortcut = {
    key: '',
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
  };

  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') {
      result.ctrl = true;
    } else if (part === 'shift') {
      result.shift = true;
    } else if (part === 'alt') {
      result.alt = true;
    } else if (part === 'meta' || part === 'cmd' || part === 'command') {
      result.meta = true;
    } else {
      // Resolve special keys
      result.key = SPECIAL_KEYS[part] || part.toUpperCase();
    }
  }

  return result;
}

/**
 * 匹配快捷键字符串
 *
 * @param event - KeyboardEvent
 * @param shortcut - 快捷键字符串，如 "ctrl+s", "shift+alt+t", "enter"
 * @returns 是否匹配
 */
export function matchShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut);

  return (
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.metaKey === parsed.meta &&
    event.key.toLowerCase() === parsed.key.toLowerCase()
  );
}

/**
 * 创建一个按键序列匹配器
 *
 * @param keys - 按键序列，如 ["ctrl", "k", "s"] 表示先按 Ctrl+K 再按 S
 * @returns 匹配函数，每次调用传入 KeyboardEvent，按顺序匹配
 */
export function createKeySequence(keys: string[]): (event: KeyboardEvent) => boolean {
  let currentIndex = 0;

  return (event: KeyboardEvent): boolean => {
    if (currentIndex >= keys.length) {
      currentIndex = 0;
    }

    if (matchShortcut(event, keys[currentIndex]!)) {
      currentIndex++;
      if (currentIndex >= keys.length) {
        currentIndex = 0;
        return true;
      }
    } else {
      // Reset if the sequence is broken
      currentIndex = 0;
    }

    return false;
  };
}
