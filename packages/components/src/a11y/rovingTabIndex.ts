/**
 * Roving Tabindex 实现
 * 用于 Tabs/Menu 等组件，实现方向键导航
 *
 * Features:
 * - 管理一组可聚焦元素的 tabindex
 * - 当前激活的元素 tabindex=0，其他 tabindex=-1
 * - 支持方向键（ArrowLeft/ArrowRight/ArrowUp/ArrowDown）导航
 * - 支持 Home/End 键跳转到首尾
 * - 支持水平/垂直方向
 */

export interface RovingTabIndexOptions {
  /** 容器元素 */
  container: HTMLElement;
  /** 子项选择器 */
  itemSelector: string;
  /** 方向: 'horizontal' | 'vertical' | 'both' | 'grid' */
  orientation?: 'horizontal' | 'vertical' | 'both' | 'grid';
  /** 初始激活索引 */
  initialIndex?: number;
  /** 是否循环（到达末尾后回到开头） */
  loop?: boolean;
  /** 选中回调 */
  onSelect?: (index: number, element: HTMLElement) => void;
  /** 每行显示的列数（仅 grid 模式） */
  cols?: number;
}

export class RovingTabIndex {
  private container: HTMLElement;
  private itemSelector: string;
  private orientation: string;
  private loop: boolean;
  private onSelect?: (index: number, element: HTMLElement) => void;
  private cols: number;
  private currentIndex: number;
  private isActive = false;
  private handleKeydown: (e: KeyboardEvent) => void;

  constructor(options: RovingTabIndexOptions) {
    this.container = options.container;
    this.itemSelector = options.itemSelector;
    this.orientation = options.orientation || 'horizontal';
    this.loop = options.loop !== false;
    this.onSelect = options.onSelect;
    this.cols = options.cols || 1;
    this.currentIndex = options.initialIndex || 0;

    this.handleKeydown = this._handleKeydown.bind(this);
  }

  /**
   * 激活 Roving Tabindex
   */
  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.container.addEventListener('keydown', this.handleKeydown);
    this.updateTabindex();
  }

  /**
   * 停用 Roving Tabindex
   */
  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.container.removeEventListener('keydown', this.handleKeydown);
  }

  /**
   * 获取所有子项元素
   */
  getItems(): HTMLElement[] {
    return Array.from(
      this.container.querySelectorAll<HTMLElement>(this.itemSelector)
    ).filter((el) => {
      // 排除禁用的元素
      return !el.hasAttribute('disabled') && !el.getAttribute('aria-disabled');
    });
  }

  /**
   * 获取当前索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 设置当前索引
   */
  setCurrentIndex(index: number): void {
    const items = this.getItems();
    if (items.length === 0) return;
    this.currentIndex = Math.max(0, Math.min(index, items.length - 1));
    this.updateTabindex();
    items[this.currentIndex]?.focus();
  }

  /**
   * 更新所有子项的 tabindex
   */
  updateTabindex(): void {
    const items = this.getItems();
    items.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.setAttribute('tabindex', '0');
      } else {
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  /**
   * 处理键盘事件
   */
  private _handleKeydown(e: KeyboardEvent): void {
    const items = this.getItems();
    if (items.length === 0) return;

    const isNext =
      this.orientation === 'horizontal' || this.orientation === 'both'
        ? e.key === 'ArrowRight'
        : e.key === 'ArrowDown';
    const isPrev =
      this.orientation === 'horizontal' || this.orientation === 'both'
        ? e.key === 'ArrowLeft'
        : e.key === 'ArrowUp';

    const isHorizontalNext = e.key === 'ArrowRight';
    const isHorizontalPrev = e.key === 'ArrowLeft';
    const isVerticalNext = e.key === 'ArrowDown';
    const isVerticalPrev = e.key === 'ArrowUp';

    let handled = false;

    if (this.orientation === 'grid') {
      handled = this.handleGridNavigation(e, items, {
        isHorizontalNext,
        isHorizontalPrev,
        isVerticalNext,
        isVerticalPrev,
      });
    } else if (isNext || isPrev) {
      e.preventDefault();
      const step = isNext ? 1 : -1;
      let newIndex = this.currentIndex + step;

      if (newIndex >= items.length) {
        newIndex = this.loop ? 0 : items.length - 1;
      } else if (newIndex < 0) {
        newIndex = this.loop ? items.length - 1 : 0;
      }

      this.currentIndex = newIndex;
      this.updateTabindex();
      items[this.currentIndex].focus();
      this.onSelect?.(this.currentIndex, items[this.currentIndex]);
      handled = true;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      this.currentIndex = 0;
      this.updateTabindex();
      items[0].focus();
      this.onSelect?.(0, items[0]);
      handled = true;
    }

    if (e.key === 'End') {
      e.preventDefault();
      this.currentIndex = items.length - 1;
      this.updateTabindex();
      items[this.currentIndex].focus();
      this.onSelect?.(this.currentIndex, items[this.currentIndex]);
      handled = true;
    }

    if (handled) {
      e.stopPropagation();
    }
  }

  /**
   * 网格导航
   */
  private handleGridNavigation(
    e: KeyboardEvent,
    items: HTMLElement[],
    keys: {
      isHorizontalNext: boolean;
      isHorizontalPrev: boolean;
      isVerticalNext: boolean;
      isVerticalPrev: boolean;
    }
  ): boolean {
    const { isHorizontalNext, isHorizontalPrev, isVerticalNext, isVerticalPrev } = keys;

    if (!isHorizontalNext && !isHorizontalPrev && !isVerticalNext && !isVerticalPrev) {
      return false;
    }

    e.preventDefault();
    let newIndex = this.currentIndex;

    if (isHorizontalNext) {
      newIndex = Math.min(this.currentIndex + 1, items.length - 1);
    } else if (isHorizontalPrev) {
      newIndex = Math.max(this.currentIndex - 1, 0);
    } else if (isVerticalNext) {
      newIndex = Math.min(this.currentIndex + this.cols, items.length - 1);
    } else if (isVerticalPrev) {
      newIndex = Math.max(this.currentIndex - this.cols, 0);
    }

    this.currentIndex = newIndex;
    this.updateTabindex();
    items[this.currentIndex].focus();
    this.onSelect?.(this.currentIndex, items[this.currentIndex]);
    return true;
  }
}

/**
 * 创建 Roving Tabindex 的便捷函数
 */
export function createRovingTabIndex(options: RovingTabIndexOptions): RovingTabIndex {
  return new RovingTabIndex(options);
}
