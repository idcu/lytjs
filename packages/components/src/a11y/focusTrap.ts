/**
 * Focus Trap 实现
 * 用于 Modal/Dialog/Drawer 等弹出层组件，确保焦点被困在弹出层内
 *
 * Features:
 * - 自动聚焦到弹出层内的第一个可聚焦元素
 * - Tab/Shift+Tab 循环焦点
 * - Escape 键关闭（可选）
 * - 支持暂停/恢复
 */

export interface FocusTrapOptions {
  /** 容器元素 */
  container: HTMLElement;
  /** 初始聚焦元素，默认为容器内第一个可聚焦元素 */
  initialFocus?: HTMLElement;
  /** 是否在 Escape 时触发回调 */
  onEscape?: () => void;
  /** 是否在激活时自动聚焦 */
  autoFocus?: boolean;
  /** 是否在停用时恢复焦点 */
  restoreFocus?: boolean;
  /** 触发元素（打开弹出层的元素），用于恢复焦点 */
  triggerElement?: HTMLElement;
}

/** 可聚焦元素选择器 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * 获取容器内所有可聚焦元素
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  // 过滤掉不可见的元素
  return elements.filter((el) => {
    const style = getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity) === 0) return false;
    return true;
  });
}

/**
 * Focus Trap 类
 */
export class FocusTrap {
  private container: HTMLElement;
  private initialFocus?: HTMLElement;
  private onEscape?: () => void;
  private autoFocus: boolean;
  private restoreFocus: boolean;
  private triggerElement?: HTMLElement;
  private previousActiveElement: HTMLElement | null = null;
  private isActive = false;
  private isPaused = false;
  private handleKeydown: (e: KeyboardEvent) => void;

  constructor(options: FocusTrapOptions) {
    this.container = options.container;
    this.initialFocus = options.initialFocus;
    this.onEscape = options.onEscape;
    this.autoFocus = options.autoFocus !== false;
    this.restoreFocus = options.restoreFocus !== false;
    this.triggerElement = options.triggerElement;

    this.handleKeydown = this._handleKeydown.bind(this);
  }

  /**
   * 激活 Focus Trap
   */
  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.isPaused = false;

    const doc = (globalThis as unknown as { document: Document }).document;

    // 保存当前焦点元素
    this.previousActiveElement = doc.activeElement as HTMLElement;

    // 绑定键盘事件
    doc.addEventListener('keydown', this.handleKeydown);

    // 自动聚焦
    if (this.autoFocus) {
      requestAnimationFrame(() => {
        this.focusInitial();
      });
    }
  }

  /**
   * 停用 Focus Trap
   */
  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.isPaused = false;

    const doc = (globalThis as unknown as { document: Document }).document;

    // 解绑键盘事件
    doc.removeEventListener('keydown', this.handleKeydown);

    // 恢复焦点
    if (this.restoreFocus && this.previousActiveElement) {
      const target = this.triggerElement || this.previousActiveElement;
      requestAnimationFrame(() => {
        target?.focus?.();
      });
    }
  }

  /**
   * 暂停 Focus Trap（不解除事件绑定，但不拦截焦点）
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * 恢复 Focus Trap
   */
  unpause(): void {
    this.isPaused = false;
  }

  /**
   * 聚焦到初始元素
   */
  focusInitial(): void {
    if (this.initialFocus && this.container.contains(this.initialFocus)) {
      this.initialFocus.focus();
      return;
    }

    const focusable = getFocusableElements(this.container);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      // 如果没有可聚焦元素，给容器设置 tabindex
      this.container.setAttribute('tabindex', '-1');
      this.container.focus();
    }
  }

  /**
   * 处理键盘事件
   */
  private _handleKeydown(e: KeyboardEvent): void {
    if (this.isPaused) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.onEscape?.();
      return;
    }

    if (e.key === 'Tab') {
      this.handleTab(e);
    }
  }

  /**
   * 处理 Tab 键循环
   */
  private handleTab(e: KeyboardEvent): void {
    const focusable = getFocusableElements(this.container);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const doc = (globalThis as unknown as { document: Document }).document;
    const active = doc.activeElement;

    if (e.shiftKey) {
      // Shift+Tab: 如果焦点在第一个元素，跳到最后一个
      if (active === first || !this.container.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: 如果焦点在最后一个元素，跳到第一个
      if (active === last || !this.container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

/**
 * 创建 Focus Trap 的便捷函数
 */
export function createFocusTrap(options: FocusTrapOptions): FocusTrap {
  return new FocusTrap(options);
}
