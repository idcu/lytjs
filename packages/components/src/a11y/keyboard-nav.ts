/**
 * 键盘导航辅助函数
 * 提供通用的键盘事件处理工具
 */

export interface KeyboardHandlerOptions {
  /** 按下 Escape 键时的回调 */
  onEscape?: (e: KeyboardEvent) => void;
  /** 按下 Enter 键时的回调 */
  onEnter?: (e: KeyboardEvent) => void;
  /** 按下 Space 键时的回调 */
  onSpace?: (e: KeyboardEvent) => void;
  /** 按下 ArrowUp 键时的回调 */
  onArrowUp?: (e: KeyboardEvent) => void;
  /** 按下 ArrowDown 键时的回调 */
  onArrowDown?: (e: KeyboardEvent) => void;
  /** 按下 ArrowLeft 键时的回调 */
  onArrowLeft?: (e: KeyboardEvent) => void;
  /** 按下 ArrowRight 键时的回调 */
  onArrowRight?: (e: KeyboardEvent) => void;
  /** 按下 Home 键时的回调 */
  onHome?: (e: KeyboardEvent) => void;
  /** 按下 End 键时的回调 */
  onEnd?: (e: KeyboardEvent) => void;
  /** 按下 Tab 键时的回调 */
  onTab?: (e: KeyboardEvent) => void;
  /** 是否阻止默认行为，默认为 true */
  preventDefault?: boolean;
}

/**
 * 创建键盘事件处理器
 * 返回一个统一的 keydown 事件处理函数
 */
export function createKeyboardHandler(options: KeyboardHandlerOptions): (e: KeyboardEvent) => void {
  const preventDefault = options.preventDefault !== false;

  return (e: KeyboardEvent) => {
    let handled = false;

    switch (e.key) {
      case 'Escape':
        options.onEscape?.(e);
        handled = true;
        break;
      case 'Enter':
        options.onEnter?.(e);
        handled = true;
        break;
      case ' ':
        options.onSpace?.(e);
        handled = true;
        break;
      case 'ArrowUp':
        options.onArrowUp?.(e);
        handled = true;
        break;
      case 'ArrowDown':
        options.onArrowDown?.(e);
        handled = true;
        break;
      case 'ArrowLeft':
        options.onArrowLeft?.(e);
        handled = true;
        break;
      case 'ArrowRight':
        options.onArrowRight?.(e);
        handled = true;
        break;
      case 'Home':
        options.onHome?.(e);
        handled = true;
        break;
      case 'End':
        options.onEnd?.(e);
        handled = true;
        break;
      case 'Tab':
        options.onTab?.(e);
        // Tab 不阻止默认行为
        return;
    }

    if (handled && preventDefault) {
      e.preventDefault();
    }
  };
}

/**
 * 处理 Arrow 键导航（在列表中上下/左右移动）
 * @param currentIndex - 当前索引
 * @param totalItems - 总项目数
 * @param direction - 方向 'up' | 'down' | 'left' | 'right'
 * @param loop - 是否循环
 * @returns 新的索引
 */
export function handleArrowKeys(
  currentIndex: number,
  totalItems: number,
  direction: 'up' | 'down' | 'left' | 'right',
  loop: boolean = true
): number {
  if (totalItems === 0) return -1;

  let newIndex = currentIndex;

  switch (direction) {
    case 'up':
    case 'left':
      newIndex = currentIndex - 1;
      if (newIndex < 0) {
        newIndex = loop ? totalItems - 1 : 0;
      }
      break;
    case 'down':
    case 'right':
      newIndex = currentIndex + 1;
      if (newIndex >= totalItems) {
        newIndex = loop ? 0 : totalItems - 1;
      }
      break;
  }

  return newIndex;
}

/**
 * 处理 Escape 键
 * @param e - 键盘事件
 * @param callback - 回调函数
 */
export function handleEscape(e: KeyboardEvent, callback: () => void): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    callback();
  }
}

/**
 * 处理 Enter 和 Space 键（常用于按钮/复选框/开关等）
 * @param e - 键盘事件
 * @param callback - 回调函数
 */
export function handleActivation(e: KeyboardEvent, callback: () => void): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    callback();
  }
}

/**
 * 处理 Home/End 键
 * @param e - 键盘事件
 * @param totalItems - 总项目数
 * @param callback - 回调函数，接收新索引
 */
export function handleHomeEnd(
  e: KeyboardEvent,
  totalItems: number,
  callback: (index: number) => void
): void {
  if (e.key === 'Home') {
    e.preventDefault();
    callback(0);
  } else if (e.key === 'End') {
    e.preventDefault();
    callback(totalItems - 1);
  }
}

/**
 * 检查事件是否来自键盘
 * 用于区分键盘和鼠标触发的事件
 */
export function isKeyboardEvent(e: Event): boolean {
  if (e instanceof KeyboardEvent) return true;
  // 检查 MouseEvent 的 detail 属性（键盘触发的 click 事件 detail 为 0）
  if (e instanceof MouseEvent) {
    return e.detail === 0;
  }
  return false;
}

/**
 * 在容器中查找下一个/上一个可聚焦元素
 * @param container - 容器元素
 * @param current - 当前元素
 * @param direction - 方向 'next' | 'prev'
 * @param selector - 可聚焦元素选择器
 */
export function findFocusableSibling(
  container: HTMLElement,
  current: HTMLElement,
  direction: 'next' | 'prev',
  selector: string = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="radio"]',
    '[role="checkbox"]',
  ].join(', ')
): HTMLElement | null {
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
  const currentIndex = items.indexOf(current);

  if (currentIndex === -1) return items[0] || null;

  if (direction === 'next') {
    return items[currentIndex + 1] || items[0] || null;
  } else {
    return items[currentIndex - 1] || items[items.length - 1] || null;
  }
}
